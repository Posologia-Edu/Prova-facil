import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { CheckCircle, ClipboardCheck } from "lucide-react";

interface Domain {
  id: string;
  name: string;
  description: string;
}

const scaleLabels: Record<number, string> = {
  1: "Muito abaixo", 2: "Abaixo", 3: "Abaixo da média",
  4: "Limítrofe", 5: "Dentro do esperado", 6: "Acima da média",
  7: "Bom", 8: "Muito bom", 9: "Excepcional",
};

export default function ClinicalObservationEval() {
  const { obsId } = useParams<{ obsId: string }>();
  const [obs, setObs] = useState<any>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [evaluatorName, setEvaluatorName] = useState("");
  const [evaluatorEmail, setEvaluatorEmail] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [globalScore, setGlobalScore] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [complexity, setComplexity] = useState("medium");
  const [setting, setSetting] = useState("");
  const [duration, setDuration] = useState(15);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("clinical_observations").select("*").eq("id", obsId!).single();
      if (data) {
        setObs(data);
        const d = (data.competency_domains_json as unknown as Domain[]) || [];
        setDomains(d);
        const initial: Record<string, number> = {};
        d.forEach(dom => { initial[dom.id] = 5; });
        setScores(initial);
      }
      setLoading(false);
    };
    fetch();
  }, [obsId]);

  const handleSubmit = async () => {
    if (!evaluatorName.trim() || !studentName.trim()) {
      toast.error("Preencha os dados do avaliador e do aluno");
      return;
    }
    setSubmitting(true);

    const { error } = await supabase.from("clinical_observation_sessions").insert({
      observation_id: obsId!,
      evaluator_name: evaluatorName.trim(),
      evaluator_email: evaluatorEmail.trim(),
      student_name: studentName.trim(),
      student_email: studentEmail.trim(),
      scores_json: scores,
      global_score: globalScore,
      feedback: feedback.trim(),
      complexity,
      setting: setting.trim(),
      duration_minutes: duration,
    });

    if (error) { toast.error("Erro ao enviar"); setSubmitting(false); return; }
    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;

  if (!obs || obs.status !== "active") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <ClipboardCheck className="h-16 w-16 text-muted-foreground/40 mx-auto" />
            <h2 className="text-xl font-bold">Avaliação não disponível</h2>
            <p className="text-muted-foreground">Esta avaliação ainda não está ativa.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Avaliação Registrada!</h2>
            <p className="text-muted-foreground">A ficha de observação foi salva com sucesso.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="text-center space-y-1">
          <ClipboardCheck className="h-6 w-6 text-primary mx-auto" />
          <h1 className="text-lg font-bold">{obs.title}</h1>
          <p className="text-xs text-muted-foreground">{obs.type === "mini_cex" ? "Mini-CEX" : "DOPS"} — Ficha de Observação Direta</p>
        </div>

        {/* Identification */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Nome do avaliador</Label><Input value={evaluatorName} onChange={(e) => setEvaluatorName(e.target.value)} placeholder="Dr. João" /></div>
              <div><Label className="text-xs">E-mail do avaliador</Label><Input value={evaluatorEmail} onChange={(e) => setEvaluatorEmail(e.target.value)} type="email" /></div>
              <div><Label className="text-xs">Nome do aluno</Label><Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Maria Silva" /></div>
              <div><Label className="text-xs">E-mail do aluno</Label><Input value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} type="email" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Complexidade</Label>
                <Select value={complexity} onValueChange={setComplexity}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Ambiente</Label><Input value={setting} onChange={(e) => setSetting(e.target.value)} placeholder="Enfermaria, ambulatório..." className="h-9" /></div>
              <div><Label className="text-xs">Duração (min)</Label><Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={1} className="h-9" /></div>
            </div>
          </CardContent>
        </Card>

        {/* Domains */}
        {domains.map((d) => (
          <Card key={d.id}>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.description}</p>
                </div>
                <span className="text-lg font-bold text-primary">{scores[d.id] || 5}</span>
              </div>
              <Slider
                value={[scores[d.id] || 5]}
                onValueChange={([v]) => setScores({ ...scores, [d.id]: v })}
                min={1} max={9} step={1}
                className="py-2"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1 — Muito abaixo</span>
                <span className="font-medium">{scaleLabels[scores[d.id] || 5]}</span>
                <span>9 — Excepcional</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Global + Feedback */}
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Competência Global</p>
              <span className="text-xl font-bold text-primary">{globalScore}</span>
            </div>
            <Slider value={[globalScore]} onValueChange={([v]) => setGlobalScore(v)} min={1} max={9} step={1} />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>1 — Muito abaixo</span>
              <span className="font-medium">{scaleLabels[globalScore]}</span>
              <span>9 — Excepcional</span>
            </div>
            <div>
              <Label className="text-xs">Feedback para o aluno</Label>
              <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Pontos fortes, áreas de melhoria, próximos passos..." rows={4} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center pb-6">
          <Button size="lg" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Enviando..." : "Registrar Avaliação"}
          </Button>
        </div>
      </div>
    </div>
  );
}
