import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Gavel, Play, Pause, SkipForward, Square, FileText, Users, CheckCircle2, Clock } from "lucide-react";
import { LegalProcessRenderer } from "@/components/mock-trial/LegalProcessRenderer";
import { MockTrialEvaluationForm } from "@/components/mock-trial/MockTrialEvaluationForm";
import { ensureEvaluationForms } from "@/lib/mock-trial-evaluations";

import { formatGroupLabel } from "@/lib/mock-trial-utils";

const ROLE_LABELS: Record<string, string> = {
  prosecution: "Acusação",
  defense: "Defesa",
  jury: "Júri Técnico",
};
const ROLE_COLORS: Record<string, string> = {
  prosecution: "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300",
  defense: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-300",
  jury: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300",
};

const PHASES = [
  {
    key: "announcement",
    label: "Anúncio do Caso",
    duration: 120,
    instructions: [
      "Leia em voz alta o título e o resumo do caso clínico (formato jurídico).",
      "Relembre o tema central da deliberação (pergunta que o júri deve responder).",
    ],
  },
  {
    key: "defense",
    label: "Fala da Defesa",
    duration: 300,
    instructions: [
      "Chame o grupo de defesa.",
      "Lembre que eles podem usar suas testemunhas técnicas (1 min por testemunha).",
      "Avise quando faltar 1 minuto para encerrar.",
    ],
  },
  {
    key: "prosecution",
    label: "Fala da Acusação",
    duration: 300,
    instructions: [
      "Chame o grupo de acusação.",
      "Reforce que também podem acionar testemunhas.",
      "Controle o tempo e anuncie a aproximação do final.",
    ],
  },
  {
    key: "jury_questions",
    label: "Perguntas do Júri Técnico",
    duration: 300,
    instructions: [
      "Dê voz ao grupo que representa o júri técnico.",
      "Permita até 3 perguntas, sendo no máximo 2 para um mesmo grupo.",
      "Estimule perguntas claras e com foco na conduta, evidência ou raciocínio clínico.",
    ],
  },
  {
    key: "deliberation",
    label: "Deliberação do Júri",
    duration: 300,
    instructions: [
      "Instrua o júri técnico a deliberar em voz baixa.",
      "Peça que preencham a ficha do júri técnico.",
      "Um representante deve anunciar o veredito e a justificativa técnica.",
    ],
  },
  {
    key: "verdict",
    label: "Veredito",
    duration: 0,
    instructions: [
      "Registre o veredito proferido pelo júri técnico.",
      "Encerre a sessão usando o botão de finalizar processo.",
    ],
  },
];

