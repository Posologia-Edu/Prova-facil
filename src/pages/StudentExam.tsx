import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock, ChevronLeft, ChevronRight, Send, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface Question {
  id: string;
  type: string;
  content_json: Json;
  position: number;
  points: number;
  section_name: string;
}

interface Answer {
  question_id: string;
  answer_text: string;
  answer_json: Record<string, unknown>;
}

export default function StudentExam() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [examTitle, setExamTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSubmittedRef = useRef(false);

  const submitExam = useCallback(async (auto = false) => {
    if (submitting || autoSubmittedRef.current) return;
    if (auto) autoSubmittedRef.current = true;
    setSubmitting(true);

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession || !sessionId) return;

      // Save all answers
      for (const q of questions) {
        const ans = answers[q.id];
        const answerText = ans?.answer_text || "";
        const answerJson = ans?.answer_json || {};

        // Auto-grade objective questions
        let isCorrect: boolean | null = null;
        let pointsEarned = 0;
        let gradingStatus = "pending";

        const content = q.content_json as Record<string, unknown>;
        if (q.type === "multiple_choice" || q.type === "true_false") {
          const alternatives = (content?.alternatives as Array<Record<string, unknown>>) || [];
          const correctAlt = alternatives.find((a) => a.correct === true);
          const selectedLetter = (answerJson as Record<string, string>).selected;
          isCorrect = correctAlt ? String(correctAlt.letter) === selectedLetter : false;
          pointsEarned = isCorrect ? q.points : 0;
          gradingStatus = "graded";
        }

        // Check if answer already exists
        const { data: existing } = await supabase
          .from("student_answers")
          .select("id")
          .eq("session_id", sessionId)
          .eq("question_id", q.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("student_answers")
            .update({
              answer_text: answerText,
              answer_json: answerJson as Json,
              is_correct: isCorrect,
              points_earned: pointsEarned,
              max_points: q.points,
              grading_status: gradingStatus,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("student_answers").insert({
            session_id: sessionId,
            question_id: q.id,
            answer_text: answerText,
            answer_json: answerJson as Json,
            is_correct: isCorrect,
            points_earned: pointsEarned,
            max_points: q.points,
            grading_status: gradingStatus,
          });
        }
      }

      // Calculate total score for graded questions
      const totalScore = questions.reduce((sum, q) => {
        const content = q.content_json as Record<string, unknown>;
        if (q.type === "multiple_choice" || q.type === "true_false") {
          const alternatives = (content?.alternatives as Array<Record<string, unknown>>) || [];
          const correctAlt = alternatives.find((a) => a.correct === true);
          const ans = answers[q.id];
          const selectedLetter = (ans?.answer_json as Record<string, string>)?.selected;
          const correct = correctAlt ? String(correctAlt.letter) === selectedLetter : false;
          return sum + (correct ? q.points : 0);
        }
        return sum;
      }, 0);

      const maxScore = questions.reduce((sum, q) => sum + q.points, 0);

      // Update session
      await supabase
        .from("exam_sessions")
        .update({
          status: "submitted",
          finished_at: new Date().toISOString(),
          total_score: totalScore,
          max_score: maxScore,
        })
        .eq("id", sessionId);

      // Trigger AI grading for subjective questions
      const subjectiveQuestions = questions.filter(
        (q) => q.type === "open_ended" || q.type === "matching"
      );
      if (subjectiveQuestions.length > 0) {
        try {
          await supabase.functions.invoke("grade-exam", {
            body: { sessionId },
          });
        } catch {
          console.warn("AI grading will be processed later");
        }
      }

      toast.success(auto ? "Tempo esgotado! Prova enviada automaticamente." : "Prova enviada com sucesso!");
      navigate(`/student/results/${sessionId}`);
    } catch (error) {
      console.error("Error submitting exam:", error);
      toast.error("Erro ao enviar prova. Tente novamente.");
      setSubmitting(false);
    }
  }, [submitting, sessionId, questions, answers, navigate]);

  useEffect(() => {
    const loadExam = async () => {
      if (!sessionId) return;

      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) { navigate("/student/auth"); return; }

      // Load session
      const { data: examSession, error: sessError } = await supabase
        .from("exam_sessions")
        .select("*, exam_publications(*)")
        .eq("id", sessionId)
        .single();

      if (sessError || !examSession) {
        toast.error("Sessão não encontrada.");
        navigate("/student/dashboard");
        return;
      }

      if (examSession.status !== "in_progress") {
        navigate(`/student/results/${sessionId}`);
        return;
      }

      const pub = examSession.exam_publications as unknown as {
        exam_id: string;
        time_limit_minutes: number;
      };

      // Calculate remaining time
      const startedAt = new Date(examSession.started_at).getTime();
      const limitMs = pub.time_limit_minutes * 60 * 1000;
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.floor((limitMs - elapsed) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        submitExam(true);
        return;
      }

      // Load exam info
      const { data: exam } = await supabase
        .from("exams")
        .select("title")
        .eq("id", pub.exam_id)
        .single();

      setExamTitle(exam?.title || "Prova");

      // Load questions
      const { data: examQuestions } = await supabase
        .from("exam_questions")
        .select("question_id, position, points, section_name")
        .eq("exam_id", pub.exam_id)
        .order("position");

      if (!examQuestions || examQuestions.length === 0) {
        toast.error("Nenhuma questão encontrada nesta prova.");
        return;
      }

      const questionIds = examQuestions.map((eq) => eq.question_id);
      const { data: bankQuestions } = await supabase
        .from("question_bank")
        .select("id, type, content_json")
        .in("id", questionIds);

      const merged: Question[] = examQuestions.map((eq) => {
        const bq = bankQuestions?.find((b) => b.id === eq.question_id);
        return {
          id: eq.question_id,
          type: bq?.type || "open_ended",
          content_json: bq?.content_json || {},
          position: eq.position,
          points: Number(eq.points) || 1,
          section_name: eq.section_name || "Geral",
        };
      });

      setQuestions(merged);

      // Load existing answers
      const { data: existingAnswers } = await supabase
        .from("student_answers")
        .select("question_id, answer_text, answer_json")
        .eq("session_id", sessionId);

      if (existingAnswers) {
        const ansMap: Record<string, Answer> = {};
        for (const a of existingAnswers) {
          ansMap[a.question_id] = {
            question_id: a.question_id,
            answer_text: a.answer_text || "",
            answer_json: (a.answer_json as Record<string, unknown>) || {},
          };
        }
        setAnswers(ansMap);
      }

      setLoading(false);
    };

    loadExam();
  }, [sessionId, navigate, submitExam]);

  // Timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        const next = prev - 1;
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          submitExam(true);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft !== null, submitExam]);

  const setAnswer = (questionId: string, text: string, json: Record<string, unknown> = {}) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { question_id: questionId, answer_text: text, answer_json: json },
    }));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const content = (currentQ?.content_json || {}) as Record<string, unknown>;
  const statement = (content.statement as string) || (content.title as string) || "Questão sem enunciado";
  const alternatives = (content.alternatives as Array<Record<string, unknown>>) || [];
  const answeredCount = Object.keys(answers).filter((k) => {
    const a = answers[k];
    return a.answer_text || (a.answer_json as Record<string, string>)?.selected;
  }).length;
  const isTimeLow = timeLeft !== null && timeLeft < 300;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with timer */}
      <header className="border-b bg-card px-6 py-3 flex items-center justify-between shrink-0 sticky top-0 z-10">
        <div>
          <h1 className="font-bold text-lg">{examTitle}</h1>
          <p className="text-xs text-muted-foreground">
            Questão {currentIdx + 1} de {questions.length} · {answeredCount}/{questions.length} respondidas
          </p>
        </div>
        <div className="flex items-center gap-4">
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 font-mono text-lg font-bold ${isTimeLow ? "text-destructive animate-pulse" : "text-foreground"}`}>
              {isTimeLow && <AlertTriangle className="h-5 w-5" />}
              <Clock className="h-5 w-5" />
              {formatTime(timeLeft)}
            </div>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowSubmitDialog(true)}
            disabled={submitting}
          >
            <Send className="h-4 w-4 mr-2" />
            Entregar
          </Button>
        </div>
      </header>

      {/* Progress */}
      <div className="px-6 py-2 bg-card border-b">
        <Progress value={(answeredCount / questions.length) * 100} className="h-2" />
      </div>

      {/* Question */}
      <main className="flex-1 max-w-3xl mx-auto w-full p-6">
        {currentQ && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{currentQ.section_name}</Badge>
                <span className="text-sm text-muted-foreground">{currentQ.points} pts</span>
              </div>
              <CardTitle className="text-base mt-3 leading-relaxed">{statement}</CardTitle>
            </CardHeader>
            <CardContent>
              {(currentQ.type === "multiple_choice") && alternatives.length > 0 && (
                <RadioGroup
                  value={(answers[currentQ.id]?.answer_json as Record<string, string>)?.selected || ""}
                  onValueChange={(val) => setAnswer(currentQ.id, val, { selected: val })}
                  className="space-y-3"
                >
                  {alternatives.map((alt, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value={String(alt.letter)} id={`alt-${i}`} className="mt-0.5" />
                      <Label htmlFor={`alt-${i}`} className="cursor-pointer flex-1 text-sm">
                        <span className="font-semibold mr-2">{String(alt.letter)})</span>
                        {String(alt.text)}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {currentQ.type === "true_false" && (
                <RadioGroup
                  value={(answers[currentQ.id]?.answer_json as Record<string, string>)?.selected || ""}
                  onValueChange={(val) => setAnswer(currentQ.id, val, { selected: val })}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="true" id="tf-true" />
                    <Label htmlFor="tf-true" className="cursor-pointer">Verdadeiro</Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="false" id="tf-false" />
                    <Label htmlFor="tf-false" className="cursor-pointer">Falso</Label>
                  </div>
                </RadioGroup>
              )}

              {(currentQ.type === "open_ended" || currentQ.type === "matching") && (
                <Textarea
                  placeholder="Digite sua resposta aqui..."
                  value={answers[currentQ.id]?.answer_text || ""}
                  onChange={(e) => setAnswer(currentQ.id, e.target.value)}
                  rows={8}
                  className="resize-none"
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Question navigator */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
            disabled={currentIdx === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>

          <div className="flex gap-1.5 flex-wrap justify-center max-w-md">
            {questions.map((q, i) => {
              const hasAnswer = answers[q.id]?.answer_text || (answers[q.id]?.answer_json as Record<string, string>)?.selected;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(i)}
                  className={`h-8 w-8 rounded text-xs font-medium transition-colors ${
                    i === currentIdx
                      ? "bg-primary text-primary-foreground"
                      : hasAnswer
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            onClick={() => setCurrentIdx((p) => Math.min(questions.length - 1, p + 1))}
            disabled={currentIdx === questions.length - 1}
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </main>

      {/* Submit dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Entregar prova?</AlertDialogTitle>
            <AlertDialogDescription>
              Você respondeu {answeredCount} de {questions.length} questões.
              {answeredCount < questions.length && (
                <span className="text-destructive font-medium block mt-2">
                  Atenção: {questions.length - answeredCount} questão(ões) em branco.
                </span>
              )}
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => submitExam(false)} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar entrega
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
