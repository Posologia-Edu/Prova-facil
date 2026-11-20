import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Gavel, FileText, ClipboardList, Users, Clock } from "lucide-react";
import FormRenderer from "@/components/forms/FormRenderer";
import type { FormField } from "@/components/forms/types";
import { LegalProcessRenderer } from "@/components/mock-trial/LegalProcessRenderer";

const PHASE_LABELS: Record<string, string> = {
  pending: "Aguardando início",
  announcement: "Anúncio do Caso",
  prosecution: "Fala da Acusação",
  defense: "Fala da Defesa",
  jury_questions: "Perguntas do Júri",
  deliberation: "Deliberação",
  verdict: "Veredito",
  finished: "Sessão Finalizada",
};

const ACTIVE_STATUSES = new Set([
  "announcement",
  "prosecution",
  "defense",
  "jury_questions",
  "deliberation",
  "verdict",
]);

function PhaseTimer({ session }: { session: any }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!session?.current_phase_started_at || !session?.phase_duration_seconds) {
      setTimeLeft(0);
      return;
    }
    if (session.is_paused) {
      setTimeLeft(session.paused_remaining_seconds ?? 0);
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    const tick = () => {
      const startedAt = new Date(session.current_phase_started_at).getTime();
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, session.phase_duration_seconds - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [session?.current_phase_started_at, session?.phase_duration_seconds, session?.is_paused, session?.paused_remaining_seconds]);

  if (!session?.phase_duration_seconds) return null;
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  return (
    <div className={`flex items-center gap-2 text-2xl font-mono font-bold ${timeLeft <= 60 ? "text-destructive animate-pulse" : "text-primary"}`}>
      <Clock className="h-5 w-5" />
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      {session?.is_paused && <span className="text-xs uppercase tracking-wider text-muted-foreground">(pausado)</span>}
    </div>
  );
}

