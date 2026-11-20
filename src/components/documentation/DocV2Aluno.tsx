import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BookOpen, FilePlus2, CheckCircle2, ClipboardList, Eye, FileText, Pill, Plus, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import DraftStatusBadge from "@/components/forms/DraftStatusBadge";
import DocV2Devolutiva from "@/components/documentation/DocV2Devolutiva";
import DocV2Paciente from "@/components/documentation/DocV2Paciente";
import DocV2ExtraForm from "@/components/documentation/DocV2ExtraForm";
import { ESQUEMAS_EXTRA, extrasValidos, rotuloExtra, type ExtraId } from "@/lib/doc-v2-extras";
import DocV2Revisao from "@/components/documentation/DocV2Revisao";
import DocV2Cronometro from "@/components/documentation/DocV2Cronometro";
import { useFormDraft } from "@/hooks/use-form-draft";
import { ROTULO_FONTE, ROTULO_TRANSICAO, type CasoV2 } from "@/lib/recon-v2";
import {
  linhaCartaoVazia, linhaIntervencaoVazia, linhaProblemaVazia, normalizarRespostas, ROTULO_DOCUMENTO, ROTULO_PRIORIDADE,
  TIPOS_DOCUMENTO, verificarTudo, type ItemReferencia, type Mudanca, type Prioridade, type RespostasV2, type TipoDocumento,
} from "@/lib/doc-v2";

type Props = { room: any; participant: any; accessCode: string; email: string };
type Estado = {
  sala: { id: string; titulo: string; tempo_sugerido_min: number | null };
  parceiro: { nome: string } | null;
  caso: { id: string; titulo: string; caso_json: CasoV2 };
  referencia: ItemReferencia[];
  enviada: boolean;
  respostas: any;
  usa_paciente?: boolean;
  aconselhamento_concluido?: boolean;
  extras?: string[];
};

