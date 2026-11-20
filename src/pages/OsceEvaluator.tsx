import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsListLine, TabsTriggerLine } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  const [initialItens, setInitialItens] = useState<{ checklist_item_id: string; value: number; notes: string }[] | undefined>(undefined);
  const [studentTimeUp, setStudentTimeUp] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Tudo vem da função osce-avaliador, consultada a cada 3 s no lugar do realtime: circuito, estação do avaliador
  // (caso e roteiro, que só ele vê), checklist, materiais, aluno atual, chat dele e a avaliação em andamento.
  const chamar = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("osce-avaliador", {
      body: { access_code: accessCode, email: evaluatorEmail.trim(), ...body },
    });
    if (error || data?.error) throw new Error(data?.error || error?.message || "erro");
    return data as any;
  };
  const { data: estado, isLoading } = useQuery({
    queryKey: ["osce-avaliador", accessCode, evaluatorEmail.trim().toLowerCase()],
    queryFn: () => chamar({ action: "estado" }),
    enabled: !!accessCode && authenticated && !!evaluatorEmail.trim(),
    refetchInterval: 3000,
  });
  const circuitLoading = isLoading;
  const assignmentLoading = false;
  // "circuito" = código inexistente; "avaliador" = o circuito existe, mas o e-mail não é de avaliador dele
  const circuit: any = estado?.ok ? estado.circuito : estado?.motivo === "avaliador" ? {} : null;
  const assignedEvaluator = estado?.ok ? { station_id: estado.estacao?.id } : null;
  const selectedStationId: string | null = estado?.ok ? estado.estacao?.id || null : null;
  const currentStation: any = estado?.ok ? estado.estacao : null;
  const currentStudent: any = estado?.ok ? estado.aluno : null;
  const checklistItems: any[] | undefined = estado?.ok ? estado.checklist : undefined;
  const stationMaterials: any[] | undefined = estado?.ok ? estado.materiais : undefined;
  const chatMessages: { role: string; content: string; created_at: string }[] = estado?.ok ? estado.mensagens || [] : [];

  // Se a página foi recarregada no meio de uma avaliação, retoma a que já estava aberta no servidor
  useEffect(() => {
    if (estado?.ok && estado.avaliacao && !evaluationId) {
      setEvaluationId(estado.avaliacao.id);
      setObservations(estado.avaliacao.observations || "");
      setInitialItens(estado.itens || []);
    }
  }, [estado?.avaliacao?.id]);

  // Audio hook
  const audioEnabled = !!evaluationId && !!circuit?.id && !!selectedStationId;
  const { isMuted, isConnected, hasRemoteAudio, toggleMute, audioDevices, selectedDeviceId, switchMicrophone } = useOsceAudio({
    circuitId: circuit?.id,
    stationId: selectedStationId ?? undefined,
    role: "evaluator",
    enabled: audioEnabled,
  });

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

  // Inicia a avaliação do aluno que está na estação (a função devolve a mesma se já houver uma aberta)
  const createEvaluation = useMutation({
    mutationFn: async () => {
      if (!circuit || !selectedStationId || !currentStudent) throw new Error("Dados incompletos");
      return await chamar({ action: "iniciar" });
    },
    onSuccess: (data) => {
      setEvaluationId(data.avaliacao_id);
      setInitialItens(undefined);
      toast.success("Avaliação iniciada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Finaliza a avaliação: a nota e a rotação dos alunos são feitas no servidor
  const saveObservations = useMutation({
    mutationFn: async () => {
      if (!evaluationId) return;
      await chamar({ action: "finalizar", evaluation_id: evaluationId, observations });
    },
    onSuccess: () => {
      toast.success("Avaliação finalizada! Aguardando próximo aluno.");
      setEvaluationId(null);
      setObservations("");
      setScoreInfo({ total: 0, max: 0, passed: true });
      setStudentTimeUp(false);
      setInitialItens(undefined);
      queryClient.invalidateQueries({ queryKey: ["osce-avaliador"] });
    },
    onError: (e: any) => toast.error("Não foi possível finalizar: " + e.message),
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
            <Stethoscope className="h-10 w-10 mx-auto text-brand-text mb-2" />
            <div className="eyebrow">OSCE</div>
            <CardTitle className="font-heading text-2xl font-medium">Portal do Avaliador</CardTitle>
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
          <h2 className="font-heading text-xl font-medium mb-2">Circuito Não Encontrado</h2>
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
          <h2 className="font-heading text-xl font-medium mb-2">Sem Estação Atribuída</h2>
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
            <div className="eyebrow">Estação</div>
            <h2 className="font-heading text-xl font-medium">{currentStation?.title}</h2>
            <p className="text-muted-foreground">Avaliador: {evaluatorName}</p>
            <div className="py-6">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-3">Aguardando aluno nesta estação...</p>
            </div>
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
          <div className="eyebrow">Estação</div>
          <h2 className="font-heading text-xl font-medium">{currentStation?.title}</h2>
          <div className="bg-brand-soft rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Aluno na estação:</p>
            <p className="font-heading text-2xl font-medium mt-1">{currentStudent.student_name}</p>
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
  // Use per-student station_entered_at for timer
  const studentEnteredAt = (currentStudent as any)?.station_entered_at;

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
            isRunning={!!studentEnteredAt}
            startedAt={studentEnteredAt}
            onTimeUp={handleTimeUp}
          />
          <div className="flex items-center justify-between mt-2 text-sm">
            <div className="min-w-0">
              <div className="eyebrow">Estação · Avaliador</div>
              <span className="font-heading text-base font-medium">{currentStation?.title}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Audio controls */}
              {audioDevices.length > 1 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => switchMicrophone(e.target.value)}
                  className="h-7 text-xs rounded border border-border bg-background px-1 max-w-[140px]"
                >
                  {audioDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                  ))}
                </select>
              )}
              <Button
                size="sm"
                variant={isMuted ? "destructive" : "outline"}
                onClick={toggleMute}
                className="gap-1 h-7 px-2"
              >
                {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                {isConnected && <Phone className="h-3 w-3 text-success" />}
              </Button>
              <span className="text-muted-foreground">
                Aluno: <b className="text-foreground font-medium">{studentName}</b> {studentTimeUp && "(desconectado)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsListLine className="w-full grid grid-cols-4">
            <TabsTriggerLine value="checklist" className="text-sm gap-1"><ClipboardCheck className="h-4 w-4" /> Checklist</TabsTriggerLine>
            <TabsTriggerLine value="student" className="text-sm gap-1"><Eye className="h-4 w-4" /> Aluno</TabsTriggerLine>
            <TabsTriggerLine value="case" className="text-sm gap-1"><BookOpen className="h-4 w-4" /> Caso</TabsTriggerLine>
            <TabsTriggerLine value="general" className="text-sm gap-1"><BarChart3 className="h-4 w-4" /> Geral</TabsTriggerLine>
          </TabsListLine>

          <TabsContent value="checklist" className="mt-4">
            {checklistItems && evaluationId && (
              <OsceEvaluatorChecklist
                checklistItems={checklistItems}
                evaluationId={evaluationId}
                initialValues={initialItens}
                onSaveItem={async (itemId, value, notes) => { await chamar({ action: "item", evaluation_id: evaluationId, checklist_item_id: itemId, value, notes }); }}
                onScoreChange={(total, max, passed) => setScoreInfo({ total, max, passed })}
              />
            )}
          </TabsContent>

          <TabsContent value="student" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Chat do Aluno em Tempo Real
                  {hasRemoteAudio && (
                    <StatusBadge tone="ok" dot className="gap-1 ml-auto">Áudio conectado</StatusBadge>
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
                <CardHeader><CardTitle className="font-heading text-lg font-medium">Materiais da Estação</CardTitle></CardHeader>
                <CardContent>
                  <OsceMaterialViewer materials={stationMaterials} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="case" className="mt-4 space-y-4">
            <Card>
              <CardHeader><CardTitle className="font-heading text-lg font-medium">Instruções do Estudante</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{currentStation?.student_instructions || "Sem instruções"}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="font-heading text-lg font-medium">Caso Clínico</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{currentStation?.case_summary || "Sem resumo"}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="font-heading text-lg font-medium">Roteiro do Paciente</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{currentStation?.patient_script || "Sem roteiro"}</p></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="mt-4 space-y-4">
            <Card>
              <CardHeader><CardTitle className="font-heading text-lg font-medium">Pontuação</CardTitle></CardHeader>
              <CardContent>
                <div className="label-mono text-center">Nota parcial</div>
                <div className="font-heading text-5xl font-medium text-center mt-1">
                  {scoreInfo.total.toFixed(1)} <span className="text-muted-foreground text-3xl">/ {scoreInfo.max.toFixed(1)}</span>
                </div>
                <div className="text-center mt-3">
                  <StatusBadge tone={scoreInfo.passed ? "ok" : "bad"} dot>
                    {scoreInfo.passed ? "Aprovado" : "Reprovado (item crítico)"}
                  </StatusBadge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-lg font-medium">Observações</CardTitle>
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
