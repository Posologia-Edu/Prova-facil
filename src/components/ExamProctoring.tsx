import { useEffect, useRef, useCallback, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Camera, Shield, AlertTriangle } from "lucide-react";

const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/exam-proctoring`;

export interface ProctoringConfig {
  fullscreen?: boolean;
  blockCopyPaste?: boolean;
  shuffleQuestions?: boolean;
  shuffleAlternatives?: boolean;
  requirePhoto?: boolean;
  periodicPhotos?: boolean;
  photoIntervalMinutes?: number;
  watermark?: boolean;
  maxViolations?: number;
}

interface ExamProctoringProps {
  config: ProctoringConfig;
  sessionId: string;
  studentName?: string;
  studentEmail?: string;
  onBlocked?: () => void;
  children: React.ReactNode;
}

export default function ExamProctoring({
  config,
  sessionId,
  studentName = "",
  studentEmail = "",
  onBlocked,
  children,
}: ExamProctoringProps) {
  const [consentGiven, setConsentGiven] = useState(false);
  const [showConsent, setShowConsent] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasLogged = useRef(false);

  const hasAnyFeature = config.fullscreen || config.blockCopyPaste || config.requirePhoto || config.watermark;

  // Diagnostic log for debugging proctoring config
  console.log("[ExamProctoring] Config received:", JSON.stringify(config));
  console.log("[ExamProctoring] hasAnyFeature:", hasAnyFeature, "sessionId:", sessionId);
  const logEvent = useCallback(async (eventType: string, eventData: Record<string, unknown> = {}) => {
    try {
      await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "log-event", sessionId, eventType, eventData }),
      });
    } catch {
      // silently fail
    }
  }, [sessionId]);

  const incrementViolation = useCallback((type: string) => {
    if (blocked) return;

    setViolationCount(prev => {
      const next = prev + 1;
      if (config.maxViolations && next >= config.maxViolations) {
        setBlocked(true);
        onBlocked?.();
        logEvent("session_blocked", { reason: "max_violations_reached", count: next });
        toast.error("Prova bloqueada por excesso de violações.");
      }
      return next;
    });

    logEvent(type);
  }, [blocked, config.maxViolations, logEvent, onBlocked]);

  // Capture photo from webcam
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !streamRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, 320, 240);
    const base64 = canvas.toDataURL("image/jpeg", 0.7);
    try {
      await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "capture-photo", sessionId, photoBase64: base64 }),
      });
    } catch {
      // silently fail
    }
  }, [sessionId]);

  // Device fingerprint
  const collectFingerprint = useCallback(async () => {
    const fp = {
      userAgent: navigator.userAgent,
      screenWidth: screen.width,
      screenHeight: screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      colorDepth: screen.colorDepth,
    };
    try {
      await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "log-event", sessionId, eventType: "session_started", eventData: { fingerprint: fp } }),
      });
    } catch {
      // silently fail
    }
  }, [sessionId]);

  // Initialize webcam
  const initWebcam = useCallback(async () => {
    if (!config.requirePhoto && !config.periodicPhotos) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      // Initial photo after 2 sec
      setTimeout(() => capturePhoto(), 2000);
    } catch {
      toast.warning("Não foi possível acessar a câmera. A prova continuará sem captura de imagem.");
      logEvent("webcam_denied");
    }
  }, [config.requirePhoto, config.periodicPhotos, capturePhoto, logEvent]);

  // Handle consent
  const handleConsent = async () => {
    setConsentGiven(true);
    setShowConsent(false);

    // Collect fingerprint
    await collectFingerprint();

    // Enter fullscreen
    if (config.fullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        toast.warning("Não foi possível ativar tela cheia.");
      }
    }

    // Init webcam
    await initWebcam();

    // Periodic photos
    if (config.periodicPhotos && config.photoIntervalMinutes) {
      photoIntervalRef.current = setInterval(() => {
        capturePhoto();
      }, (config.photoIntervalMinutes || 5) * 60 * 1000);
    }
  };

  // Fullscreen enforcement
  useEffect(() => {
    if (!consentGiven || blocked || !config.fullscreen) return;
    const handler = () => {
      if (!document.fullscreenElement) {
        incrementViolation("fullscreen_exit");
        toast.warning(`Violação registrada: saída de tela cheia (${violationCount + 1}/${config.maxViolations || "∞"})`);
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [blocked, consentGiven, config.fullscreen, incrementViolation, violationCount, config.maxViolations]);

  // Tab switch detection
  useEffect(() => {
    if (!consentGiven || blocked) return;
    const handleVisibility = () => {
      if (document.hidden) {
        incrementViolation("focus_lost");
        toast.warning(`Violação registrada: troca de aba (${violationCount + 1}/${config.maxViolations || "∞"})`);
      }
    };
    const handleBlur = () => {
      incrementViolation("focus_lost");
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
    };
  }, [blocked, consentGiven, incrementViolation, violationCount, config.maxViolations]);

  // Copy/paste blocker
  useEffect(() => {
    if (!consentGiven || blocked || !config.blockCopyPaste) return;
    const block = (e: Event) => {
      e.preventDefault();
      incrementViolation(`${e.type}_attempt`);
    };
    const blockKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const blockedKeys = ["c", "v", "x", "a", "p", "s"];
        if (blockedKeys.includes(e.key.toLowerCase())) {
          e.preventDefault();
          incrementViolation("keyboard_shortcut_blocked");
        }
      }
      if (e.key === "PrintScreen") {
        e.preventDefault();
        incrementViolation("printscreen_attempt");
      }
    };
    document.addEventListener("copy", block);
    document.addEventListener("paste", block);
    document.addEventListener("cut", block);
    document.addEventListener("contextmenu", block);
    document.addEventListener("keydown", blockKeyboard);
    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("keydown", blockKeyboard);
    };
  }, [blocked, consentGiven, config.blockCopyPaste, incrementViolation]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (photoIntervalRef.current) {
        clearInterval(photoIntervalRef.current);
      }
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Realtime: keep session status synced without requiring page reload
  useEffect(() => {
    if (!sessionId) return;

    const syncSessionStatus = (status?: string, nextViolationCount?: number) => {
      if (status === "blocked") {
        setBlocked(true);
        if (typeof nextViolationCount === "number") {
          setViolationCount(nextViolationCount);
        }
        return;
      }

      if (status === "in_progress") {
        setBlocked((wasBlocked) => {
          if (wasBlocked) {
            toast.success("Sua prova foi desbloqueada pelo professor.");
          }
          return false;
        });
        setViolationCount(typeof nextViolationCount === "number" ? nextViolationCount : 0);
      }
    };

    const databaseChannel = supabase
      .channel(`session-status-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "exam_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload: any) => {
          syncSessionStatus(payload.new?.status, payload.new?.violation_count);
        }
      )
      .subscribe();

    const broadcastChannel = supabase
      .channel(`exam-proctoring-events-${sessionId}`)
      .on("broadcast", { event: "session-status-changed" }, ({ payload }: any) => {
        if (payload?.sessionId !== sessionId) return;
        syncSessionStatus(payload.status, payload.violationCount);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(databaseChannel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [sessionId]);

  // If no proctoring features, just render children
  if (!hasAnyFeature) return <>{children}</>;

  // Consent screen
  if (showConsent && !consentGiven) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-card rounded-xl border shadow-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <Shield className="h-12 w-12 mx-auto text-primary" />
            <h1 className="text-xl font-bold">Prova com Monitoramento Ativo</h1>
            <p className="text-sm text-muted-foreground">
              Esta avaliação possui medidas de segurança para garantir a integridade do processo.
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <p className="font-semibold">Ao prosseguir, você concorda com:</p>
            <ul className="space-y-2 text-muted-foreground">
              {config.fullscreen && (
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                  Modo tela cheia obrigatório — sair registra violação
                </li>
              )}
              {config.blockCopyPaste && (
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                  Bloqueio de copiar, colar e atalhos do teclado
                </li>
              )}
              {config.requirePhoto && (
                <li className="flex items-start gap-2">
                  <Camera className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                  Captura de imagem pela webcam para identificação
                </li>
              )}
              {config.periodicPhotos && (
                <li className="flex items-start gap-2">
                  <Camera className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                  Fotos periódicas a cada {config.photoIntervalMinutes || 5} minutos
                </li>
              )}
              {config.watermark && (
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                  Marca d'água com seus dados na tela
                </li>
              )}
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                Registro completo de todas as suas ações (log de auditoria)
              </li>
            </ul>
            {config.maxViolations && (
              <p className="text-xs text-destructive font-medium mt-2">
                ⚠ Limite de {config.maxViolations} violações. Exceder bloqueará sua prova.
              </p>
            )}
          </div>

          <Button onClick={handleConsent} className="w-full gap-2" size="lg">
            <Shield className="h-4 w-4" />
            Concordo e desejo iniciar
          </Button>
        </div>
      </div>
    );
  }

  // Blocked screen
  if (blocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-xl border border-destructive shadow-lg p-8 text-center space-y-4">
          <AlertTriangle className="h-16 w-16 mx-auto text-destructive" />
          <h1 className="text-xl font-bold text-destructive">Prova Bloqueada</h1>
          <p className="text-sm text-muted-foreground">
            Sua prova foi bloqueada por excesso de violações de segurança ({violationCount} violações registradas).
            Entre em contato com seu professor.
          </p>
          <p className="text-xs text-muted-foreground animate-pulse">
            Aguardando desbloqueio pelo professor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Watermark overlay */}
      {config.watermark && (
        <div
          className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
          style={{ opacity: 0.06 }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-foreground font-bold text-sm whitespace-nowrap select-none"
              style={{
                transform: "rotate(-35deg)",
                top: `${(i % 4) * 25 + 5}%`,
                left: `${Math.floor(i / 4) * 35 - 10}%`,
              }}
            >
              {studentName} · {studentEmail} · {new Date().toLocaleDateString("pt-BR")}
            </div>
          ))}
        </div>
      )}

      {/* Hidden webcam video */}
      {(config.requirePhoto || config.periodicPhotos) && (
        <video
          ref={videoRef}
          className="fixed bottom-2 right-2 w-24 h-18 rounded-lg border shadow-lg z-40 opacity-80 object-cover"
          muted
          playsInline
          autoPlay
        />
      )}

      {/* Violation counter badge */}
      {violationCount > 0 && (
        <div className="fixed top-2 right-2 z-50 bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          {violationCount} violação(ões)
        </div>
      )}

      {children}
    </div>
  );
}
