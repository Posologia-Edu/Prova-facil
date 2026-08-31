import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/use-subscription";
import { PremiumGate } from "@/components/PremiumGate";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Users, Clock, CheckCircle2, Loader2, Bot, Eye, MessageSquare, Shield, AlertTriangle, Camera } from "lucide-react";
import { toast } from "sonner";
import AITutorChat from "@/components/AITutorChat";
import type { Json } from "@/integrations/supabase/types";

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

interface AnswerRow {
  id: string;
  question_id: string;
  answer_text: string | null;
  answer_json: Json;
  is_correct: boolean | null;
  points_earned: number | null;
  max_points: number | null;
  ai_score: number | null;
  ai_feedback: string | null;
  teacher_score: number | null;
  teacher_feedback: string | null;
  grading_status: string;
  question_bank: { type: string; content_json: Json } | null;
}

export default function ExamMonitoring() {
  const { publicationId } = useParams<{ publicationId: string }>();
  const navigate = useNavigate();
  const { isPremium, isLoading: subLoading } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [examTitle, setExamTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState(0);
  const [accessCode, setAccessCode] = useState("");
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
    if (selectedSession) loadStudentAnswers(selectedSession);
  };

  const handleAISuggestScore = (score: number, feedback: string) => {
    setTeacherScore(String(score));
    setTeacherFeedback(feedback.substring(0, 300));
    toast.info(`Nota sugerida: ${score}/${Number(reviewAnswer?.max_points)} aplicada.`);
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
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-xl font-bold">{examTitle}</h1>
          <p className="text-sm text-muted-foreground">
            Código: <span className="font-mono font-bold text-foreground">{accessCode}</span> · {timeLimit} min
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{sessions.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <Clock className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{inProgress}</p>
            <p className="text-xs text-muted-foreground">Em andamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{submitted}</p>
            <p className="text-xs text-muted-foreground">Finalizadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Monitoring and Security */}
      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v);
        if (v === "security" && !securityData) loadSecurityData();
      }}>
        <TabsList>
          <TabsTrigger value="monitoring" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Monitoramento
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Segurança
          </TabsTrigger>
        </TabsList>

        {/* ===== MONITORING TAB ===== */}
        <TabsContent value="monitoring" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Student list */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Alunos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum aluno conectado ainda.</p>
                ) : (
                  sessions.map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors ${
                        selectedSession === s.id ? "border-primary bg-accent/30" : ""
                      }`}
                      onClick={() => loadStudentAnswers(s.id)}
                    >
                      <div>
                        <p className="text-sm font-medium">{s.profiles?.full_name || "Aluno"}</p>
                        <p className="text-xs text-muted-foreground">
                          Início: {new Date(s.started_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.total_score != null && (
                          <span className="text-sm font-semibold">{Number(s.total_score).toFixed(1)}/{Number(s.max_score).toFixed(1)}</span>
                        )}
                         <Badge
                           variant={s.status === "blocked" ? "destructive" : s.status === "in_progress" ? "default" : s.status === "graded" ? "secondary" : "outline"}
                           className="text-xs"
                         >
                           {s.status === "blocked" ? "Bloqueada" : s.status === "in_progress" ? "Fazendo" : s.status === "submitted" ? "Enviada" : "Corrigida"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Selected student answers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Respostas</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedSession ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Selecione um aluno para ver as respostas.</p>
                ) : loadingAnswers ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : selectedAnswers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma resposta ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedAnswers.map((a, i) => {
                      const content = (a.question_bank?.content_json || {}) as Record<string, unknown>;
                      const statement = (content.statement as string) || (content.title as string) || "Questão";
                      const score = Number(a.teacher_score ?? a.ai_score ?? a.points_earned) || 0;

                      return (
                        <div key={a.id} className="p-3 border rounded-lg space-y-2">
                          <div className="flex justify-between items-start">
                            <p className="text-xs font-medium">Q{i + 1}: {statement.substring(0, 80)}...</p>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-semibold">{score}/{Number(a.max_points)}</span>
                              {a.grading_status === "pending" && a.question_bank?.type === "open_ended" && (
                                <Badge variant="outline" className="text-xs">
                                  <Bot className="h-3 w-3 mr-1" />
                                  Aguardando IA
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            R: {a.answer_text || (a.answer_json as Record<string, string>)?.selected || "—"}
                          </p>
                          {(a.question_bank?.type === "open_ended" || a.question_bank?.type === "matching") && (
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => openReview(a)}>
                              <Eye className="h-3 w-3 mr-1" />
                              Revisar nota
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== SECURITY TAB ===== */}
        <TabsContent value="security" className="mt-4">
          {loadingSecurity ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !securityData || securityData.sessions.length === 0 ? (
            <div className="text-center py-16">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Nenhum dado de segurança disponível.</p>
              <p className="text-xs text-muted-foreground mt-1">Os logs aparecerão quando alunos iniciarem provas com proctoring ativo.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={loadSecurityData}>
                Recarregar
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Students with violations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Alunos — Violações
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Quando uma prova é bloqueada, o aluno só volta após desbloqueio manual do professor.
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {securityData.sessions.map(s => (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors ${
                        selectedSecuritySession === s.id ? "border-primary bg-accent/30" : ""
                      }`}
                      onClick={() => setSelectedSecuritySession(s.id)}
                    >
                      <div>
                        <p className="text-sm font-medium">{s.student_name || s.student_email || "Aluno"}</p>
                        {s.device_fingerprint && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                            {s.device_fingerprint?.platform} · {s.device_fingerprint?.timezone}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {s.status === "blocked" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7"
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
                        <Badge
                          variant={s.status === "blocked" || s.violation_count > 5 ? "destructive" : s.violation_count > 0 ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {s.status === "blocked" ? "Bloqueada" : `${s.violation_count} violação(ões)`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Timeline for selected student */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Timeline de Eventos</CardTitle>
                </CardHeader>
                <CardContent>
                  {!selectedSecuritySession ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Selecione um aluno para ver os eventos.</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Photos */}
                      {signedPhotoUrls[selectedSecuritySession] && signedPhotoUrls[selectedSecuritySession].length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                            <Camera className="h-3 w-3" /> Fotos capturadas
                          </p>
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {signedPhotoUrls[selectedSecuritySession].map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt={`Captura ${i + 1}`}
                                className="h-20 w-auto rounded border object-cover shrink-0"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Event log */}
                      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                        {securityData.logs
                          .filter(l => l.session_id === selectedSecuritySession)
                          .map(log => (
                            <div key={log.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/40 text-xs">
                              <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                                log.event_type.includes("blocked") || log.event_type.includes("exit") || log.event_type.includes("lost")
                                  ? "bg-destructive"
                                  : log.event_type === "photo_captured"
                                  ? "bg-primary"
                                  : "bg-muted-foreground"
                              }`} />
                              <div className="flex-1 min-w-0">
                                <span className="font-medium">{getEventLabel(log.event_type)}</span>
                                <p className="text-muted-foreground">
                                  {new Date(log.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                </p>
                              </div>
                            </div>
                          ))}
                        {securityData.logs.filter(l => l.session_id === selectedSecuritySession).length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">Nenhum evento registrado.</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Review dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Correção com Tutor de IA
            </DialogTitle>
          </DialogHeader>
          {reviewAnswer && (
            <Tabs defaultValue="tutor" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tutor" className="gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Tutor de IA
                </TabsTrigger>
                <TabsTrigger value="review" className="gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  Nota Manual
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tutor" className="mt-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Enunciado</Label>
                    <p className="text-sm bg-muted/50 rounded p-2 mt-1">
                      {((reviewAnswer.question_bank?.content_json as Record<string, unknown>)?.statement as string) ||
                        ((reviewAnswer.question_bank?.content_json as Record<string, unknown>)?.title as string) ||
                        "Questão"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Resposta do aluno</Label>
                    <p className="text-sm bg-muted/50 rounded p-2 mt-1">{reviewAnswer.answer_text || "Sem resposta"}</p>
                  </div>
                  <Separator />
                  <AITutorChat
                    answerId={reviewAnswer.id}
                    studentAnswer={reviewAnswer.answer_text || ""}
                    questionStatement={
                      ((reviewAnswer.question_bank?.content_json as Record<string, unknown>)?.statement as string) || ""
                    }
                    aiScore={reviewAnswer.ai_score}
                    aiFeedback={reviewAnswer.ai_feedback}
                    teacherScore={reviewAnswer.teacher_score}
                    maxPoints={Number(reviewAnswer.max_points) || 1}
                    onSuggestScore={handleAISuggestScore}
                  />
                </div>
              </TabsContent>

              <TabsContent value="review" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Resposta do aluno</Label>
                    <p className="text-sm bg-muted/50 rounded p-3 mt-1">{reviewAnswer.answer_text || "Sem resposta"}</p>
                  </div>
                  {reviewAnswer.ai_feedback && (
                    <div>
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Bot className="h-3 w-3" /> Avaliação da IA ({reviewAnswer.ai_score}/{Number(reviewAnswer.max_points)})
                      </Label>
                      <p className="text-sm bg-primary/5 rounded p-3 mt-1">{reviewAnswer.ai_feedback}</p>
                    </div>
                  )}
                  <Separator />
                  <div className="space-y-2">
                    <Label>Nota do Professor (máx: {Number(reviewAnswer.max_points)})</Label>
                    <Input
                      type="number"
                      min={0}
                      max={Number(reviewAnswer.max_points)}
                      step={0.5}
                      value={teacherScore}
                      onChange={(e) => setTeacherScore(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Feedback (opcional)</Label>
                    <Textarea
                      value={teacherFeedback}
                      onChange={(e) => setTeacherFeedback(e.target.value)}
                      rows={3}
                      placeholder="Comentário para o aluno..."
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancelar</Button>
            <Button onClick={saveReview}>Salvar Nota</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
