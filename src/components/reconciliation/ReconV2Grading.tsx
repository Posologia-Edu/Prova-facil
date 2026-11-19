import { useEffect, useState } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import FormRenderer from "@/components/forms/FormRenderer";
import { computeFormScore, type FormField } from "@/components/forms/types";
import { notaFinalReconV2 } from "@/lib/recon-v2-nota";
import { reconciliationV2PeerTemplate } from "@/lib/form-templates/pharmacy-reconciliation-v2";
import { ROTULO_DECISAO, ROTULO_DISCREPANCIA, ROTULO_RISCO, type DecisaoPrescritor, type TipoDiscrepancia, type Risco } from "@/lib/recon-v2";
import { RECON_V2_CRITERIOS, criticasEmRisco, type AvaliacaoReconV2 } from "@/lib/recon-v2-rubrica";

type Props = {
  roomId: string;
  response: { id: string; pair_index?: number; admin_score?: number | string | null; admin_feedback?: string | null };
  onSaved: () => void;
};

// A avaliação detalhada fica na tabela privada reconciliation_v2_avaliacoes (o aluno não a lê). Ainda não está nos tipos gerados.
const tabela = () => (supabase as any).from("reconciliation_v2_avaliacoes");
const ROT_TRI: Record<string, string> = { sim: "sim", parcial: "em parte", nao: "não", na: "—" };
const corTri = (v: string) => (v === "sim" ? "text-primary" : v === "parcial" ? "text-warning-ink" : v === "nao" ? "text-destructive" : "text-muted-foreground");

