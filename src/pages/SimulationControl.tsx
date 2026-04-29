import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Users, Clock, CheckCircle, BarChart3, FileText, Stethoscope, Eye, GraduationCap, Play, BookOpen, Square, PauseCircle, PlayCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SimulationReportGenerator, type PairReport, type ReportSection } from "@/components/SimulationReportGenerator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SimulationProgressPanel } from "@/components/simulation/SimulationProgressPanel";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function SimulationControl() {
  const { roomId } = useParams<{ roomId: string }>();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: room } = useQuery({
    queryKey: ["simulation-room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("simulation_rooms").select("*").eq("id", roomId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  const { data: rounds = [] } = useQuery({
    queryKey: ["simulation-rounds", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulation_rounds")
        .select("*")
        .eq("room_id", roomId!)
        .order("round_number", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
    refetchInterval: 5000,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["simulation-participants", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulation_participants")
        .select("*")
        .eq("room_id", roomId!)
        .order("pair_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
    refetchInterval: 5000,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["simulation-assignments", roomId],
    queryFn: async () => {
      const roundIds = rounds.map((r: any) => r.id);
      if (!roundIds.length) return [];
      const { data, error } = await supabase
        .from("simulation_round_assignments")
        .select("*, simulation_participants(*)")
        .in("round_id", roundIds);
      if (error) throw error;
      return data;
    },
    enabled: rounds.length > 0,
    refetchInterval: 5000,
  });

  const { data: responses = [] } = useQuery({
    queryKey: ["simulation-responses", roomId],
    queryFn: async () => {
      const roundIds = rounds.map((r: any) => r.id);
      if (!roundIds.length) return [];
      const { data, error } = await supabase
        .from("simulation_responses")
        .select("*")
        .in("round_id", roundIds);
      if (error) throw error;
      return data;
    },
    enabled: rounds.length > 0,
    refetchInterval: 5000,
  });

  const { data: forms = [] } = useQuery({
    queryKey: ["simulation-forms", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulation_forms")
        .select("*")
        .eq("room_id", roomId!);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!roomId,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["simulation-sessions", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulation_sessions" as any)
        .select("*")
        .eq("room_id", roomId!)
        .order("session_number", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!roomId,
    refetchInterval: 10000,
  });

  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);

  const professor = participants.find((participant: any) => participant.participant_role === "professor");
  const students = participants.filter((participant: any) => participant.participant_role === "student");
  const readyStudentsCount = students.filter((participant: any) => participant.status === "ready").length;
  const activeRound = rounds.find((r: any) => r.status === "active");
  const nextPendingRound = rounds.find((r: any) => r.status === "pending");
  const allRoundsCompleted = rounds.length > 0 && rounds.every((r: any) => r.status === "completed");

  // Determine if materials need releasing for the next pending round's cycle
  const needsMaterialRelease = useMemo(() => {
    if (!nextPendingRound || activeRound) return false;
    const cycle = nextPendingRound.cycle;
    const cycleRounds = rounds.filter((r: any) => r.cycle === cycle);
    return cycleRounds.length > 0 && !cycleRounds.some((r: any) => r.materials_released);
  }, [rounds, nextPendingRound, activeRound]);

  const materialsReleasedButNotStarted = useMemo(() => {
    if (!nextPendingRound || activeRound) return false;
    const cycle = nextPendingRound.cycle;
    const cycleRounds = rounds.filter((r: any) => r.cycle === cycle);
    return cycleRounds.some((r: any) => r.materials_released) && !cycleRounds.some((r: any) => r.status === "active");
  }, [rounds, nextPendingRound, activeRound]);

  // Realtime subscription for participants
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`sim-participants-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "simulation_participants", filter: `room_id=eq.${roomId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["simulation-participants", roomId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "simulation_rounds", filter: `room_id=eq.${roomId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["simulation-rounds", roomId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, queryClient]);

  const openProfessorRoom = () => {
    if (!room?.access_code || !professor?.student_email) {
      toast({ title: "Cadastre o e-mail do professor para abrir a sala.", variant: "destructive" });
      return;
    }

    sessionStorage.setItem("sim_pin", room.access_code);
    sessionStorage.setItem("sim_email", String(professor.student_email).trim().toLowerCase());
    navigate("/simulation/join");
  };

  // Professor actions
  const releaseMaterials = async () => {
    if (!nextPendingRound || !room) return;
    const cycle = nextPendingRound.cycle;
    const cycleRoundIds = rounds.filter((r: any) => r.cycle === cycle).map((r: any) => r.id);
    await Promise.all([
      supabase.from("simulation_rounds").update({ materials_released: true }).in("id", cycleRoundIds),
      supabase.from("simulation_participants").update({ status: "waiting" }).eq("room_id", room.id).eq("participant_role", "student"),
      supabase.from("simulation_rooms").update({ current_cycle: cycle, current_round: 0, status: "active" }).eq("id", room.id),
    ]);
    queryClient.invalidateQueries({ queryKey: ["simulation-rounds", roomId] });
    queryClient.invalidateQueries({ queryKey: ["simulation-participants", roomId] });
    toast({ title: "Materiais liberados para o ciclo " + cycle });
  };

  const startNextRound = async () => {
    if (!nextPendingRound || !room) return;
    await Promise.all([
      supabase.from("simulation_rounds").update({ status: "active", started_at: new Date().toISOString(), released_by: "professor" }).eq("id", nextPendingRound.id),
      supabase.from("simulation_rooms").update({ current_cycle: nextPendingRound.cycle, current_round: nextPendingRound.round_number, status: "active" }).eq("id", room.id),
    ]);
    queryClient.invalidateQueries({ queryKey: ["simulation-rounds", roomId] });
    queryClient.invalidateQueries({ queryKey: ["simulation-room", roomId] });
    toast({ title: `Rodada ${nextPendingRound.round_number} iniciada!` });
  };

  const endActiveRound = async () => {
    if (!activeRound || !room) return;
    const remainingPending = rounds.filter((r: any) => r.id !== activeRound.id && r.status === "pending");
    await Promise.all([
      supabase.from("simulation_rounds").update({ status: "completed", finished_at: new Date().toISOString() }).eq("id", activeRound.id),
      supabase.from("simulation_rooms").update({ current_cycle: activeRound.cycle, current_round: activeRound.round_number, status: remainingPending.length === 0 ? "completed" : "active" }).eq("id", room.id),
    ]);
    queryClient.invalidateQueries({ queryKey: ["simulation-rounds", roomId] });
    queryClient.invalidateQueries({ queryKey: ["simulation-room", roomId] });
    toast({ title: `Rodada ${activeRound.round_number} encerrada!` });
  };

  const pauseSimulation = async () => {
    if (!room) return;
    // Close the open session, if any
    const openSession = sessions.find((s: any) => !s.ended_at);
    await supabase.from("simulation_rooms").update({ status: "paused" }).eq("id", room.id);
    if (openSession) {
      await supabase
        .from("simulation_sessions" as any)
        .update({ ended_at: new Date().toISOString() })
        .eq("id", openSession.id);
    }
    queryClient.invalidateQueries({ queryKey: ["simulation-room", roomId] });
    queryClient.invalidateQueries({ queryKey: ["simulation-sessions", roomId] });
    setPauseDialogOpen(false);
    toast({ title: "Simulação pausada", description: "Os alunos verão uma tela informando que a sessão continuará em outro dia." });
  };

  const resumeSimulation = async () => {
    if (!room) return;
    const nextNumber = (sessions.length || 0) + 1;
    await supabase.from("simulation_rooms").update({ status: "active" }).eq("id", room.id);
    await supabase
      .from("simulation_sessions" as any)
      .insert({ room_id: room.id, session_number: nextNumber, started_at: new Date().toISOString() });
    queryClient.invalidateQueries({ queryKey: ["simulation-room", roomId] });
    queryClient.invalidateQueries({ queryKey: ["simulation-sessions", roomId] });
    toast({ title: `Sessão ${nextNumber} iniciada`, description: "Os alunos pendentes podem entrar normalmente com o PIN." });
  };

  // Auto-create the first session when first round becomes active and no session exists yet
  useEffect(() => {
    if (!room || !roomId) return;
    if (room.status !== "active") return;
    if (sessions.length > 0) return;
    if (!rounds.some((r: any) => r.status === "active" || r.status === "completed")) return;
    supabase
      .from("simulation_sessions" as any)
      .insert({ room_id: roomId, session_number: 1, started_at: new Date().toISOString() })
      .then(() => queryClient.invalidateQueries({ queryKey: ["simulation-sessions", roomId] }));
  }, [room?.status, sessions.length, rounds, roomId, queryClient]);

  const isPaused = room?.status === "paused";
  const hasPendingRounds = rounds.some((r: any) => r.status === "pending");
  const canPause = !isPaused && hasPendingRounds && rounds.some((r: any) => r.status === "completed");

  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!activeRound?.started_at || !room?.duration_minutes) {
      setTimeLeft(null);
      return;
    }
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(activeRound.started_at).getTime()) / 1000);
      const remaining = room.duration_minutes * 60 - elapsed;
      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeRound, room]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const roleLabels: Record<string, string> = {
    professional: t("sim_role_professional"),
    patient: t("sim_role_patient"),
    observer: t("sim_role_observer"),
    professor: t("sim_professor"),
  };

  const roleColors: Record<string, string> = {
    professional: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    patient: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    observer: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  };

  // Analytics computations
  const getParticipantName = (id: string) => participants.find((p: any) => p.id === id)?.student_name || id;

  const analyticsData = useMemo(() => {
    const completedRounds = rounds.filter((r: any) => r.status === "completed");
    const profForm = forms.find((f: any) => f.form_type === "professor_eval");
    const obsForm = forms.find((f: any) => f.form_type === "observer_eval");
    const anamnesisForm = forms.find((f: any) => f.form_type === "anamnesis");

    // Group responses by round
    const roundAnalytics = completedRounds.map((round: any) => {
      const roundAssigns = assignments.filter((a: any) => a.round_id === round.id);
      const roundResponses = responses.filter((r: any) => r.round_id === round.id);

      // Get the professional for this round
      const professionalAssign = roundAssigns.find((a: any) => a.assigned_role === "professional");
      const patientAssign = roundAssigns.find((a: any) => a.assigned_role === "patient");
      const observerAssign = roundAssigns.find((a: any) => a.assigned_role === "observer");

      // Find professor and observer scores
      const profResponse = roundResponses.find((r: any) => r.form_id === profForm?.id);
      const obsResponse = roundResponses.find((r: any) => r.form_id === obsForm?.id);
      const anamnesisResponse = roundResponses.find((r: any) => r.form_id === anamnesisForm?.id);

      const profScore = profResponse?.score || 0;
      const obsScore = obsResponse?.score || 0;
      const scoresAvailable = (profResponse?.score != null ? 1 : 0) + (obsResponse?.score != null ? 1 : 0);
      const totalScore = scoresAvailable > 0 ? (profScore + obsScore) / scoresAvailable : 0;

      return {
        round,
        professionalName: professionalAssign ? getParticipantName(professionalAssign.participant_id) : "—",
        patientName: patientAssign ? getParticipantName(patientAssign.participant_id) : "—",
        observerName: observerAssign ? getParticipantName(observerAssign.participant_id) : "—",
        profScore,
        obsScore,
        totalScore,
        profFeedback: (profResponse?.answers_json as any)?._feedback || null,
        obsFeedback: (obsResponse?.answers_json as any)?._feedback || null,
        anamnesisResponse,
        profResponse,
        obsResponse,
        responseCount: roundResponses.filter((r: any) => r.submitted_at).length,
      };
    });

    // Per-student summary
    const studentMap: Record<string, { name: string; scores: number[]; roundCount: number }> = {};
    roundAnalytics.forEach((ra) => {
      if (ra.professionalName !== "—") {
        if (!studentMap[ra.professionalName]) studentMap[ra.professionalName] = { name: ra.professionalName, scores: [], roundCount: 0 };
        studentMap[ra.professionalName].scores.push(ra.totalScore);
        studentMap[ra.professionalName].roundCount++;
      }
    });

    const studentSummaries = Object.values(studentMap).map(s => ({
      ...s,
      avg: s.scores.length > 0 ? (s.scores.reduce((a, b) => a + b, 0) / s.scores.length).toFixed(1) : "—",
    }));

    return { roundAnalytics, studentSummaries };
  }, [rounds, responses, assignments, forms, participants]);

  const renderFormResponseReadOnly = (response: any, form: any) => {
    if (!response || !form) return null;
    const fields = Array.isArray(form.content_json) ? form.content_json : [];
    const answersData = response.answers_json || {};

    return (
      <div className="space-y-2">
        {fields.map((field: any) => (
          <div key={field.id} className="space-y-1">
            <p className="text-xs font-medium text-foreground">{field.label}</p>
            <p className="text-xs text-muted-foreground bg-muted p-1.5 rounded">
              {Array.isArray(answersData[field.id])
                ? answersData[field.id].join(", ")
                : answersData[field.id] || "—"}
            </p>
          </div>
        ))}
        {answersData._feedback && (
          <div className="space-y-1 border-t pt-2">
            <p className="text-xs font-medium text-foreground">{t("sim_feedback_label")}</p>
            <p className="text-xs text-muted-foreground bg-muted p-1.5 rounded">{answersData._feedback}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/simulations")}>
            <ArrowLeft className="h-4 w-4 mr-1" />{t("pricing_back")}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground"><span className="text-xs font-normal bg-primary/10 text-primary border border-primary/30 rounded px-1.5 py-0.5 mr-2">Anamnese</span>{room?.title} — {t("sim_control")}</h1>
            <p className="text-sm text-muted-foreground">PIN: <span className="font-mono">{room?.access_code}</span></p>
          </div>
        </div>
        {timeLeft !== null && (
          <div className={`text-3xl font-mono font-bold ${timeLeft <= 60 ? "text-destructive" : "text-foreground"}`}>
            <Clock className="h-5 w-5 inline mr-2" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("sim_control_admin_hint") || "A liberação das rodadas é realizada pelo professor na sala virtual."}
        </p>
        {analyticsData.studentSummaries.length > 0 && (
          <SimulationReportGenerator
            stageName="Anamnese"
            stageType="anamnese"
            roomTitle={room?.title || ""}
            pairs={analyticsData.studentSummaries.map((s, idx) => {
              const student = students.find(st => st.student_name === s.name);
              const studentRounds = analyticsData.roundAnalytics.filter(ra => ra.professionalName === s.name);
              
              const sections: ReportSection[] = studentRounds.map(ra => {
                const items: { label: string; value: string; score?: string }[] = [
                  { label: "Nota do Professor", value: ra.profScore.toFixed(1), score: `${ra.profScore.toFixed(1)}/10` },
                  { label: "Nota do Observador", value: ra.obsScore.toFixed(1), score: `${ra.obsScore.toFixed(1)}/10` },
                  { label: "Média da Rodada", value: ra.totalScore.toFixed(1), score: `${ra.totalScore.toFixed(1)}/10` },
                ];
                if (ra.profFeedback) items.push({ label: "Feedback do Professor", value: ra.profFeedback });
                if (ra.obsFeedback) items.push({ label: "Feedback do Observador", value: ra.obsFeedback });
                
                // Add anamnesis answers if available
                if (ra.anamnesisResponse?.answers_json) {
                  Object.entries(ra.anamnesisResponse.answers_json as Record<string, any>)
                    .filter(([k]) => k !== "_feedback")
                    .forEach(([k, v]) => {
                      items.push({ label: k, value: String(v || "—") });
                    });
                }
                return { title: `Rodada ${ra.round.round_number} — Paciente: ${ra.patientName}`, items };
              });

              const avg = s.scores.length > 0 ? s.scores.reduce((a, b) => a + b, 0) / s.scores.length : 0;
              return {
                pairIndex: idx,
                students: [{ name: s.name, email: student?.student_email || undefined }],
                score: avg,
                maxScore: 10,
                details: [],
                sections,
                adminScore: avg || null,
              } as PairReport;
            })}
          />
        )}
      </div>

      {rounds.length > 0 && (
        <SimulationProgressPanel
          rounds={rounds as any}
          assignments={assignments as any}
          participants={participants as any}
          sessions={sessions as any}
          roomStatus={room?.status}
        />
      )}

      <AlertDialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pausar e continuar em outro dia?</AlertDialogTitle>
            <AlertDialogDescription>
              {activeRound
                ? `Há uma rodada ativa (Rodada ${activeRound.round_number}). Encerre-a antes de pausar para preservar as notas. Você pode também pausar agora — a rodada ativa continuará disponível para retomar.`
                : "As rodadas concluídas e suas notas ficarão salvas. As rodadas pendentes permanecerão prontas para retomar em outra sessão."}
              {" "}Os alunos verão uma tela informando que a simulação continuará em outro dia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={pauseSimulation}>Pausar simulação</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs defaultValue="monitoring">
        <TabsList>
          <TabsTrigger value="monitoring"><Users className="h-4 w-4 mr-1" />{t("sim_round")}</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" />{t("sim_tab_analytics")}</TabsTrigger>
        </TabsList>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          {rounds.length === 0 && students.length > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">A simulação ainda não foi preparada.</p>
                  <p className="text-sm text-muted-foreground">
                    {readyStudentsCount > 0
                      ? `${readyStudentsCount}/${students.length} alunos prontos. Abra a sala do professor para formar duplas, gerar as rodadas e liberar a atividade.`
                      : `${students.length} alunos cadastrados. Abra a sala do professor para formar duplas, gerar as rodadas e liberar a atividade.`}
                  </p>
                </div>
                <Button onClick={openProfessorRoom} className="gap-2 shrink-0">
                  <Play className="h-4 w-4" />
                  Abrir sala do professor
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Professor Action Buttons */}
          {rounds.length > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  {needsMaterialRelease && (
                    <Button onClick={releaseMaterials} className="gap-2">
                      <BookOpen className="h-4 w-4" />
                      Liberar Materiais — Ciclo {nextPendingRound?.cycle}
                    </Button>
                  )}
                  {materialsReleasedButNotStarted && (
                    <Button onClick={startNextRound} className="gap-2">
                      <Play className="h-4 w-4" />
                      Iniciar Rodada {nextPendingRound?.round_number}
                    </Button>
                  )}
                  {activeRound && (
                    <Button variant="destructive" onClick={endActiveRound} className="gap-2">
                      <Square className="h-4 w-4" />
                      Encerrar Rodada {activeRound.round_number}
                    </Button>
                  )}
                  {!needsMaterialRelease && !materialsReleasedButNotStarted && !activeRound && rounds.every((r: any) => r.status === "completed") && (
                    <Badge variant="outline" className="text-sm py-1.5 px-3">
                      <CheckCircle className="h-4 w-4 mr-1" /> Todas as rodadas concluídas
                    </Badge>
                  )}
                  {!needsMaterialRelease && !materialsReleasedButNotStarted && !activeRound && nextPendingRound && (
                    <Button onClick={releaseMaterials} className="gap-2">
                      <BookOpen className="h-4 w-4" />
                      Liberar Materiais — Ciclo {nextPendingRound.cycle}
                    </Button>
                  )}

                  {/* Pause / Resume controls for multi-day execution */}
                  {isPaused && (
                    <Button onClick={resumeSimulation} className="gap-2 ml-auto bg-green-600 hover:bg-green-700">
                      <PlayCircle className="h-4 w-4" />
                      Retomar simulação
                    </Button>
                  )}
                  {canPause && (
                    <Button
                      variant="outline"
                      onClick={() => setPauseDialogOpen(true)}
                      className="gap-2 ml-auto border-amber-400/60 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40"
                    >
                      <PauseCircle className="h-4 w-4" />
                      Pausar e continuar em outro dia
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Show all participants */}
          {participants.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Participantes ({participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {`${readyStudentsCount}/${students.length} alunos prontos.`}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {participants.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <Badge variant="outline" className="text-xs">
                        {p.pair_position}
                      </Badge>
                      <div className="min-w-0">
                        <span className="text-sm font-medium block truncate">{p.student_name}</span>
                        {p.student_email && (
                          <span className="text-xs text-muted-foreground block truncate">{p.student_email}</span>
                        )}
                      </div>
                      <Badge
                        variant={p.status === "ready" ? "default" : p.status === "joined" ? "outline" : "secondary"}
                        className="ml-auto text-xs shrink-0"
                      >
                        {p.status === "ready" ? "Pronto" : p.status === "joined" ? "Na sala" : "Aguardando"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {rounds.length === 0 && participants.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhum aluno acessou a sala ainda.</p>
                <p className="text-sm text-muted-foreground mt-1">Compartilhe o PIN <span className="font-mono font-bold">{room?.access_code}</span> com os alunos.</p>
                <Button onClick={openProfessorRoom} variant="outline" className="mt-4 gap-2">
                  <Play className="h-4 w-4" />
                  Abrir sala do professor
                </Button>
              </CardContent>
            </Card>
          )}

          {rounds.map((round: any) => {
            const roundAssignments = assignments.filter((a: any) => a.round_id === round.id);
            const roundResponses = responses.filter((r: any) => r.round_id === round.id);
            const isActive = round.status === "active";
            const isCompleted = round.status === "completed";
            const isPending = round.status === "pending";

            return (
              <Card key={round.id} className={isActive ? "ring-2 ring-primary" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {t("sim_round")} {round.round_number} — {t("sim_cycle")} {round.cycle}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {isCompleted && <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />{t("sim_status_completed")}</Badge>}
                      {isActive && <Badge className="bg-green-600">{t("sim_status_active")}</Badge>}
                      {isPending && <Badge variant="outline">{t("sim_status_pending")}</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {roundAssignments.map((a: any) => {
                      // Get case info for patients
                      let caseLabel = "";
                      if (a.assigned_role === "patient" && a.case_index != null) {
                        const patientScriptForm = forms.find((f: any) => f.form_type === "patient_script");
                        const content = patientScriptForm?.content_json as any;
                        if (Array.isArray(content) && content[0]?.cases) {
                          caseLabel = content[0].cases[a.case_index]?.title || `Caso ${a.case_index + 1}`;
                        }
                      }
                      return (
                        <div key={a.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                          <Badge className={roleColors[a.assigned_role] || ""}>
                            {roleLabels[a.assigned_role] || a.assigned_role}
                          </Badge>
                          <span className="text-sm font-medium">
                            {a.simulation_participants?.student_name || "—"}
                          </span>
                          {caseLabel && (
                            <span className="text-xs text-muted-foreground">({caseLabel})</span>
                          )}
                          {roundResponses.some((r: any) => r.participant_id === a.participant_id && r.submitted_at) && (
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Student Summary */}
          {analyticsData.studentSummaries.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("sim_analytics_avg")} — {t("sim_analytics_student")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("sim_analytics_student")}</TableHead>
                        <TableHead className="text-center">{t("sim_round")}</TableHead>
                        <TableHead className="text-center">{t("sim_analytics_avg")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyticsData.studentSummaries.map((s) => (
                        <TableRow key={s.name}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-center">{s.roundCount}</TableCell>
                          <TableCell className="text-center font-bold">{s.avg}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Detailed per-round */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("sim_analytics_responses")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {analyticsData.roundAnalytics.map((ra) => (
                      <AccordionItem key={ra.round.id} value={ra.round.id}>
                        <AccordionTrigger className="text-sm">
                          <div className="flex items-center gap-3">
                            <span>{t("sim_round")} {ra.round.round_number} — {t("sim_cycle")} {ra.round.cycle}</span>
                            <Badge variant="outline" className="text-xs">
                              <Stethoscope className="h-3 w-3 mr-1" />{ra.professionalName}
                            </Badge>
                            <span className="font-bold">{ra.totalScore.toFixed(1)}/10</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          {/* Participants */}
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="flex items-center gap-1">
                              <Stethoscope className="h-4 w-4 text-blue-600" />
                              <span>{ra.professionalName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-green-600" />
                              <span>{ra.patientName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4 text-yellow-600" />
                              <span>{ra.observerName}</span>
                            </div>
                          </div>

                          {/* Scores */}
                          <div className="grid grid-cols-3 gap-2">
                            <Card className="p-3">
                              <p className="text-xs text-muted-foreground">{t("sim_form_professor_eval")}</p>
                              <p className="text-lg font-bold">{ra.profScore.toFixed(1)}/10</p>
                            </Card>
                            <Card className="p-3">
                              <p className="text-xs text-muted-foreground">{t("sim_form_observer_eval")}</p>
                              <p className="text-lg font-bold">{ra.obsScore.toFixed(1)}/10</p>
                            </Card>
                            <Card className="p-3">
                              <p className="text-xs text-muted-foreground">{t("sim_score_average_label")}</p>
                              <p className="text-lg font-bold text-primary">{ra.totalScore.toFixed(1)}/10</p>
                            </Card>
                          </div>

                          {/* Anamnesis response */}
                          {ra.anamnesisResponse && (
                            <div className="border rounded-lg p-3">
                              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                                <FileText className="h-4 w-4" /> {t("sim_form_anamnesis")}
                              </p>
                              {renderFormResponseReadOnly(ra.anamnesisResponse, forms.find((f: any) => f.form_type === "anamnesis"))}
                            </div>
                          )}

                          {/* Professor evaluation */}
                          {ra.profResponse && (
                            <div className="border rounded-lg p-3">
                              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                                <GraduationCap className="h-4 w-4" /> {t("sim_form_professor_eval")}
                              </p>
                              {renderFormResponseReadOnly(ra.profResponse, forms.find((f: any) => f.form_type === "professor_eval"))}
                            </div>
                          )}

                          {/* Observer evaluation */}
                          {ra.obsResponse && (
                            <div className="border rounded-lg p-3">
                              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                                <Eye className="h-4 w-4" /> {t("sim_form_observer_eval")}
                              </p>
                              {renderFormResponseReadOnly(ra.obsResponse, forms.find((f: any) => f.form_type === "observer_eval"))}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{t("sim_analytics_no_data")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
