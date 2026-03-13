import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Play, Pause, SkipForward, Copy, Users } from "lucide-react";
import { toast } from "sonner";
import { OsceTimer } from "@/components/osce/OsceTimer";
import { OsceCircuitGrid } from "@/components/osce/OsceCircuitGrid";

export default function OsceCircuitControl() {
  const { circuitId } = useParams<{ circuitId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const startExam = () => {
    updateCircuit.mutate({ status: "running", started_at: new Date().toISOString(), current_rotation: 1 });
    toast.success("Exame iniciado!");
  };

  const pauseExam = () => {
    updateCircuit.mutate({ status: "paused" });
    toast.info("Exame pausado");
  };

  const nextRotation = () => {
    const next = (circuit?.current_rotation || 0) + 1;
    updateCircuit.mutate({ current_rotation: next, started_at: new Date().toISOString() });
    toast.success(`Rotação ${next} iniciada`);
  };

  const completeExam = () => {
    updateCircuit.mutate({ status: "completed" });
    toast.success("Exame concluído!");
  };

  const copyAccessLink = () => {
    const url = `${window.location.origin}/osce/evaluate/${circuit?.access_code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  if (!circuit) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  const examData = circuit as any;
  const durationMin = examData?.osce_exams?.station_duration_minutes || 5;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/osce")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Painel de Controle</h1>
          <p className="text-sm text-muted-foreground">{examData?.osce_exams?.title}</p>
        </div>
        <Badge variant={circuit.status === "running" ? "default" : circuit.status === "completed" ? "outline" : "secondary"}>
          {circuit.status === "running" ? "Em andamento" : circuit.status === "completed" ? "Concluído" : circuit.status === "paused" ? "Pausado" : "Pendente"}
        </Badge>
      </div>

      {/* Timer + Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <OsceTimer
          durationMinutes={durationMin}
          isRunning={circuit.status === "running"}
          startedAt={circuit.started_at}
          onTimeUp={() => toast.info("Tempo da estação esgotado!")}
        />

        <Card>
          <CardHeader><CardTitle className="text-base">Controles</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Rotação atual:</span>
              <Badge variant="outline" className="text-lg px-3">{circuit.current_rotation || 0}</Badge>
            </div>

            <div className="flex gap-2 flex-wrap">
              {circuit.status !== "running" && circuit.status !== "completed" && (
                <Button onClick={startExam} className="gap-2 flex-1"><Play className="h-4 w-4" /> Iniciar</Button>
              )}
              {circuit.status === "running" && (
                <>
                  <Button variant="outline" onClick={pauseExam} className="gap-2"><Pause className="h-4 w-4" /> Pausar</Button>
                  <Button onClick={nextRotation} className="gap-2 flex-1"><SkipForward className="h-4 w-4" /> Próxima Rotação</Button>
                </>
              )}
              {circuit.status === "paused" && (
                <Button onClick={() => updateCircuit.mutate({ status: "running", started_at: new Date().toISOString() })} className="gap-2 flex-1">
                  <Play className="h-4 w-4" /> Retomar
                </Button>
              )}
              {(circuit.status === "running" || circuit.status === "paused") && (
                <Button variant="destructive" onClick={completeExam}>Encerrar</Button>
              )}
            </div>

            <Button variant="outline" onClick={copyAccessLink} className="w-full gap-2">
              <Copy className="h-4 w-4" /> Copiar Link do Avaliador
            </Button>
            <p className="text-xs text-muted-foreground text-center">Código: <strong>{circuit.access_code}</strong></p>
          </CardContent>
        </Card>
      </div>

      {/* Grid */}
      <OsceCircuitGrid stations={stations || []} evaluations={evaluations || []} currentRotation={circuit.current_rotation || 0} />
    </div>
  );
}
