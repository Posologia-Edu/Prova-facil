import { useEffect, useState } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import FormRenderer from "@/components/forms/FormRenderer";
import FormAnswersView from "@/components/forms/FormAnswersView";
import { computeFormScore, type FormField } from "@/components/forms/types";
import { SOAP_V2_CRITERIOS, type AvaliacaoSoapV2 } from "@/lib/soap-v2-rubrica";

type Props = {
  roomId: string;
  response: { id: string; answers_json?: any; admin_score?: number | string | null; admin_feedback?: string | null };
  soapFields: FormField[];
  onSaved: () => void;
};

const ORIGEM_GABARITO: Record<string, string> = {
  paciente_virtual: "Gabarito do paciente virtual de origem",
  deduzido: "Sem gabarito: a IA deduziu os problemas a partir do roteiro",
  nenhum: "Sem roteiro nem gabarito",
};

// A avaliação detalhada fica na tabela privada soap_v2_avaliacoes (o aluno não a lê). Ainda não está nos tipos gerados.
const tabela = () => (supabase as any).from("soap_v2_avaliacoes");

/** Correção do SOAP v2 pelo professor: a IA sugere a pontuação dos 10 critérios, o professor revisa, confirma e libera a devolutiva. */
export function SoapV2Grading({ roomId, response, soapFields, onSaved }: Props) {
  const [dados, setDados] = useState<AvaliacaoSoapV2 | null>(null);
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [comentario, setComentario] = useState("");
  const [confirmada, setConfirmada] = useState(false);
  const [liberada, setLiberada] = useState(false);
  const [lendo, setLendo] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Troca de aluno: recarrega o que está salvo para aquela resposta.
  useEffect(() => {
    let vivo = true;
    setLendo(true);
    setDados(null); setRespostas({}); setComentario(response.admin_feedback || ""); setConfirmada(false); setLiberada(false);
    tabela().select("dados, confirmada, liberada").eq("response_id", response.id).maybeSingle()
      .then(({ data }: any) => {
        if (!vivo) return;
        if (data?.dados) {
          const av = data.dados as AvaliacaoSoapV2;
          setDados(av);
          setRespostas(av.respostas || {});
          setComentario(av.comentario || response.admin_feedback || "");
          setConfirmada(!!data.confirmada);
          setLiberada(!!data.liberada);
        }
      })
      .then(() => { if (vivo) setLendo(false); }, () => { if (vivo) setLendo(false); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response.id]);

  const nota = computeFormScore(SOAP_V2_CRITERIOS, respostas);

  const corrigir = async () => {
    if (confirmada && !window.confirm("Esta resposta já tem nota confirmada. Corrigir de novo substitui a sugestão, tira a liberação ao aluno e pede nova confirmação. Continuar?")) return;
    setCarregando(true);
    try {
      const { data, error } = await supabase.functions.invoke("grade-soap-v2", {
        body: {
          response_id: response.id,
          force: true,
          criterios: SOAP_V2_CRITERIOS.map((c) => ({ id: c.id, criterio: c.label, peso: c.max_score, ancoras: c.description, allow_na: !!c.allow_na })),
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Falha ao chamar a IA");
      const av = data.avaliacao as AvaliacaoSoapV2;
      setDados(av);
      setRespostas(av.respostas || {});
      setComentario(av.comentario || "");
      setConfirmada(false);
      setLiberada(false);
      toast({ title: "Sugestão da IA pronta", description: "Revise os critérios e confirme a nota." });
      onSaved();
    } catch (e) {
      toast({ title: "Não foi possível corrigir com a IA", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setCarregando(false);
    }
  };

  const confirmar = async () => {
    setSalvando(true);
    const avaliacao: AvaliacaoSoapV2 = {
      ...(dados || { respostas: {} }),
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
    const { error: e2 } = e1 ? { error: null } : await supabase.from("soap_responses").update({
      admin_score: nota2,
      admin_feedback: comentario.trim() || null,
    } as any).eq("id", response.id);
    setSalvando(false);
    const erro = e1 || e2;
    if (erro) {
      toast({ title: "Erro ao salvar a nota", description: erro.message, variant: "destructive" });
      return;
    }
    setDados(avaliacao);
    setConfirmada(true);
    toast({ title: "Nota do SOAP confirmada", description: `${nota2.toFixed(2).replace(".", ",")} de 10` });
    onSaved();
  };

  const alternarLiberacao = async (v: boolean) => {
    const { error } = await tabela().update({ liberada: v, updated_at: new Date().toISOString() }).eq("response_id", response.id);
    if (error) {
      toast({ title: "Erro ao alterar a liberação", description: error.message, variant: "destructive" });
      return;
    }
    setLiberada(v);
    toast({ title: v ? "Devolutiva liberada ao aluno" : "Devolutiva recolhida" });
  };

  const auditoria = dados?.auditoria;
  const temAlertas = !!auditoria && (auditoria.inventados.length + auditoria.nao_coletados.length + auditoria.contradicoes.length > 0);
  const just = dados?.justificativas || {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Correção do SOAP v2 (vale 80% da nota; os outros 20% vêm da revisão por pares)</p>
        {confirmada && response.admin_score != null ? <StatusBadge tone="ok">Confirmada: {Number(response.admin_score).toFixed(2)}/10</StatusBadge>
          : dados ? <StatusBadge tone="warn">Sugestão da IA, falta confirmar</StatusBadge>
          : <StatusBadge tone="warn">{lendo ? "Carregando..." : "Ainda não corrigido"}</StatusBadge>}
      </div>

      <details className="rounded-lg border p-3 text-sm">
        <summary className="cursor-pointer font-medium">SOAP do aluno</summary>
        <div className="mt-3 max-h-[50vh] overflow-y-auto"><FormAnswersView fields={soapFields} answers={response.answers_json || {}} /></div>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Critérios</p>
        <Button size="sm" variant="outline" onClick={corrigir} disabled={carregando} className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />{carregando ? "Corrigindo (pode levar um minuto)..." : dados ? "Corrigir de novo com IA" : "Corrigir com IA"}
        </Button>
      </div>

      {dados && (
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>{ORIGEM_GABARITO[dados.gabarito_origem || "nenhum"]}.</p>
          {dados.roteiro_encontrado === false && <p className="flex items-center gap-1.5 text-warning-ink"><AlertTriangle className="h-3.5 w-3.5" />Roteiro do caso não encontrado: a IA não pôde checar os fatos do paciente.</p>}
          {dados.registro_encontrado === false && <p className="flex items-center gap-1.5 text-warning-ink"><AlertTriangle className="h-3.5 w-3.5" />Registro da anamnese não encontrado: a fidelidade do SOAP não foi auditada.</p>}
        </div>
      )}

      {temAlertas && (
        <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" />Alertas da auditoria dos fatos (só o professor vê)</p>
          {auditoria!.inventados.length > 0 && <div><p className="text-xs font-semibold">Dados que não estão no registro nem no roteiro</p><ul className="list-disc pl-5">{auditoria!.inventados.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
          {auditoria!.contradicoes.length > 0 && <div><p className="text-xs font-semibold">Contradizem o registro ou o roteiro</p><ul className="list-disc pl-5">{auditoria!.contradicoes.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
          {auditoria!.nao_coletados.length > 0 && <div><p className="text-xs font-semibold">Estão no roteiro, mas não no registro do aluno (como ele soube?)</p><ul className="list-disc pl-5">{auditoria!.nao_coletados.map((t, i) => <li key={i}>{t}</li>)}</ul><p className="mt-1 text-xs text-muted-foreground">Não tiram nota sozinhos. Você decide se foi conversa com o colega, memória ou falha do registro.</p></div>}
        </div>
      )}

      <FormRenderer fields={SOAP_V2_CRITERIOS} answers={respostas} onChange={setRespostas} showScores idPrefix={`sv-${response.id}-`} />

      {Object.keys(just).length > 0 && (
        <div className="space-y-1 rounded-md bg-sunken p-3 text-xs">
          <p className="font-medium">Justificativas da IA (sugestão, você decide):</p>
          {SOAP_V2_CRITERIOS.filter((c) => just[c.id]).map((c) => (
            <p key={c.id}><span className="font-medium">{c.label.split("?")[0].slice(0, 70)}…</span> {just[c.id]}</p>
          ))}
        </div>
      )}

      {dados && (dados.cobertura?.length || 0) > 0 && (
        <details className="rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer font-medium">Problemas esperados do caso: o que este aluno identificou</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {dados.cobertura!.map((c, k) => <li key={k}><b>{c.problema}</b>: {c.identificado === "sim" ? "identificou" : c.identificado === "parcial" ? "identificou em parte" : "não identificou"}{c.motivo ? ` (${c.motivo})` : ""}</li>)}
          </ul>
        </details>
      )}

      {dados && ((dados.iceberg?.length || 0) > 0 || (dados.calibracao?.length || 0) > 0) && (
        <details className="rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer font-medium">Mapa do iceberg e calibração da confiança (vão para a devolutiva do aluno)</summary>
          <div className="mt-3 space-y-3">
            {(dados.iceberg?.length || 0) > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">O que o paciente sabia e não entrou no registro</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">{dados.iceberg!.map((i, k) => <li key={k}>{i.fato}{i.nivel ? <span className="text-muted-foreground"> ({i.nivel})</span> : null}. {i.impacto}</li>)}</ul>
              </div>
            )}
            {(dados.calibracao?.length || 0) > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Confiança do aluno x qualidade do problema</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">{dados.calibracao!.map((c, k) => <li key={k}><b>{c.problema}</b> (confiança {c.confianca_aluno || "não informada"}): {c.avaliacao}. {c.comentario}</li>)}</ul>
              </div>
            )}
          </div>
        </details>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Comentário para o aluno (opcional)</Label>
        <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-sm">Nota do SOAP: {nota.toFixed(2).replace(".", ",")}/10</span>
        <Button size="sm" onClick={confirmar} disabled={salvando || Object.keys(respostas).length === 0}>
          {confirmada ? "Atualizar nota" : "Confirmar nota"}
        </Button>
      </div>

      <div className="flex items-start gap-2 rounded-lg border p-3">
        <Checkbox id={`lib-${response.id}`} checked={liberada} disabled={!confirmada} onCheckedChange={(v) => alternarLiberacao(v === true)} />
        <div>
          <Label htmlFor={`lib-${response.id}`} className="text-sm font-medium">Liberar a devolutiva ao aluno</Label>
          <p className="text-xs text-muted-foreground">
            {confirmada
              ? "O aluno passa a ver a nota da rubrica, as justificativas, o seu comentário, o mapa do iceberg e a calibração. Os alertas da auditoria e os problemas esperados nunca vão ao aluno."
              : "Confirme a nota antes de liberar."}
          </p>
        </div>
      </div>
    </div>
  );
}
