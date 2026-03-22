import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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

export default function SctExpertPortal() {
  const { examId } = useParams<{ examId: string }>();
  const [examTitle, setExamTitle] = useState("");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [expertName, setExpertName] = useState("");
  const [expertEmail, setExpertEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data: exam } = await supabase.from("sct_exams").select("title").eq("id", examId!).single();
      if (exam) setExamTitle(exam.title);

      const { data: sc } = await supabase.from("sct_scenarios").select("*").eq("sct_exam_id", examId!).order("position");
      setScenarios((sc || []) as Scenario[]);
      setLoading(false);
    };
    fetch();
  }, [examId]);

  const handleSubmit = async () => {
    if (!expertName.trim() || !expertEmail.trim()) {
      toast.error("Preencha seu nome e e-mail");
      return;
    }
    const unanswered = scenarios.filter(s => answers[s.id] === undefined);
    if (unanswered.length > 0) {
      toast.error(`Responda todos os cenários (${unanswered.length} pendentes)`);
      return;
    }

    setSubmitting(true);
    const inserts = scenarios.map(s => ({
      scenario_id: s.id,
      expert_email: expertEmail.trim(),
      expert_name: expertName.trim(),
      likert_value: answers[s.id],
    }));

    const { error } = await supabase.from("sct_expert_responses").insert(inserts);
    if (error) {
      toast.error("Erro ao enviar respostas");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Obrigado!</h2>
            <p className="text-muted-foreground">Suas respostas foram registradas com sucesso. Elas serão usadas para calcular a pontuação dos alunos.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Painel de Especialistas — SCT</h1>
          </div>
          <p className="text-lg font-medium text-foreground">{examTitle}</p>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Para cada cenário, avalie como a nova informação afeta a probabilidade da hipótese proposta.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Seu nome</Label>
                <Input value={expertName} onChange={(e) => setExpertName(e.target.value)} placeholder="Dr. João Silva" />
              </div>
              <div>
                <Label>Seu e-mail</Label>
                <Input value={expertEmail} onChange={(e) => setExpertEmail(e.target.value)} placeholder="joao@hospital.com" type="email" />
              </div>
            </div>
          </CardContent>
        </Card>

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
            {submitting ? "Enviando..." : "Enviar Respostas"}
          </Button>
        </div>
      </div>
    </div>
  );
}