async function chamar(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("doc-v2-aluno", { body });
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* mantém a mensagem */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

const ICONE: Record<TipoDocumento, typeof FileText> = { encaminhamento: FileText, intervencao: ClipboardList, cartao: Pill, plano: BookOpen };
const ROTULO_CONDUTA: Record<string, string> = { mantido: "Mantido", alterado: "Alterado", novo: "Novo", suspenso: "Suspenso" };

function Campo({ id, rotulo, children }: { id: string; rotulo: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label htmlFor={id} className="text-xs">{rotulo}</Label>{children}</div>;
}

/** Tela do aluno na Documentação v2: dossiê e conciliação de referência de um lado, os quatro documentos do outro. */
export default function DocV2Aluno({ room, participant, accessCode, email }: Props) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [r, setR] = useState<RespostasV2>(() => normalizarRespostas(null));
  const [aba, setAba] = useState<string>("encaminhamento");
  const [previa, setPrevia] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [finalizada, setFinalizada] = useState(false);
  const [conselhoFeito, setConselhoFeito] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try {
      const est: Estado = await chamar({ action: "estado", access_code: accessCode, email });
      setEstado(est);
      if (est.enviada) { setFinalizada(true); setR(normalizarRespostas(est.respostas)); }
      setConselhoFeito(!!est.aconselhamento_concluido);
    } catch (e: any) {
      setErro(e?.message || "Não foi possível carregar o caso.");
    } finally { setCarregando(false); }
  }, [accessCode, email]);
  useEffect(() => { void carregar(); }, [carregar]);

  // Rascunho: o servidor só entrega ao dono da chave. Restaura uma vez, antes de qualquer salvamento.
  const draftKey = room && participant && estado ? `documentation:${room.id}:${participant.id}` : null;
  const { draft, loaded: draftLoaded, status: draftStatus, lastSavedAt, saveDraft, clearDraft } = useFormDraft({ draftKey, module: "documentation", accessCode, email, enabled: !finalizada });
  const restaurado = useRef(false);
  useEffect(() => {
    if (!draftLoaded || finalizada || restaurado.current || !estado) return;
    restaurado.current = true;
    const d = draft as any;
    if (d && d.v2 && typeof d.v2 === "object") {
      setR(normalizarRespostas(d.v2));
      toast({ title: "Rascunho recuperado", description: "Suas respostas anteriores foram restauradas." });
    }
  }, [draft, draftLoaded, finalizada, estado]);
  useEffect(() => {
    if (!draftKey || finalizada || !draftLoaded || !restaurado.current) return;
    saveDraft({ v2: r });
  }, [r, draftKey, draftLoaded, finalizada, saveDraft]);

  const extras = useMemo(() => extrasValidos(estado?.extras), [estado]);
  const avisos = useMemo(() => verificarTudo(r, estado?.referencia || [], extras), [r, estado, extras]);
  const rotuloDoc = (k: string) => (k.startsWith("extra:") ? rotuloExtra(k.slice(6)) : ROTULO_DOCUMENTO[k as TipoDocumento]);
  const pendencias = avisos.filter((a) => a.nivel === "aviso");

  const enviar = async () => {
    if (!confirmar) { setConfirmar(true); return; }
    setEnviando(true);
    try {
      await chamar({ action: "enviar", access_code: accessCode, email, respostas: r });
      await clearDraft();
      setFinalizada(true);
      toast({ title: "Enviado!", description: "A documentação da dupla foi enviada." });
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e?.message || "Tente novamente. Suas respostas estão salvas.", variant: "destructive" });
    } finally { setEnviando(false); setConfirmar(false); }
  };

  const set = <K extends TipoDocumento>(doc: K, patch: Partial<RespostasV2[K]>) => setR((a) => ({ ...a, [doc]: { ...a[doc], ...patch } }));
  const desabilitado = finalizada;

  if (carregando) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Carregando o caso...</div>;
  if (erro || !estado) return <div className="flex min-h-screen items-center justify-center p-4"><Card className="max-w-md"><CardContent className="space-y-3 py-8 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-destructive" /><p className="text-sm">{erro}</p><Button onClick={() => void carregar()}>Tentar de novo</Button></CardContent></Card></div>;

  const caso = estado.caso.caso_json;
  const p = caso.paciente;

  const cabecalhoEncaminhamento = r.encaminhamento;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg font-medium">Documentação — {estado.sala.titulo}</CardTitle>
              <p className="text-sm text-muted-foreground">{estado.parceiro ? `Dupla com ${estado.parceiro.nome}` : "Individual"}{estado.sala.tempo_sugerido_min ? ` · tempo sugerido: ${estado.sala.tempo_sugerido_min} min` : ""}</p>
              {estado.sala.tempo_sugerido_min && !finalizada && <DocV2Cronometro minutos={estado.sala.tempo_sugerido_min} chave={`docv2-inicio:${room.id}:${participant.id}`} />}
            </CardHeader>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 font-heading text-base font-medium"><BookOpen className="h-4 w-4" />{caso.titulo}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{caso.resumo}</p>
              <p className="text-muted-foreground">{p.nome}, {p.idade} anos, {p.sexo === "F" ? "feminino" : "masculino"}, {p.peso_kg} kg{p.creatinina_mg_dl ? `, creatinina ${p.creatinina_mg_dl} mg/dL` : ""}. Alergias: {p.alergias_registradas || "não registradas"}.</p>
              <p><Badge variant="secondary">{ROTULO_TRANSICAO[caso.transicao]}</Badge> {p.motivo}</p>
              {extras.some((id) => caso.ocorrencias?.[id]) && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 text-xs"><p className="font-medium">O que aconteceu depois</p>{extras.filter((id) => caso.ocorrencias?.[id]).map((id) => <p key={id} className="mt-1">{caso.ocorrencias![id]}</p>)}</div>
              )}
              <details className="rounded border p-2"><summary className="cursor-pointer text-xs font-medium">Fontes do dossiê ({caso.fontes.length})</summary>
                <div className="mt-2 space-y-2">{caso.fontes.map((f) => <div key={f.id}><p className="text-xs font-medium">{f.titulo} <span className="text-muted-foreground">({ROTULO_FONTE[f.tipo]})</span></p><p className="whitespace-pre-wrap text-xs">{f.texto}</p></div>)}</div>
              </details>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 font-heading text-base font-medium"><Pill className="h-4 w-4" />Conciliação validada</CardTitle><p className="text-xs text-muted-foreground">É a base dos seus documentos: o que o paciente deve usar depois desta transição.</p></CardHeader>
            <CardContent>
              {estado.referencia.length === 0 ? <p className="text-sm text-muted-foreground">O professor ainda não cadastrou a conciliação deste caso. Avise-o.</p> : (
                <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th className="p-1">Medicamento</th><th className="p-1">Conduta</th><th className="p-1">Frequência</th></tr></thead>
                  <tbody>{estado.referencia.map((m, i) => <tr key={i} className="border-t"><td className="p-1">{m.medicamento}</td><td className="p-1">{ROTULO_CONDUTA[m.conduta] || m.conduta}</td><td className="p-1">{m.frequencia || "—"}</td></tr>)}</tbody></table></div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="tablist">
            {TIPOS_DOCUMENTO.map((t) => {
              const Icone = ICONE[t];
              const n = avisos.filter((a) => a.documento === t && a.nivel === "aviso").length;
              return <Button key={t} role="tab" aria-selected={aba === t} variant={aba === t ? "default" : "outline"} size="sm" onClick={() => { setAba(t); setPrevia(false); }}><Icone className="mr-1 h-3.5 w-3.5" />{ROTULO_DOCUMENTO[t].split(" ")[0]}{n > 0 && <Badge variant="secondary" className="ml-1">{n}</Badge>}</Button>;
            })}
            {extras.map((id) => {
              const n = avisos.filter((a) => a.documento === `extra:${id}` && a.nivel === "aviso").length;
              return <Button key={id} role="tab" aria-selected={aba === `extra:${id}`} variant={aba === `extra:${id}` ? "default" : "outline"} size="sm" onClick={() => { setAba(`extra:${id}`); setPrevia(false); }}><FilePlus2 className="mr-1 h-3.5 w-3.5" />{rotuloExtra(id).split(" ").slice(0, 2).join(" ")}{n > 0 && <Badge variant="secondary" className="ml-1">{n}</Badge>}</Button>;
            })}
          </div>

          <Card>
            <CardHeader><CardTitle className="font-heading text-base font-medium">{rotuloDoc(aba)}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <fieldset disabled={desabilitado} className="space-y-4">
                {aba === "encaminhamento" && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Campo id="enc-dest" rotulo="Para (nome)"><Input id="enc-dest" value={r.encaminhamento.destinatario} onChange={(e) => set("encaminhamento", { destinatario: e.target.value })} /></Campo>
                      <Campo id="enc-cargo" rotulo="Cargo ou função"><Input id="enc-cargo" value={r.encaminhamento.cargo} onChange={(e) => set("encaminhamento", { cargo: e.target.value })} /></Campo>
                      <Campo id="enc-serv" rotulo="Serviço ou unidade"><Input id="enc-serv" value={r.encaminhamento.servico} onChange={(e) => set("encaminhamento", { servico: e.target.value })} /></Campo>
                      <Campo id="enc-prio" rotulo="Prioridade">
                        <select id="enc-prio" value={r.encaminhamento.prioridade} onChange={(e) => set("encaminhamento", { prioridade: e.target.value as Prioridade | "" })} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                          <option value="">Escolha</option>{(Object.keys(ROTULO_PRIORIDADE) as Prioridade[]).map((k) => <option key={k} value={k}>{ROTULO_PRIORIDADE[k]}</option>)}
                        </select>
                      </Campo>
                      <Campo id="enc-prazo" rotulo="Prazo de resposta"><Input id="enc-prazo" value={r.encaminhamento.prazo} onChange={(e) => set("encaminhamento", { prazo: e.target.value })} placeholder="Ex.: até a visita de amanhã" /></Campo>
                    </div>
                    {([["s", "Situação (o que está acontecendo)"], ["b", "Background (o que o destinatário precisa saber do histórico)"], ["a", "Avaliação (o que você concluiu)"], ["r", "Recomendação (o que você pede)"]] as const).map(([k, rot]) => (
                      <Campo key={k} id={`enc-${k}`} rotulo={rot}><Textarea id={`enc-${k}`} rows={3} value={r.encaminhamento[k]} onChange={(e) => set("encaminhamento", { [k]: e.target.value })} /></Campo>
                    ))}
                    <div className="space-y-2">
                      <p className="text-xs font-medium">Problemas priorizados</p>
                      {r.encaminhamento.problemas.map((l, i) => (
                        <div key={i} className="grid gap-2 rounded border p-2 sm:grid-cols-2">
                          <Input aria-label={`Problema ${i + 1}`} placeholder="Problema" value={l.problema} onChange={(e) => set("encaminhamento", { problemas: r.encaminhamento.problemas.map((x, j) => (j === i ? { ...x, problema: e.target.value } : x)) })} />
                          <Input aria-label={`Evidência ${i + 1}`} placeholder="Evidência (dado do caso)" value={l.evidencia} onChange={(e) => set("encaminhamento", { problemas: r.encaminhamento.problemas.map((x, j) => (j === i ? { ...x, evidencia: e.target.value } : x)) })} />
                          <Input aria-label={`Sugestão ${i + 1}`} placeholder="Sugestão de conduta" value={l.sugestao} onChange={(e) => set("encaminhamento", { problemas: r.encaminhamento.problemas.map((x, j) => (j === i ? { ...x, sugestao: e.target.value } : x)) })} />
                          <div className="flex gap-2">
                            <select aria-label={`Prioridade do problema ${i + 1}`} value={l.prioridade} onChange={(e) => set("encaminhamento", { problemas: r.encaminhamento.problemas.map((x, j) => (j === i ? { ...x, prioridade: e.target.value as Prioridade | "" } : x)) })} className="h-10 flex-1 rounded-md border border-input bg-background px-2 text-sm">
                              <option value="">Prioridade</option>{(Object.keys(ROTULO_PRIORIDADE) as Prioridade[]).map((k) => <option key={k} value={k}>{ROTULO_PRIORIDADE[k]}</option>)}
                            </select>
                            <Button type="button" variant="ghost" size="sm" aria-label={`Remover problema ${i + 1}`} onClick={() => set("encaminhamento", { problemas: r.encaminhamento.problemas.filter((_, j) => j !== i) })}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => set("encaminhamento", { problemas: [...r.encaminhamento.problemas, linhaProblemaVazia()] })}><Plus className="mr-1 h-3.5 w-3.5" />Adicionar problema</Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Campo id="enc-farm" rotulo="Farmacêutico(a)"><Input id="enc-farm" value={cabecalhoEncaminhamento.farmaceutico} onChange={(e) => set("encaminhamento", { farmaceutico: e.target.value })} /></Campo>
                      <Campo id="enc-crf" rotulo="CRF (fictício)"><Input id="enc-crf" value={cabecalhoEncaminhamento.crf} onChange={(e) => set("encaminhamento", { crf: e.target.value })} placeholder="CRF-XX 00000" /></Campo>
                      <Campo id="enc-data" rotulo="Data"><Input id="enc-data" value={cabecalhoEncaminhamento.data} onChange={(e) => set("encaminhamento", { data: e.target.value })} placeholder="dd/mm/aaaa" /></Campo>
                    </div>
                  </>
                )}

                {aba === "intervencao" && (
                  <>
                    <p className="text-xs text-muted-foreground">Uma linha para cada intervenção que você fez ou propôs. Classificação inspirada na PCNE, adaptada para o ensino.</p>
                    {r.intervencao.linhas.map((l, i) => {
                      const mudar = (patch: Partial<typeof l>) => set("intervencao", { linhas: r.intervencao.linhas.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                      return (
                        <div key={i} className="grid gap-2 rounded border p-2 sm:grid-cols-2">
                          <Input aria-label={`Medicamento ${i + 1}`} placeholder="Medicamento" value={l.medicamento} onChange={(e) => mudar({ medicamento: e.target.value })} />
                          <Input aria-label={`Problema ${i + 1}`} placeholder="Problema relacionado ao medicamento" value={l.problema} onChange={(e) => mudar({ problema: e.target.value })} />
                          <Input aria-label={`Causa ${i + 1}`} placeholder="Causa provável" value={l.causa} onChange={(e) => mudar({ causa: e.target.value })} />
                          <Input aria-label={`Intervenção ${i + 1}`} placeholder="Intervenção proposta" value={l.intervencao} onChange={(e) => mudar({ intervencao: e.target.value })} />
                          <Input aria-label={`Dirigida a ${i + 1}`} placeholder="Dirigida a (prescritor, paciente, equipe)" value={l.alvo} onChange={(e) => mudar({ alvo: e.target.value })} />
                          <Input aria-label={`Aceitação ${i + 1}`} placeholder="Aceita? (sim, não, em aberto)" value={l.aceitacao} onChange={(e) => mudar({ aceitacao: e.target.value })} />
                          <Input aria-label={`Desfecho ${i + 1}`} placeholder="Desfecho esperado" value={l.desfecho} onChange={(e) => mudar({ desfecho: e.target.value })} className="sm:col-span-2" />
                          <Button type="button" variant="ghost" size="sm" className="justify-self-end sm:col-span-2" onClick={() => set("intervencao", { linhas: r.intervencao.linhas.filter((_, j) => j !== i) })}><Trash2 className="mr-1 h-3.5 w-3.5" />Remover</Button>
                        </div>
                      );
                    })}
                    <Button type="button" variant="outline" size="sm" onClick={() => set("intervencao", { linhas: [...r.intervencao.linhas, linhaIntervencaoVazia()] })}><Plus className="mr-1 h-3.5 w-3.5" />Adicionar intervenção</Button>
                  </>
                )}

                {aba === "cartao" && !previa && (
                  <>
                    <p className="text-xs text-muted-foreground">Escreva para o paciente, não para o médico: palavras do dia a dia, frases curtas.</p>
                    {r.cartao.linhas.map((l, i) => {
                      const mudar = (patch: Partial<typeof l>) => set("cartao", { linhas: r.cartao.linhas.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                      return (
                        <div key={i} className="space-y-2 rounded border p-2">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input aria-label={`Medicamento ${i + 1}`} placeholder="Medicamento e dose" value={l.medicamento} onChange={(e) => mudar({ medicamento: e.target.value })} />
                            <Input aria-label={`Para que serve ${i + 1}`} placeholder="Para que serve" value={l.para_que} onChange={(e) => mudar({ para_que: e.target.value })} />
                            <Input aria-label={`Como tomar ${i + 1}`} placeholder="Como tomar" value={l.como_tomar} onChange={(e) => mudar({ como_tomar: e.target.value })} />
                            <Input aria-label={`Frequência ${i + 1}`} placeholder="Frequência (ex.: 2 vezes ao dia)" value={l.frequencia} onChange={(e) => mudar({ frequencia: e.target.value })} />
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            {([["manha", "Manhã"], ["tarde", "Tarde"], ["noite", "Noite"], ["deitar", "Ao deitar"]] as const).map(([k, rot]) => (
                              <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={l[k]} onChange={(e) => mudar({ [k]: e.target.checked })} />{rot}</label>
                            ))}
                            <select aria-label={`O que mudou ${i + 1}`} value={l.mudou} onChange={(e) => mudar({ mudou: e.target.value as Mudanca })} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                              <option value="">O que mudou?</option><option value="novo">Novo</option><option value="mantido">Mantido</option><option value="alterado">Alterado</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <Input aria-label={`Cuidado ${i + 1}`} placeholder="Cuidado especial (opcional)" value={l.cuidado} onChange={(e) => mudar({ cuidado: e.target.value })} />
                            <Button type="button" variant="ghost" size="sm" aria-label={`Remover linha ${i + 1}`} onClick={() => set("cartao", { linhas: r.cartao.linhas.filter((_, j) => j !== i) })}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                      );
                    })}
                    <Button type="button" variant="outline" size="sm" onClick={() => set("cartao", { linhas: [...r.cartao.linhas, linhaCartaoVazia()] })}><Plus className="mr-1 h-3.5 w-3.5" />Adicionar medicamento</Button>

                    <div className="space-y-2">
                      <p className="text-xs font-medium">Pare de usar</p>
                      {r.cartao.pare.map((l, i) => (
                        <div key={i} className="flex gap-2">
                          <Input aria-label={`Parar medicamento ${i + 1}`} placeholder="Medicamento" value={l.medicamento} onChange={(e) => set("cartao", { pare: r.cartao.pare.map((x, j) => (j === i ? { ...x, medicamento: e.target.value } : x)) })} />
                          <Input aria-label={`Motivo ${i + 1}`} placeholder="Por quê, em palavras simples" value={l.motivo} onChange={(e) => set("cartao", { pare: r.cartao.pare.map((x, j) => (j === i ? { ...x, motivo: e.target.value } : x)) })} />
                          <Button type="button" variant="ghost" size="sm" aria-label={`Remover ${i + 1}`} onClick={() => set("cartao", { pare: r.cartao.pare.filter((_, j) => j !== i) })}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => set("cartao", { pare: [...r.cartao.pare, { medicamento: "", motivo: "" }] })}><Plus className="mr-1 h-3.5 w-3.5" />Adicionar</Button>
                    </div>
                    <Campo id="cartao-esq" rotulo="Se esquecer uma dose"><Textarea id="cartao-esq" rows={2} value={r.cartao.se_esquecer} onChange={(e) => set("cartao", { se_esquecer: e.target.value })} /></Campo>
                    <Campo id="cartao-atend" rotulo="Procure atendimento se..."><Textarea id="cartao-atend" rows={2} value={r.cartao.procure_atendimento} onChange={(e) => set("cartao", { procure_atendimento: e.target.value })} /></Campo>
                    <Campo id="cartao-onde" rotulo="Onde conseguir os medicamentos"><Textarea id="cartao-onde" rows={2} value={r.cartao.onde_conseguir} onChange={(e) => set("cartao", { onde_conseguir: e.target.value })} /></Campo>
                  </>
                )}

                {aba.startsWith("extra:") && extras.includes(aba.slice(6) as ExtraId) && (() => {
                  const id = aba.slice(6) as ExtraId;
                  const esq = ESQUEMAS_EXTRA[id];
                  return (
                    <>
                      <p className="text-xs text-muted-foreground">{esq.descricao}</p>
                      {caso.ocorrencias?.[id] && <p className="rounded-lg border bg-muted/30 p-3 text-sm"><b>Ocorrência:</b> {caso.ocorrencias[id]}</p>}
                      <DocV2ExtraForm esquema={esq} valor={r.extras[id] || {}} onChange={(v) => setR((a) => ({ ...a, extras: { ...a.extras, [id]: v } }))} desabilitado={desabilitado} />
                    </>
                  );
                })()}

                {aba === "plano" && (
                  <>
                    <Campo id="plano-metas" rotulo="Metas do tratamento"><Textarea id="plano-metas" rows={3} value={r.plano.metas} onChange={(e) => set("plano", { metas: e.target.value })} /></Campo>
                    <Campo id="plano-acoes" rotulo="Ações combinadas (farmacêutico, paciente, equipe)"><Textarea id="plano-acoes" rows={4} value={r.plano.acoes} onChange={(e) => set("plano", { acoes: e.target.value })} /></Campo>
                    <Campo id="plano-mon" rotulo="O que será monitorado"><Textarea id="plano-mon" rows={3} value={r.plano.monitorizacao} onChange={(e) => set("plano", { monitorizacao: e.target.value })} /></Campo>
                    <Campo id="plano-ret" rotulo="Quando o paciente volta"><Input id="plano-ret" value={r.plano.retorno} onChange={(e) => set("plano", { retorno: e.target.value })} /></Campo>
                  </>
                )}
              </fieldset>

              {aba === "cartao" && (
                <Button type="button" variant="outline" size="sm" onClick={() => setPrevia((v) => !v)}><Eye className="mr-1 h-3.5 w-3.5" />{previa ? "Voltar a editar" : "Ver como o paciente verá"}</Button>
              )}
              {aba === "cartao" && previa && <CartaoPrevia r={r} nome={p.nome} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-heading text-base font-medium">Conferência automática</CardTitle><p className="text-xs text-muted-foreground">São só avisos: você decide se corrige. Nada bloqueia o envio.</p></CardHeader>
            <CardContent>
              {pendencias.length === 0 ? <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-success" />Nenhum aviso.</p> : (
                <ul className="space-y-1 text-sm">{pendencias.map((a) => <li key={a.id} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" /><span><b>{rotuloDoc(a.documento).split(" ")[0]}:</b> {a.texto}</span></li>)}</ul>
              )}
            </CardContent>
          </Card>

          {finalizada ? (
            estado.usa_paciente && !conselhoFeito
              ? <DocV2Paciente accessCode={accessCode} email={email} nomePaciente={p.nome} onConcluida={() => setConselhoFeito(true)} />
              : <><DocV2Revisao accessCode={accessCode} email={email} /><DocV2Devolutiva accessCode={accessCode} email={email} /></>
          ) : (
            <>
              <div className="flex justify-end"><DraftStatusBadge status={draftStatus} lastSavedAt={lastSavedAt} /></div>
              <Button type="button" size="lg" className="sticky bottom-2 z-10 w-full shadow-lg" onClick={enviar} disabled={enviando}>
                <Send className="mr-2 h-4 w-4" />{confirmar ? `Confirmar envio${pendencias.length ? ` (${pendencias.length} aviso(s) em aberto)` : ""}: não será possível editar` : "Enviar documentação"}
              </Button>
              {confirmar && <Button type="button" variant="ghost" className="w-full" onClick={() => setConfirmar(false)}>Cancelar</Button>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Prévia do cartão como o paciente o receberia (folha A4 simplificada). */
function CartaoPrevia({ r, nome }: { r: RespostasV2; nome: string }) {
  const c = r.cartao;
  const linhas = c.linhas.filter((l) => l.medicamento.trim());
  const marca = (b: boolean) => (b ? "●" : "");
  return (
    <div className="mx-auto max-w-[210mm] space-y-3 rounded border bg-white p-4 text-black shadow-sm">
      <h3 className="text-lg font-bold">Meus medicamentos</h3>
      <p className="text-sm">{nome}</p>
      <div className="overflow-x-auto"><table className="w-full border-collapse text-sm">
        <thead><tr className="bg-neutral-100 text-left"><th className="border p-1">Medicamento</th><th className="border p-1">Para que serve</th><th className="border p-1">Como tomar</th><th className="border p-1 text-center">Manhã</th><th className="border p-1 text-center">Tarde</th><th className="border p-1 text-center">Noite</th><th className="border p-1 text-center">Deitar</th><th className="border p-1">Mudou</th></tr></thead>
        <tbody>{linhas.map((l, i) => <tr key={i}><td className="border p-1 font-medium">{l.medicamento}</td><td className="border p-1">{l.para_que}</td><td className="border p-1">{l.como_tomar}{l.cuidado ? ` — ${l.cuidado}` : ""}</td><td className="border p-1 text-center">{marca(l.manha)}</td><td className="border p-1 text-center">{marca(l.tarde)}</td><td className="border p-1 text-center">{marca(l.noite)}</td><td className="border p-1 text-center">{marca(l.deitar)}</td><td className="border p-1">{l.mudou ? l.mudou[0].toUpperCase() + l.mudou.slice(1) : ""}</td></tr>)}</tbody>
      </table></div>
      {c.pare.some((l) => l.medicamento.trim()) && <div><p className="font-bold">Pare de usar</p><ul className="list-disc pl-5 text-sm">{c.pare.filter((l) => l.medicamento.trim()).map((l, i) => <li key={i}><b>{l.medicamento}</b>: {l.motivo}</li>)}</ul></div>}
      {c.se_esquecer && <div><p className="font-bold">Se esquecer uma dose</p><p className="text-sm">{c.se_esquecer}</p></div>}
      {c.procure_atendimento && <div><p className="font-bold">Procure atendimento se</p><p className="text-sm">{c.procure_atendimento}</p></div>}
      {c.onde_conseguir && <div><p className="font-bold">Onde conseguir</p><p className="text-sm">{c.onde_conseguir}</p></div>}
    </div>
  );
}
