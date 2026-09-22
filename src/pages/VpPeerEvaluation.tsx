import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Users, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PEER_EVAL_CRITERIA, PeerEvaluationScores } from "@/lib/vp-peer-eval";

interface Teammate {
  email: string;
  name: string;
}

type Status = "loading" | "pending" | "used" | "expired" | "not_found" | "submitted" | "error";

type FormState = Record<string, Partial<PeerEvaluationScores> & { comentario?: string }>;

export default function VpPeerEvaluation() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>("loading");
  const [evaluatorName, setEvaluatorName] = useState("");
  const [patientLabel, setPatientLabel] = useState("");
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [form, setForm] = useState<FormState>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, [token]);

  const load = async () => {
    if (!token) {
      setStatus("not_found");
      return;
    }
    setStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("vp-peer-eval-context", { body: { token } });
      if (error) throw error;
      setEvaluatorName(data?.evaluator_name || "");
      if (data?.status === "pending") {
        setPatientLabel(data.patient_label || "");
        setTeammates(data.teammates || []);
        setStatus("pending");
      } else {
        setStatus(data?.status || "error");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const updateScore = (email: string, key: keyof PeerEvaluationScores, value: number) => {
    setForm((prev) => ({ ...prev, [email]: { ...prev[email], [key]: value } }));
  };

  const updateComment = (email: string, comentario: string) => {
    setForm((prev) => ({ ...prev, [email]: { ...prev[email], comentario } }));
  };

  const isComplete = teammates.every((t) => {
    const f = form[t.email];
    return f && PEER_EVAL_CRITERIA.every((c) => typeof f[c.key] === "number");
  });

  const handleSubmit = async () => {
    if (!isComplete || !token) return;
    setSubmitting(true);
    try {
      const ratings = teammates.map((t) => ({
        evaluatee_email: t.email,
        participacao_score: form[t.email]?.participacao_score,
        contribuicao_score: form[t.email]?.contribuicao_score,
        colaboracao_score: form[t.email]?.colaboracao_score,
        comentario: form[t.email]?.comentario || "",
      }));
      const { data, error } = await supabase.functions.invoke("submit-vp-peer-evaluation", {
        body: { token, ratings },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setStatus("submitted");
      toast.success("Avaliação enviada. Obrigado!");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível enviar sua avaliação. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "not_found" || status === "error") {
    return (
      <StatusCard
        icon={<ShieldAlert className="h-10 w-10 mx-auto text-destructive" />}
        title="Link inválido"
        description="Este link de avaliação não existe ou já foi removido."
      />
    );
  }

  if (status === "used" || status === "submitted") {
    return (
      <StatusCard
        icon={<CheckCircle2 className="h-10 w-10 mx-auto text-primary" />}
        title="Avaliação já enviada"
        description="Obrigado! Sua avaliação entre pares para esta atividade já foi registrada."
      />
    );
  }

  if (status === "expired") {
    return (
      <StatusCard
        icon={<Clock className="h-10 w-10 mx-auto text-muted-foreground" />}
        title="Link expirado"
        description="O prazo para avaliar seus colegas nesta atividade encerrou. Fale com seu professor se precisar de mais tempo."
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Avaliação entre pares
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Olá, {evaluatorName || "colega"}! Avalie a participação de cada colega do seu grupo
            {patientLabel ? ` no atendimento a ${patientLabel}` : ""}. Suas respostas não são mostradas aos colegas avaliados.
          </p>
        </div>

        {teammates.map((t) => (
          <Card key={t.email}>
            <CardHeader>
              <CardTitle className="text-base">{t.name || t.email}</CardTitle>
              <CardDescription>{t.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {PEER_EVAL_CRITERIA.map((c) => (
                <div key={c.key} className="space-y-1.5">
                  <Label className="text-sm font-medium">{c.label}</Label>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                  <div className="flex gap-1.5 mt-1">
                    {[0, 1, 2, 3, 4, 5].map((n) => {
                      const selected = form[t.email]?.[c.key] === n;
                      return (
                        <Button
                          key={n}
                          type="button"
                          size="sm"
                          variant={selected ? "default" : "outline"}
                          className="w-9 h-9 p-0"
                          onClick={() => updateScore(t.email, c.key, n)}
                        >
                          {n}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Comentário (opcional)</Label>
                <Textarea
                  placeholder="Algo que queira destacar sobre a participação deste colega..."
                  value={form[t.email]?.comentario || ""}
                  onChange={(e) => updateComment(t.email, e.target.value)}
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>
        ))}

        <Button onClick={handleSubmit} disabled={!isComplete || submitting} className="w-full" size="lg">
          {submitting ? "Enviando..." : "Enviar avaliação"}
        </Button>
      </div>
    </div>
  );
}

function StatusCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md">
        <CardContent className="p-8 text-center space-y-4">
          {icon}
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
