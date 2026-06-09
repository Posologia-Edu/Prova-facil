import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Loader2, Bot, Trophy, BookOpen, Sparkles } from "lucide-react";
import { toast } from "sonner";

const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/student-exam-access`;

interface AnswerRow {
  id: string;
  question_id: string;
  answer_text: string | null;
  answer_json: Record<string, unknown>;
  is_correct: boolean | null;
  points_earned: number | null;
  max_points: number | null;
  ai_score: number | null;
  ai_feedback: string | null;
  teacher_score: number | null;
  teacher_feedback: string | null;
  grading_status: string;
  question_bank: {
    type: string;
    content_json: Record<string, unknown>;
  } | null;
}

export default function StudentResults() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [session, setSession] = useState<{
    status: string;
    total_score: number | null;
    max_score: number | null;
    started_at: string;
    finished_at: string | null;
  } | null>(null);
  const [examTitle, setExamTitle] = useState("");
  const [aiFeedback, setAiFeedback] = useState<any>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const studentEmail = sessionStorage.getItem("student_email");

  useEffect(() => {
    const load = async () => {
      if (!sessionId || !studentEmail) {
        navigate("/student/auth");
        return;
      }

      try {
        const res = await fetch(FUNCTION_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "results", sessionId, email: studentEmail }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          navigate("/student/auth");
          return;
        }

        setExamTitle(data.examTitle);
        setSession(data.session);
        setAnswers(data.answers || []);
        setLoading(false);
      } catch {
        navigate("/student/auth");
      }
    };
    load();
  }, [sessionId, studentEmail, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalEarned = answers.reduce((s, a) => s + (Number(a.teacher_score ?? a.ai_score ?? a.points_earned) || 0), 0);
  const totalMax = answers.reduce((s, a) => s + (Number(a.max_points) || 0), 0);
  const percentage = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/student/auth")} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-xl font-bold">{examTitle}</h1>
        <div className="flex items-center gap-4 mt-2">
          <Badge variant={session?.status === "graded" ? "secondary" : "outline"}>
            {session?.status === "submitted" ? "Enviada" : session?.status === "graded" ? "Corrigida" : session?.status}
          </Badge>
          {session?.started_at && session?.finished_at && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {Math.round((new Date(session.finished_at).getTime() - new Date(session.started_at).getTime()) / 60000)} min
            </span>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={() => navigate("/student/gamification")}>
            <Trophy className="h-4 w-4 mr-1" /> Gamificação
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/student/portfolio")}>
            <BookOpen className="h-4 w-4 mr-1" /> Portfólio
          </Button>
          <Button size="sm" variant="outline" disabled={loadingFeedback} onClick={async () => {
            setLoadingFeedback(true);
            try {
              const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-student-feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
                body: JSON.stringify({ studentEmail, feedbackType: "exam" }),
              });
              const data = await res.json();
              if (res.status === 429) { toast.error("Limite de uso atingido. Tente novamente mais tarde."); }
              else if (res.status === 402) { toast.error("Créditos esgotados."); }
              else if (data.feedback) { setAiFeedback(data.feedback); toast.success("Feedback gerado!"); }
              else { toast.error("Erro ao gerar feedback"); }
            } catch { toast.error("Erro de conexão"); }
            setLoadingFeedback(false);
          }}>
            {loadingFeedback ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Feedback IA
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {/* AI Feedback Card */}
        {aiFeedback && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> Feedback Personalizado da IA</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{aiFeedback.summary}</p>
              {aiFeedback.strengths?.length > 0 && (
                <div>
                  <p className="font-medium text-xs text-muted-foreground mb-1">Pontos Fortes:</p>
                  <ul className="list-disc list-inside space-y-1">{aiFeedback.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
              {aiFeedback.weaknesses?.length > 0 && (
                <div>
                  <p className="font-medium text-xs text-muted-foreground mb-1">Áreas de Melhoria:</p>
                  <ul className="list-disc list-inside space-y-1">{aiFeedback.weaknesses.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
              {aiFeedback.recommendations?.length > 0 && (
                <div>
                  <p className="font-medium text-xs text-muted-foreground mb-1">Recomendações:</p>
                  <ul className="list-disc list-inside space-y-1">{aiFeedback.recommendations.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-4xl font-bold">{totalEarned.toFixed(1)}<span className="text-muted-foreground text-xl">/{totalMax.toFixed(1)}</span></p>
            <p className="text-lg text-muted-foreground mt-1">{percentage.toFixed(0)}%</p>
          </CardContent>
        </Card>

        {answers.map((a, i) => {
          const content = (a.question_bank?.content_json || {}) as Record<string, unknown>;
          const statement = (content.statement as string) || (content.title as string) || "Questão";
          const score = Number(a.teacher_score ?? a.ai_score ?? a.points_earned) || 0;
          const max = Number(a.max_points) || 0;

          return (
            <Card key={a.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Questão {i + 1}</span>
                  <div className="flex items-center gap-2">
                    {a.is_correct === true && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {a.is_correct === false && <XCircle className="h-4 w-4 text-destructive" />}
                    <span className="text-sm font-semibold">{score}/{max}</span>
                  </div>
                </div>
                <CardTitle className="text-sm font-normal mt-2">{statement}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Sua resposta:</p>
                  <p className="text-sm bg-muted/50 rounded p-2">
                    {a.answer_text || (a.answer_json as Record<string, string>)?.selected || "Sem resposta"}
                  </p>
                </div>

                {(a.ai_feedback || a.teacher_feedback) && (
                  <>
                    <Separator />
                    {a.ai_feedback && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <Bot className="h-3 w-3" /> Feedback da IA
                        </p>
                        <p className="text-sm bg-primary/5 rounded p-2">{a.ai_feedback}</p>
                      </div>
                    )}
                    {a.teacher_feedback && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Feedback do Professor</p>
                        <p className="text-sm bg-secondary/10 rounded p-2">{a.teacher_feedback}</p>
                      </div>
                    )}
                  </>
                )}

                {typeof content.answer_key === "string" && (content.answer_key as string).trim() && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> Espelho de Resposta
                      </p>
                      <p className="text-sm bg-amber-50 dark:bg-amber-900/10 border border-amber-300/40 rounded p-2 whitespace-pre-wrap">
                        {content.answer_key as string}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </main>
    </div>
  );
}
