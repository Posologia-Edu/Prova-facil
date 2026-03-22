import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, ClipboardList } from "lucide-react";

interface Scenario {
  id: string;
  position: number;
  clinical_vignette: string;
  hypothesis: string;
  new_information: string;
}

const likertOptions = [
  { value: -2, label: "Praticamente descartada", short: "-2" },
  { value: -1, label: "Menos provável", short: "-1" },
  { value: 0, label: "Nem mais, nem menos provável", short: "0" },
  { value: 1, label: "Mais provável", short: "+1" },
  { value: 2, label: "Praticamente certa", short: "+2" },
];

export default function SctStudentPortal() {
  const { examId } = useParams<{ examId: string }>();
  const [examTitle, setExamTitle] = useState("");
  const [examStatus, setExamStatus] = useState("");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"identify" | "exam" | "result">("identify");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [score, setScore] = useState<{ total: number; max: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data: exam } = await supabase.from("sct_exams").select("title, status").eq("id", examId!).single();
      if (exam) {
        setExamTitle(exam.title);
        setExamStatus(exam.status);
      }
      const { data: sc } = await supabase.from("sct_scenarios").select("*").eq("sct_exam_id", examId!).order("position");
      setScenarios((sc || []) as Scenario[]);
      setLoading(false);
    };
    fetch();
  }, [examId]);

  const handleStart = async () => {
    if (!studentName.trim() || !studentEmail.trim()) {
      toast.error("Preencha seu nome e e-mail");
      return;
    }

    const { data, error } = await supabase.from("sct_student_sessions").insert({
      sct_exam_id: examId!,
      student_name: studentName.trim(),
      student_email: studentEmail.trim(),
    }).select().single();

    if (error) { toast.error("Erro ao iniciar sessão"); return; }
    setSessionId(data.id);
    setPhase("exam");
  };

  const handleSubmit = async () => {
    const unanswered = scenarios.filter(s => answers[s.id] === undefined);
    if (unanswered.length > 0) {
      toast.error(`Responda todos os cenários (${unanswered.length} pendentes)`);
      return;
    }

    setSubmitting(true);

    // Get expert responses for scoring
    const scenarioIds = scenarios.map(s => s.id);
    const { data: expertResp } = await supabase.from("sct_expert_responses").select("*").in("scenario_id", scenarioIds);

    let totalScore = 0;
    let maxScore = 0;

    const answerInserts = scenarios.map(s => {
      const responses = (expertResp || []).filter((r: any) => r.scenario_id === s.id);
      const totalExperts = responses.length;
      let scenarioScore = 0;

      if (totalExperts > 0) {
        // Partial credit: score = count of experts who chose same answer / max count
        const dist: Record<number, number> = {};
        responses.forEach((r: any) => { dist[r.likert_value] = (dist[r.likert_value] || 0) + 1; });
        const maxFreq = Math.max(...Object.values(dist));
        const studentFreq = dist[answers[s.id]] || 0;
        scenarioScore = maxFreq > 0 ? studentFreq / maxFreq : 0;
      }

      totalScore += scenarioScore;
      maxScore += 1;

      return {
        session_id: sessionId!,
        scenario_id: s.id,
        likert_value: answers[s.id],
        score: parseFloat(scenarioScore.toFixed(3)),
      };
    });

    await supabase.from("sct_student_answers").insert(answerInserts);
    await supabase.from("sct_student_sessions").update({
      status: "submitted",
      finished_at: new Date().toISOString(),
      total_score: parseFloat(totalScore.toFixed(3)),
      max_score: maxScore,
    }).eq("id", sessionId!);

    setScore({ total: totalScore, max: maxScore });
    setPhase("result");
    setSubmitting(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;

  if (examStatus !== "active" && examStatus !== "collecting") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <ClipboardList className="h-16 w-16 text-muted-foreground/40 mx-auto" />
            <h2 className="text-xl font-bold">Exame não disponível</h2>
            <p className="text-muted-foreground">Este exame SCT ainda não está aberto para alunos.</p>
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
            <h2 className="text-xl font-bold">Respostas Enviadas!</h2>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-3xl font-bold text-primary">{pct}%</p>
              <p className="text-sm text-muted-foreground mt-1">Pontuação: {score?.total.toFixed(2)} / {score?.max}</p>
            </div>
            <p className="text-xs text-muted-foreground">Pontuação calculada pelo método de crédito parcial com base no painel de especialistas.</p>
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
            <ClipboardList className="h-8 w-8 text-primary mx-auto mb-2" />
            <CardTitle>{examTitle}</CardTitle>
            <p className="text-sm text-muted-foreground">Script Concordance Test — {scenarios.length} cenários</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Seu nome</Label>
              <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Maria Silva" />
            </div>
            <div>
              <Label>Seu e-mail</Label>
              <Input value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="maria@aluno.com" type="email" />
            </div>
            <Button className="w-full" onClick={handleStart}>Iniciar Exame</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exam phase
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold">{examTitle}</h1>
          <p className="text-sm text-muted-foreground">Para cada cenário, avalie como a nova informação afeta a probabilidade da hipótese.</p>
          <Badge variant="outline">{Object.keys(answers).length}/{scenarios.length} respondidos</Badge>
        </div>

        {scenarios.map((s, i) => (
          <Card key={s.id} className={answers[s.id] !== undefined ? "border-primary/30" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Cenário {i + 1} de {scenarios.length}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{s.clinical_vignette}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Se você estava pensando em...</p>
                  <p className="text-sm">{s.hypothesis}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">E então você descobre que...</p>
                  <p className="text-sm">{s.new_information}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium mb-3">Esta hipótese se torna:</p>
                <div className="grid grid-cols-5 gap-2">
                  {likertOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setAnswers({ ...answers, [s.id]: opt.value })}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-center ${
                        answers[s.id] === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="text-lg font-bold">{opt.short}</span>
                      <span className="text-[10px] leading-tight">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-center pb-8">
          <Button size="lg" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Calculando pontuação..." : "Enviar Respostas"}
          </Button>
        </div>
      </div>
    </div>
  );
}
