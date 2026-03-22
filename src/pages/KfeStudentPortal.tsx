import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, Target, ArrowRight, AlertCircle } from "lucide-react";

interface KfCase {
  id: string;
  position: number;
  title: string;
  clinical_scenario: string;
}

interface KeyFeature {
  id: string;
  case_id: string;
  position: number;
  question_text: string;
  question_type: string;
  options_json: any[];
  correct_answer_json: any;
  max_score: number;
  explanation: string;
}

export default function KfeStudentPortal() {
  const { examId } = useParams<{ examId: string }>();
  const [examTitle, setExamTitle] = useState("");
  const [examStatus, setExamStatus] = useState("");
  const [cases, setCases] = useState<KfCase[]>([]);
  const [features, setFeatures] = useState<KeyFeature[]>([]);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [phase, setPhase] = useState<"identify" | "exam" | "result">("identify");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0);
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [score, setScore] = useState<{ total: number; max: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data: exam } = await supabase.from("kfe_exams").select("title, status").eq("id", examId!).single();
      if (exam) { setExamTitle(exam.title); setExamStatus(exam.status); }

      const { data: cs } = await supabase.from("kfe_cases").select("*").eq("kfe_exam_id", examId!).order("position");
      setCases((cs || []) as KfCase[]);

      if (cs && cs.length > 0) {
        const { data: kf } = await supabase.from("kfe_key_features").select("*").in("case_id", cs.map(c => c.id)).order("position");
        setFeatures((kf || []) as KeyFeature[]);
      }
      setLoading(false);
    };
    fetch();
  }, [examId]);

  const handleStart = async () => {
    if (!studentName.trim() || !studentEmail.trim()) { toast.error("Preencha nome e e-mail"); return; }
    const { data, error } = await supabase.from("kfe_sessions").insert({ kfe_exam_id: examId!, student_name: studentName.trim(), student_email: studentEmail.trim() }).select().single();
    if (error) { toast.error("Erro ao iniciar"); return; }
    setSessionId(data.id);
    setPhase("exam");
  };

  const currentCase = cases[currentCaseIndex];
  const caseFeatures = currentCase ? features.filter(f => f.case_id === currentCase.id).sort((a, b) => a.position - b.position) : [];
  const currentFeature = caseFeatures[currentFeatureIndex];

  const handleAnswer = (featureId: string, answer: any) => {
    setAnswers({ ...answers, [featureId]: answer });
  };

  const handleRevealAndNext = () => {
    if (!currentFeature || answers[currentFeature.id] === undefined) {
      toast.error("Selecione uma resposta");
      return;
    }
    setRevealed(new Set([...revealed, currentFeature.id]));
  };

  const handleNext = () => {
    if (currentFeatureIndex < caseFeatures.length - 1) {
      setCurrentFeatureIndex(currentFeatureIndex + 1);
    } else if (currentCaseIndex < cases.length - 1) {
      setCurrentCaseIndex(currentCaseIndex + 1);
      setCurrentFeatureIndex(0);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    let totalScore = 0;
    let maxScore = 0;

    const inserts = features.map(kf => {
      const answer = answers[kf.id];
      let featureScore = 0;

      if (kf.question_type === "multiple_choice") {
        if (answer === kf.correct_answer_json?.selected) featureScore = kf.max_score;
      } else if (kf.question_type === "short_answer") {
        const correct = (kf.correct_answer_json?.text || "").trim().toLowerCase();
        const student = (answer || "").trim().toLowerCase();
        if (student === correct) featureScore = kf.max_score;
      }

      totalScore += featureScore;
      maxScore += kf.max_score;

      return { session_id: sessionId!, key_feature_id: kf.id, answer_json: { value: answer }, score: featureScore };
    });

    await supabase.from("kfe_answers").insert(inserts);
    await supabase.from("kfe_sessions").update({ status: "submitted", finished_at: new Date().toISOString(), total_score: totalScore, max_score: maxScore }).eq("id", sessionId!);

    setScore({ total: totalScore, max: maxScore });
    setPhase("result");
    setSubmitting(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;

  if (examStatus !== "active") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <Target className="h-16 w-16 text-muted-foreground/40 mx-auto" />
            <h2 className="text-xl font-bold">Exame não disponível</h2>
            <p className="text-muted-foreground">Este exame KFE ainda não está aberto.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "result") {
    const pct = score ? ((score.total / score.max) * 100).toFixed(1) : "0";
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Exame Concluído!</h2>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-3xl font-bold text-primary">{pct}%</p>
              <p className="text-sm text-muted-foreground mt-1">Pontuação: {score?.total}/{score?.max}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "identify") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <Target className="h-8 w-8 text-primary mx-auto mb-2" />
            <CardTitle>{examTitle}</CardTitle>
            <p className="text-sm text-muted-foreground">Key Feature Exam — {cases.length} casos clínicos</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Seu nome</Label><Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Maria Silva" /></div>
            <div><Label>Seu e-mail</Label><Input value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="maria@aluno.com" type="email" /></div>
            <Button className="w-full" onClick={handleStart}>Iniciar Exame</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exam phase - progressive disclosure
  const isRevealed = currentFeature ? revealed.has(currentFeature.id) : false;
  const isCorrect = currentFeature && isRevealed ? (
    currentFeature.question_type === "multiple_choice"
      ? answers[currentFeature.id] === currentFeature.correct_answer_json?.selected
      : (answers[currentFeature.id] || "").trim().toLowerCase() === (currentFeature.correct_answer_json?.text || "").trim().toLowerCase()
  ) : false;

  const totalFeatures = features.length;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{examTitle}</h1>
            <p className="text-xs text-muted-foreground">Caso {currentCaseIndex + 1} de {cases.length}</p>
          </div>
          <Badge variant="outline">{answeredCount}/{totalFeatures} respondidos</Badge>
        </div>

        {/* Case scenario */}
        {currentCase && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{currentCase.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{currentCase.clinical_scenario}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current key feature */}
        {currentFeature && (
          <Card className={isRevealed ? (isCorrect ? "border-green-500/50" : "border-destructive/50") : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Ponto-chave {currentFeatureIndex + 1} de {caseFeatures.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm font-medium">{currentFeature.question_text}</p>

              {currentFeature.question_type === "multiple_choice" && (
                <div className="space-y-2">
                  {(currentFeature.options_json || []).map((opt: any) => {
                    const isSelected = answers[currentFeature.id] === opt.id;
                    const isCorrectOpt = isRevealed && opt.id === currentFeature.correct_answer_json?.selected;
                    const isWrongSelected = isRevealed && isSelected && !isCorrectOpt;

                    return (
                      <button
                        key={opt.id}
                        disabled={isRevealed}
                        onClick={() => handleAnswer(currentFeature.id, opt.id)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all text-sm ${
                          isCorrectOpt ? "border-green-500 bg-green-50 dark:bg-green-950/30" :
                          isWrongSelected ? "border-destructive bg-destructive/10" :
                          isSelected ? "border-primary bg-primary/10" :
                          "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="font-medium mr-2">{opt.id.toUpperCase()})</span> {opt.text}
                        {isCorrectOpt && <CheckCircle className="h-4 w-4 text-green-500 inline ml-2" />}
                        {isWrongSelected && <AlertCircle className="h-4 w-4 text-destructive inline ml-2" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {currentFeature.question_type === "short_answer" && (
                <Textarea
                  value={answers[currentFeature.id] || ""}
                  onChange={(e) => handleAnswer(currentFeature.id, e.target.value)}
                  placeholder="Digite sua resposta..."
                  disabled={isRevealed}
                  rows={3}
                />
              )}

              {isRevealed && currentFeature.explanation && (
                <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary">
                  <p className="text-xs font-medium mb-1">Explicação:</p>
                  <p className="text-sm whitespace-pre-wrap">{currentFeature.explanation}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                {!isRevealed ? (
                  <Button onClick={handleRevealAndNext} disabled={answers[currentFeature.id] === undefined}>
                    Confirmar Resposta
                  </Button>
                ) : (
                  <Button onClick={handleNext} disabled={submitting}>
                    {submitting ? "Enviando..." : (currentFeatureIndex < caseFeatures.length - 1 || currentCaseIndex < cases.length - 1) ? (
                      <><ArrowRight className="h-4 w-4 mr-1" /> Próximo</>
                    ) : "Finalizar Exame"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
