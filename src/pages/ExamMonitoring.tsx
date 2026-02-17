import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Users, Clock, CheckCircle2, Loader2, Bot, Eye } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

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
  const [teacherFeedback, setTeacherFeedback] = useState("");

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
      .select("*, profiles!exam_sessions_student_id_fkey(full_name)")
      .eq("publication_id", publicationId)
      .order("created_at", { ascending: false });

    // The join may not work with FK, so let's fetch profiles separately
    if (sess) {
      const studentIds = sess.map((s) => s.student_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", studentIds);

      const enriched = sess.map((s) => ({
        ...s,
        profiles: profiles?.find((p) => p.user_id === s.student_id) || null,
      }));
      setSessions(enriched as SessionRow[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadSessions();

    // Realtime subscription
    const channel = supabase
      .channel("monitoring")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "exam_sessions",
        filter: `publication_id=eq.${publicationId}`,
      }, () => { loadSessions(); })
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
            <CheckCircle2 className="h-5 w-5 mx-auto text-green-600 mb-1" />
            <p className="text-2xl font-bold">{submitted}</p>
            <p className="text-xs text-muted-foreground">Finalizadas</p>
          </CardContent>
        </Card>
      </div>

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
                    <Badge variant={s.status === "in_progress" ? "default" : s.status === "graded" ? "secondary" : "outline"} className="text-xs">
                      {s.status === "in_progress" ? "Fazendo" : s.status === "submitted" ? "Enviada" : "Corrigida"}
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

      {/* Review dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisar Nota</DialogTitle>
          </DialogHeader>
          {reviewAnswer && (
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
                <Input type="number" min={0} max={Number(reviewAnswer.max_points)} step={0.5} value={teacherScore} onChange={(e) => setTeacherScore(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Feedback (opcional)</Label>
                <Textarea value={teacherFeedback} onChange={(e) => setTeacherFeedback(e.target.value)} rows={3} placeholder="Comentário para o aluno..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancelar</Button>
            <Button onClick={saveReview}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
