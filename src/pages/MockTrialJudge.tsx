import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gavel, Play, Pause, SkipForward, Volume2 } from "lucide-react";

const PHASES = [
  { key: "announcement", label: "Anúncio do Caso", duration: 120 },
  { key: "prosecution", label: "Acusação", duration: 300 },
  { key: "defense", label: "Defesa", duration: 300 },
  { key: "jury_questions", label: "Perguntas do Júri", duration: 300 },
  { key: "deliberation", label: "Deliberação", duration: 300 },
  { key: "verdict", label: "Veredito", duration: 0 },
];

export default function MockTrialJudge() {
  const { trialId } = useParams<{ trialId: string }>();
  const [trial, setTrial] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [session, setSession] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const alertPlayedRef = useRef(false);

  // Fetch trial and cases
  useEffect(() => {
    const load = async () => {
      if (!trialId) return;
      const { data: t } = await supabase.from("mock_trials").select("*").eq("id", trialId).single();
      setTrial(t);

      const { data: c } = await supabase.from("mock_trial_cases").select("*").eq("mock_trial_id", trialId).order("position");
      setCases(c || []);
      if (c && c.length > 0 && !selectedCaseId) setSelectedCaseId(c[0].id);
    };
    load();
  }, [trialId]);

  // Load/create session for selected case
  useEffect(() => {
    const loadSession = async () => {
      if (!selectedCaseId) return;
      const { data } = await supabase.from("mock_trial_sessions").select("*").eq("case_id", selectedCaseId).maybeSingle();
      if (data) {
        setSession(data);
      } else {
        const { data: newSession } = await supabase.from("mock_trial_sessions").insert({ case_id: selectedCaseId }).select().single();
        setSession(newSession);
      }
    };
    loadSession();
  }, [selectedCaseId]);

  // Realtime subscription for session
  useEffect(() => {
    if (!session?.id) return;
    const channel = supabase
      .channel(`session-${session.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "mock_trial_sessions", filter: `id=eq.${session.id}` }, (payload) => {
        setSession(payload.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id]);

  const currentPhaseIndex = PHASES.findIndex(p => p.key === session?.status);
  const currentPhase = currentPhaseIndex >= 0 ? PHASES[currentPhaseIndex] : null;

  // Timer logic
  useEffect(() => {
    if (!isRunning || !currentPhase || currentPhase.duration === 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          // Play alert sound at 0
          try { audioRef.current?.play(); } catch {}
          return 0;
        }
        // Alert at 60 seconds
        if (prev === 61 && !alertPlayedRef.current) {
          alertPlayedRef.current = true;
          try { audioRef.current?.play(); } catch {}
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, currentPhase]);

  const startPhase = useCallback(async (phaseKey: string) => {
    if (!session?.id) return;
    const phase = PHASES.find(p => p.key === phaseKey);
    alertPlayedRef.current = false;
    setTimeLeft(phase?.duration || 0);
    setIsRunning(phase?.duration ? true : false);
    await supabase.from("mock_trial_sessions").update({
      status: phaseKey,
      current_phase_started_at: new Date().toISOString(),
    }).eq("id", session.id);
  }, [session?.id]);

  const nextPhase = async () => {
    const nextIdx = currentPhaseIndex + 1;
    if (nextIdx < PHASES.length) {
      await startPhase(PHASES[nextIdx].key);
    } else {
      await supabase.from("mock_trial_sessions").update({ status: "finished" }).eq("id", session.id);
      setIsRunning(false);
      setTimeLeft(0);
    }
  };

  const togglePause = () => setIsRunning(prev => !prev);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Hidden audio for alerts */}
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGEcBj+a2telezo0T6PY5a5bFgkrmNjlw3k7HjKS2O3Ms2QcDSaR2/DNu3U1FS2S3fDQwHw9GC2T3/LRw4JHHC+W4fTTx4dOJjiZ4/bWyo5XLT2e5fja0JVWM0Ch6Pze1ppgPkio7fzj3J9rRlKs8QDm46V5UmC0+AXr6q2AX3G/AQjx7sGJaoPFDRD19NaSf5TQGBz8+OqXi5jZIx8AAAAAA==" />

      <div className="flex items-center gap-4">
        <Gavel className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{trial?.title || "Júri Simulado"}</h1>
          {trial?.judge_name && <p className="text-muted-foreground">Juiz(a): {trial.judge_name}</p>}
        </div>
      </div>

      {/* Case Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Selecione o processo" /></SelectTrigger>
              <SelectContent>
                {cases.map(c => <SelectItem key={c.id} value={c.id}>{c.title} ({c.case_number})</SelectItem>)}
              </SelectContent>
            </Select>
            {session?.status === "pending" && (
              <Button onClick={() => startPhase("announcement")}>
                <Play className="h-4 w-4 mr-1" />Iniciar Sessão
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timer Display */}
      {session && session.status !== "pending" && session.status !== "finished" && (
        <Card className="border-2 border-primary">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Badge variant="default" className="text-lg px-4 py-1">
                {currentPhase?.label || session.status}
              </Badge>
              <div className={`text-8xl font-mono font-bold ${timeLeft <= 60 ? "text-destructive animate-pulse" : "text-foreground"}`}>
                {formatTime(timeLeft)}
              </div>
              <div className="flex justify-center gap-4">
                <Button onClick={togglePause} variant="outline" size="lg">
                  {isRunning ? <Pause className="h-5 w-5 mr-1" /> : <Play className="h-5 w-5 mr-1" />}
                  {isRunning ? "Pausar" : "Retomar"}
                </Button>
                <Button onClick={nextPhase} size="lg">
                  <SkipForward className="h-5 w-5 mr-1" />
                  Próxima Fase
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {session?.status === "finished" && (
        <Card className="border-2 border-primary">
          <CardContent className="py-12 text-center">
            <Gavel className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold">Sessão Finalizada</h3>
          </CardContent>
        </Card>
      )}

      {/* Phase Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sequência de Fases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {PHASES.map((phase, idx) => {
              const isCurrent = phase.key === session?.status;
              const isPast = currentPhaseIndex > idx;
              return (
                <div key={phase.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isCurrent ? "bg-primary text-primary-foreground border-primary" : isPast ? "bg-muted border-muted" : "border-border"}`}>
                  <span className="text-sm font-medium">{idx + 1}. {phase.label}</span>
                  {phase.duration > 0 && <span className="text-xs opacity-70">{Math.floor(phase.duration / 60)}min</span>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
