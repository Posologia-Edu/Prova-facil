import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, CheckCircle, HelpCircle, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Question = { id: string; question_id: string; position: number; expected_year: number; questionData?: any };

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
  const [answers, setAnswers] = useState<Record<string, { answer: string; responseType: string }>>({});
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

  const handleAnswer = (questionPtqId: string, answer: string, responseType: string) => {
    setAnswers(prev => ({ ...prev, [questionPtqId]: { answer, responseType } }));
  };

  const handleFinish = async () => {
    let correct = 0;
    const max = questions.length;

    for (const q of questions) {
      const ans = answers[q.id];
      const responseType = ans?.responseType || "dont_know";
      let isCorrect = false;

      if (responseType === "know" && ans?.answer && q.questionData) {
        const content = q.questionData.content_json as any;
        if (content?.correctAnswer !== undefined) {
          isCorrect = String(ans.answer) === String(content.correctAnswer);
        }
      }
      if (isCorrect) correct++;

      await supabase.from("progress_test_answers" as any).insert({
        session_id: sessionId,
        question_id: q.id,
        answer_json: { answer: ans?.answer || null },
        is_correct: isCorrect,
        response_type: responseType,
      } as any);
    }

    await supabase.from("progress_test_sessions" as any).update({
      status: "finished", total_score: correct, max_score: max, finished_at: new Date().toISOString(),
    } as any).eq("id", sessionId);

    setScore({ total: correct, max });
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
    const pct = score ? Math.round((score.total / score.max) * 100) : 0;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
            <CardTitle>Teste Finalizado!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-bold text-foreground">{score?.total}/{score?.max}</div>
            <Progress value={pct} className="h-3" />
            <p className="text-muted-foreground">{pct}% de acertos</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exam step
  const currentQ = questions[currentIdx];
  const content = currentQ?.questionData?.content_json as any;
  const currentAnswer = answers[currentQ?.id];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline">{currentIdx + 1} / {questions.length}</Badge>
          <Badge>Ano esperado: {currentQ?.expected_year}º</Badge>
        </div>
        <Progress value={progress} className="h-2" />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Questão {currentIdx + 1}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-foreground whitespace-pre-wrap">{content?.stem || content?.statement || "Questão sem texto"}</p>

            {/* Response type */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Você sabe a resposta?</Label>
              <div className="flex gap-2">
                {[
                  { value: "know", label: "Sei", icon: CheckCircle, color: "text-green-500" },
                  { value: "guess", label: "Chute", icon: HelpCircle, color: "text-yellow-500" },
                  { value: "dont_know", label: "Não sei", icon: XCircle, color: "text-red-500" },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    variant={currentAnswer?.responseType === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleAnswer(currentQ.id, currentAnswer?.answer || "", opt.value)}
                  >
                    <opt.icon className={`h-4 w-4 mr-1 ${currentAnswer?.responseType === opt.value ? "" : opt.color}`} />
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Options */}
            {content?.options && (
              <RadioGroup
                value={currentAnswer?.answer || ""}
                onValueChange={(v) => handleAnswer(currentQ.id, v, currentAnswer?.responseType || "know")}
                className="space-y-2"
              >
                {(content.options as any[]).map((opt: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value={String(opt.id ?? i)} id={`opt-${i}`} />
                    <Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer text-sm">{opt.text || opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" disabled={currentIdx === 0} onClick={() => setCurrentIdx(prev => prev - 1)}>
            Anterior
          </Button>
          {currentIdx < questions.length - 1 ? (
            <Button onClick={() => setCurrentIdx(prev => prev + 1)}>Próxima</Button>
          ) : (
            <Button onClick={handleFinish}>Finalizar Teste</Button>
          )}
        </div>
      </div>
    </div>
  );
}
