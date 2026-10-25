import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
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

  const grade = totalMax > 0 ? totalEarned.toFixed(1).replace(".", ",") : "—";
  const gradeTone = percentage >= 60 ? "text-success" : "text-destructive";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/student/auth")} className="-ml-2 mb-3">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <PageHeader
            eyebrow="Resultado da prova"
            title={examTitle}
            description={
              <span className="flex flex-wrap items-center gap-3">
                <StatusBadge tone={session?.status === "graded" ? "ok" : "warn"} dot>
                  {session?.status === "submitted" ? "Enviada · em correção" : session?.status === "graded" ? "Corrigida" : session?.status}
                </StatusBadge>
                {session?.started_at && session?.finished_at && (
                  <span className="flex items-center gap-1 text-sm">
                    <Clock className="h-3.5 w-3.5" />
                    {Math.round((new Date(session.finished_at).getTime() - new Date(session.started_at).getTime()) / 60000)} min
                  </span>
                )}
              </span>
            }
          />
          <div className="flex flex-wrap gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={() => navigate("/student/gamification")}>
              <Trophy className="h-4 w-4" /> Gamificação
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/student/portfolio")}>
              <BookOpen className="h-4 w-4" /> Portfólio
            </Button>
            <Button size="sm" disabled={loadingFeedback} onClick={async () => {
              setLoadingFeedback(true);
              try {
                const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-student-feedback`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
                  body: JSON.stringify({ studentEmail, sessionId, feedbackType: "exam" }),
                });
                const data = await res.json();
                if (res.status === 429) { toast.error("Limite de uso atingido. Tente novamente mais tarde."); }
                else if (res.status === 402) { toast.error("Créditos esgotados."); }
                else if (data.feedback) { setAiFeedback(data.feedback); toast.success("Feedback gerado!"); }
                else { toast.error("Erro ao gerar feedback"); }
              } catch { toast.error("Erro de conexão"); }
              setLoadingFeedback(false);
            }}>
              {loadingFeedback ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Feedback IA
            </Button>
          </div>
        </div>

        <Card className="p-8 text-center">
          <div className="label-mono">Sua nota</div>
          <p className={`mt-3 font-heading text-6xl font-medium tabular-nums ${totalMax > 0 ? gradeTone : ""}`}>
            {grade}<span className="text-2xl text-muted-foreground">/{totalMax.toFixed(1).replace(".", ",")}</span>
          </p>
          <p className="mt-2 font-mono text-sm text-muted-foreground">{percentage.toFixed(0)}%</p>
        </Card>

        {/* AI Feedback Card */}
        {aiFeedback && (
          <Card className="border-primary/30 bg-brand-soft p-6 space-y-4 text-sm">
            <h2 className="flex items-center gap-2 font-heading text-lg font-medium"><Sparkles className="h-4 w-4 text-primary" /> Feedback personalizado da IA</h2>
            <p>{aiFeedback.summary}</p>
            {aiFeedback.strengths?.length > 0 && (
              <div>
                <p className="label-mono mb-2">Pontos fortes</p>
                <ul className="list-disc list-inside space-y-1">{aiFeedback.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {aiFeedback.weaknesses?.length > 0 && (
              <div>
                <p className="label-mono mb-2">Áreas de melhoria</p>
                <ul className="list-disc list-inside space-y-1">{aiFeedback.weaknesses.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {aiFeedback.recommendations?.length > 0 && (
              <div>
                <p className="label-mono mb-2">Recomendações</p>
                <ul className="list-disc list-inside space-y-1">{aiFeedback.recommendations.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
          </Card>
        )}

        {answers.map((a, i) => {
          const content = (a.question_bank?.content_json || {}) as Record<string, unknown>;
          const statement = (content.question_text as string) || (content.statement as string) || (content.title as string) || "Questão";
          const score = Number(a.teacher_score ?? a.ai_score ?? a.points_earned) || 0;
          const max = Number(a.max_points) || 0;
          const pending = a.is_correct == null && a.grading_status === "pending";

          return (
            <Card key={a.id} className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b bg-sunken px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-heading text-xl font-medium tabular-nums">{i + 1}</span>
                  {a.is_correct === true && <StatusBadge tone="ok"><CheckCircle2 className="h-3 w-3" />Correta</StatusBadge>}
                  {a.is_correct === false && <StatusBadge tone="bad"><XCircle className="h-3 w-3" />Incorreta</StatusBadge>}
                  {pending && <StatusBadge tone="warn">Em correção</StatusBadge>}
                </div>
                <span className="font-mono text-sm font-medium">{score}/{max}</span>
              </div>
              <div className="space-y-4 p-5">
                <p className="text-sm leading-relaxed">{statement}</p>
                <div>
                  <p className="label-mono mb-1.5">Sua resposta</p>
                  <p className="rounded-md bg-sunken p-3 text-sm">
                    {a.answer_text || (a.answer_json as Record<string, string>)?.selected || "Sem resposta"}
                  </p>
                </div>

                {a.ai_feedback && (
                  <div>
                    <p className="label-mono mb-1.5 flex items-center gap-1.5"><Bot className="h-3 w-3" /> Feedback da IA</p>
                    <p className="rounded-md bg-brand-soft p-3 text-sm text-brand-text">{a.ai_feedback}</p>
                  </div>
                )}
                {a.teacher_feedback && (
                  <div>
                    <p className="label-mono mb-1.5">Feedback do professor</p>
                    <p className="rounded-md border-l-4 border-primary bg-sunken p-3 text-sm">{a.teacher_feedback}</p>
                  </div>
                )}

                {typeof content.answer_key === "string" && (content.answer_key as string).trim() && (
                  <div>
                    <p className="label-mono mb-1.5 flex items-center gap-1.5"><BookOpen className="h-3 w-3" /> Espelho de resposta</p>
                    <p className="whitespace-pre-wrap rounded-md border border-highlight/40 bg-highlight/10 p-3 text-sm">
                      {content.answer_key as string}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
