import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Eye, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FormRenderer from "@/components/forms/FormRenderer";
import FormAnswersView from "@/components/forms/FormAnswersView";
import DraftStatusBadge from "@/components/forms/DraftStatusBadge";
import { getSections, type FormField } from "@/components/forms/types";
import type { DraftStatus } from "@/hooks/use-form-draft";
import type { RegistroAnamnese } from "@/lib/soap-v2-registro";
import { montarSoapV2, progressoPorParte, verificarCoerencia } from "@/lib/soap-v2";

interface Props {
  soapForm: any;
  answers: Record<string, any>;
  setAnswers: (a: Record<string, any>) => void;
  /** Registro da anamnese do aluno, já entregue pelo servidor (null se não há vínculo ou o aluno não enviou). */
  registro: RegistroAnamnese | null;
  patientName: string | null;
  draftLoaded: boolean;
  draftStatus: DraftStatus;
  draftLastSavedAt: Date | null;
  submitting: boolean;
  onSubmit: () => void;
}

// Tela do aluno no SOAP v2: registro da anamnese à esquerda (só leitura), SOAP em quatro passos à direita,
// S e O pré-montados a partir do registro e verificador de coerência. O roteiro do paciente nunca passa por aqui.
export default function SoapV2Workspace({
  soapForm, answers, setAnswers, registro, patientName, draftLoaded, draftStatus, draftLastSavedAt, submitting, onSubmit,
}: Props) {
  const fields: FormField[] = Array.isArray(soapForm?.content_json) ? soapForm.content_json : [];
  const secoes = useMemo(() => getSections(fields).filter((s) => s.header), [fields]);
  const [passo, setPasso] = useState(0);
  const montado = useRef(false);

  // Pré-montagem: só quando o aluno ainda não tem nada escrito (um rascunho recuperado sempre vence).
  useEffect(() => {
    if (montado.current || !registro || !draftLoaded) return;
    montado.current = true;
    if (Object.keys(answers).length === 0) {
      const base = montarSoapV2(registro);
      if (Object.keys(base).length > 0) setAnswers(base);
    }
  }, [registro, draftLoaded, answers, setAnswers]);

  const avisos = useMemo(() => verificarCoerencia(answers), [answers]);
  const pendencias = avisos.filter((a) => a.nivel === "aviso");
  const progresso = useMemo(() => progressoPorParte(fields, answers), [fields, answers]);
  const secao = secoes[Math.min(passo, secoes.length - 1)];
  const camposDoPasso: FormField[] = secao ? [secao.header as FormField, ...secao.fields] : [];
  const ultimo = passo >= secoes.length - 1;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-medium">SOAP v2</h1>
          <p className="text-muted-foreground">Confira o que veio do seu registro e faça a avaliação e o plano.</p>
          {patientName && <p className="mt-1 text-sm">Paciente simulado atendido: <strong>{patientName}</strong></p>}
        </div>

        <ol className="flex flex-wrap items-center justify-center gap-2" aria-label="Partes do SOAP">
          {secoes.map((s, i) => {
            const p = progresso[i];
            const atual = i === passo;
            return (
              <li key={s.header!.id}>
                <button
                  type="button"
                  onClick={() => setPasso(i)}
                  aria-current={atual ? "step" : undefined}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${atual ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"}`}
                >
                  {s.header!.label.split("·")[0].trim()}
                  {p && p.total > 0 && <span className={`ml-2 text-xs ${atual ? "opacity-90" : "text-muted-foreground"}`}>{p.feitos}/{p.total}</span>}
                </button>
              </li>
            );
          })}
        </ol>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-lg font-medium"><Eye className="h-4 w-4" />Seu atendimento</CardTitle>
              <p className="text-xs text-muted-foreground">Seu registro da anamnese, só para consulta.</p>
            </CardHeader>
            <CardContent className="max-h-[75vh] overflow-y-auto">
              {registro ? (
                <FormAnswersView fields={registro.fields} answers={registro.answers} />
              ) : (
                <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" />Não encontramos o seu registro da anamnese.</p>
                  <p className="text-muted-foreground">Você pode preencher o SOAP em branco. O professor será avisado de que esta resposta ficou sem registro.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 font-heading text-lg font-medium"><FileText className="h-4 w-4" />{secao?.header?.label || "SOAP"}</CardTitle>
                <DraftStatusBadge status={draftStatus} lastSavedAt={draftLastSavedAt} />
              </div>
              {registro && passo === 0 && (
                <p className="text-xs text-muted-foreground">Os trechos abaixo foram montados com o seu registro. Corrija o que precisar.</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <FormRenderer fields={camposDoPasso} answers={answers} onChange={setAnswers} idPrefix="soapv2-" />

              {(passo >= 2 || ultimo) && (
                <div className="rounded-lg border bg-muted/30 p-3" aria-live="polite">
                  <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Verificador de coerência
                    {pendencias.length > 0 ? <Badge variant="outline">{pendencias.length} aviso(s)</Badge> : <Badge variant="secondary">sem avisos</Badge>}
                  </p>
                  <ul className="space-y-1.5 text-sm">
                    {avisos.map((a) => (
                      <li key={a.id} className="flex items-start gap-2">
                        {a.nivel === "ok"
                          ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-ink" />}
                        <span><span className="mr-1.5 font-mono text-xs text-muted-foreground">{a.parte}</span>{a.texto}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted-foreground">Os avisos não impedem o envio. Corrija o que concordar.</p>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <Button type="button" variant="outline" onClick={() => setPasso(Math.max(0, passo - 1))} disabled={passo === 0}>
                  <ArrowLeft className="mr-2 h-4 w-4" />Voltar
                </Button>
                {!ultimo ? (
                  <Button type="button" onClick={() => setPasso(passo + 1)}>
                    Próxima parte<ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" onClick={onSubmit} disabled={submitting} size="lg">
                    <Send className="mr-2 h-4 w-4" />{submitting ? "Enviando..." : "Enviar SOAP"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