export default function MockTrialJudge() {
  const { accessCode } = useParams<{ accessCode: string }>();
  const [judgeName, setJudgeName] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [trial, setTrial] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [session, setSession] = useState<any>(null);
  const [evaluationForms, setEvaluationForms] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const alertPlayedRef = useRef(false);

  // Auto-join from StudentAuth redirect
  useEffect(() => {
    const savedPin = sessionStorage.getItem("mt_judge_pin");
    const savedName = sessionStorage.getItem("mt_judge_name");
    if (savedPin && savedName && !authenticated) {
      sessionStorage.removeItem("mt_judge_pin");
      sessionStorage.removeItem("mt_judge_name");
      setJudgeName(savedName);
      setTimeout(() => authenticateJudge(savedName), 100);
    }
  }, []);

  const authenticateJudge = async (name: string) => {
    if (!name.trim()) {
      toast.error("Informe seu nome");
      return;
    }
    const { data: t } = await supabase
      .from("mock_trials")
      .select("*")
      .eq("access_code", accessCode!)
      .single();
    if (!t) { toast.error("Júri não encontrado"); return; }

    // Verify judge name matches what the teacher configured (case/spacing-insensitive)
    const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    const expected = (t.judge_name || "").trim();
    if (!expected) {
      toast.error("Este Júri Simulado ainda não tem um juiz cadastrado pelo professor.");
      return;
    }
    if (normalize(expected) !== normalize(name)) {
      toast.error("Nome não corresponde ao juiz cadastrado para este júri.");
      return;
    }

    setTrial(t);

    const { data: c } = await supabase.from("mock_trial_cases").select("*").eq("mock_trial_id", t.id).order("position");
    setCases(c || []);
    if (c && c.length > 0) setSelectedCaseId(c[0].id);

    const { data: grps } = await supabase.from("mock_trial_groups").select("*").eq("mock_trial_id", t.id).order("group_number");
    setGroups(grps || []);
    const groupIds = (grps || []).map(g => g.id);
    if (groupIds.length > 0) {
      const { data: studs } = await supabase.from("mock_trial_students").select("*").in("group_id", groupIds);
      setStudents(studs || []);
    }
    const caseIds = (c || []).map(x => x.id);
    if (caseIds.length > 0) {
      const { data: assigns } = await supabase.from("mock_trial_assignments").select("*").in("case_id", caseIds);
      setAssignments(assigns || []);
    }
    const { data: frms } = await supabase.from("mock_trial_forms").select("*").eq("mock_trial_id", t.id);
    setForms(frms || []);

    // Garantir formulários de avaliação (juiz e professor)
    const evalForms = await ensureEvaluationForms(t.id);
    setEvaluationForms(evalForms);

    setAuthenticated(true);
  };

  // Load responses for the current session + realtime updates
  useEffect(() => {
    if (!session?.id) { setResponses([]); return; }
    let active = true;
    (async () => {
      const { data } = await supabase.from("mock_trial_responses").select("*").eq("session_id", session.id);
      if (active) setResponses(data || []);
    })();
    const channel = supabase
      .channel(`responses-${session.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mock_trial_responses", filter: `session_id=eq.${session.id}` }, (payload) => {
        setResponses(prev => [...prev, payload.new]);
      })
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [session?.id]);

  // Load evaluations for current session + realtime
  useEffect(() => {
    if (!session?.id) { setEvaluations([]); return; }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("mock_trial_evaluations")
        .select("*")
        .eq("session_id", session.id);
      if (active) setEvaluations(data || []);
    })();
    const channel = supabase
      .channel(`evals-${session.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "mock_trial_evaluations", filter: `session_id=eq.${session.id}` }, () => {
        supabase.from("mock_trial_evaluations").select("*").eq("session_id", session.id).then(({ data }) => {
          setEvaluations(data || []);
        });
      })
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [session?.id]);
  useEffect(() => {
    const loadSession = async () => {
      if (!selectedCaseId) return;
      const { data, error } = await supabase
        .from("mock_trial_sessions")
        .select("*")
        .eq("case_id", selectedCaseId)
        .maybeSingle();
      if (error) {
        console.error("loadSession select error:", error);
        toast.error("Erro ao carregar sessão: " + error.message);
        return;
      }
      if (data) {
        setSession(data);
      } else {
        const { data: newSession, error: insErr } = await supabase
          .from("mock_trial_sessions")
          .insert({ case_id: selectedCaseId })
          .select()
          .single();
        if (insErr) {
          console.error("loadSession insert error:", insErr);
          toast.error("Não foi possível criar a sessão: " + insErr.message);
          return;
        }
        setSession(newSession);
      }
    };
    if (authenticated) loadSession();
  }, [selectedCaseId, authenticated]);

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

  // Sync timer from session timestamps (so it works after refresh / for accurate countdown)
  useEffect(() => {
    if (!session?.current_phase_started_at || !session?.phase_duration_seconds) {
      setTimeLeft(0);
      setIsRunning(false);
      return;
    }
    const startedAt = new Date(session.current_phase_started_at).getTime();
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const remaining = Math.max(0, session.phase_duration_seconds - elapsed);
    setTimeLeft(remaining);
    setIsRunning(remaining > 0);
    alertPlayedRef.current = remaining <= 60;
  }, [session?.current_phase_started_at, session?.phase_duration_seconds, session?.status]);

  // Timer logic
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          try { audioRef.current?.play(); } catch {}
          return 0;
        }
        if (prev === 61 && !alertPlayedRef.current) {
          alertPlayedRef.current = true;
          try { audioRef.current?.play(); } catch {}
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  const startPhase = useCallback(async (phaseKey: string) => {
    if (!session?.id) {
      toast.error("Sessão ainda não foi criada para este processo.");
      return false;
    }
    const phase = PHASES.find(p => p.key === phaseKey);
    alertPlayedRef.current = false;
    const { data, error } = await supabase
      .from("mock_trial_sessions")
      .update({
        status: phaseKey,
        current_phase_started_at: new Date().toISOString(),
        phase_duration_seconds: phase?.duration || 0,
      })
      .eq("id", session.id)
      .select()
      .single();
    if (error) {
      console.error("startPhase error:", error);
      toast.error("Não foi possível atualizar a fase: " + error.message);
      return false;
    }
    if (data) setSession(data);
    return true;
  }, [session?.id]);

  const startSession = async () => {
    const ok = await startPhase("announcement");
    if (ok) toast.success("Sessão iniciada! Apenas os grupos participantes verão o processo.");
  };

  const finishSession = async () => {
    if (!session?.id) return;
    await supabase.from("mock_trial_sessions").update({
      status: "finished",
      current_phase_started_at: null,
      phase_duration_seconds: null,
    }).eq("id", session.id);
    setIsRunning(false);
    setTimeLeft(0);
    toast.success("Sessão finalizada. O processo foi inativado para todos os grupos.");
  };

  const togglePause = () => setIsRunning(prev => !prev);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const selectedCase = cases.find(c => c.id === selectedCaseId);
  const isActive = session && session.status !== "pending" && session.status !== "finished";
  const isPending = !session || session.status === "pending";
  const isFinished = session?.status === "finished";

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Gavel className="h-10 w-10 text-primary mx-auto mb-2" />
            <CardTitle>Painel do Juiz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome do(a) Juiz(a)</Label>
              <Input value={judgeName} onChange={e => setJudgeName(e.target.value)} placeholder="Seu nome" />
              <p className="text-xs text-muted-foreground mt-1">
                O nome deve ser exatamente o mesmo cadastrado pelo professor para este Júri.
              </p>
            </div>
            <Button onClick={() => authenticateJudge(judgeName)} className="w-full">Entrar como Juiz</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGEcBj+a2telezo0T6PY5a5bFgkrmNjlw3k7HjKS2O3Ms2QcDSaR2/DNu3U1FS2S3fDQwHw9GC2T3/LRw4JHHC+W4fTTx4dOJjiZ4/bWyo5XLT2e5fja0JVWM0Ch6Pze1ppgPkio7fzj3J9rRlKs8QDm46V5UmC0+AXr6q2AX3G/AQjx7sGJaoPFDRD19NaSf5TQGBz8+OqXi5jZIx8AAAAAA==" />

      <div className="flex items-center gap-4">
        <Gavel className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{trial?.title || "Júri Simulado"}</h1>
          <p className="text-muted-foreground">Juiz(a): {judgeName}</p>
        </div>
      </div>

      {/* Case Selector + Start/Finish */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
              <SelectTrigger className="w-80"><SelectValue placeholder="Selecione o processo" /></SelectTrigger>
              <SelectContent>
                {cases.map(c => <SelectItem key={c.id} value={c.id}>{c.title} ({c.case_number})</SelectItem>)}
              </SelectContent>
            </Select>

            {isPending && (
              <Button onClick={startSession}>
                <Play className="h-4 w-4 mr-1" />Iniciar Processo
              </Button>
            )}
            {isActive && (
              <Button onClick={finishSession} variant="destructive">
                <Square className="h-4 w-4 mr-1" />Finalizar Processo
              </Button>
            )}
            {isFinished && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Processo finalizado</Badge>
                <Button onClick={startSession} size="sm" variant="outline">
                  <Play className="h-4 w-4 mr-1" />Reabrir
                </Button>
              </div>
            )}
            {isActive && currentPhase && (
              <Badge variant="default" className="ml-auto">Fase atual: {currentPhase.label}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timer Display */}
      {isActive && (
        <Card className="border-2 border-primary">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Badge variant="default" className="text-lg px-4 py-1">
                {currentPhase?.label}
              </Badge>
              {currentPhase && currentPhase.duration > 0 ? (
                <>
                  <div className={`text-8xl font-mono font-bold ${timeLeft <= 60 ? "text-destructive animate-pulse" : "text-foreground"}`}>
                    {formatTime(timeLeft)}
                  </div>
                  <div className="flex justify-center gap-4">
                    <Button onClick={togglePause} variant="outline" size="lg">
                      {isRunning ? <Pause className="h-5 w-5 mr-1" /> : <Play className="h-5 w-5 mr-1" />}
                      {isRunning ? "Pausar" : "Retomar"}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Esta fase não tem cronômetro.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase Selector with Instructions */}
      {isActive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fases da Sessão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {PHASES.map((phase, idx) => {
                const isCurrent = phase.key === session?.status;
                const isPast = currentPhaseIndex > idx;
                return (
                  <Button
                    key={phase.key}
                    onClick={() => startPhase(phase.key)}
                    variant={isCurrent ? "default" : isPast ? "secondary" : "outline"}
                    size="sm"
                  >
                    {idx + 1}. {phase.label}
                    {phase.duration > 0 && (
                      <span className="ml-2 text-xs opacity-70">{Math.floor(phase.duration / 60)}min</span>
                    )}
                  </Button>
                );
              })}
            </div>

            {currentPhase && (
              <Card className="bg-muted/40 border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <SkipForward className="h-4 w-4" />
                    Orientações – {currentPhase.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-foreground">
                    {currentPhase.instructions.map((ins, i) => (
                      <li key={i}>{ins}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* Participating groups for the selected case */}
      {selectedCase && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Grupos Participantes deste Processo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const caseAssignments = assignments.filter(a => a.case_id === selectedCase.id);
              if (caseAssignments.length === 0) {
                return <p className="text-sm text-muted-foreground">Nenhum grupo distribuído para este processo.</p>;
              }
              const order = ["prosecution", "defense", "jury"];
              const sorted = [...caseAssignments].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
              return sorted.map(a => {
                const group = groups.find(g => g.id === a.group_id);
                if (!group) return null;
                const members = students.filter(s => s.group_id === group.id);
                const formForRole = forms.find(f => f.target_role === a.role);
                const submitted = formForRole
                  ? responses.some(r => r.group_id === group.id && r.form_id === formForRole.id)
                  : false;
                return (
                  <div key={a.id} className={`rounded-lg border p-3 ${ROLE_COLORS[a.role] || ""}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-semibold">
                          {formatGroupLabel(group)}
                        </Badge>
                        <Badge variant="secondary">{ROLE_LABELS[a.role] || a.role}</Badge>
                      </div>
                      {formForRole && (
                        submitted ? (
                          <Badge className="bg-green-600 text-white border-green-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Formulário enviado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-dashed">
                            <Clock className="h-3 w-3 mr-1" />
                            Aguardando envio
                          </Badge>
                        )
                      )}
                    </div>
                    {members.length > 0 ? (
                      <ul className="text-sm text-foreground/90 flex flex-col gap-1 pl-1">
                        {members.map(m => (
                          <li key={m.id} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                            <span>{m.student_name}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Nenhum aluno cadastrado neste grupo.</p>
                    )}
                  </div>
                );
              });
            })()}
          </CardContent>
        </Card>
      )}

      {/* Avaliação do Juiz - Acusação e Defesa */}
      {selectedCase && session && (() => {
        const judgeForm = evaluationForms.find(f => f.evaluator_type === "judge");
        if (!judgeForm) return null;
        const caseAssigns = assignments.filter(a => a.case_id === selectedCase.id);
        const targets = caseAssigns.filter(a => a.role === "prosecution" || a.role === "defense");
        if (targets.length === 0) return null;
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Gavel className="h-4 w-4" />
                Avaliação do Juiz
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Avalie cada lado considerando postura processual, clareza, respeito ao rito e cumprimento do tempo.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {targets.map(a => {
                const group = groups.find(g => g.id === a.group_id);
                if (!group) return null;
                const existing = evaluations.find(
                  e => e.group_id === a.group_id && e.evaluator_type === "judge"
                );
                return (
                  <MockTrialEvaluationForm
                    key={a.id}
                    sessionId={session.id}
                    caseId={selectedCase.id}
                    groupId={a.group_id}
                    groupLabel={formatGroupLabel(group)}
                    evaluatedRole={a.role}
                    evaluatorType="judge"
                    evaluatorName={judgeName}
                    fields={judgeForm.fields_json}
                    existing={existing}
                  />
                );
              })}
            </CardContent>
          </Card>
        );
      })()}

      {selectedCase && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Texto do Processo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LegalProcessRenderer
              content={selectedCase.process_content || "Conteúdo do processo não disponível"}
              caseNumber={selectedCase.case_number}
              title={selectedCase.title}
              caseId={selectedCase.id}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
