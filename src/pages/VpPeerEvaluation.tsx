import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, Clock, ShieldAlert, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PEER_EVAL_CRITERIA, PeerEvaluationScores } from "@/lib/vp-peer-eval";

interface Teammate {
  email: string;
  name: string;
}

type Status = "loading" | "pending" | "used" | "expired" | "not_found" | "submitted" | "error";

type FormState = Record<string, Partial<PeerEvaluationScores> & { comentario?: string }>;

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

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

  const isDone = (email: string) => {
    const f = form[email];
    return !!f && PEER_EVAL_CRITERIA.every((c) => typeof f[c.key] === "number");
  };
  const isComplete = teammates.every((t) => isDone(t.email));
  const doneCount = teammates.filter((t) => isDone(t.email)).length;

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

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-sunken">
      <header className="border-b bg-card px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-heading text-base font-medium text-primary-foreground" aria-hidden>P</span>
          <div>
            <p className="font-heading text-base font-medium leading-tight">Avaliação entre pares</p>
            {patientLabel && <p className="text-xs text-muted-foreground">{patientLabel}</p>}
          </div>
        </div>
      </header>
      {children}
    </div>
  );

  const statusScreen = (icon: React.ReactNode, title: string, description: string) =>
    shell(
      <div className="flex items-center justify-center p-6 pt-24">
        <div className="max-w-md space-y-3 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted">{icon}</div>
          <h2 className="font-heading text-2xl font-medium">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>,
    );

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sunken">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "not_found" || status === "error") {
    return statusScreen(<ShieldAlert className="h-6 w-6 text-destructive" />, "Link inválido", "Este link de avaliação não existe ou já foi removido.");
  }

  if (status === "used" || status === "submitted") {
    return statusScreen(
      <CheckCircle2 className="h-6 w-6 text-success" />,
      status === "submitted" ? "Obrigado, avaliação enviada" : "Este link já foi utilizado",
      status === "submitted"
        ? `Você avaliou ${teammates.length} ${teammates.length === 1 ? "colega" : "colegas"}. Pode fechar esta página.`
        : "Sua avaliação entre pares para esta atividade já foi registrada. Se precisar corrigir, fale com o seu professor.",
    );
  }

  if (status === "expired") {
    return statusScreen(
      <Clock className="h-6 w-6 text-muted-foreground" />,
      "Link expirado",
      "O prazo para avaliar seus colegas nesta atividade encerrou. Fale com seu professor se precisar de mais tempo.",
    );
  }

  return shell(
    <div className="px-4 py-6 md:px-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h1 className="font-heading text-2xl font-medium">Olá, {evaluatorName || "colega"}!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Avalie a participação de cada colega do seu grupo{patientLabel ? ` no atendimento a ${patientLabel}` : ""}.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-card border border-info/30 bg-info-soft px-4 py-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <p>Seu link é pessoal. Suas respostas não são mostradas aos colegas avaliados e ajustam o bônus individual de cada um na nota do grupo.</p>
        </div>

        {teammates.map((t, idx) => (
          <Card key={t.email}>
            <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-highlight/20 text-sm font-medium" aria-hidden>
                  {initials(t.name || t.email)}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-heading text-lg font-medium leading-tight">{t.name || t.email}</h3>
                  <p className="truncate text-xs text-muted-foreground">{t.email}</p>
                </div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {isDone(t.email) ? <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3.5 w-3.5" />completo</span> : `colega ${idx + 1} de ${teammates.length}`}
              </span>
            </div>
            <div className="space-y-5 p-5">
              {PEER_EVAL_CRITERIA.map((c) => (
                <div key={c.key} className="space-y-1.5">
                  <Label className="text-sm font-medium">{c.label}</Label>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                  <div className="mt-1 flex gap-1.5" role="radiogroup" aria-label={`${c.label} de ${t.name || t.email}`}>
                    {[0, 1, 2, 3, 4, 5].map((n) => {
                      const selected = form[t.email]?.[c.key] === n;
                      return (
                        <Button
                          key={n}
                          type="button"
                          size="sm"
                          role="radio"
                          aria-checked={selected}
                          variant={selected ? "default" : "outline"}
                          className="h-10 w-10 p-0 font-mono"
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
                <Label className="text-sm font-medium">Comentário <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                <Textarea
                  placeholder="Algo que queira destacar sobre a participação deste colega..."
                  value={form[t.email]?.comentario || ""}
                  onChange={(e) => updateComment(t.email, e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          </Card>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{doneCount} de {teammates.length} {teammates.length === 1 ? "colega avaliado" : "colegas avaliados"}</span>
          <Button onClick={handleSubmit} disabled={!isComplete || submitting} size="lg">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Enviando..." : "Enviar avaliação"}
          </Button>
        </div>
      </div>
    </div>,
  );
}
