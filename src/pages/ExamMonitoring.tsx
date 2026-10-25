import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/use-subscription";
import { PremiumGate } from "@/components/PremiumGate";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsListLine, TabsTriggerLine } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ArrowLeft, Users, Loader2, Eye, Shield, AlertTriangle, Camera } from "lucide-react";
import { toast } from "sonner";
import ExamAnswerReviewDialog, { getAnswerStatement, type ReviewAnswerRow } from "@/components/ExamAnswerReviewDialog";

const PROCTORING_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/exam-proctoring`;

interface SessionRow {
  id: string;
  student_id: string;
  status: string;
  total_score: number | null;
  max_score: number | null;
  started_at: string;
  finished_at: string | null;
  profiles: { full_name: string } | null;
}

type AnswerRow = ReviewAnswerRow;

export default function ExamMonitoring() {
  const { publicationId } = useParams<{ publicationId: string }>();
  const navigate = useNavigate();
  const { isPremium, isLoading: subLoading } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [examTitle, setExamTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState(0);
  const [accessCode, setAccessCode] = useState("");
  const [pubActive, setPubActive] = useState(true);
  const [pubEndAt, setPubEndAt] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<AnswerRow[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewAnswer, setReviewAnswer] = useState<AnswerRow | null>(null);
  const [teacherScore, setTeacherScore] = useState("");
  const [reviewTab, setReviewTab] = useState("tutor");

  const [teacherFeedback, setTeacherFeedback] = useState("");

  // Security tab state
  const [securityData, setSecurityData] = useState<{
    sessions: Array<{ id: string; student_name: string; student_email: string; status: string; violation_count: number; device_fingerprint: any; photo_url: string | null }>;
    logs: Array<{ id: string; session_id: string; event_type: string; event_data: any; created_at: string }>;
    photoPaths: Record<string, string[]>;
  } | null>(null);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [selectedSecuritySession, setSelectedSecuritySession] = useState<string | null>(null);
  const [signedPhotoUrls, setSignedPhotoUrls] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState("monitoring");
  const [unlockingSessionId, setUnlockingSessionId] = useState<string | null>(null);
  const activeTabRef = useRef(activeTab);
  const securitySessionIdsRef = useRef<string[]>([]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    securitySessionIdsRef.current = securityData?.sessions.map((session) => session.id) || [];
  }, [securityData]);

  // Generate signed URLs when a security session is selected
  useEffect(() => {
    if (!selectedSecuritySession || !securityData?.photoPaths[selectedSecuritySession]?.length) return;
    const paths = securityData.photoPaths[selectedSecuritySession];
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage
        .from("exam-proctoring")
        .createSignedUrls(paths, 3600);
      if (!cancelled && data) {
        setSignedPhotoUrls(prev => ({
          ...prev,
          [selectedSecuritySession]: data.map(d => d.signedUrl).filter(Boolean),
        }));
      }
    })();
    return () => { cancelled = true; };
  }, [selectedSecuritySession, securityData]);

  const getFunctionHeaders = async () => {
    const { data } = await supabase.auth.getSession();

    return {
      "Content-Type": "application/json",
      ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
    };
  };

  const loadSessions = async () => {
    if (!publicationId) return;

    const { data: pub } = await supabase
      .from("exam_publications")
      .select("*, exams(title)")
      .eq("id", publicationId)
      .single();

    if (!pub) { navigate("/dashboard"); return; }
    setExamTitle((pub.exams as unknown as { title: string })?.title || "Prova");
    setTimeLimit(pub.time_limit_minutes);
    setAccessCode(pub.access_code);
    setPubActive(!!pub.is_active && !(pub.end_at && new Date() > new Date(pub.end_at)));
    setPubEndAt(pub.end_at || null);

    const { data: sess } = await supabase
      .from("exam_sessions")
      .select("*")
      .eq("publication_id", publicationId)
      .order("created_at", { ascending: false });

    if (sess) {
      const enriched = sess.map((s: any) => ({
        ...s,
        profiles: { full_name: s.student_name || s.student_email || "Aluno" },
      }));
      setSessions(enriched as SessionRow[]);
    }

    setLoading(false);
  };

  const sendSessionStatusBroadcast = async (sessionId: string, status: "in_progress" | "blocked", violationCount = 0) => {
    const channel = supabase.channel(`exam-proctoring-events-${sessionId}`);

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          reject(new Error("Realtime indisponível."));
        }, 3000);

        channel.subscribe((subscriptionStatus) => {
          if (subscriptionStatus === "SUBSCRIBED") {
            window.clearTimeout(timeout);
            resolve();
          }

          if (subscriptionStatus === "CHANNEL_ERROR" || subscriptionStatus === "TIMED_OUT") {
            window.clearTimeout(timeout);
            reject(new Error(subscriptionStatus));
          }
        });
      });

      await channel.send({
        type: "broadcast",
        event: "session-status-changed",
        payload: {
          sessionId,
          status,
          violationCount,
        },
      });
    } finally {
      supabase.removeChannel(channel);
    }
  };

  // Auto-close expired sessions on mount
  useEffect(() => {
    if (!publicationId) return;
    const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/student-exam-access`;
    fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cleanup-expired", publicationId }),
    }).then(r => r.json()).then(data => {
      if (data.closedCount > 0) {
        toast.info(`${data.closedCount} prova(s) expirada(s) foram enviadas automaticamente.`);
      }
    }).catch(() => {});
  }, [publicationId]);

  useEffect(() => {
    loadSessions();

    // Realtime subscription
    const channel = supabase
      .channel(`monitoring-${publicationId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "exam_sessions",
        filter: `publication_id=eq.${publicationId}`,
      }, () => {
        loadSessions();

        if (activeTabRef.current === "security") {
          loadSecurityData();
        }
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "exam_audit_logs",
      }, (payload: any) => {
        if (activeTabRef.current !== "security") return;

        const sessionId = payload.new?.session_id;
        if (sessionId && securitySessionIdsRef.current.includes(sessionId)) {
          loadSecurityData();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [publicationId]);

  const recalcSessionTotal = async (sessionId: string) => {
    const { data } = await supabase
      .from("student_answers")
      .select("teacher_score, ai_score, points_earned, max_points")
      .eq("session_id", sessionId);
    if (!data) return;
    const total = data.reduce(
      (s: number, a: any) => s + (Number(a.teacher_score ?? a.ai_score ?? a.points_earned) || 0),
      0
    );
    const max = data.reduce((s: number, a: any) => s + (Number(a.max_points) || 0), 0);
    await supabase
      .from("exam_sessions")
      .update({ total_score: Number(total.toFixed(2)), max_score: Number(max.toFixed(2)) })
      .eq("id", sessionId);
    setSessions((prev: any) =>
      prev.map((s: any) =>
        s.id === sessionId
          ? { ...s, total_score: Number(total.toFixed(2)), max_score: Number(max.toFixed(2)) }
          : s
      )
    );
  };

  const loadStudentAnswers = async (sessionId: string) => {
    setSelectedSession(sessionId);
    setLoadingAnswers(true);
    const { data } = await supabase
      .from("student_answers")
      .select("*, question_bank(type, content_json)")
      .eq("session_id", sessionId)
      .order("created_at");

    setSelectedAnswers((data as unknown as AnswerRow[]) || []);
    setLoadingAnswers(false);
  };

  const openReview = (answer: AnswerRow) => {
    setReviewAnswer(answer);
    setTeacherScore(String(answer.teacher_score ?? answer.ai_score ?? ""));
    setTeacherFeedback(answer.teacher_feedback || "");
    setReviewTab("tutor");
    setReviewOpen(true);
  };

  const saveReview = async () => {
    if (!reviewAnswer) return;
    await supabase
      .from("student_answers")
      .update({
        teacher_score: parseFloat(teacherScore) || 0,
        teacher_feedback: teacherFeedback,
        grading_status: "reviewed",
      })
      .eq("id", reviewAnswer.id);

    toast.success("Avaliação salva.");
    setReviewOpen(false);
    if (selectedSession) {
      await loadStudentAnswers(selectedSession);
      await recalcSessionTotal(selectedSession);
    }
  };

  const handleAISuggestScore = async (score: number, feedback: string) => {
    const cleanFeedback = feedback.substring(0, 300);
    setTeacherScore(String(score));
    setTeacherFeedback(cleanFeedback);
    setReviewTab("review");
    if (!reviewAnswer) return;
    const { error } = await supabase
      .from("student_answers")
      .update({ teacher_score: score, teacher_feedback: cleanFeedback, grading_status: "reviewed" })
      .eq("id", reviewAnswer.id);
    if (error) {
      toast.error("Nota aplicada, mas não foi possível salvar: " + error.message);
      return;
    }
    setReviewAnswer({ ...reviewAnswer, teacher_score: score, teacher_feedback: cleanFeedback } as AnswerRow);
    if (selectedSession) {
      await loadStudentAnswers(selectedSession);
      await recalcSessionTotal(selectedSession);
    }
    toast.success(`Nota ${score}/${Number(reviewAnswer.max_points)} aplicada e salva.`);
  };



  const loadSecurityData = async () => {
    if (!publicationId) return;
    setLoadingSecurity(true);
    try {
      const headers = await getFunctionHeaders();
      const res = await fetch(PROCTORING_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "get-violations", publicationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar monitoramento.");
      setSecurityData(data);
    } catch {
      toast.error("Erro ao carregar dados de segurança.");
    }
    setLoadingSecurity(false);
  };

  const handleUnlockSession = async (sessionId: string) => {
    setUnlockingSessionId(sessionId);

    try {
      const headers = await getFunctionHeaders();
      const res = await fetch(PROCTORING_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "unlock-session", sessionId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao desbloquear sessão.");

      await Promise.allSettled([
        loadSecurityData(),
        loadSessions(),
        sendSessionStatusBroadcast(sessionId, "in_progress", 0),
      ]);

      toast.success("Aluno desbloqueado com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível desbloquear o aluno.");
    } finally {
      setUnlockingSessionId(null);
    }
  };

  const getEventLabel = (type: string) => {
    const labels: Record<string, string> = {
      focus_lost: "Perda de foco / troca de aba",
      fullscreen_exit: "Saída de tela cheia",
      copy_attempt: "Tentativa de copiar",
      paste_attempt: "Tentativa de colar",
      cut_attempt: "Tentativa de recortar",
      contextmenu_attempt: "Menu de contexto",
      keyboard_shortcut_blocked: "Atalho bloqueado",
      printscreen_attempt: "PrintScreen",
      photo_captured: "Foto capturada",
      session_started: "Sessão iniciada",
      session_blocked: "Sessão bloqueada",
      session_unblocked: "Sessão desbloqueada pelo professor",
      webcam_denied: "Webcam negada",
    };
    return labels[type] || type;
  };

  if (loading || subLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/exams")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <PremiumGate feature="Monitoramento em Tempo Real">
          <span />
        </PremiumGate>
      </div>
    );
  }

  const inProgress = sessions.filter((s) => s.status === "in_progress").length;
  const submitted = sessions.filter((s) => s.status === "submitted" || s.status === "graded").length;
  const blocked = sessions.filter((s) => s.status === "blocked").length;
  const blockedNames = sessions.filter((s) => s.status === "blocked").map((s) => s.profiles?.full_name || "Aluno");
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const pubStatus = !pubActive
    ? { tone: "neutral" as const, label: "Encerrada" }
    : { tone: "ok" as const, label: pubEndAt ? `Ativa até ${fmtTime(pubEndAt)}` : "Ativa" };

  const sessionLabel = (status: string): { label: string; tone: "ok" | "bad" | "info" | "brand" } => {
    switch (status) {
      case "blocked": return { label: "Bloqueada", tone: "bad" };
      case "in_progress": return { label: "Fazendo", tone: "info" };
      case "submitted": return { label: "Enviada", tone: "brand" };
      default: return { label: "Corrigida", tone: "ok" };
    }
  };
  const initials = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-3" onClick={() => navigate("/exams")}>
          <ArrowLeft className="h-4 w-4" /> Provas
        </Button>
        <PageHeader
          eyebrow="Monitoramento · ao vivo"
          title={examTitle}
          actions={
            <>
              <StatusBadge tone={pubStatus.tone} dot>{pubStatus.label}</StatusBadge>
              <span className="text-xs text-muted-foreground">
                Código <span className="font-mono font-semibold text-foreground">{accessCode}</span> · {timeLimit} min
              </span>
            </>
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <div className="label-mono">Total</div>
          <div className="mt-3 font-heading text-4xl font-medium tabular-nums">{sessions.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">participantes</div>
        </Card>
        <Card className="p-5">
          <div className="label-mono">Em andamento</div>
          <div className="mt-3 font-heading text-4xl font-medium tabular-nums">{inProgress}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            {inProgress > 0 && <span className="h-1.5 w-1.5 rounded-full bg-success" />}fazendo agora
          </div>
        </Card>
        <Card className="p-5">
          <div className="label-mono">Finalizadas</div>
          <div className="mt-3 font-heading text-4xl font-medium tabular-nums">{submitted}</div>
          <div className="mt-1 text-xs text-muted-foreground">entregues</div>
        </Card>
        <Card className="p-5">
          <div className="label-mono">Bloqueadas</div>
          <div className={`mt-3 font-heading text-4xl font-medium tabular-nums ${blocked > 0 ? "text-destructive" : ""}`}>{blocked}</div>
          <div className="mt-1 text-xs text-muted-foreground">{blocked > 0 ? "aguardando desbloqueio" : "nenhuma"}</div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v);
        if (v === "security" && !securityData) loadSecurityData();
      }}>
        <TabsListLine>
          <TabsTriggerLine value="monitoring"><Users className="h-4 w-4" />Monitoramento</TabsTriggerLine>
          <TabsTriggerLine value="security"><Shield className="h-4 w-4" />Segurança</TabsTriggerLine>
        </TabsListLine>

        {/* ===== MONITORING TAB ===== */}
        <TabsContent value="monitoring" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="label-mono">Alunos · tempo real</h3>
              <Card className="divide-y overflow-hidden">
                {sessions.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">Nenhum aluno conectado ainda.</p>
                ) : (
                  sessions.map((s) => {
                    const name = s.profiles?.full_name || "Aluno";
                    const st = sessionLabel(s.status);
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => loadStudentAnswers(s.id)}
                        className={`flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-sunken ${selectedSession === s.id ? "bg-sunken" : ""}`}
                      >
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-medium ${s.status === "blocked" ? "bg-destructive/10 text-destructive" : "bg-brand-soft text-brand-text"}`}>{initials(name)}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{name}</p>
                          <p className="text-xs text-muted-foreground">
                            Início {fmtTime(s.started_at)}{s.finished_at && ` · Entrega ${fmtTime(s.finished_at)}`}
                          </p>
                        </div>
                        {s.total_score != null && (
                          <span className="font-mono text-sm font-medium">{Number(s.total_score).toFixed(1)}/{Number(s.max_score).toFixed(1)}</span>
                        )}
                        <StatusBadge tone={st.tone} dot={s.status === "in_progress" || s.status === "blocked"}>{st.label}</StatusBadge>
                      </button>
                    );
                  })
                )}
              </Card>
            </div>

            <div className="space-y-3">
              <h3 className="label-mono">Respostas</h3>
              {!selectedSession ? (
                <Card className="p-8 text-center text-sm text-muted-foreground">Selecione um aluno para ver as respostas.</Card>
              ) : loadingAnswers ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : selectedAnswers.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma resposta ainda.</Card>
              ) : (
                <Card className="divide-y overflow-hidden">
                  {selectedAnswers.map((a, i) => {
                    const statement = getAnswerStatement(a);
                    const score = Number(a.teacher_score ?? a.ai_score ?? a.points_earned) || 0;
                    const reviewable = a.question_bank?.type === "open_ended" || a.question_bank?.type === "matching";
                    return (
                      <div key={a.id} className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium"><span className="mr-2 font-mono text-xs text-muted-foreground">Q{i + 1}</span>{statement.substring(0, 80)}{statement.length > 80 && "…"}</p>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="font-mono text-xs font-medium">{score}/{Number(a.max_points)}</span>
                            {a.grading_status === "pending" && a.question_bank?.type === "open_ended" && (
                              <StatusBadge tone="warn">Aguardando IA</StatusBadge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          R: {a.answer_text || (a.answer_json as Record<string, string>)?.selected || "—"}
                        </p>
                        {reviewable && (
                          <Button size="sm" variant="outline" onClick={() => openReview(a)}>
                            <Eye className="h-3.5 w-3.5" />Revisar nota
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ===== SECURITY TAB ===== */}
        <TabsContent value="security" className="mt-6">
          {loadingSecurity ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !securityData || securityData.sessions.length === 0 ? (
            <Card className="py-16 text-center">
              <Shield className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhum dado de segurança disponível.</p>
              <p className="mt-1 text-xs text-muted-foreground">Os logs aparecerão quando alunos iniciarem provas com proctoring ativo.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={loadSecurityData}>Recarregar</Button>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                {blocked > 0 ? (
                  <div className="flex flex-1 items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning-ink">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span><strong>{blockedNames.join(", ")}</strong> {blocked === 1 ? "está bloqueado(a)" : "estão bloqueados"} e só volta{blocked === 1 ? "" : "m"} após desbloqueio manual.</span>
                  </div>
                ) : (
                  <p className="flex-1 text-xs text-muted-foreground">Quando uma prova é bloqueada, o aluno só volta após desbloqueio manual do professor.</p>
                )}
                <Button variant="outline" size="sm" onClick={loadSecurityData}>Recarregar</Button>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="label-mono">Alunos · violações</h3>
                  <Card className="divide-y overflow-hidden">
                    {securityData.sessions.map((s) => {
                      const name = s.student_name || s.student_email || "Aluno";
                      return (
                        <div
                          key={s.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedSecuritySession(s.id)}
                          onKeyDown={(e) => { if (e.key === "Enter") setSelectedSecuritySession(s.id); }}
                          className={`flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-sunken ${selectedSecuritySession === s.id ? "bg-sunken" : ""}`}
                        >
                          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-medium ${s.status === "blocked" ? "bg-destructive/10 text-destructive" : "bg-brand-soft text-brand-text"}`}>{initials(name)}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{name}</p>
                            {s.device_fingerprint && (
                              <p className="truncate text-[11px] text-muted-foreground">
                                {s.device_fingerprint?.platform} · {s.device_fingerprint?.timezone}
                              </p>
                            )}
                          </div>
                          {s.status === "blocked" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={unlockingSessionId === s.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleUnlockSession(s.id);
                              }}
                            >
                              {unlockingSessionId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Desbloquear"}
                            </Button>
                          )}
                          {s.photo_url && <Camera className="h-3.5 w-3.5 text-muted-foreground" />}
                          <StatusBadge tone={s.status === "blocked" || s.violation_count > 5 ? "bad" : s.violation_count > 0 ? "warn" : "neutral"}>
                            {s.status === "blocked" ? "Bloqueada" : `${s.violation_count} ${s.violation_count === 1 ? "violação" : "violações"}`}
                          </StatusBadge>
                        </div>
                      );
                    })}
                  </Card>
                </div>

                <div className="space-y-3">
                  <h3 className="label-mono">Timeline de eventos</h3>
                  <Card className="p-5">
                    {!selectedSecuritySession ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">Selecione um aluno para ver os eventos.</p>
                    ) : (
                      <div className="space-y-5">
                        {signedPhotoUrls[selectedSecuritySession] && signedPhotoUrls[selectedSecuritySession].length > 0 && (
                          <div>
                            <p className="label-mono mb-2 flex items-center gap-1.5"><Camera className="h-3 w-3" /> Fotos capturadas</p>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {signedPhotoUrls[selectedSecuritySession].map((url, i) => (
                                <img key={i} src={url} alt={`Captura ${i + 1}`} className="h-20 w-auto shrink-0 rounded-md border object-cover" />
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="max-h-[400px] space-y-3 overflow-y-auto">
                          {securityData.logs
                            .filter((l) => l.session_id === selectedSecuritySession)
                            .map((log) => {
                              const bad = log.event_type.includes("blocked") || log.event_type.includes("exit") || log.event_type.includes("lost");
                              return (
                                <div key={log.id} className="flex items-start gap-3">
                                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${bad ? "bg-destructive" : log.event_type === "photo_captured" ? "bg-primary" : "bg-muted-foreground/50"}`} />
                                  <div className="min-w-0 flex-1 text-sm">
                                    <span className="font-medium">{getEventLabel(log.event_type)}</span>
                                    <p className="font-mono text-xs text-muted-foreground">
                                      {new Date(log.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          {securityData.logs.filter((l) => l.session_id === selectedSecuritySession).length === 0 && (
                            <p className="py-4 text-center text-xs text-muted-foreground">Nenhum evento registrado.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ExamAnswerReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        answer={reviewAnswer}
        tab={reviewTab}
        onTabChange={setReviewTab}
        teacherScore={teacherScore}
        onTeacherScoreChange={setTeacherScore}
        teacherFeedback={teacherFeedback}
        onTeacherFeedbackChange={setTeacherFeedback}
        onSave={saveReview}
        onSuggestScore={handleAISuggestScore}
      />
    </div>
  );
}
