import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AudioDevice {
  deviceId: string;
  label: string;
}

interface UseOsceAudioProps {
  circuitId: string | undefined;
  stationId: string | undefined;
  role: "student" | "evaluator";
  enabled: boolean;
}

export function useOsceAudio({ circuitId, stationId, role, enabled }: UseOsceAudioProps) {
  const [isMuted, setIsMuted] = useState(true); // Start muted by default
  const [isConnected, setIsConnected] = useState(false);
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<any>(null);
  const isInitiatorRef = useRef(role === "evaluator");

  const roomId = circuitId && stationId ? `osce-audio-${circuitId}-${stationId}` : null;

  // Enumerate audio input devices
  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter(d => d.kind === "audioinput")
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Microfone ${d.deviceId.slice(0, 5)}` }));
      setAudioDevices(audioInputs);
      if (!selectedDeviceId && audioInputs.length > 0) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }
    } catch (e) {
      console.error("Error enumerating devices:", e);
    }
  }, [selectedDeviceId]);

  // Switch microphone without re-creating the peer connection
  const switchMicrophone = useCallback(async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
        video: false,
      });
      const newTrack = newStream.getAudioTracks()[0];

      // Preserve mute state
      newTrack.enabled = !isMuted;

      // Replace track in peer connection
      const pc = peerConnectionRef.current;
      if (pc) {
        const sender = pc.getSenders().find(s => s.track?.kind === "audio");
        if (sender) {
          await sender.replaceTrack(newTrack);
        }
      }

      // Stop old tracks and update ref
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = newStream;
    } catch (e) {
      console.error("Error switching microphone:", e);
    }
  }, [isMuted]);

  const cleanup = useCallback(() => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    setIsConnected(false);
    setHasRemoteAudio(false);
  }, []);

  useEffect(() => {
    if (!enabled || !roomId) {
      cleanup();
      return;
    }

    let cancelled = false;

    const start = async () => {
      try {
        // Get microphone (use selected device if available)
        const constraints: MediaStreamConstraints = {
          audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
          video: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        // Start muted by default
        stream.getAudioTracks().forEach(t => { t.enabled = false; });
        localStreamRef.current = stream;

        // Refresh device list after getting permission
        await refreshDevices();

        // Create peer connection with STUN servers
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        });
        peerConnectionRef.current = pc;

        // Add local tracks
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // Handle remote tracks
        pc.ontrack = (event) => {
          if (!remoteAudioRef.current) {
            remoteAudioRef.current = new Audio();
            remoteAudioRef.current.autoplay = true;
          }
          remoteAudioRef.current.srcObject = event.streams[0];
          setHasRemoteAudio(true);
        };

        // Signaling via Supabase Realtime broadcast
        const channel = supabase.channel(roomId, {
          config: { broadcast: { self: false } },
        });
        channelRef.current = channel;

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({
              type: "broadcast",
              event: "ice-candidate",
              payload: { candidate: event.candidate.toJSON(), from: role },
            });
          }
        };

        pc.onconnectionstatechange = () => {
          setIsConnected(pc.connectionState === "connected");
        };

        channel.on("broadcast", { event: "offer" }, async ({ payload }) => {
          if (payload.from === role) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channel.send({
              type: "broadcast",
              event: "answer",
              payload: { answer, from: role },
            });
          } catch (e) {
            console.error("Error handling offer:", e);
          }
        });

        channel.on("broadcast", { event: "answer" }, async ({ payload }) => {
          if (payload.from === role) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
          } catch (e) {
            console.error("Error handling answer:", e);
          }
        });

        channel.on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
          if (payload.from === role) return;
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.error("Error adding ICE candidate:", e);
          }
        });

        channel.on("broadcast", { event: "join" }, async ({ payload }) => {
          if (payload.from === role) return;
          if (isInitiatorRef.current) {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              channel.send({
                type: "broadcast",
                event: "offer",
                payload: { offer, from: role },
              });
            } catch (e) {
              console.error("Error creating offer on join:", e);
            }
          }
        });

        await channel.subscribe();

        setTimeout(() => {
          channel.send({
            type: "broadcast",
            event: "join",
            payload: { from: role },
          });
        }, 500);

        if (isInitiatorRef.current) {
          setTimeout(async () => {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              channel.send({
                type: "broadcast",
                event: "offer",
                payload: { offer, from: role },
              });
            } catch (e) {
              console.error("Error creating initial offer:", e);
            }
          }, 1500);
        }
      } catch (e) {
        console.error("Failed to start audio:", e);
      }
    };

    start();

    return () => {
      cancelled = true;
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, roomId, role, cleanup]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  return { isMuted, isConnected, hasRemoteAudio, toggleMute, audioDevices, selectedDeviceId, switchMicrophone };
}
