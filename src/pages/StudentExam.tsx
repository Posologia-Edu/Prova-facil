import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock, ChevronLeft, ChevronRight, Send, Loader2, AlertTriangle, FileText, Save } from "lucide-react";
import AccessibilityPanel, { useA11ySettings, getA11yClasses, getA11yStyle, ReadingMask } from "@/components/AccessibilityPanel";
import { toast } from "sonner";

const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/student-exam-access`;

interface Question {
  id: string;
  type: string;
  content_json: Record<string, unknown>;
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
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const autoSubmittedRef = useRef(false);
  const [a11y, setA11y] = useA11ySettings();
  const lastSavedRef = useRef<string>("");

  const studentEmail = sessionStorage.getItem("student_email");

  const getStatement = (content: Record<string, unknown>): string => {
    return (content.question_text as string) || (content.statement as string) || (content.title as string) || "Questão sem enunciado";
  };

  const getAlternatives = (content: Record<string, unknown>): Array<{ letter: string; text: string }> => {
    if (Array.isArray(content.alternatives)) {
      return (content.alternatives as Array<Record<string, unknown>>).map(a => ({
        letter: String(a.letter),
        text: String(a.text),
      }));
    }
    if (content.options && typeof content.options === "object" && !Array.isArray(content.options)) {
      const opts = content.options as Record<string, string>;
      return Object.entries(opts).map(([letter, text]) => ({ letter, text }));
    }
    return [];
  };

  const submitExam = useCallback(async (auto = false) => {
    if (submitting || autoSubmittedRef.current) return;
    if (auto) autoSubmittedRef.current = true;
    setSubmitting(true);

    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", sessionId, email: studentEmail, answers }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao enviar prova.");
        setSubmitting(false);
        return;
      }

      toast.success(auto ? "Tempo esgotado! Prova enviada automaticamente." : "Prova enviada com sucesso!");
      navigate(`/student/results/${sessionId}`);
    } catch {
      toast.error("Erro ao enviar prova. Tente novamente.");
      setSubmitting(false);
    }
  }, [submitting, sessionId, studentEmail, answers, navigate]);

  useEffect(() => {
    const loadExam = async () => {
      if (!sessionId || !studentEmail) {
        navigate("/student/auth");
        return;
      }

      try {
        const res = await fetch(FUNCTION_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "load", sessionId, email: studentEmail }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          if (data.status === "finished") {
            navigate(`/student/results/${sessionId}`);
            return;
          }
          toast.error(data.error || "Erro ao carregar prova.");
          navigate("/student/auth");
          return;
        }

        setExamTitle(data.examTitle);
        setTimeLeft(data.timeLeft);
        setQuestions(data.questions);

        if (data.timeLeft <= 0) {
          submitExam(true);
          return;
        }

        // Restore existing answers
        if (data.existingAnswers?.length) {
          const ansMap: Record<string, Answer> = {};
          for (const a of data.existingAnswers) {
            ansMap[a.question_id] = {
              question_id: a.question_id,
              answer_text: a.answer_text || "",
              answer_json: a.answer_json || {},
            };
          }
          setAnswers(ansMap);
        }

        setLoading(false);
      } catch {
        toast.error("Erro de conexão.");
        navigate("/student/auth");
      }
    };

    loadExam();
  }, [sessionId, studentEmail, navigate]);

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

  // Auto-save progress every 30 seconds
  useEffect(() => {
    if (!sessionId || !studentEmail) return;

    autoSaveRef.current = setInterval(async () => {
      const answersSnapshot = JSON.stringify(answers);
      if (answersSnapshot === lastSavedRef.current || answersSnapshot === "{}") return;

      try {
        await fetch(FUNCTION_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save-progress", sessionId, email: studentEmail, answers }),
        });
        lastSavedRef.current = answersSnapshot;
      } catch {
        // Silently fail - will retry on next interval
      }
    }, 30000);

    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [sessionId, studentEmail, answers]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (Object.keys(answers).length > 0 && sessionId && studentEmail) {
        navigator.sendBeacon(
          FUNCTION_URL,
          JSON.stringify({ action: "save-progress", sessionId, email: studentEmail, answers })
        );
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [answers, sessionId, studentEmail]);

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

  const currentQ = questions[currentIdx];

  // Keyboard shortcuts for accessibility
  useEffect(() => {
    if (loading) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIdx(prev => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1));
      } else if (e.key === "r" || e.key === "R") {
        if (!("speechSynthesis" in window) || !currentQ) return;
        window.speechSynthesis.cancel();
        let text = getStatement(currentQ.content_json || {});
        const alts = getAlternatives(currentQ.content_json || {});
        if (alts.length) text += ". Alternativas: " + alts.map(a => `${a.letter}: ${a.text}`).join(". ");
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "pt-BR";
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      } else if (/^[1-5]$/.test(e.key) && currentQ) {
        const alts = getAlternatives(currentQ.content_json || {});
        const idx = parseInt(e.key) - 1;
        if (idx < alts.length) {
          setAnswer(currentQ.id, alts[idx].letter, { selected: alts[idx].letter });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [loading, questions.length, currentQ]);

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

  const content = currentQ?.content_json || {};
  const statement = getStatement(content);
  const alternatives = getAlternatives(content);
  const answeredCount = Object.keys(answers).filter(k => {
    const a = answers[k];
    return a.answer_text || (a.answer_json as Record<string, string>)?.selected;
  }).length;
  const isTimeLow = timeLeft !== null && timeLeft < 300;
  const progressPercent = (answeredCount / questions.length) * 100;

  return (
    <div className={`min-h-screen bg-muted/30 flex flex-col ${getA11yClasses(a11y)}`} style={getA11yStyle(a11y)}>
      {/* Top bar */}
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
                <div
                  role="timer"
                  aria-live="polite"
                  aria-label={`Tempo restante: ${formatTime(timeLeft)}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold ${
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

                <div className="px-6 py-5">
                  <p className="text-sm sm:text-base leading-relaxed text-foreground whitespace-pre-wrap">
                    {statement}
                  </p>
                </div>

                <Separator />

                <div className="px-6 py-5">
                  {currentQ.type === "multiple_choice" && alternatives.length > 0 && (
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
                            className={`flex items-start gap-3 p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-transparent bg-muted/40 hover:bg-muted/70"
                            }`}
                          >
                            <RadioGroupItem value={opt.value} id={`tf-${currentQ.id}-${opt.value}`} className="mt-0.5 shrink-0" />
                            <span className="text-sm font-medium">{opt.label}</span>
                          </label>
                        );
                      })}
                    </RadioGroup>
                  )}

                  {currentQ.type === "matching" && (() => {
                    const colA = (content.column_a as string[]) || [];
                    const colB = (content.column_b as string[]) || [];
                    const currentMatches = (answers[currentQ.id]?.answer_json as Record<string, string>)?.matches || {};
                    return (
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Associe cada item da Coluna A com o item correspondente da Coluna B:</p>
                        {colA.map((itemA, i) => (
                          <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-2 p-3 rounded-lg bg-muted/40 border">
                            <div className="flex-1 text-sm font-medium min-w-0">
                              <span className="text-primary font-bold mr-1.5">{i + 1}.</span>
                              {itemA}
                            </div>
                            <Select
                              value={currentMatches[String(i)] || ""}
                              onValueChange={(val) => {
                                const newMatches = { ...currentMatches, [String(i)]: val };
                                const matchText = colA.map((_, idx) => `${idx + 1}-${newMatches[String(idx)] || "?"}`).join(", ");
                                setAnswer(currentQ.id, matchText, { matches: newMatches, selected: "matched" });
                              }}
                            >
                              <SelectTrigger className="sm:w-[280px] w-full bg-background">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {colB.map((itemB, j) => (
                                  <SelectItem key={j} value={String(j)}>
                                    <span className="font-bold mr-1">{String.fromCharCode(65 + j)})</span> {itemB.length > 80 ? itemB.slice(0, 80) + "..." : itemB}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                        {colB.length > 0 && (
                          <div className="mt-4 p-3 rounded-lg border bg-muted/20">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Coluna B - Opções:</p>
                            <div className="space-y-1.5">
                              {colB.map((itemB, j) => (
                                <p key={j} className="text-xs text-muted-foreground">
                                  <span className="font-bold text-foreground">{String.fromCharCode(65 + j)})</span> {itemB}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {currentQ.type === "open_ended" && (
                    <Textarea
                      placeholder="Digite sua resposta aqui..."
                      value={answers[currentQ.id]?.answer_text || ""}
                      onChange={(e) => setAnswer(currentQ.id, e.target.value)}
                      rows={6}
                      className="resize-none"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                disabled={currentIdx === 0}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                {answeredCount}/{questions.length} respondidas
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))}
                disabled={currentIdx === questions.length - 1}
                className="gap-1"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Question navigator sidebar */}
          <div className="hidden lg:block">
            <div className="bg-card rounded-xl border shadow-sm p-4 sticky top-20">
              <p className="text-xs font-semibold text-muted-foreground mb-3">Navegação</p>
              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((q, i) => {
                  const answered = !!(answers[q.id]?.answer_text || (answers[q.id]?.answer_json as Record<string, string>)?.selected);
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIdx(i)}
                      className={`h-8 w-8 rounded-md text-xs font-bold transition-all ${
                        i === currentIdx
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : answered
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Submit dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Entregar prova?</AlertDialogTitle>
            <AlertDialogDescription>
              Você respondeu {answeredCount} de {questions.length} questões.
              {answeredCount < questions.length && " Algumas questões não foram respondidas."}
              {" "}Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar respondendo</AlertDialogCancel>
            <AlertDialogAction onClick={() => submitExam(false)} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Entregar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Accessibility */}
      <AccessibilityPanel
        settings={a11y}
        onChange={setA11y}
        currentQuestionText={statement}
        currentAlternatives={alternatives}
      />
      {a11y.readingMask && <ReadingMask />}
    </div>
  );
}