export default function MockTrialStudent() {
  const { accessCode } = useParams<{ accessCode: string }>();
  const [studentEmail, setStudentEmail] = useState(() => sessionStorage.getItem("mt_email") || "");
  const [studentName, setStudentName] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const [trial, setTrial] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [myStudent, setMyStudent] = useState<any>(null);
  const [myGroup, setMyGroup] = useState<any>(null);
  const [groupMembers, setGroupMembers] = useState<{ email: string; name: string }[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  // Set of "sessionId:formId" pairs already submitted by this group
  const [submittedFormKeys, setSubmittedFormKeys] = useState<Set<string>>(new Set());

  // Auto-join from StudentAuth redirect
  useEffect(() => {
    const savedPin = sessionStorage.getItem("mt_pin");
    const savedEmail = sessionStorage.getItem("mt_email");
    if (savedPin && savedEmail && !authenticated) {
      sessionStorage.removeItem("mt_pin");
      setStudentEmail(savedEmail);
      setTimeout(() => authenticateWithEmail(savedEmail), 100);
    }
  }, []);

  const [pollKey, setPollKey] = useState("");
  const [caseImages, setCaseImages] = useState<any[]>([]);
  const prevStatusRef = useRef<Record<string, string>>({});

  // Aplica o que a função devolve. Na primeira vez escolhe o caso inicial; nas seguintes só atualiza os dados.
  const applyState = (d: any, first: boolean) => {
    setTrial(d.juri);
    setMyStudent({ student_name: d.participante.name, student_email: d.participante.email });
    setStudentName(d.participante.name);
    setMyGroup(d.grupo);
    setGroupMembers(d.integrantes || []);
    setCases(d.casos || []);
    setAssignments(d.atribuicoes || []);
    setSessions(d.sessoes || []);
    setForms(d.formularios || []);
    setCaseImages(d.imagens || []);
    setSubmittedFormKeys(new Set<string>(d.enviados || []));
    if (first) for (const s of d.sessoes || []) prevStatusRef.current[s.id] = s.status;
    if (first && d.casos?.length) setSelectedCaseId(d.casos[0].id);
  };

  const authenticateWithEmail = async (email: string) => {
    if (!email.trim()) {
      toast.error("Informe seu email");
      return;
    }
    const { data, error } = await supabase.functions.invoke("juri-aluno", {
      body: { action: "entrar", access_code: accessCode, email: email.trim() },
    });
    if (error || data?.error) { toast.error("Não foi possível entrar. Tente de novo."); return; }
    if (!data?.ok) {
      if (data?.motivo === "juri") toast.error("Júri não encontrado");
      else if (data?.motivo === "grupos") toast.error("Nenhum grupo encontrado");
      else toast.error("Email não encontrado neste júri simulado");
      return;
    }
    setStudentEmail(email.trim());
    setPollKey(email.trim());
    applyState(data, true);
    setAuthenticated(true);
  };

  const authenticate = async () => {
    await authenticateWithEmail(studentEmail);
  };

  // Acompanha a sessão (substitui o realtime): consulta a função a cada 4 segundos
  useEffect(() => {
    if (!authenticated || !pollKey) return;
    let ativo = true;
    const tick = async () => {
      if (document.hidden) return;
      const { data } = await supabase.functions.invoke("juri-aluno", {
        body: { action: "estado", access_code: accessCode, email: pollKey },
      });
      if (!ativo || !data?.ok) return;
      applyState(data, false);
      // Auto-advance: quando um caso passa a ficar ativo, vai para ele (só na transição, para não brigar com a escolha do aluno)
      for (const s of data.sessoes || []) {
        const antes = prevStatusRef.current[s.id];
        prevStatusRef.current[s.id] = s.status;
        if (antes !== undefined && !ACTIVE_STATUSES.has(antes) && ACTIVE_STATUSES.has(s.status)) setSelectedCaseId(s.case_id);
      }
    };
    const id = setInterval(tick, 4000);
    return () => { ativo = false; clearInterval(id); };
  }, [authenticated, pollKey, accessCode]);

  // Get my role for a specific case
  const getMyRole = (caseId: string) => {
    if (!myGroup) return null;
    const assignment = assignments.find(a => a.case_id === caseId && a.group_id === myGroup.id);
    return assignment?.role || null;
  };

  const roleLabels: Record<string, string> = { prosecution: "Acusação", defense: "Defesa", jury: "Júri" };

  const selectedCase = cases.find(c => c.id === selectedCaseId);
  const selectedSession = sessions.find(s => s.case_id === selectedCaseId);
  const myRole = getMyRole(selectedCaseId);
  const myForms = forms.filter(f => f.target_role === myRole);

  // Characters for my role in this case
  const myCharacters = selectedCase?.characters_json
    ? (selectedCase.characters_json as any[]).filter((ch: any) => ch.side === myRole)
    : [];

  const submitResponse = async (formId: string, answers: Record<string, any>): Promise<boolean> => {
    if (!selectedSession || !myGroup) return false;
    const key = `${selectedSession.id}:${formId}`;
    if (submittedFormKeys.has(key)) {
      toast.error("Este formulário já foi enviado pelo seu grupo");
      return false;
    }
    const { data, error } = await supabase.functions.invoke("juri-aluno", {
      body: { action: "enviar", access_code: accessCode, email: pollKey || studentEmail, form_id: formId, session_id: selectedSession.id, answers },
    });
    if (data?.ok === false && data?.motivo === "ja_enviado") {
      setSubmittedFormKeys(prev => new Set(prev).add(key));
      toast.error("Este formulário já foi enviado pelo seu grupo");
      return false;
    }
    if (error || data?.error || !data?.ok) {
      toast.error(data?.error || "Erro ao enviar resposta");
      return false;
    }
    const membersInRoom = { length: data.integrantes ?? groupMembers.length };
    setSubmittedFormKeys(prev => new Set(prev).add(key));
    toast.success(`Resposta enviada — ${membersInRoom.length} integrante(s) do grupo pontuados`);
    return true;
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Gavel className="h-10 w-10 text-primary mx-auto mb-2" />
            <div className="eyebrow mb-1">Júri Simulado</div>
            <CardTitle className="font-heading text-2xl font-medium">Portal do Aluno</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Seu Email</Label>
              <Input value={studentEmail} onChange={e => setStudentEmail(e.target.value)} placeholder="email@exemplo.com" type="email" />
            </div>
            <Button onClick={authenticate} className="w-full">Entrar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="flex items-start gap-4">
        <Gavel className="h-6 w-6 text-primary mt-1" />
        <div className="flex-1">
          <div className="eyebrow mb-1">Júri Simulado</div>
          <h1 className="font-heading text-2xl font-medium">{trial?.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span className="font-medium text-foreground">{myGroup?.name}</span>
            {myRole && (
              <Badge variant={myRole === "prosecution" ? "destructive" : myRole === "defense" ? "default" : "secondary"}>
                {roleLabels[myRole] || myRole}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Group members panel — entire group is "in the room" */}
      {groupMembers.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Integrantes do grupo na sala ({groupMembers.length})
              </span>
              <span className="text-xs text-muted-foreground">
                — todos serão pontuados ao enviar as respostas
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {groupMembers.map((m, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="bg-background"
                  title={m.email}
                >
                  {m.name || m.email}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Status */}
      {selectedSession && (
        <Card className="border-primary/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <Badge variant="outline">{PHASE_LABELS[selectedSession.status] || selectedSession.status}</Badge>
              {ACTIVE_STATUSES.has(selectedSession.status) && myRole && (
                <PhaseTimer session={selectedSession} />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Case selector for multiple cases */}
      {cases.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {cases.map(c => (
            <Button key={c.id} variant={selectedCaseId === c.id ? "default" : "outline"} size="sm" onClick={() => setSelectedCaseId(c.id)}>
              {c.title}
            </Button>
          ))}
        </div>
      )}

      {(() => {
        const sessionStatus = selectedSession?.status || "pending";
        const isSessionActive = ACTIVE_STATUSES.has(sessionStatus);
        const isFinished = sessionStatus === "finished";

        // Session finished → block everyone
        if (isFinished) {
          return (
            <Card>
              <CardContent className="py-12 text-center">
                <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading text-lg font-medium">Sessão finalizada</h3>
                <p className="text-muted-foreground">Este processo foi encerrado pelo(a) juiz(a).</p>
              </CardContent>
            </Card>
          );
        }

        // Group does not participate (regardless of status)
        if (!myRole) {
          return (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading text-lg font-medium">Seu grupo não participa deste processo</h3>
                <p className="text-muted-foreground">Selecione outro processo ou aguarde instruções</p>
              </CardContent>
            </Card>
          );
        }

        // Pre-session (pending) and participant → allow only reading the process
        if (!isSessionActive) {
          return (
            <div className="space-y-4">
              <Card className="border-dashed">
                <CardContent className="py-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    A sessão ainda não foi iniciada pelo(a) juiz(a). Você pode <strong>ler e estudar o processo</strong> abaixo
                    para se preparar. Os formulários e personagens só serão liberados quando o juiz iniciar a sessão.
                  </p>
                </CardContent>
              </Card>
              <LegalProcessRenderer
                content={selectedCase?.process_content || "Conteúdo do processo não disponível"}
                caseNumber={selectedCase?.case_number}
                title={selectedCase?.title}
                caseId={selectedCase?.id}
                images={caseImages.filter(i => i.case_id === selectedCase?.id)}
              />
            </div>
          );
        }

        // Active + participant → show full content
        return (
          <Tabs defaultValue="process" className="space-y-4">
            <TabsList>
              <TabsTrigger value="process"><FileText className="h-4 w-4 mr-1" />Processo</TabsTrigger>
              {myCharacters.length > 0 && <TabsTrigger value="characters"><Users className="h-4 w-4 mr-1" />Personagens</TabsTrigger>}
              {myForms.length > 0 && <TabsTrigger value="forms"><ClipboardList className="h-4 w-4 mr-1" />Formulário</TabsTrigger>}
            </TabsList>

            <TabsContent value="process">
              <LegalProcessRenderer
                content={selectedCase?.process_content || "Conteúdo do processo não disponível"}
                caseNumber={selectedCase?.case_number}
                title={selectedCase?.title}
                caseId={selectedCase?.id}
                images={caseImages.filter(i => i.case_id === selectedCase?.id)}
              />
            </TabsContent>

            {myCharacters.length > 0 && (
              <TabsContent value="characters">
                <Card className="mb-4 border-dashed bg-muted/30">
                  <CardContent className="py-3 text-xs text-muted-foreground">
                    <strong className="text-foreground">Testemunha técnica:</strong> este personagem NÃO é o réu.
                    Trata-se de um(a) profissional convocado(a) pela {myRole === "prosecution" ? "acusação" : "defesa"} para
                    prestar depoimento técnico e fortalecer a argumentação do seu grupo. Estude as instruções e use
                    estrategicamente durante o júri.
                  </CardContent>
                </Card>
                {myCharacters.map((char: any, idx: number) => (
                  <Card key={idx} className="mb-4">
                    <CardHeader>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={char.side === "prosecution" ? "destructive" : "default"}>
                          Testemunha da {char.side === "prosecution" ? "Acusação" : "Defesa"}
                        </Badge>
                        <CardTitle className="font-heading text-lg font-medium">{char.name}</CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground">{char.profession}</p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{char.instructions}</p>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            )}

            {myForms.length > 0 && (
              <TabsContent value="forms">
                {myForms.map((form: any) => (
                  <MockTrialFormCard
                    key={form.id}
                    form={form}
                    alreadySubmitted={submittedFormKeys.has(`${selectedSession?.id}:${form.id}`)}
                    onSubmit={(answers) => submitResponse(form.id, answers)}
                  />
                ))}
              </TabsContent>
            )}
          </Tabs>
        );
      })()}
    </div>
  );
}


function MockTrialFormCard({
  form,
  onSubmit,
  alreadySubmitted = false,
}: {
  form: any;
  onSubmit: (answers: Record<string, any>) => Promise<boolean> | void;
  alreadySubmitted?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (submitted || alreadySubmitted || sending) return;
    setSending(true);
    const result = await onSubmit(answers);
    setSending(false);
    // If onSubmit returns boolean, only mark submitted on success.
    // If it returns void, assume success (back-compat).
    if (result === false) return;
    setSubmitted(true);
  };

  if (submitted || alreadySubmitted) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="font-heading text-lg font-medium">{form.title}</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <p className="text-primary font-medium">✓ Resposta enviada com sucesso!</p>
          <p className="text-xs text-muted-foreground mt-2">
            Este formulário já foi enviado pelo seu grupo e não pode ser enviado novamente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="font-heading text-lg font-medium">{form.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormRenderer
          fields={(form.fields_json || []) as FormField[]}
          answers={answers}
          onChange={setAnswers}
        />
        <Button onClick={handleSubmit} className="w-full" disabled={sending}>
          {sending ? "Enviando..." : "Enviar Resposta"}
        </Button>
      </CardContent>
    </Card>
  );
}
