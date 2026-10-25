import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ArrowLeft, Play, Pause, Copy, Users, Globe, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { OsceCircuitGrid } from "@/components/osce/OsceCircuitGrid";
import { OsceChatMonitor } from "@/components/osce/OsceChatMonitor";

export default function OsceCircuitControl() {
  const { circuitId } = useParams<{ circuitId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCycleBanner, setShowCycleBanner] = useState(false);

  const { data: circuit } = useQuery({
    queryKey: ["osce-circuit", circuitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_circuits")
        .select("*, osce_exams(*)")
        .eq("id", circuitId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!circuitId,
  });

  const { data: stations } = useQuery({
    queryKey: ["osce-stations-circuit", circuit?.osce_exam_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_stations")
        .select("*")
        .eq("osce_exam_id", circuit!.osce_exam_id)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!circuit?.osce_exam_id,
  });

  const { data: evaluations } = useQuery({
    queryKey: ["osce-evaluations-circuit", circuitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_evaluations")
        .select("*")
        .eq("circuit_id", circuitId!)
        .order("rotation");
      if (error) throw error;
      return data;
    },
    enabled: !!circuitId,
  });

  const { data: circuitStudents } = useQuery({
    queryKey: ["osce-circuit-students", circuitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_circuit_students")
        .select("*")
        .eq("circuit_id", circuitId!)
        .order("student_name");
      if (error) throw error;
      return data;
    },
    enabled: !!circuitId,
  });

  // Realtime
  useEffect(() => {
    if (!circuitId) return;
    const ch1 = supabase.channel(`ctrl-circuit-${circuitId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "osce_circuits", filter: `id=eq.${circuitId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["osce-circuit", circuitId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "osce_evaluations", filter: `circuit_id=eq.${circuitId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["osce-evaluations-circuit", circuitId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "osce_circuit_students", filter: `circuit_id=eq.${circuitId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["osce-circuit-students", circuitId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch1); };
  }, [circuitId]);

  const updateCircuit = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from("osce_circuits").update(updates).eq("id", circuitId!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["osce-circuit", circuitId] }),
  });

  // Initial assignment: shuffle students, assign first N to N stations
  const startExam = async () => {
    if (!circuitStudents || !stations) return;
    const clinicalStations = stations.filter(s => !s.is_rest_station);
    const numStations = clinicalStations.length;
    if (numStations === 0) { toast.error("Nenhuma estação clínica"); return; }

    const waitingStudents = circuitStudents.filter(s => s.status === "waiting");
    const shuffled = [...waitingStudents].sort(() => Math.random() - 0.5);
    const toAssign = shuffled.slice(0, numStations);
    const now = new Date().toISOString();

    for (let i = 0; i < toAssign.length; i++) {
      await supabase.from("osce_circuit_students").update({
        current_station_id: clinicalStations[i].id,
        current_rotation: 1,
        status: "in_station",
        station_entered_at: now,
        visited_stations: [],
      }).eq("id", toAssign[i].id);
    }

    await updateCircuit.mutateAsync({ status: "running", started_at: now, current_rotation: 1 });
    toast.success("Exame iniciado! Alunos sorteados para as estações.");
    setShowCycleBanner(true);
    setTimeout(() => setShowCycleBanner(false), 5000);
  };

  const pauseExam = () => {
    updateCircuit.mutate({ status: "paused" });
    toast.info("Exame pausado");
  };

  const completeExam = async () => {
    if (circuitStudents) {
      for (const s of circuitStudents.filter(s => s.status !== "completed")) {
        await supabase.from("osce_circuit_students").update({ status: "completed", current_station_id: null }).eq("id", s.id);
      }
    }
    updateCircuit.mutate({ status: "completed" });
    toast.success("Exame concluído!");
  };

  const copyAccessLink = () => {
    const url = `${window.location.origin}/osce/evaluate/${circuit?.access_code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link do avaliador copiado!");
  };

  const copyStudentLink = () => {
    const url = `${window.location.origin}/osce/student/${circuit?.access_code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link do aluno copiado!");
  };

  if (!circuit) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  const examData = circuit as any;
  const durationMin = examData?.osce_exams?.station_duration_minutes || 5;
  const isOnline = examData?.osce_exams?.is_online || false;
  const waitingCount = circuitStudents?.filter(s => s.status === "waiting").length || 0;
  const activeCount = circuitStudents?.filter(s => s.status === "in_station").length || 0;
  const completedCount = circuitStudents?.filter(s => s.status === "completed").length || 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Cycle banner */}
      {showCycleBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground py-4 text-center animate-pulse">
          <div className="text-xl font-bold flex items-center justify-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            EXAME INICIADO
          </div>
          <p className="text-sm opacity-80">Alunos foram distribuídos para as estações</p>
        </div>
      )}

      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate("/osce")}>
          <ArrowLeft className="h-4 w-4" />Avaliações OSCE
        </Button>
        <PageHeader
          eyebrow="OSCE · Painel do circuito"
          title={examData?.osce_exams?.title || "Painel de controle"}
          description={
            <span className="flex flex-wrap items-center gap-3">
              <StatusBadge tone={circuit.status === "running" ? "info" : circuit.status === "completed" ? "ok" : "warn"} dot={circuit.status !== "completed"}>
                {circuit.status === "running" ? "Em andamento" : circuit.status === "completed" ? "Concluído" : circuit.status === "paused" ? "Pausado" : "Pendente"}
              </StatusBadge>
              {isOnline && <StatusBadge tone="neutral"><Globe className="h-3 w-3" />Online</StatusBadge>}
              <span>Código <b className="font-mono font-medium text-foreground">{circuit.access_code}</b></span>
            </span>
          }
          actions={
            <>
              {circuit.status !== "running" && circuit.status !== "completed" && (
                <Button onClick={startExam}><Play className="h-4 w-4" />Iniciar</Button>
              )}
              {circuit.status === "running" && (
                <Button variant="outline" onClick={pauseExam}><Pause className="h-4 w-4" />Pausar</Button>
              )}
              {circuit.status === "paused" && (
                <Button onClick={() => updateCircuit.mutate({ status: "running", started_at: new Date().toISOString() })}>
                  <Play className="h-4 w-4" />Retomar
                </Button>
              )}
              {(circuit.status === "running" || circuit.status === "paused") && (
                <Button variant="destructive" onClick={completeExam}>Encerrar</Button>
              )}
            </>
          }
        />
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <div className="label-mono">Total</div>
          <div className="mt-3 font-heading text-4xl font-medium tabular-nums">{circuitStudents?.length || 0}</div>
          <div className="mt-1 text-xs text-muted-foreground">alunos</div>
        </Card>
        <Card className="p-5">
          <div className="label-mono">Aguardando</div>
          <div className="mt-3 font-heading text-4xl font-medium tabular-nums text-warning-ink">{waitingCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">na fila</div>
        </Card>
        <Card className="p-5">
          <div className="label-mono">Nas estações</div>
          <div className="mt-3 font-heading text-4xl font-medium tabular-nums">{activeCount}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            {activeCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-success" />}em atendimento
          </div>
        </Card>
        <Card className="p-5">
          <div className="label-mono">Concluídos</div>
          <div className="mt-3 font-heading text-4xl font-medium tabular-nums text-success">{completedCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">terminaram o circuito</div>
        </Card>
      </div>

      {/* Links */}
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="label-mono mr-auto">Links de acesso</span>
        <Button variant="outline" size="sm" onClick={copyAccessLink}>
          <Copy className="h-4 w-4" />Copiar link do avaliador
        </Button>
        {isOnline && (
          <Button variant="outline" size="sm" onClick={copyStudentLink}>
            <Globe className="h-4 w-4" />Copiar link do aluno
          </Button>
        )}
      </Card>

      {/* Grid */}
      <OsceCircuitGrid
        stations={stations || []}
        evaluations={evaluations || []}
        currentRotation={circuit.current_rotation || 0}
        circuitStudents={circuitStudents || []}
        circuitId={circuitId}
        durationMinutes={durationMin}
        isRunning={circuit.status === "running"}
      />

      {/* Online monitoring */}
      {isOnline && circuitStudents && (
        <OsceChatMonitor
          circuitId={circuitId!}
          stations={stations || []}
          circuitStudents={circuitStudents}
        />
      )}
    </div>
  );
}