/** Correção da Reconciliação v2 pelo professor: a IA sugere os 10 critérios e a matriz de discrepâncias; o professor revisa, confirma e libera. */
export default function ReconV2Grading({ roomId, response, onSaved }: Props) {
  const [dados, setDados] = useState<AvaliacaoReconV2 | null>(null);
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [comentario, setComentario] = useState("");
  const [confirmada, setConfirmada] = useState(false);
  const [liberada, setLiberada] = useState(false);
  const [lendo, setLendo] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setLendo(true);
    setDados(null); setRespostas({}); setComentario(response.admin_feedback || ""); setConfirmada(false); setLiberada(false);
    tabela().select("dados, confirmada, liberada").eq("response_id", response.id).maybeSingle()
      .then(({ data }: any) => {
        if (!vivo) return;
        if (data?.dados) {
          const av = data.dados as AvaliacaoReconV2;
          setDados(av); setRespostas(av.respostas || {}); setComentario(av.comentario || response.admin_feedback || "");
          setConfirmada(!!data.confirmada); setLiberada(!!data.liberada);
        }
      })
      .then(() => { if (vivo) setLendo(false); }, () => { if (vivo) setLendo(false); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response.id]);

  const nota = computeFormScore(RECON_V2_CRITERIOS, respostas);

  // Revisão cruzada que esta dupla RECEBEU (de 0 a 10), para a nota final 80/20.
  const [revisao, setRevisao] = useState<number | null>(null);
  useEffect(() => {
    let vivo = true;
    setRevisao(null);
    if (response.pair_index == null) return;
    (async () => {
      const { data: rev } = await (supabase as any).from("reconciliation_v2_revisoes").select("answers_json")
        .eq("room_id", roomId).eq("reviewed_pair", response.pair_index).not("submitted_at", "is", null).maybeSingle();
      if (!rev || !vivo) return;
      const { data: f } = await supabase.from("reconciliation_forms").select("content_json").eq("room_id", roomId).eq("form_type", "peer_evaluation").limit(1).maybeSingle();
      const campos: FormField[] = Array.isArray(f?.content_json) ? (f!.content_json as any) : (reconciliationV2PeerTemplate.content_json as FormField[]);
      const max = campos.reduce((s, c) => s + (c.type === "section_header" ? 0 : c.max_score || 0), 0);
      if (vivo && max > 0) setRevisao((computeFormScore(campos, rev.answers_json || {}) / max) * 10);
    })().catch(() => { /* sem revisão: vale só a rubrica */ });
    return () => { vivo = false; };
  }, [roomId, response.pair_index]);
  const notaFinal = notaFinalReconV2(confirmada ? Number(response.admin_score ?? nota) : null, revisao);
  const emRisco = criticasEmRisco(dados?.matriz);

  const corrigir = async () => {
    if (confirmada && !window.confirm("Esta resposta já tem nota confirmada. Corrigir de novo substitui a sugestão, tira a liberação à dupla e pede nova confirmação. Continuar?")) return;
    setCarregando(true);
    try {
      const { data, error } = await supabase.functions.invoke("grade-recon-v2", {
        body: {
          response_id: response.id,
          force: true,
          criterios: RECON_V2_CRITERIOS.map((c) => ({ id: c.id, criterio: c.label, peso: c.max_score, ancoras: c.description, allow_na: !!c.allow_na })),
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Falha ao chamar a IA");
      const av = data.avaliacao as AvaliacaoReconV2;
      setDados(av); setRespostas(av.respostas || {}); setComentario(av.comentario || "");
      setConfirmada(false); setLiberada(false);
      toast({ title: "Sugestão da IA pronta", description: "Revise a matriz e os critérios e confirme a nota." });
      onSaved();
    } catch (e) {
      toast({ title: "Não foi possível corrigir com a IA", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setCarregando(false);
    }
  };

  const confirmar = async () => {
    setSalvando(true);
    const avaliacao: AvaliacaoReconV2 = {
      ...(dados || { respostas: {}, confirmado: false }),
      respostas,
      comentario: comentario.trim() || undefined,
      confirmado: true,
      confirmado_em: new Date().toISOString(),
      origem: dados?.origem === "ia" ? "ia" : "professor",
    };
    const nota2 = Math.round(nota * 100) / 100;
    const { error: e1 } = await tabela().upsert(
      { response_id: response.id, room_id: roomId, dados: avaliacao, confirmada: true, liberada, updated_at: new Date().toISOString() },
      { onConflict: "response_id" },
    );
    const { error: e2 } = e1 ? { error: null } : await supabase.from("reconciliation_responses").update({
      admin_score: nota2, admin_feedback: comentario.trim() || null,
    } as any).eq("id", response.id);
    setSalvando(false);
    const erro = e1 || e2;
    if (erro) { toast({ title: "Erro ao salvar a nota", description: erro.message, variant: "destructive" }); return; }
    setDados(avaliacao); setConfirmada(true);
    toast({ title: "Nota da reconciliação confirmada", description: `${nota2.toFixed(2).replace(".", ",")} de 10` });
    onSaved();
  };

  const alternarLiberacao = async (v: boolean) => {
    const { error } = await tabela().update({ liberada: v, updated_at: new Date().toISOString() }).eq("response_id", response.id);
    if (error) { toast({ title: "Erro ao alterar a liberação", description: error.message, variant: "destructive" }); return; }
    setLiberada(v);
    toast({ title: v ? "Devolutiva liberada à dupla" : "Devolutiva recolhida" });
  };

  const just = dados?.justificativas || {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Correção da Reconciliação v2</p>
        {confirmada && response.admin_score != null ? <StatusBadge tone="ok">Confirmada: {Number(response.admin_score).toFixed(2)}/10</StatusBadge>
          : dados ? <StatusBadge tone="warn">Sugestão da IA, falta confirmar</StatusBadge>
          : <StatusBadge tone="warn">{lendo ? "Carregando..." : "Ainda não corrigido"}</StatusBadge>}
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={corrigir} disabled={carregando} className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />{carregando ? "Corrigindo (pode levar um minuto)..." : dados ? "Corrigir de novo com IA" : "Corrigir com IA"}
        </Button>
      </div>

      {emRisco.length > 0 && (
        <div className="space-y-1.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" />Discrepâncias críticas em risco ({emRisco.length})</p>
          <ul className="list-disc pl-5">
            {emRisco.map((l) => (
              <li key={l.id}><b>{l.medicamento}</b>: {l.achou !== "sim" ? (l.achou === "nao" ? "não identificada" : "identificada em parte") : "identificada, mas a ação proposta ficou " + (l.acao === "nao" ? "ausente" : "parcial")}{!l.fonte_aberta && l.achou !== "sim" ? " (a dupla não abriu a fonte que a revelava)" : ""}.</li>
            ))}
          </ul>
        </div>
      )}

      {dados?.matriz && dados.matriz.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Matriz de discrepâncias</p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="p-2">Discrepância</th><th className="p-2">Risco</th><th className="p-2">Achou</th><th className="p-2">Classificou</th><th className="p-2">Dano</th><th className="p-2">Ação</th><th className="p-2">Prescritor</th></tr>
              </thead>
              <tbody>
                {dados.matriz.map((l) => (
                  <tr key={l.id} className="border-t align-top">
                    <td className="p-2">
                      <b>{l.medicamento}</b> <span className="text-xs text-muted-foreground">({ROTULO_DISCREPANCIA[l.tipo as TipoDiscrepancia] || l.tipo})</span>
                      {l.comentario && <p className="mt-0.5 text-xs text-muted-foreground">{l.comentario}</p>}
                      <p className="mt-0.5 text-xs text-muted-foreground">Fonte: {l.fontes.join("; ")}{l.fonte_aberta ? "" : " (não aberta)"}</p>
                    </td>
                    <td className="p-2 whitespace-nowrap">{ROTULO_RISCO[l.risco as Risco] || l.risco}{l.critica && <Badge variant="destructive" className="ml-1">crítica</Badge>}</td>
                    <td className={`p-2 font-medium ${corTri(l.achou)}`}>{ROT_TRI[l.achou]}</td>
                    <td className={`p-2 ${corTri(l.classificou)}`}>{ROT_TRI[l.classificou]}</td>
                    <td className={`p-2 ${corTri(l.risco_avaliado)}`}>{ROT_TRI[l.risco_avaliado]}</td>
                    <td className={`p-2 ${corTri(l.acao)}`}>{ROT_TRI[l.acao]}</td>
                    <td className="p-2 whitespace-nowrap text-xs">{l.desfecho ? ROTULO_DECISAO[l.desfecho as DecisaoPrescritor] : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(dados.inventadas?.length || 0) > 0 && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              <p className="mb-1 font-medium">Discrepâncias apontadas que não existem no caso (só o professor vê)</p>
              <ul className="list-disc pl-5">{dados.inventadas!.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}
          {dados.codigo && (dados.codigo.prescricao_sem_linha.length > 0 || dados.codigo.bpmh_sem_linha.length > 0) && (
            <p className="text-xs text-muted-foreground">
              Conferência em código. Sem linha na conciliação: {[...dados.codigo.prescricao_sem_linha, ...dados.codigo.bpmh_sem_linha].join(", ")}.
            </p>
          )}
        </div>
      )}

      {dados?.bpmh && dados.bpmh.length > 0 && (
        <details className="rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer font-medium">BPMH esperada: o que a dupla registrou</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {dados.bpmh.map((b, i) => <li key={i}><b>{b.medicamento}</b>: <span className={corTri(b.achou)}>{ROT_TRI[b.achou]}</span>{b.comentario ? `. ${b.comentario}` : ""}</li>)}
          </ul>
        </details>
      )}

      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Critérios</p>
      <FormRenderer fields={RECON_V2_CRITERIOS} answers={respostas} onChange={setRespostas} showScores idPrefix={`rv-${response.id}-`} />

      {Object.keys(just).length > 0 && (
        <div className="space-y-1 rounded-md bg-sunken p-3 text-xs">
          <p className="font-medium">Justificativas da IA (sugestão, você decide):</p>
          {RECON_V2_CRITERIOS.filter((c) => just[c.id]).map((c) => (
            <p key={c.id}><span className="font-medium">{c.label.split("?")[0].slice(0, 70)}…</span> {just[c.id]}</p>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Comentário para a dupla (opcional)</Label>
        <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-sm">Nota da rubrica: {nota.toFixed(2).replace(".", ",")}/10</span>
        <Button size="sm" onClick={confirmar} disabled={salvando || Object.keys(respostas).length === 0}>{confirmada ? "Atualizar nota" : "Confirmar nota"}</Button>
      </div>

      <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
        Revisão cruzada recebida: {revisao == null ? "ainda não há" : `${revisao.toFixed(2).replace(".", ",")}/10`}. Nota final (80% rubrica + 20% revisão): <b className="text-foreground">{notaFinal == null ? "aparece depois de confirmar a rubrica" : `${notaFinal.toFixed(2).replace(".", ",")}/10`}</b>. Sem revisão recebida, vale só a rubrica.
      </p>

      <div className="flex items-start gap-2 rounded-lg border p-3">
        <Checkbox id={`lib-${response.id}`} checked={liberada} disabled={!confirmada} onCheckedChange={(v) => alternarLiberacao(v === true)} />
        <div>
          <Label htmlFor={`lib-${response.id}`} className="text-sm font-medium">Liberar a devolutiva à dupla</Label>
          <p className="text-xs text-muted-foreground">
            {confirmada
              ? "A dupla passa a ver a nota, as justificativas, o seu comentário e a matriz de discrepâncias com a ação esperada e a fonte que revelava cada uma. Duplas que receberam o mesmo caso conseguiriam ver o gabarito: libere depois que todas terminarem."
              : "Confirme a nota antes de liberar."}
          </p>
        </div>
      </div>
    </div>
  );
}
