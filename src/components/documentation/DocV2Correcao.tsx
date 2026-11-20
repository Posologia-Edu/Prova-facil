import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ExtraId } from "@/lib/doc-v2-extras";
import { normalizarRespostas, resumoDocumentos, verificarTudo, type ItemReferencia } from "@/lib/doc-v2";
import { ITENS_CHECKLIST, resumoCompreensao } from "@/lib/doc-v2-paciente";
import { criteriosAplicaveis, notaRubricaDoc, type AvaliacaoDoc } from "@/lib/doc-v2-rubrica";

type Props = {
  roomId: string;
  usaPaciente: boolean;
  response: { id: string; respostas: any };
  referencia: ItemReferencia[];
  totalBarreiras?: number;
  extras?: ExtraId[];
  onSaved: () => void;
};

// A avaliação detalhada fica na tabela privada documentation_v2_avaliacoes (o aluno não a lê). Ainda não está nos tipos gerados.
const tabela = () => (supabase as any).from("documentation_v2_avaliacoes");

/** Correção da Documentação v2 pelo professor: a IA sugere os critérios; o professor revisa, confirma e libera. */
export default function DocV2Correcao({ roomId, usaPaciente, response, referencia, totalBarreiras = 0, extras = [], onSaved }: Props) {
  // Conversa com o paciente virtual (privada): o professor lê tudo, inclusive a medida de compreensão e o checklist do observador.
  const [conversa, setConversa] = useState<any>(null);
  useEffect(() => {
    if (!usaPaciente) return;
    let vivo = true;
    (supabase as any).from("documentation_v2_paciente").select("dados").eq("response_id", response.id).maybeSingle()
      .then(({ data }: any) => { if (vivo) setConversa(data?.dados || null); });
    return () => { vivo = false; };
  }, [usaPaciente, response.id]);
  const comp = conversa ? resumoCompreensao(conversa.entendimento || [], conversa.barreiras_reveladas || [], totalBarreiras) : null;
  const [dados, setDados] = useState<AvaliacaoDoc | null>(null);
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [comentario, setComentario] = useState("");
  const [confirmada, setConfirmada] = useState(false);
  const [liberada, setLiberada] = useState(false);
  const [nota, setNota] = useState<number | null>(null);
  const [lendo, setLendo] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const criterios = useMemo(() => criteriosAplicaveis(usaPaciente, extras), [usaPaciente, extras]);
  const docs = useMemo(() => normalizarRespostas(response.respostas), [response.respostas]);
  const avisos = useMemo(() => verificarTudo(docs, referencia, extras).filter((a) => a.nivel === "aviso"), [docs, referencia]);

  useEffect(() => {
    let vivo = true;
    setLendo(true);
    tabela().select("dados, nota, confirmada, liberada").eq("response_id", response.id).maybeSingle()
      .then(({ data }: any) => {
        if (!vivo || !data?.dados) return;
        const av = data.dados as AvaliacaoDoc;
        setDados(av); setRespostas(av.respostas || {}); setComentario(av.comentario || "");
        setConfirmada(!!data.confirmada); setLiberada(!!data.liberada); setNota(data.nota != null ? Number(data.nota) : null);
      })
      .then(() => { if (vivo) setLendo(false); }, () => { if (vivo) setLendo(false); });
    return () => { vivo = false; };
  }, [response.id]);

  const notaAtual = notaRubricaDoc(respostas, usaPaciente, extras);

  const corrigir = async () => {
    if (confirmada && !window.confirm("Esta resposta já tem nota confirmada. Corrigir de novo substitui a sugestão, tira a liberação à dupla e pede nova confirmação. Continuar?")) return;
    setCarregando(true);
    try {
      const { data, error } = await supabase.functions.invoke("grade-doc-v2", {
        body: {
          response_id: response.id, force: true,
          criterios: criterios.map((c) => ({ id: c.id, criterio: c.label, peso: c.peso, ancoras: c.ancoras, allow_na: !!c.allowNa })),
          avisos: avisos.map((a) => a.texto),
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Falha ao chamar a IA");
      const av = data.avaliacao as AvaliacaoDoc;
      setDados(av); setRespostas(av.respostas || {}); setComentario(av.comentario || "");
      setConfirmada(false); setLiberada(false); setNota(data.nota_sugerida ?? null);
      toast({ title: "Sugestão da IA pronta", description: "Revise os critérios e confirme a nota." });
      onSaved();
    } catch (e) {
      toast({ title: "Não foi possível corrigir com a IA", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally { setCarregando(false); }
  };

  const confirmar = async () => {
    setSalvando(true);
    const avaliacao: AvaliacaoDoc = {
      ...(dados || { respostas: {}, confirmado: false }),
      respostas, comentario: comentario.trim() || undefined,
      confirmado: true, confirmado_em: new Date().toISOString(), origem: dados?.origem === "ia" ? "ia" : "professor",
    };
    const n = Math.round(notaAtual * 100) / 100;
    const { error } = await tabela().upsert(
      { response_id: response.id, room_id: roomId, dados: avaliacao, nota: n, confirmada: true, liberada, updated_at: new Date().toISOString() },
      { onConflict: "response_id" },
    );
    setSalvando(false);
    if (error) { toast({ title: "Erro ao salvar a nota", description: error.message, variant: "destructive" }); return; }
    setDados(avaliacao); setConfirmada(true); setNota(n);
    toast({ title: "Nota da documentação confirmada", description: `${n.toFixed(2).replace(".", ",")} de 10` });
    onSaved();
  };

  const alternarLiberacao = async (v: boolean) => {
    const { error } = await tabela().update({ liberada: v, updated_at: new Date().toISOString() }).eq("response_id", response.id);
    if (error) { toast({ title: "Erro ao alterar a liberação", description: error.message, variant: "destructive" }); return; }
    setLiberada(v);
    toast({ title: v ? "Devolutiva liberada à dupla" : "Devolutiva recolhida" });
    onSaved();
  };

  const just = dados?.justificativas || {};

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Correção da Documentação v2</p>
        {confirmada && nota != null ? <StatusBadge tone="ok">Confirmada: {nota.toFixed(2)}/10</StatusBadge>
          : dados ? <StatusBadge tone="warn">Sugestão da IA, falta confirmar</StatusBadge>
          : <StatusBadge tone="warn">{lendo ? "Carregando..." : "Ainda não corrigido"}</StatusBadge>}
      </div>

      <details className="rounded border bg-background p-2"><summary className="cursor-pointer text-sm font-medium">Ler os documentos da dupla</summary>
        <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap text-xs">{resumoDocumentos(docs, extras)}</pre>
      </details>

      {usaPaciente && (
        <details className="rounded border bg-background p-2"><summary className="cursor-pointer text-sm font-medium">Aconselhamento ao paciente virtual {conversa ? `(${(conversa.transcript || []).filter((t: any) => t.role === "aluno").length} fala(s))` : "(não realizado)"}</summary>
          {conversa && comp && (
            <div className="mt-2 space-y-2 text-xs">
              <p>Mensagens-chave: <b>{comp.abordadas}</b> de {comp.total} abordadas · <b>{comp.corretas}</b> entendidas corretamente, {comp.parciais} em parte · teach-back em {comp.comTeachback}. Barreiras reveladas: <b>{comp.barreiras}</b> de {comp.totalBarreiras}.</p>
              <div className="max-h-64 space-y-1 overflow-auto rounded border p-2">{(conversa.transcript || []).map((t: any, i: number) => <p key={i}><b>{t.role === "aluno" ? "Farmacêutico" : "Paciente"}:</b> {t.texto}</p>)}</div>
              {conversa.checklist ? <p>Checklist do observador: {ITENS_CHECKLIST.map((i) => `${i.texto.split(" ").slice(0, 4).join(" ")}… ${conversa.checklist.respostas?.[i.id] ?? "—"}`).join(" · ")}{conversa.checklist.comentario ? ` — “${conversa.checklist.comentario}”` : ""}</p> : <p>Checklist do observador: não enviado.</p>}
            </div>
          )}
        </details>
      )}

      {avisos.length > 0 && (
        <details className="rounded border bg-background p-2"><summary className="cursor-pointer text-sm font-medium">Conferência automática ({avisos.length} aviso(s))</summary>
          <ul className="mt-2 list-disc pl-5 text-xs">{avisos.map((a) => <li key={a.id}>{a.texto}</li>)}</ul>
        </details>
      )}

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={corrigir} disabled={carregando} className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />{carregando ? "Corrigindo (pode levar um minuto)..." : dados ? "Corrigir de novo com IA" : "Corrigir com IA"}
        </Button>
      </div>

      {(dados?.alertas || []).length > 0 && (
        <div className="space-y-1 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" />Riscos para o paciente apontados pela IA</p>
          <ul className="list-disc pl-5">{dados!.alertas!.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </div>
      )}

      {dados && (
        <div className="space-y-3">
          {criterios.map((c) => (
            <div key={c.id} className="space-y-1 rounded border bg-background p-2">
              <p className="text-sm font-medium">{c.label} <span className="text-xs text-muted-foreground">(peso {String(c.peso).replace(".", ",")})</span></p>
              <details><summary className="cursor-pointer text-xs text-muted-foreground">Âncoras</summary><p className="text-xs">{c.ancoras}</p></details>
              <div className="flex flex-wrap items-center gap-1">
                {[0, 1, 2, 3, 4].map((n) => (
                  <Button key={n} type="button" size="sm" variant={respostas[c.id] === n ? "default" : "outline"} className="h-8 w-8 p-0" aria-label={`${c.id} nota ${n}`}
                    onClick={() => { setRespostas((r) => ({ ...r, [c.id]: n })); setConfirmada(false); }}>{n}</Button>
                ))}
                {c.allowNa && <Button type="button" size="sm" variant={respostas[c.id] === "__na__" ? "default" : "outline"} className="h-8" onClick={() => { setRespostas((r) => ({ ...r, [c.id]: "__na__" })); setConfirmada(false); }}>Não se aplica</Button>}
              </div>
              {just[c.id] && <p className="text-xs text-muted-foreground">IA: {just[c.id]}</p>}
            </div>
          ))}
          <div className="space-y-1">
            <Label htmlFor={`com-${response.id}`} className="text-xs">Comentário para a dupla</Label>
            <Textarea id={`com-${response.id}`} rows={3} value={comentario} onChange={(e) => { setComentario(e.target.value); setConfirmada(false); }} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">Nota da rubrica: <b>{notaAtual.toFixed(2).replace(".", ",")}</b> / 10</p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={liberada} onCheckedChange={(v) => { if (confirmada) void alternarLiberacao(!!v); else setLiberada(!!v); }} />Liberar devolutiva à dupla</label>
              <Button size="sm" onClick={confirmar} disabled={salvando}>{salvando ? "Salvando..." : confirmada ? "Confirmada (salvar de novo)" : "Confirmar nota"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
