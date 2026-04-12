import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, CheckCircle, HelpCircle, XCircle, ChevronLeft, ChevronRight, Send, Ban } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import RichTextRenderer from "@/components/RichTextRenderer";

type Question = { id: string; question_id: string; position: number; expected_year: number; questionData?: any };

const LETTER_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

function parseOptions(content: any): { key: string; label: string; text: string }[] {
  if (!content?.options) return [];
  const opts = content.options;
  if (!Array.isArray(opts) && typeof opts === "object") {
    return Object.entries(opts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, text], i) => ({ key, label: LETTER_LABELS[i] || key.toUpperCase(), text: String(text) }));
  }
  if (Array.isArray(opts)) {
    return opts.map((opt: any, i: number) => ({
      key: String(opt.id ?? LETTER_LABELS[i]?.toLowerCase() ?? i),
      label: LETTER_LABELS[i] || String(i + 1),
      text: typeof opt === "string" ? opt : opt.text || "",
    }));
  }
  return [];
}

function getStem(content: any): string {
  return content?.stem || content?.question_text || content?.statement || "";
}

export default function ProgressTestStudentPortal() {
  const { testId } = useParams<{ testId: string }>();
  const [step, setStep] = useState<"identify" | "exam" | "finished">("identify");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [studentYear, setStudentYear] = useState("1");
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { answer: string | null; responseType: "answered" | "annulled" }>>({});
  const [score, setScore] = useState<{ total: number; max: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTest();
  }, [testId]);

  const loadTest = async () => {
    const { data: t } = await supabase.from("progress_tests" as any).select("*").eq("id", testId).single();
    if (!t) { toast({ title: "Teste não encontrado", variant: "destructive" }); setLoading(false); return; }
    setTest(t);

    const { data: tqs } = await supabase.from("progress_test_questions" as any).select("*").eq("test_id", testId).order("position");
    if (tqs && tqs.length > 0) {
      const questionIds = (tqs as any[]).map((q: any) => q.question_id);
      const { data: qData } = await supabase.from("question_bank").select("id, content_json, type").in("id", questionIds);
      const enriched = (tqs as any[]).map((tq: any) => ({
        ...tq,
        questionData: (qData || []).find((q: any) => q.id === tq.question_id),
      }));
      setQuestions(enriched);
    }
    setLoading(false);
  };

  const handleStart = async () => {
    if (!name.trim()) { toast({ title: "Informe seu nome", variant: "destructive" }); return; }
    const { data, error } = await supabase.from("progress_test_sessions" as any).insert({
      test_id: testId, student_name: name, student_email: email || null, student_year: Number(studentYear),
    } as any).select().single();
    if (error) { toast({ title: "Erro ao iniciar", variant: "destructive" }); return; }
    setSessionId((data as any).id);
    setStep("exam");
  };

  const handleSelectOption = (questionPtqId: string, optionKey: string) => {
    setAnswers(prev => ({ ...prev, [questionPtqId]: { answer: optionKey, responseType: "answered" } }));
  };

  const handleAnnul = (questionPtqId: string) => {
    setAnswers(prev => ({ ...prev, [questionPtqId]: { answer: null, responseType: "annulled" } }));
  };

  const handleFinish = async () => {
    let correct = 0;
    let incorrect = 0;
    let annulled = 0;

    for (const q of questions) {
      const ans = answers[q.id];
      const responseType = ans?.responseType || "blank";
      let isCorrect = false;

      if (responseType === "answered" && ans?.answer && q.questionData) {
        const content = q.questionData.content_json as any;
        const correctKey = content?.correct_answer ?? content?.correctAnswer;
        if (correctKey !== undefined) {
          isCorrect = String(ans.answer).toLowerCase() === String(correctKey).toLowerCase();
        }
      }
      if (responseType === "annulled") annulled++;
      else if (responseType === "answered") { if (isCorrect) correct++; else incorrect++; }

      await supabase.from("progress_test_answers" as any).insert({
        session_id: sessionId,
        question_id: q.id,
        answer_json: { answer: ans?.answer || null },
        is_correct: isCorrect,
        response_type: responseType,
      } as any);
    }

    const finalScore = Math.max(0, correct - incorrect);

    await supabase.from("progress_test_sessions" as any).update({
      status: "finished", total_score: finalScore, max_score: questions.length, finished_at: new Date().toISOString(),
    } as any).eq("id", sessionId);

    setScore({ total: finalScore, max: questions.length });
    setStep("finished");
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p>Carregando...</p></div>;
  if (!test) return <div className="flex items-center justify-center min-h-screen"><p>Teste não encontrado.</p></div>;

  if (step === "identify") {
    const years = test.target_years_json || [1, 2, 3, 4, 5, 6];
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <TrendingUp className="h-10 w-10 mx-auto text-primary mb-2" />
            <CardTitle>{test.title}</CardTitle>
            {test.description && <CardDescription>{test.description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Ano do curso *</Label>
              <Select value={studentYear} onValueChange={setStudentYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(years as number[]).map((y: number) => (
                    <SelectItem key={y} value={String(y)}>{y}º ano</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleStart} disabled={!name.trim()}>
              Iniciar Teste ({questions.length} questões)
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "finished") {
    const pct = score && score.max > 0 ? Math.round((score.total / score.max) * 100) : 0;
    const totalAnswered = Object.values(answers).filter(a => a.responseType === "answered").length;
    const totalAnnulled = Object.values(answers).filter(a => a.responseType === "annulled").length;
    const totalBlank = questions.length - totalAnswered - totalAnnulled;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle className="h-12 w-12 mx-auto text-success mb-2" />
            <CardTitle className="text-xl">Teste de Progresso Finalizado</CardTitle>
            <CardDescription>Obrigado por participar!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-bold text-foreground">{pct}%</div>
            <p className="text-sm text-muted-foreground">Escore: {score?.total} / {score?.max}</p>
            <Progress value={pct} className="h-3" />
            <Separator />
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="p-2 rounded-lg bg-muted/50"><p className="font-semibold">{totalAnswered}</p><p className="text-muted-foreground text-xs">Respondidas</p></div>
              <div className="p-2 rounded-lg bg-muted/50"><p className="font-semibold">{totalAnnulled}</p><p className="text-muted-foreground text-xs">Anuladas</p></div>
              <div className="p-2 rounded-lg bg-muted/50"><p className="font-semibold">{totalBlank}</p><p className="text-muted-foreground text-xs">Em branco</p></div>
            </div>
            <p className="text-xs text-muted-foreground">Pontuação: +1 acerto, −1 erro, 0 anulada/em branco</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exam step
  const currentQ = questions[currentIdx];
  const content = currentQ?.questionData?.content_json as any;
  const currentAnswer = answers[currentQ?.id] || null;
  const progress = ((currentIdx + 1) / questions.length) * 100;
  const options = parseOptions(content);
  const stem = getStem(content);
  const isAnnulled = currentAnswer?.responseType === "annulled";
  const selectedKey = currentAnswer?.answer;
  const answeredCount = Object.values(answers).filter(a => a.responseType === "answered").length;
  const annulledCount = Object.values(answers).filter(a => a.responseType === "annulled").length;
  const blankCount = questions.length - answeredCount - annulledCount;

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center">
          <h1 className="text-lg font-bold text-foreground">{test?.title || "Teste de Progresso"}</h1>
        </div>
        <div className="flex items-center justify-between">
          <Badge variant="outline">{currentIdx + 1} / {questions.length}</Badge>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs">{answeredCount} resp. · {annulledCount} anul. · {blankCount} branco</Badge>
            <Badge>Ano esperado: {currentQ?.expected_year}º</Badge>
          </div>
        </div>
        <Progress value={progress} className="h-2" />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Questão {currentIdx + 1}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="text-sm leading-relaxed text-foreground">
              <RichTextRenderer text={stem || "Questão sem enunciado"} />
            </div>
            <Separator />
            {options.length > 0 && (
              <div className="space-y-2">
                {options.map((opt) => {
                  const isSelected = !isAnnulled && selectedKey === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleSelectOption(currentQ.id, opt.key)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left text-sm transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                          : isAnnulled
                            ? "border-border bg-muted/30 opacity-50 cursor-pointer"
                            : "border-border bg-background hover:bg-muted/50 cursor-pointer"
                      }`}
                    >
                      <span className={`font-bold shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>{opt.label}</span>
                      <span className="flex-1 pt-0.5"><RichTextRenderer text={opt.text} /></span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="pt-1">
              <Button
                variant={isAnnulled ? "destructive" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  if (isAnnulled) {
                    setAnswers(prev => { const next = { ...prev }; delete next[currentQ.id]; return next; });
                  } else {
                    handleAnnul(currentQ.id);
                  }
                }}
              >
                <Ban className="h-3.5 w-3.5" />
                {isAnnulled ? "Remover anulação" : "Anular questão (não sei)"}
              </Button>
              <p className="text-[10px] text-muted-foreground mt-1">Anular = 0 pontos. Resposta errada = −1 ponto.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" disabled={currentIdx === 0} onClick={() => setCurrentIdx(prev => prev - 1)} className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          {currentIdx < questions.length - 1 ? (
            <Button onClick={() => setCurrentIdx(prev => prev + 1)} className="gap-1">Próxima <ChevronRight className="h-4 w-4" /></Button>
          ) : (
            <Button onClick={handleFinish} className="gap-1.5"><Send className="h-4 w-4" /> Finalizar Teste</Button>
          )}
        </div>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Navegação rápida</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex flex-wrap gap-1.5">
              {questions.map((q, i) => {
                const ans = answers[q.id];
                const isCurrent = i === currentIdx;
                let bg = "bg-muted text-muted-foreground";
                if (ans?.responseType === "answered") bg = "bg-primary text-primary-foreground";
                if (ans?.responseType === "annulled") bg = "bg-destructive/20 text-destructive";
                return (
                  <button key={q.id} onClick={() => setCurrentIdx(i)}
                    className={`w-8 h-8 rounded text-xs font-medium flex items-center justify-center transition-all ${bg} ${isCurrent ? "ring-2 ring-primary ring-offset-1" : "hover:opacity-80"}`}
                  >{i + 1}</button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
