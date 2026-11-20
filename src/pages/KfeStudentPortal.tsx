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
  max_score: number;
}

// Resultado de um ponto-chave, devolvido pelo servidor só depois que o aluno confirma a resposta
interface Reveal {
  correto: boolean;
  alternativa_certa: string | null;
  explicacao: string;
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
  const [revealed, setRevealed] = useState<Record<string, Reveal>>({});
  const [confirming, setConfirming] = useState(false);
  const [score, setScore] = useState<{ total: number; max: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // A prova vem da função kfe-aluno, sem resposta certa nem explicação (o servidor revela cada ponto-chave ao confirmar)
    const fetch = async () => {
      const { data } = await supabase.functions.invoke("kfe-aluno", { body: { action: "exame", exam_id: examId } });
      if (data?.ok) {
        setExamTitle(data.titulo);
        setExamStatus(data.status);
        setCases((data.casos || []) as KfCase[]);
        setFeatures((data.pontos || []) as KeyFeature[]);
      }
      setLoading(false);
    };
    fetch();
  }, [examId]);

  const handleStart = async () => {
    if (!studentName.trim() || !studentEmail.trim()) { toast.error("Preencha nome e e-mail"); return; }
    const { data, error } = await supabase.functions.invoke("kfe-aluno", {
      body: { action: "iniciar", exam_id: examId, name: studentName.trim(), email: studentEmail.trim() },
    });
    if (error || !data?.ok) { toast.error(data?.error || "Erro ao iniciar"); return; }
    setSessionId(data.session_id);
    setPhase("exam");
  };

  const currentCase = cases[currentCaseIndex];
  const caseFeatures = currentCase ? features.filter(f => f.case_id === currentCase.id).sort((a, b) => a.position - b.position) : [];
  const currentFeature = caseFeatures[currentFeatureIndex];

  const handleAnswer = (featureId: string, answer: any) => {
    setAnswers({ ...answers, [featureId]: answer });
  };

  const handleRevealAndNext = async () => {
    if (!currentFeature || answers[currentFeature.id] === undefined) {
      toast.error("Selecione uma resposta");
      return;
    }
    if (confirming) return;
    setConfirming(true);
    // O servidor grava a resposta (uma única vez) e devolve se acertou e a explicação
    const { data, error } = await supabase.functions.invoke("kfe-aluno", {
      body: { action: "confirmar", session_id: sessionId, key_feature_id: currentFeature.id, answer: answers[currentFeature.id] },
    });
    setConfirming(false);
    if (error || !data?.ok) { toast.error("Não foi possível confirmar a resposta. Tente novamente."); return; }
    setRevealed({ ...revealed, [currentFeature.id]: { correto: data.correto, alternativa_certa: data.alternativa_certa, explicacao: data.explicacao } });
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
    const { data, error } = await supabase.functions.invoke("kfe-aluno", { body: { action: "enviar", session_id: sessionId } });
    if (error || !data?.ok) {
      toast.error("Não foi possível finalizar. Tente novamente.");
      setSubmitting(false);
      return;
    }
    setScore({ total: data.total, max: data.max });
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
            <h2 className="font-heading text-2xl font-medium">Exame não disponível</h2>
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
            <CheckCircle className="h-16 w-16 text-success mx-auto" />
            <h2 className="font-heading text-2xl font-medium">Exame Concluído!</h2>
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
            <div className="eyebrow">KFE</div>
            <CardTitle className="font-heading text-lg font-medium">{examTitle}</CardTitle>
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
  const reveal = currentFeature ? revealed[currentFeature.id] : undefined;
  const isRevealed = !!reveal;
  const isCorrect = !!reveal?.correto;

  const totalFeatures = features.length;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="eyebrow mb-1">KFE</div>
          <h1 className="font-heading text-2xl font-medium">{examTitle}</h1>
            <p className="text-xs text-muted-foreground">Caso {currentCaseIndex + 1} de {cases.length}</p>
          </div>
          <Badge variant="outline">{answeredCount}/{totalFeatures} respondidos</Badge>
        </div>

        {/* Case scenario */}
        {currentCase && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-lg font-medium">{currentCase.title}</CardTitle>
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
          <Card className={isRevealed ? (isCorrect ? "border-success/50" : "border-destructive/50") : ""}>
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
                    const isCorrectOpt = isRevealed && opt.id === reveal?.alternativa_certa;
                    const isWrongSelected = isRevealed && isSelected && !isCorrectOpt;

                    return (
                      <button
                        key={opt.id}
                        disabled={isRevealed}
                        onClick={() => handleAnswer(currentFeature.id, opt.id)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all text-sm ${
                          isCorrectOpt ? "border-success bg-success/10" :
                          isWrongSelected ? "border-destructive bg-destructive/10" :
                          isSelected ? "border-primary bg-primary/10" :
                          "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="font-medium mr-2">{opt.id.toUpperCase()})</span> {opt.text}
                        {isCorrectOpt && <CheckCircle className="h-4 w-4 text-success inline ml-2" />}
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

              {isRevealed && reveal?.explicacao && (
                <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary">
                  <p className="text-xs font-medium mb-1">Explicação:</p>
                  <p className="text-sm whitespace-pre-wrap">{reveal?.explicacao}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                {!isRevealed ? (
                  <Button onClick={handleRevealAndNext} disabled={answers[currentFeature.id] === undefined || confirming}>
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
