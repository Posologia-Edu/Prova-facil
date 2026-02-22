import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock, ChevronLeft, ChevronRight, Send, Loader2, AlertTriangle, CheckCircle2, FileText, Shield } from "lucide-react";
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

  // Helper to extract content fields regardless of JSON shape
  const getStatement = (content: Record<string, unknown>): string => {
    return (content.question_text as string) || (content.statement as string) || (content.title as string) || "Questão sem enunciado";
  };

  const getAlternatives = (content: Record<string, unknown>, type: string): Array<{ letter: string; text: string; correct?: boolean }> => {
    // Handle `alternatives` array format
    if (Array.isArray(content.alternatives)) {
      return (content.alternatives as Array<Record<string, unknown>>).map(a => ({
        letter: String(a.letter),
        text: String(a.text),
        correct: !!a.correct,
      }));
    }
    // Handle `options` object format: { a: "text", b: "text", ... }
    if (content.options && typeof content.options === "object" && !Array.isArray(content.options)) {
      const opts = content.options as Record<string, string>;
      return Object.entries(opts).map(([letter, text]) => ({
        letter,
        text,
        correct: content.correct_answer === letter,
      }));
    }
    return [];
  };

  const submitExam = useCallback(async (auto = false) => {
    if (submitting || autoSubmittedRef.current) return;
    if (auto) autoSubmittedRef.current = true;
    setSubmitting(true);

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession || !sessionId) return;

      for (const q of questions) {
        const ans = answers[q.id];
        const answerText = ans?.answer_text || "";
        const answerJson = ans?.answer_json || {};

        let isCorrect: boolean | null = null;
        let pointsEarned = 0;
        let gradingStatus = "pending";

        const content = q.content_json as Record<string, unknown>;
        if (q.type === "multiple_choice" || q.type === "true_false") {
          const alts = getAlternatives(content, q.type);
          const correctAlt = alts.find(a => a.correct);
          const selectedLetter = (answerJson as Record<string, string>).selected;
          isCorrect = correctAlt ? String(correctAlt.letter) === selectedLetter : false;
          pointsEarned = isCorrect ? q.points : 0;
          gradingStatus = "graded";
        }

        const { data: existing } = await supabase
          .from("student_answers")
          .select("id")
          .eq("session_id", sessionId)
          .eq("question_id", q.id)
          .maybeSingle();

        if (existing) {
          await supabase.from("student_answers").update({
            answer_text: answerText,
            answer_json: answerJson as Json,
            is_correct: isCorrect,
            points_earned: pointsEarned,
            max_points: q.points,
            grading_status: gradingStatus,
          }).eq("id", existing.id);
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

      const totalScore = questions.reduce((sum, q) => {
        const content = q.content_json as Record<string, unknown>;
        if (q.type === "multiple_choice" || q.type === "true_false") {
          const alts = getAlternatives(content, q.type);
          const correctAlt = alts.find(a => a.correct);
          const ans = answers[q.id];
          const selectedLetter = (ans?.answer_json as Record<string, string>)?.selected;
          const correct = correctAlt ? String(correctAlt.letter) === selectedLetter : false;
          return sum + (correct ? q.points : 0);
        }
        return sum;
      }, 0);

      const maxScore = questions.reduce((sum, q) => sum + q.points, 0);

      await supabase.from("exam_sessions").update({
        status: "submitted",
        finished_at: new Date().toISOString(),
        total_score: totalScore,
        max_score: maxScore,
      }).eq("id", sessionId);

      const subjectiveQuestions = questions.filter(q => q.type === "open_ended" || q.type === "matching");
      if (subjectiveQuestions.length > 0) {
        try { await supabase.functions.invoke("grade-exam", { body: { sessionId } }); }
        catch { console.warn("AI grading will be processed later"); }
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

      const startedAt = new Date(examSession.started_at).getTime();
      const limitMs = pub.time_limit_minutes * 60 * 1000;
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.floor((limitMs - elapsed) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) { submitExam(true); return; }

      const { data: exam } = await supabase
        .from("exams")
        .select("title")
        .eq("id", pub.exam_id)
        .single();

      setExamTitle(exam?.title || "Prova");

      // Load questions - use service-level query to get actual exam questions
      const { data: examQuestions } = await supabase
        .from("exam_questions")
        .select("question_id, position, points, section_name")
        .eq("exam_id", pub.exam_id)
        .order("position");

      if (!examQuestions || examQuestions.length === 0) {
        toast.error("Nenhuma questão encontrada nesta prova.");
        return;
      }

      const questionIds = examQuestions.map(eq => eq.question_id);
      const { data: bankQuestions } = await supabase
        .from("question_bank")
        .select("id, type, content_json")
        .in("id", questionIds);

      const merged: Question[] = examQuestions.map(eq => {
        const bq = bankQuestions?.find(b => b.id === eq.question_id);
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

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
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

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft !== null, submitExam]);

  const setAnswer = (questionId: string, text: string, json: Record<string, unknown> = {}) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { question_id: questionId, answer_text: text, answer_json: json },
    }));
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando prova...</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const content = (currentQ?.content_json || {}) as Record<string, unknown>;
  const statement = getStatement(content);
  const alternatives = getAlternatives(content, currentQ?.type || "");
  const answeredCount = Object.keys(answers).filter(k => {
    const a = answers[k];
    return a.answer_text || (a.answer_json as Record<string, string>)?.selected;
  }).length;
  const isTimeLow = timeLeft !== null && timeLeft < 300;
  const progressPercent = (answeredCount / questions.length) * 100;

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Professional top bar */}
      <header className="bg-card border-b shadow-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-1.5">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold text-sm sm:text-base leading-tight">{examTitle}</h1>
                <p className="text-[11px] text-muted-foreground">
                  Questão {currentIdx + 1} de {questions.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {timeLeft !== null && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold ${
                  isTimeLow 
                    ? "bg-destructive/10 text-destructive animate-pulse border border-destructive/20" 
                    : "bg-muted text-foreground"
                }`}>
                  {isTimeLow && <AlertTriangle className="h-4 w-4" />}
                  <Clock className="h-4 w-4" />
                  {formatTime(timeLeft)}
                </div>
              )}
              <Button
                size="sm"
                onClick={() => setShowSubmitDialog(true)}
                disabled={submitting}
                className="gap-1.5 font-semibold"
              >
                <Send className="h-3.5 w-3.5" />
                Entregar
              </Button>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-6">
          {/* Question card */}
          <div className="space-y-4">
            {currentQ && (
              <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                {/* Question header */}
                <div className="px-6 py-4 bg-muted/30 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-md">
                      {currentIdx + 1}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-medium">
                      {currentQ.section_name}
                    </Badge>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {currentQ.points} {currentQ.points === 1 ? "ponto" : "pontos"}
                  </span>
                </div>

                {/* Question statement */}
                <div className="px-6 py-5">
                  <p className="text-sm sm:text-base leading-relaxed text-foreground whitespace-pre-wrap">
                    {statement}
                  </p>
                </div>

                <Separator />

                {/* Answer area */}
                <div className="px-6 py-5">
                  {(currentQ.type === "multiple_choice") && alternatives.length > 0 && (
                    <RadioGroup
                      value={(answers[currentQ.id]?.answer_json as Record<string, string>)?.selected || ""}
                      onValueChange={(val) => setAnswer(currentQ.id, val, { selected: val })}
                      className="space-y-2"
                    >
                      {alternatives.map((alt, i) => {
                        const isSelected = (answers[currentQ.id]?.answer_json as Record<string, string>)?.selected === alt.letter;
                        return (
                          <label
                            key={i}
                            htmlFor={`alt-${currentQ.id}-${i}`}
                            className={`flex items-start gap-3 p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-transparent bg-muted/40 hover:bg-muted/70 hover:border-muted-foreground/20"
                            }`}
                          >
                            <RadioGroupItem value={alt.letter} id={`alt-${currentQ.id}-${i}`} className="mt-0.5 shrink-0" />
                            <span className="text-sm leading-relaxed">
                              <span className="font-bold text-primary mr-1.5">{alt.letter.toUpperCase()})</span>
                              {alt.text}
                            </span>
                          </label>
                        );
                      })}
                    </RadioGroup>
                  )}

                  {currentQ.type === "true_false" && (
                    <RadioGroup
                      value={(answers[currentQ.id]?.answer_json as Record<string, string>)?.selected || ""}
                      onValueChange={(val) => setAnswer(currentQ.id, val, { selected: val })}
                      className="space-y-2"
                    >
                      {[
                        { value: "true", label: "Verdadeiro" },
                        { value: "false", label: "Falso" },
                      ].map((opt) => {
                        const isSelected = (answers[currentQ.id]?.answer_json as Record<string, string>)?.selected === opt.value;
                        return (
                          <label
                            key={opt.value}
                            htmlFor={`tf-${currentQ.id}-${opt.value}`}
                            className={`flex items-center gap-3 p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-transparent bg-muted/40 hover:bg-muted/70 hover:border-muted-foreground/20"
                            }`}
                          >
                            <RadioGroupItem value={opt.value} id={`tf-${currentQ.id}-${opt.value}`} />
                            <span className="font-medium text-sm">{opt.label}</span>
                          </label>
                        );
                      })}
                    </RadioGroup>
                  )}

                  {(currentQ.type === "open_ended" || currentQ.type === "matching") && (
                    <div className="space-y-2">
                      {currentQ.type === "matching" && content.column_a && (
                        <div className="mb-4 space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Coluna A</p>
                              {(content.column_a as string[]).map((item, i) => (
                                <div key={i} className="text-sm p-2 bg-muted/40 rounded mb-1.5">
                                  {i + 1}. {item}
                                </div>
                              ))}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Coluna B</p>
                              {(content.column_b as string[]).map((item, i) => (
                                <div key={i} className="text-sm p-2 bg-muted/40 rounded mb-1.5">
                                  {String.fromCharCode(65 + i)}. {item}
                                </div>
                              ))}
                            </div>
                          </div>
                          <Separator />
                        </div>
                      )}
                      <Textarea
                        placeholder={
                          currentQ.type === "matching"
                            ? "Digite as correspondências (ex: 1-B, 2-A, 3-D, 4-C)"
                            : "Digite sua resposta aqui..."
                        }
                        value={answers[currentQ.id]?.answer_text || ""}
                        onChange={(e) => setAnswer(currentQ.id, e.target.value)}
                        rows={6}
                        className="resize-none text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIdx(p => Math.max(0, p - 1))}
                disabled={currentIdx === 0}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIdx(p => Math.min(questions.length - 1, p + 1))}
                disabled={currentIdx === questions.length - 1}
                className="gap-1"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Side navigation panel */}
          <div className="hidden lg:block">
            <div className="bg-card rounded-xl border shadow-sm p-4 sticky top-20">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Questões</p>
                <p className="text-xs text-muted-foreground">{answeredCount}/{questions.length}</p>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((q, i) => {
                  const hasAnswer = answers[q.id]?.answer_text || (answers[q.id]?.answer_json as Record<string, string>)?.selected;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIdx(i)}
                      className={`h-8 w-8 rounded-md text-xs font-medium transition-all ${
                        i === currentIdx
                          ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30"
                          : hasAnswer
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              <Separator className="my-4" />

              {/* Status summary */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-primary/15 border border-primary/30" />
                  <span className="text-muted-foreground">Respondidas: {answeredCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-muted" />
                  <span className="text-muted-foreground">Pendentes: {questions.length - answeredCount}</span>
                </div>
              </div>

              <Separator className="my-4" />

              <Button
                size="sm"
                className="w-full gap-1.5 text-xs"
                onClick={() => setShowSubmitDialog(true)}
                disabled={submitting}
              >
                <Send className="h-3.5 w-3.5" />
                Entregar Prova
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile question navigator */}
        <div className="lg:hidden mt-4">
          <div className="bg-card rounded-xl border shadow-sm p-3">
            <div className="flex gap-1.5 flex-wrap justify-center">
              {questions.map((q, i) => {
                const hasAnswer = answers[q.id]?.answer_text || (answers[q.id]?.answer_json as Record<string, string>)?.selected;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(i)}
                    className={`h-8 w-8 rounded-md text-xs font-medium transition-all ${
                      i === currentIdx
                        ? "bg-primary text-primary-foreground shadow-md"
                        : hasAnswer
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-2 text-center">
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <Shield className="h-3 w-3" />
          Ambiente seguro de avaliação · ProvaFácil
        </div>
      </footer>

      {/* Submit dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Entregar prova?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Você respondeu <strong>{answeredCount}</strong> de <strong>{questions.length}</strong> questões.</p>
                {answeredCount < questions.length && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20">
                    <AlertTriangle className="h-4 w-4 inline mr-1.5" />
                    {questions.length - answeredCount} questão(ões) em branco. Após entregar, não será possível alterar.
                  </div>
                )}
                {answeredCount === questions.length && (
                  <div className="bg-primary/10 text-primary text-sm p-3 rounded-lg border border-primary/20">
                    <CheckCircle2 className="h-4 w-4 inline mr-1.5" />
                    Todas as questões foram respondidas!
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar Prova</AlertDialogCancel>
            <AlertDialogAction onClick={() => submitExam(false)} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Confirmar Entrega
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
