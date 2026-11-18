import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import FormAnswersView from "@/components/forms/FormAnswersView";
import type { FormField } from "@/components/forms/types";
import {
  ROTULO_DISCREPANCIA, ROTULO_FONTE, ROTULO_INTENCAO, ROTULO_RISCO, type CasoV2, type Gabarito,
} from "@/lib/recon-v2";

type Props = { response: any; caso: CasoV2 | null; fields: FormField[]; mostrarRespostas?: boolean };

/**
 * Painel do professor para uma resposta da Reconciliação v2: respostas em tabelas legíveis, fontes que a dupla abriu
 * e, ao lado, o gabarito do caso (lido da tabela privada, só o dono da sala consegue).
 */
export default function ReconV2Painel({ response, caso, fields, mostrarRespostas = true }: Props) {
  const [gabarito, setGabarito] = useState<Gabarito | null>(null);
  const [aberto, setAberto] = useState(false);
  const [conversa, setConversa] = useState<any | null>(null);

  useEffect(() => {
    let vivo = true;
    setGabarito(null);
    if (!response?.clinical_case_id) return;
    supabase.from("reconciliation_v2_privado" as any).select("gabarito").eq("case_id", response.clinical_case_id).maybeSingle()
      .then(({ data }) => { if (vivo) setGabarito((data as any)?.gabarito || null); });
    return () => { vivo = false; };
  }, [response?.clinical_case_id]);

  useEffect(() => {
    let vivo = true;
    setConversa(null);
    if (!response?.id) return;
    supabase.from("reconciliation_v2_prescritor" as any).select("dados").eq("response_id", response.id).maybeSingle()
      .then(({ data }) => { if (vivo) setConversa((data as any)?.dados || null); });
    return () => { vivo = false; };
  }, [response?.id]);

  const abertas: { id: string; em: string }[] = Array.isArray(response?.fontes_json) ? response.fontes_json : [];
  const idsAbertas = new Set(abertas.map((a) => a.id));
  const fontes = caso?.fontes || [];
  const nomeFonte = (id: string) => fontes.find((f) => f.id === id)?.titulo || id;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-3 text-sm">
        <p className="mb-1.5 font-medium">
          Fontes abertas: {fontes.filter((f) => idsAbertas.has(f.id)).length} de {fontes.length}
          {response?.bpmh_submitted_at && <span className="ml-2 text-xs text-muted-foreground">BPMH enviada em {new Date(response.bpmh_submitted_at).toLocaleString("pt-BR")}</span>}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {fontes.map((f) => (
            <Badge key={f.id} variant={idsAbertas.has(f.id) ? "secondary" : "outline"} className={idsAbertas.has(f.id) ? "" : "text-warning-ink"}>
              {ROTULO_FONTE[f.tipo]}: {f.titulo}{idsAbertas.has(f.id) ? "" : " (não abriu)"}
            </Badge>
          ))}
        </div>
      </div>

      {conversa && Array.isArray(conversa.transcript) && conversa.transcript.length > 0 && (
        <details className="rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer font-medium">Conversa com o prescritor virtual ({Math.ceil(conversa.transcript.length / 2)} troca(s))</summary>
          <div className="mt-3 space-y-2">
            {conversa.transcript.map((t: any, i: number) => (
              <p key={i}><b>{t.role === "aluno" ? "Dupla" : "Prescritor"}:</b> {t.texto}</p>
            ))}
            {Array.isArray(conversa.desfecho) && conversa.desfecho.length > 0 && (
              <div className="rounded-md border bg-muted/30 p-2">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Decisão do prescritor por discrepância (só o professor vê o motivo)</p>
                <ul className="list-disc pl-5">
                  {conversa.desfecho.map((d: any) => {
                    const disc = gabarito?.discrepancias?.find((x) => x.id === d.id);
                    return <li key={d.id}><b>{disc?.medicamento || d.id}</b>: {d.decisao}{d.motivo ? ` (${d.motivo})` : ""}</li>;
                  })}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}

      <div className={mostrarRespostas ? "grid grid-cols-1 gap-6 lg:grid-cols-2" : ""}>
        {mostrarRespostas && (
          <div className="min-w-0">
            <h4 className="mb-3 text-sm font-medium">Respostas da dupla</h4>
            <FormAnswersView fields={fields} answers={response?.answers_json || {}} />
          </div>
        )}
        <div className="min-w-0 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Gabarito do caso</h4>
            <button type="button" className="text-xs text-primary underline" onClick={() => setAberto((v) => !v)}>{aberto ? "Esconder" : "Mostrar"}</button>
          </div>
          {!aberto ? null : !gabarito ? (
            <p className="text-sm text-muted-foreground">Sem gabarito cadastrado para este caso.</p>
          ) : (
            <div className="space-y-2">
              {gabarito.discrepancias.map((d) => (
                <div key={d.id} className="rounded-lg border p-2.5 text-sm">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <b>{d.medicamento}</b>
                    <Badge variant="outline">{ROTULO_DISCREPANCIA[d.tipo]}</Badge>
                    <Badge variant="outline">{ROTULO_INTENCAO[d.intencionalidade]}</Badge>
                    <Badge variant={d.risco === "grave" ? "destructive" : "secondary"}>{ROTULO_RISCO[d.risco]}</Badge>
                    {d.critica && <Badge variant="destructive">crítica</Badge>}
                  </div>
                  <p className="mt-1">{d.descricao}</p>
                  <p className="mt-1 text-muted-foreground"><b>Ação esperada:</b> {d.acao_esperada}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Revelada em: {d.fontes.map((f) => `${nomeFonte(f)}${idsAbertas.has(f) ? "" : " (não aberta)"}`).join("; ")}</p>
                </div>
              ))}
              {gabarito.outros_problemas?.length > 0 && (
                <div className="rounded-lg border p-2.5 text-sm"><b>Outros problemas de segurança</b><ul className="mt-1 list-disc pl-5">{gabarito.outros_problemas.map((o, i) => <li key={i}>{o}</li>)}</ul></div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
