import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, ClipboardCheck, BookOpen, BarChart3, Mic, MicOff, LogIn } from "lucide-react";
import { toast } from "sonner";
import { OsceTimer } from "@/components/osce/OsceTimer";
import { OsceEvaluatorChecklist } from "@/components/osce/OsceEvaluatorChecklist";

export default function OsceEvaluator() {
  const { accessCode } = useParams<{ accessCode: string }>();
  const queryClient = useQueryClient();
  const [authenticated, setAuthenticated] = useState(false);
  const [evaluatorName, setEvaluatorName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [observations, setObservations] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState("checklist");
  const [scoreInfo, setScoreInfo] = useState({ total: 0, max: 0, passed: true });

  // Fetch circuit by access code
  const { data: circuit } = useQuery({
    queryKey: ["osce-circuit-eval", accessCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_circuits")
        .select("*, osce_exams(*)")
        .eq("access_code", accessCode!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!accessCode && authenticated,
  });

  // Fetch stations for this exam
  const { data: stations } = useQuery({
    queryKey: ["osce-stations-eval", circuit?.osce_exam_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_stations")
        .select("*")
        .eq("osce_exam_id", circuit!.osce_exam_id)
        .eq("is_rest_station", false)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!circuit?.osce_exam_id,
  });

  // Fetch checklist items for selected station
  const { data: checklistItems } = useQuery({
    queryKey: ["osce-checklist-eval", selectedStation],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_checklist_items")
        .select("*")
        .eq("station_id", selectedStation!)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStation,
  });

  // Selected station data
  const currentStation = stations?.find((s: any) => s.id === selectedStation);

  // Realtime subscription for circuit updates (timer sync)
  useEffect(() => {
    if (!circuit?.id) return;
    const channel = supabase
      .channel(`circuit-${circuit.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "osce_circuits", filter: `id=eq.${circuit.id}` }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["osce-circuit-eval", accessCode] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [circuit?.id]);

  const createEvaluation = useMutation({
    mutationFn: async () => {
      if (!circuit || !selectedStation || !studentName.trim()) throw new Error("Dados incompletos");
      const { data, error } = await supabase
        .from("osce_evaluations")
        .insert([{
          circuit_id: circuit.id,
          station_id: selectedStation,
          student_name: studentName.trim(),
          rotation: circuit.current_rotation || 0,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setEvaluationId(data.id);
      toast.success("Avaliação iniciada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveObservations = useMutation({
    mutationFn: async () => {
      if (!evaluationId) return;
      await supabase.from("osce_evaluations").update({
        observations,
        total_score: scoreInfo.total,
        max_score: scoreInfo.max,
        passed: scoreInfo.passed,
        finished_at: new Date().toISOString(),
      }).eq("id", evaluationId);
    },
    onSuccess: () => toast.success("Avaliação finalizada!"),
  });

  // Voice-to-text
  const toggleVoice = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Navegador não suporta ditado por voz");
      return;
    }
    if (isRecording) {
      setIsRecording(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setObservations((prev) => prev + " " + transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    setIsRecording(true);
  };

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Stethoscope className="h-10 w-10 mx-auto text-primary mb-2" />
            <CardTitle>Portal do Avaliador OSCE</CardTitle>
            <p className="text-sm text-muted-foreground">Código: {accessCode}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Seu Nome</Label>
              <Input value={evaluatorName} onChange={(e) => setEvaluatorName(e.target.value)} placeholder="Nome do avaliador" className="h-12 text-lg" />
            </div>
            <Button className="w-full h-12 text-lg gap-2" onClick={() => { if (evaluatorName.trim()) setAuthenticated(true); else toast.error("Informe seu nome"); }}>
              <LogIn className="h-5 w-5" /> Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Station selection
  if (!selectedStation || !evaluationId) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-bold">Avaliador: {evaluatorName}</h1>
            <p className="text-muted-foreground text-sm">{(circuit as any)?.osce_exams?.title || "Exame OSCE"}</p>
          </div>

          {!selectedStation ? (
            <>
              <h2 className="font-semibold">Selecione a Estação</h2>
              <div className="grid gap-3">
                {stations?.map((s: any) => (
                  <Button key={s.id} variant="outline" className="h-16 text-lg justify-start gap-3" onClick={() => setSelectedStation(s.id)}>
                    <Badge variant="secondary">{s.position}</Badge>
                    {s.title}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <Card className="p-6 space-y-4">
              <h2 className="font-semibold">Nome do Aluno</h2>
              <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Nome completo do aluno" className="h-12 text-lg" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedStation(null)}>Voltar</Button>
                <Button className="flex-1 h-12 text-lg" onClick={() => createEvaluation.mutate()} disabled={!studentName.trim()}>
                  Iniciar Avaliação
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  const examData = circuit as any;
  const durationMin = currentStation?.duration_minutes || examData?.osce_exams?.station_duration_minutes || 5;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed timer header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b p-3">
        <div className="max-w-2xl mx-auto">
          <OsceTimer
            durationMinutes={durationMin}
            isRunning={circuit?.status === "running"}
            startedAt={circuit?.started_at}
          />
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="font-medium">{currentStation?.title}</span>
            <span className="text-muted-foreground">Aluno: {studentName}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 h-12">
            <TabsTrigger value="checklist" className="text-sm gap-1"><ClipboardCheck className="h-4 w-4" /> Checklist</TabsTrigger>
            <TabsTrigger value="case" className="text-sm gap-1"><BookOpen className="h-4 w-4" /> Caso</TabsTrigger>
            <TabsTrigger value="general" className="text-sm gap-1"><BarChart3 className="h-4 w-4" /> Geral</TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="mt-4">
            {checklistItems && (
              <OsceEvaluatorChecklist
                checklistItems={checklistItems}
                evaluationId={evaluationId}
                onScoreChange={(total, max, passed) => setScoreInfo({ total, max, passed })}
              />
            )}
          </TabsContent>

          <TabsContent value="case" className="mt-4 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Instruções do Estudante</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{currentStation?.student_instructions || "Sem instruções"}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Caso Clínico</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{currentStation?.case_summary || "Sem resumo"}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Roteiro do Paciente</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{currentStation?.patient_script || "Sem roteiro"}</p></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="mt-4 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Pontuação</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-center">
                  {scoreInfo.total.toFixed(1)} / {scoreInfo.max.toFixed(1)}
                </div>
                <div className="text-center mt-2">
                  <Badge variant={scoreInfo.passed ? "default" : "destructive"}>
                    {scoreInfo.passed ? "Aprovado" : "Reprovado (item crítico)"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Observações</CardTitle>
                  <Button size="sm" variant={isRecording ? "destructive" : "outline"} onClick={toggleVoice} className="gap-1">
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {isRecording ? "Parar" : "Ditar"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Feedback qualitativo sobre o aluno..."
                  rows={5}
                  className="text-base"
                />
              </CardContent>
            </Card>

            <Button className="w-full h-14 text-lg" onClick={() => saveObservations.mutate()}>
              Finalizar Avaliação
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
