import { useState, useEffect, useRef } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Stethoscope, ClipboardCheck, BookOpen, BarChart3, Eye, Mic, MicOff, Phone, LogIn, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { OsceTimer } from "@/components/osce/OsceTimer";
import { OsceEvaluatorChecklist } from "@/components/osce/OsceEvaluatorChecklist";
import { OsceMaterialViewer } from "@/components/osce/OsceMaterialViewer";
import { useOsceAudio } from "@/hooks/use-osce-audio";

export default function OsceEvaluator() {
  const { accessCode } = useParams<{ accessCode: string }>();
  const queryClient = useQueryClient();
  const [authenticated, setAuthenticated] = useState(false);
  const [evaluatorName, setEvaluatorName] = useState("");
  const [evaluatorEmail, setEvaluatorEmail] = useState("");
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [observations, setObservations] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState("checklist");
  const [scoreInfo, setScoreInfo] = useState({ total: 0, max: 0, passed: true });
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string; created_at: string }[]>([]);
  const [studentTimeUp, setStudentTimeUp] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch circuit by access code
  const { data: circuit, isLoading: circuitLoading } = useQuery({
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

  // Fetch evaluator's assigned station
  const { data: assignedEvaluator, isLoading: assignmentLoading } = useQuery({
    queryKey: ["osce-evaluator-assignment", circuit?.osce_exam_id, evaluatorEmail],
    queryFn: async () => {
      const { data: stationData, error: stError } = await supabase
        .from("osce_stations")
        .select("id")
        .eq("osce_exam_id", circuit!.osce_exam_id);
      if (stError) throw stError;
      const stationIds = stationData.map(s => s.id);
      if (stationIds.length === 0) return null;

      const { data, error } = await supabase
        .from("osce_station_evaluators")
        .select("*")
        .in("station_id", stationIds)
        .ilike("evaluator_email", evaluatorEmail.trim());
      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!circuit?.osce_exam_id && !!evaluatorEmail && authenticated,
  });

  const selectedStationId = assignedEvaluator?.station_id || null;

  // Fetch station details
  const { data: currentStation } = useQuery({
    queryKey: ["osce-station-eval", selectedStationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_stations")
        .select("*")
        .eq("id", selectedStationId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStationId,
  });

  // Fetch current student assigned to this station in this rotation
  const { data: currentStudent } = useQuery({
    queryKey: ["osce-current-student", circuit?.id, selectedStationId, circuit?.current_rotation],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_circuit_students")
        .select("*")
        .eq("circuit_id", circuit!.id)
        .eq("current_station_id", selectedStationId!)
        .eq("status", "in_station")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!circuit?.id && !!selectedStationId,
    refetchInterval: 3000,
  });

  // Fetch checklist items for assigned station
  const { data: checklistItems } = useQuery({
    queryKey: ["osce-checklist-eval", selectedStationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_checklist_items")
        .select("*")
        .eq("station_id", selectedStationId!)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStationId,
  });

  // Fetch materials for current station
  const { data: stationMaterials } = useQuery({
    queryKey: ["osce-eval-materials", selectedStationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_station_materials")
        .select("*")
        .eq("station_id", selectedStationId!)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStationId,
  });

  // Audio hook
  const audioEnabled = !!evaluationId && !!circuit?.id && !!selectedStationId;
  const { isMuted, isConnected, hasRemoteAudio, toggleMute, audioDevices, selectedDeviceId, switchMicrophone } = useOsceAudio({
    circuitId: circuit?.id,
    stationId: selectedStationId ?? undefined,
    role: "evaluator",
    enabled: audioEnabled,
  });

  // Fetch existing chat messages for current student
  useEffect(() => {
    if (!circuit?.id || !selectedStationId || !currentStudent?.id) {
      setChatMessages([]);
      return;
    }
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("osce_chat_messages" as any)
        .select("*")
        .eq("circuit_id", circuit.id)
        .eq("station_id", selectedStationId)
        .eq("student_id", currentStudent.id)
        .order("created_at", { ascending: true });
      if (data) setChatMessages(data as any[]);
    };
    fetchMessages();
  }, [circuit?.id, selectedStationId, currentStudent?.id]);

  // Realtime subscription for circuit updates + chat messages
  useEffect(() => {
    if (!circuit?.id) return;
    const channel = supabase
      .channel(`eval-circuit-${circuit.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "osce_circuits", filter: `id=eq.${circuit.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["osce-circuit-eval", accessCode] });
        queryClient.invalidateQueries({ queryKey: ["osce-current-student"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "osce_circuit_students", filter: `circuit_id=eq.${circuit.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["osce-current-student"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "osce_chat_messages", filter: `circuit_id=eq.${circuit.id}` }, (payload: any) => {
        const msg = payload.new;
        if (msg.station_id === selectedStationId && msg.student_id === currentStudent?.id) {
          setChatMessages(prev => [...prev, { role: msg.role, content: msg.content, created_at: msg.created_at }]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [circuit?.id, selectedStationId, currentStudent?.id]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Handle time up — student is expelled but evaluator stays
  const handleTimeUp = () => {
    setStudentTimeUp(true);
    toast.info("Tempo esgotado! O aluno foi desconectado. Finalize a avaliação.");
  };

  // Reset studentTimeUp when student changes
  useEffect(() => {
    setStudentTimeUp(false);
  }, [currentStudent?.id]);

  // Auto-create evaluation when student appears
  const createEvaluation = useMutation({
    mutationFn: async () => {
      if (!circuit || !selectedStationId || !currentStudent) throw new Error("Dados incompletos");
      const { data, error } = await supabase
        .from("osce_evaluations")
        .insert([{
          circuit_id: circuit.id,
          station_id: selectedStationId,
          student_name: currentStudent.student_name,
          student_email: currentStudent.student_email,
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

  // Finalize evaluation and move to next student
  const saveObservations = useMutation({
    mutationFn: async () => {
      if (!evaluationId) return;
      // Save evaluation
      await supabase.from("osce_evaluations").update({
        observations,
        total_score: scoreInfo.total,
        max_score: scoreInfo.max,
        passed: scoreInfo.passed,
        finished_at: new Date().toISOString(),
      }).eq("id", evaluationId);

      // Move current student out — mark as waiting for next rotation or completed
      if (currentStudent && circuit) {
        // Get all clinical stations to determine if student completed all
        const { data: allStations } = await supabase
          .from("osce_stations")
          .select("id")
          .eq("osce_exam_id", circuit.osce_exam_id)
          .eq("is_rest_station", false);
        
        const numStations = allStations?.length || 1;
        const studentRotation = currentStudent.current_rotation || 0;

        if (studentRotation >= numStations) {
          // Student completed all stations
          await supabase.from("osce_circuit_students").update({
            status: "completed",
            current_station_id: null,
          }).eq("id", currentStudent.id);
        } else {
          // Student goes to waiting for next rotation
          await supabase.from("osce_circuit_students").update({
            status: "waiting",
            current_station_id: null,
          }).eq("id", currentStudent.id);
        }

        // Try to assign next waiting student to this station
        const { data: waitingStudents } = await supabase
          .from("osce_circuit_students")
          .select("*")
          .eq("circuit_id", circuit.id)
          .eq("status", "waiting")
          .order("created_at")
          .limit(1);
        
        if (waitingStudents && waitingStudents.length > 0) {
          const nextStudent = waitingStudents[0];
          await supabase.from("osce_circuit_students").update({
            current_station_id: selectedStationId,
            current_rotation: (nextStudent.current_rotation || 0) + 1,
            status: "in_station",
          }).eq("id", nextStudent.id);
        }
      }
    },
    onSuccess: () => {
      toast.success("Avaliação finalizada! Aguardando próximo aluno.");
      setEvaluationId(null);
      setObservations("");
      setScoreInfo({ total: 0, max: 0, passed: true });
      setStudentTimeUp(false);
      setChatMessages([]);
      queryClient.invalidateQueries({ queryKey: ["osce-current-student"] });
    },
  });

  // Voice-to-text
  const toggleVoice = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Navegador não suporta ditado por voz");
      return;
    }
    if (isRecording) { setIsRecording(false); return; }
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
      setObservations(prev => prev + " " + transcript);
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
              <Input value={evaluatorName} onChange={e => setEvaluatorName(e.target.value)} placeholder="Nome do avaliador" className="h-12 text-lg" />
            </div>
            <div>
              <Label>Seu Email</Label>
              <Input value={evaluatorEmail} onChange={e => setEvaluatorEmail(e.target.value)} placeholder="email@instituicao.edu" type="email" className="h-12 text-lg" />
            </div>
            <Button className="w-full h-12 text-lg gap-2" onClick={() => {
              if (!evaluatorName.trim() || !evaluatorEmail.trim()) { toast.error("Informe nome e email"); return; }
              setAuthenticated(true);
            }}>
              <LogIn className="h-5 w-5" /> Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading
  if (circuitLoading || assignmentLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Conectando ao exame...</p>
        </div>
      </div>
    );
  }

  if (!circuit) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <Stethoscope className="h-10 w-10 mx-auto text-destructive mb-4" />
          <h2 className="text-lg font-bold mb-2">Circuito Não Encontrado</h2>
          <p className="text-muted-foreground text-sm">
            O código <strong>{accessCode}</strong> não corresponde a nenhum circuito OSCE ativo.
          </p>
        </Card>
      </div>
    );
  }

  if (!assignedEvaluator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <Stethoscope className="h-10 w-10 mx-auto text-destructive mb-4" />
          <h2 className="text-lg font-bold mb-2">Sem Estação Atribuída</h2>
          <p className="text-muted-foreground text-sm">
            O email <strong>{evaluatorEmail}</strong> não está vinculado a nenhuma estação neste circuito.
            Entre em contato com o administrador.
          </p>
        </Card>
      </div>
    );
  }

  // Waiting for student
  if (!currentStudent && !evaluationId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Estação: {currentStation?.title}</h2>
            <p className="text-muted-foreground">Avaliador: {evaluatorName}</p>
            <div className="py-6">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-3">Aguardando aluno nesta estação...</p>
            </div>
            <Badge variant="outline">Rotação: {circuit.current_rotation || 0}</Badge>
          </div>
        </Card>
      </div>
    );
  }

  // Student arrived but no evaluation yet — show start button
  if (currentStudent && !evaluationId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 space-y-4 text-center">
          <h2 className="text-lg font-bold">Estação: {currentStation?.title}</h2>
          <div className="bg-primary/5 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Aluno na estação:</p>
            <p className="text-xl font-bold mt-1">{currentStudent.student_name}</p>
          </div>
          <Button className="w-full h-12 text-lg" onClick={() => createEvaluation.mutate()}>
            Iniciar Avaliação
          </Button>
        </Card>
      </div>
    );
  }

  const examData = circuit as any;
  const studentName = currentStudent?.student_name || "";
  const durationMin = currentStation?.duration_minutes || examData?.osce_exams?.station_duration_minutes || 5;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Time up banner for evaluator */}
      {studentTimeUp && (
        <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-2 text-center">
          <p className="text-sm font-medium text-destructive">
            ⏰ Tempo esgotado — O aluno foi desconectado. Finalize a avaliação para chamar o próximo aluno.
          </p>
        </div>
      )}

      {/* Fixed timer header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b p-3">
        <div className="max-w-2xl mx-auto">
          <OsceTimer
            durationMinutes={durationMin}
            isRunning={circuit?.status === "running"}
            startedAt={circuit?.started_at}
            onTimeUp={handleTimeUp}
          />
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="font-medium">{currentStation?.title}</span>
            <div className="flex items-center gap-2">
              {/* Audio controls */}
              <Button
                size="sm"
                variant={isMuted ? "destructive" : "outline"}
                onClick={toggleMute}
                className="gap-1 h-7 px-2"
              >
                {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                {isConnected && <Phone className="h-3 w-3 text-green-500" />}
              </Button>
              <span className="text-muted-foreground">
                Aluno: {studentName} {studentTimeUp && "(desconectado)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 h-12">
            <TabsTrigger value="checklist" className="text-sm gap-1"><ClipboardCheck className="h-4 w-4" /> Checklist</TabsTrigger>
            <TabsTrigger value="student" className="text-sm gap-1"><Eye className="h-4 w-4" /> Aluno</TabsTrigger>
            <TabsTrigger value="case" className="text-sm gap-1"><BookOpen className="h-4 w-4" /> Caso</TabsTrigger>
            <TabsTrigger value="general" className="text-sm gap-1"><BarChart3 className="h-4 w-4" /> Geral</TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="mt-4">
            {checklistItems && evaluationId && (
              <OsceEvaluatorChecklist
                checklistItems={checklistItems}
                evaluationId={evaluationId}
                onScoreChange={(total, max, passed) => setScoreInfo({ total, max, passed })}
              />
            )}
          </TabsContent>

          <TabsContent value="student" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Chat do Aluno em Tempo Real
                  {hasRemoteAudio && (
                    <Badge variant="outline" className="gap-1 ml-auto">
                      <Phone className="h-3 w-3 text-green-500" /> Áudio conectado
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {chatMessages.length === 0 && (
                      <p className="text-center text-muted-foreground text-sm py-8">
                        Nenhuma mensagem ainda. O chat aparecerá aqui quando o aluno iniciar a conversa.
                      </p>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}>
                          <p className="text-[10px] opacity-70 mb-1">{msg.role === "user" ? "Aluno" : "Paciente"}</p>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            {stationMaterials && stationMaterials.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Materiais da Estação</CardTitle></CardHeader>
                <CardContent>
                  <OsceMaterialViewer materials={stationMaterials} />
                </CardContent>
              </Card>
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
                  onChange={e => setObservations(e.target.value)}
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
