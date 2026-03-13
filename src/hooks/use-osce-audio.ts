import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseOsceAudioProps {
  circuitId: string | undefined;
  stationId: string | undefined;
  role: "student" | "evaluator";
  enabled: boolean;
}

export function useOsceAudio({ circuitId, stationId, role, enabled }: UseOsceAudioProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<any>(null);
  const isInitiatorRef = useRef(role === "evaluator");

  const roomId = circuitId && stationId ? `osce-audio-${circuitId}-${stationId}` : null;

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
        // Get microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;

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

        // When a peer joins, the evaluator re-sends an offer
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

        // Announce presence
        setTimeout(() => {
          channel.send({
            type: "broadcast",
            event: "join",
            payload: { from: role },
          });
        }, 500);

        // If evaluator (initiator), create offer
        if (isInitiatorRef.current) {
          // Small delay to let peer subscribe
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

  return { isMuted, isConnected, hasRemoteAudio, toggleMute };
}
