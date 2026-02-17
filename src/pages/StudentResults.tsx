import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Loader2, Bot } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

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
  question_bank: {
    type: string;
    content_json: Json;
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

  useEffect(() => {
    const load = async () => {
      if (!sessionId) return;

      const { data: sess } = await supabase
        .from("exam_sessions")
        .select("*, exam_publications(exam_id)")
        .eq("id", sessionId)
        .single();

      if (!sess) { navigate("/student/dashboard"); return; }
      setSession(sess);

      const pub = sess.exam_publications as unknown as { exam_id: string };
      const { data: exam } = await supabase
        .from("exams")
        .select("title")
        .eq("id", pub.exam_id)
        .single();
      setExamTitle(exam?.title || "Prova");

      const { data: ans } = await supabase
        .from("student_answers")
        .select("*, question_bank(type, content_json)")
        .eq("session_id", sessionId)
        .order("created_at");

      setAnswers((ans as unknown as AnswerRow[]) || []);
      setLoading(false);
    };
    load();
  }, [sessionId, navigate]);

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
        <Button variant="ghost" size="sm" onClick={() => navigate("/student/dashboard")} className="mb-2">
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
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Score summary */}
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-4xl font-bold">{totalEarned.toFixed(1)}<span className="text-muted-foreground text-xl">/{totalMax.toFixed(1)}</span></p>
            <p className="text-lg text-muted-foreground mt-1">{percentage.toFixed(0)}%</p>
          </CardContent>
        </Card>

        {/* Answers */}
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
              </CardContent>
            </Card>
          );
        })}
      </main>
    </div>
  );
}
