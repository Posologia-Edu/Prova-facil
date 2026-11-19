import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Calculator, CheckCircle2, Lock, Pill, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import FormRenderer from "@/components/forms/FormRenderer";
import FormAnswersView from "@/components/forms/FormAnswersView";
import DraftStatusBadge from "@/components/forms/DraftStatusBadge";
import ReconV2Devolutiva from "@/components/reconciliation/ReconV2Devolutiva";
import ReconV2Revisao from "@/components/reconciliation/ReconV2Revisao";
import ReconV2Prescritor from "@/components/reconciliation/ReconV2Prescritor";
import { getSections, type FormField } from "@/components/forms/types";
import { useFormDraft } from "@/hooks/use-form-draft";
import { RECON_V2, RECON_V2_LINHAS_BPMH } from "@/lib/form-templates/pharmacy-reconciliation-v2";
import {
  clearanceCreatinina, medicamentosBpmh, montarConciliacao, progressoRecon, verificarCoerenciaRecon,
  ROTULO_FONTE, ROTULO_TRANSICAO, type CasoV2, type ItemPrescricao,
} from "@/lib/recon-v2";

type Props = { room: any; participant: any; accessCode: string; email: string };
type Aberta = { id: string; em: string };
type Estado = {
  caso: { id: string; titulo: string; caso_json: CasoV2 };
  formulario_id: string;
  bpmh_enviada: boolean;
  bpmh: Record<string, any> | null;
  fontes_abertas: Aberta[] | null;
  prescricao: ItemPrescricao[] | null;
  finalizada: boolean;
};

async function chamar(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("recon-v2-aluno", { body });
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* mantém a mensagem */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

function CalculadoraClcr({ caso }: { caso: CasoV2 }) {
  const p = caso.paciente;
  const [idade, setIdade] = useState(String(p.idade || ""));
  const [peso, setPeso] = useState(String(p.peso_kg || ""));
  const [cr, setCr] = useState(p.creatinina_mg_dl ? String(p.creatinina_mg_dl) : "");
  const [sexo, setSexo] = useState<"F" | "M">(p.sexo);
  const v = clearanceCreatinina(Number(idade.replace(",", ".")), Number(peso.replace(",", ".")), Number(cr.replace(",", ".")), sexo);
  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <p className="flex items-center gap-2 text-sm font-medium"><Calculator className="h-4 w-4" />Clearance de creatinina (Cockcroft-Gault)</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div><Label htmlFor="cg-idade" className="text-xs">Idade (anos)</Label><Input id="cg-idade" inputMode="decimal" value={idade} onChange={(e) => setIdade(e.target.value)} /></div>
        <div><Label htmlFor="cg-peso" className="text-xs">Peso (kg)</Label><Input id="cg-peso" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} /></div>
        <div><Label htmlFor="cg-cr" className="text-xs">Creatinina (mg/dL)</Label><Input id="cg-cr" inputMode="decimal" value={cr} onChange={(e) => setCr(e.target.value)} /></div>
        <div>
          <Label htmlFor="cg-sexo" className="text-xs">Sexo</Label>
          <select id="cg-sexo" value={sexo} onChange={(e) => setSexo(e.target.value as "F" | "M")} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
            <option value="F">Feminino</option><option value="M">Masculino</option>
          </select>
        </div>
      </div>
      <p className="text-sm">Resultado: <b>{v == null ? "—" : `${v.toFixed(1).replace(".", ",")} mL/min`}</b> <span className="text-xs text-muted-foreground">(a ferramenta só calcula; interpretar e registrar é com você)</span></p>
    </div>
  );
}

/**
 * Tela do aluno na Reconciliação v2. À esquerda, o dossiê (e, depois do envio da BPMH, a prescrição); à direita, o
 * formulário em quatro etapas. A prescrição e a trava da BPMH vêm da função no servidor.
 */
export default function ReconV2Aluno({ room, participant, accessCode, email }: Props) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [form, setForm] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [abertas, setAbertas] = useState<Aberta[]>([]);
  const [prescricao, setPrescricao] = useState<ItemPrescricao[]>([]);
  const [bpmhEnviada, setBpmhEnviada] = useState(false);
  const [importando, setImportando] = useState(false);
  const [passo, setPasso] = useState(0);
  const [painel, setPainel] = useState<"dossie" | "prescricao">("dossie");
  const [enviando, setEnviando] = useState(false);
  const [finalizada, setFinalizada] = useState(false);
  const prefeito = useRef(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const est: Estado = await chamar({ action: "estado", access_code: accessCode, email });
      const f = (est as any).formulario;
      if (!f) throw new Error("O formulário da sala não foi encontrado.");
      setEstado(est);
      setForm(f);
      setBpmhEnviada(est.bpmh_enviada);
      setPrescricao(est.prescricao || []);
      if (est.fontes_abertas) setAbertas(est.fontes_abertas);
      if (est.bpmh) setAnswers((a) => ({ ...a, ...est.bpmh }));
      if (est.finalizada) setFinalizada(true);
    } catch (e: any) {
      setErro(e?.message || "Não foi possível carregar o caso.");
    } finally {
      setCarregando(false);
    }
  }, [accessCode, email]);

  useEffect(() => { void carregar(); }, [carregar]);

  // Rascunho (respostas e fontes abertas). Depois do envio da BPMH, o que o servidor guardou vale mais que o rascunho.
  const draftKey = room && participant && estado ? `reconciliation-v2:${room.id}:${participant.id}` : null;
  const { draft, loaded: draftLoaded, status: draftStatus, lastSavedAt, saveDraft, clearDraft } = useFormDraft({ draftKey, module: "reconciliation", accessCode, email, enabled: !finalizada });
  const restaurado = useRef(false);
  useEffect(() => {
    if (!draftLoaded || finalizada || restaurado.current || !estado) return;
    restaurado.current = true;
    const d = draft as any;
    if (d && d.a && Object.keys(d.a).length > 0) {
      setAnswers((atual) => ({ ...d.a, ...(estado.bpmh || {}), ...(Object.keys(atual).length ? atual : {}) }));
      if (Array.isArray(d.f) && !(estado.fontes_abertas || []).length) setAbertas(d.f);
      toast({ title: "Rascunho recuperado", description: "Suas respostas anteriores foram restauradas." });
    }
  }, [draft, draftLoaded, finalizada, estado]);
  useEffect(() => {
    if (!draftKey || finalizada || !draftLoaded || !restaurado.current) return;
    saveDraft({ a: answers, f: abertas });
  }, [answers, abertas, draftKey, draftLoaded, finalizada, saveDraft]);

  const fields: FormField[] = useMemo(() => (Array.isArray(form?.content_json) ? form.content_json : []), [form]);
  const secoes = useMemo(() => getSections(fields).filter((s) => s.header), [fields]);
  const caso = estado?.caso.caso_json;

  // Etapa 3: pré-monta a conciliação com os nomes da BPMH e da prescrição, uma vez, se ainda estiver vazia.
  useEffect(() => {
    if (!bpmhEnviada || prefeito.current || !restaurado.current || prescricao.length === 0) return;
    prefeito.current = true;
    setAnswers((a) => {
      const atual = a[RECON_V2.conciliacao];
      const vazia = !Array.isArray(atual) || atual.every((l: string[]) => (l || []).every((c) => !String(c ?? "").trim()));
      return vazia ? { ...a, [RECON_V2.conciliacao]: montarConciliacao(medicamentosBpmh(a), prescricao) } : a;
    });
  }, [bpmhEnviada, prescricao, draftLoaded, draft]);

  const avisos = useMemo(() => verificarCoerenciaRecon(answers, prescricao), [answers, prescricao]);
  const progresso = useMemo(() => progressoRecon(answers, bpmhEnviada), [answers, bpmhEnviada]);

  const abrirFonte = (id: string, aberta: boolean) => {
    if (!aberta) return;
    setAbertas((l) => (l.some((x) => x.id === id) ? l : [...l, { id, em: new Date().toISOString() }]));
  };

  const importarSoap = async () => {
    if (!window.confirm("Importar a farmacoterapia do seu SOAP para a tabela da BPMH? As linhas atuais da tabela serão substituídas.")) return;
    setImportando(true);
    try {
      const r = await chamar({ action: "importar_soap", access_code: accessCode, email });
      const linhas: string[][] = r.linhas || [];
      setAnswers((a) => ({ ...a, [RECON_V2.bpmh]: Array.from({ length: Math.max(RECON_V2_LINHAS_BPMH, linhas.length) }, (_, i) => linhas[i] || ["", "", "", ""]) }));
      toast({ title: "SOAP importado", description: `${linhas.length} linha(s). Confira com as fontes do dossiê e complete as colunas de fontes e conflito.` });
    } catch (e: any) {
      toast({ title: "Não foi possível importar", description: e?.message, variant: "destructive" });
    } finally { setImportando(false); }
  };

  const enviarBpmh = async () => {
    if (!window.confirm("Enviar a BPMH? Depois do envio as etapas 1 e 2 ficam travadas e a prescrição é liberada.")) return;
    setEnviando(true);
    try {
      const r = await chamar({ action: "enviar_bpmh", access_code: accessCode, email, answers, fontes_abertas: abertas });
      setBpmhEnviada(true);
      setPrescricao(r.prescricao || []);
      setAnswers((a) => ({ ...a, ...(r.bpmh || {}) }));
      setPainel("prescricao");
      setPasso(2);
      toast({ title: "BPMH enviada", description: "A prescrição foi liberada." });
    } catch (e: any) {
      toast({ title: "Não foi possível enviar a BPMH", description: e?.message, variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  };

  const enviarFinal = async () => {
    if (!window.confirm("Enviar a resposta final? Depois do envio não será possível editar.")) return;
    setEnviando(true);
    try {
      await chamar({ action: "enviar_final", access_code: accessCode, email, answers, fontes_abertas: abertas });
      await clearDraft();
      setFinalizada(true);
    } catch (e: any) {
      toast({ title: "Não foi possível enviar", description: e?.message, variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  };

  // Cronômetro sugerido por etapa (só avisa; não bloqueia). O professor define os minutos na sala.
  const tempoMin = Number(room?.tempo_etapa_min) > 0 ? Number(room.tempo_etapa_min) : 0;
  const [inicioPasso, setInicioPasso] = useState(() => Date.now());
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => { setInicioPasso(Date.now()); setAgora(Date.now()); }, [passo]);
  useEffect(() => {
    if (!tempoMin || finalizada) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [tempoMin, finalizada]);
  const restanteS = tempoMin ? Math.max(0, tempoMin * 60 - Math.floor((agora - inicioPasso) / 1000)) : 0;
  const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (carregando) return <div className="flex min-h-screen items-center justify-center bg-background p-4 text-muted-foreground">Carregando o caso...</div>;
  if (erro || !estado || !caso || !form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center"><CardContent className="space-y-3 py-10">
          <AlertTriangle className="mx-auto h-10 w-10 text-warning-ink" />
          <p>{erro || "Não foi possível carregar o caso."}</p>
          <Button variant="outline" onClick={() => void carregar()}>Tentar de novo</Button>
        </CardContent></Card>
      </div>
    );
  }
  if (finalizada) {
    return (
      <div className="flex min-h-screen items-start justify-center bg-background p-4">
        <div className="w-full max-w-6xl space-y-4 py-6">
          <Card className="text-center"><CardContent className="py-10">
            <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-success" />
            <h2 className="mb-2 font-heading text-xl font-medium">Resposta enviada!</h2>
            <p className="text-muted-foreground">Sua reconciliação foi enviada. Aguarde a avaliação do professor e volte aqui para ver a devolutiva quando ela for liberada.</p>
          </CardContent></Card>
          <ReconV2Revisao accessCode={accessCode} email={email} />
          <ReconV2Devolutiva accessCode={accessCode} email={email} />
        </div>
      </div>
    );
  }

  const secao = secoes[Math.min(passo, secoes.length - 1)];
  const camposDoPasso: FormField[] = secao ? [secao.header as FormField, ...secao.fields] : [];
  const travado = bpmhEnviada && passo <= 1;
  const bloqueadoSemBpmh = !bpmhEnviada && passo >= 2;
  const ultimo = passo >= secoes.length - 1;
  const p = caso.paciente;
  const pendencias = avisos.filter((a) => a.nivel === "aviso" && (passo === 2 ? a.parte === "3" : passo === 3 ? a.parte === "4" || a.parte === "3" : a.parte === String(passo + 1)));

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-medium">Reconciliação — {room?.title}</h1>
          <p className="text-muted-foreground">Monte a história medicamentosa, depois compare com a prescrição.</p>
          <p className="mt-1 text-sm text-muted-foreground">{participant?.pair_position === "S" ? "Individual" : `Dupla ${(participant?.pair_index || 0) + 1}`}</p>
        </div>

        <ol className="flex flex-wrap items-center justify-center gap-2" aria-label="Etapas da reconciliação">
          {secoes.map((s, i) => {
            const pr = progresso[i];
            const atual = i === passo;
            return (
              <li key={s.header!.id}>
                <button type="button" onClick={() => setPasso(i)} aria-current={atual ? "step" : undefined}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${atual ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"}`}>
                  {s.header!.label}
                  {pr && <span className={`ml-2 text-xs ${atual ? "opacity-90" : "text-muted-foreground"}`}>{pr.feitos}/{pr.total}</span>}
                </button>
              </li>
            );
          })}
        </ol>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader className="space-y-3">
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={painel === "dossie" ? "default" : "outline"} onClick={() => setPainel("dossie")}><BookOpen className="mr-2 h-4 w-4" />Dossiê</Button>
                <Button type="button" size="sm" variant={painel === "prescricao" ? "default" : "outline"} onClick={() => setPainel("prescricao")} disabled={!bpmhEnviada}>
                  {bpmhEnviada ? <Pill className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}Prescrição
                </Button>
              </div>
              {!bpmhEnviada && <p className="text-xs text-muted-foreground">A prescrição é liberada quando você envia a BPMH (etapa 2).</p>}
            </CardHeader>
            <CardContent className="max-h-[75vh] space-y-4 overflow-y-auto">
              {painel === "dossie" || !bpmhEnviada ? (
                <>
                  <div className="space-y-1">
                    <h2 className="font-heading text-lg font-medium">{caso.titulo}</h2>
                    <div className="flex flex-wrap gap-1.5"><Badge variant="outline">{ROTULO_TRANSICAO[caso.transicao]}</Badge></div>
                    <p className="text-sm text-muted-foreground">{caso.resumo}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    <p><b>{p.nome}</b>, {p.idade} anos, {p.sexo === "F" ? "feminino" : "masculino"}, {String(p.peso_kg).replace(".", ",")} kg{p.altura_m ? `, ${String(p.altura_m).replace(".", ",")} m` : ""}</p>
                    <p className="mt-1">Motivo: {p.motivo}</p>
                    {p.creatinina_mg_dl ? <p>Creatinina: {String(p.creatinina_mg_dl).replace(".", ",")} mg/dL</p> : null}
                    <p>Alergias registradas: {p.alergias_registradas || "nenhuma registrada"}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">Fontes ({abertas.length} de {caso.fontes.length} abertas)</p>
                    {caso.fontes.map((f) => (
                      <details key={f.id} className="rounded-lg border bg-card" onToggle={(e) => abrirFonte(f.id, (e.currentTarget as HTMLDetailsElement).open)}>
                        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                          <span className="mr-2 font-mono text-[0.7rem] uppercase text-primary">{ROTULO_FONTE[f.tipo]}</span>{f.titulo}
                          {abertas.some((x) => x.id === f.id) && <span className="ml-2 text-xs text-muted-foreground">· aberta</span>}
                        </summary>
                        <div className="space-y-1.5 px-3 pb-3 text-sm">
                          <p className="whitespace-pre-wrap">{f.texto}</p>
                          {f.nota && <p className="text-xs text-muted-foreground">{f.nota}</p>}
                        </div>
                      </details>
                    ))}
                  </div>
                  <CalculadoraClcr caso={caso} />
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Prescrição do serviço</p>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[420px] text-sm">
                      <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr><th className="p-2">Medicamento</th><th className="p-2">Dose</th><th className="p-2">Via</th><th className="p-2">Frequência</th></tr>
                      </thead>
                      <tbody>
                        {prescricao.map((m, i) => (
                          <tr key={i} className="border-t align-top">
                            <td className="p-2">{m.medicamento}{m.observacao ? <span className="block text-xs text-muted-foreground">{m.observacao}</span> : null}</td>
                            <td className="p-2">{m.dose}</td><td className="p-2">{m.via}</td><td className="p-2">{m.frequencia}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="font-heading text-lg font-medium">{secao?.header?.label}</CardTitle>
                {tempoMin > 0 && !travado && (
                  <Badge variant={restanteS === 0 ? "destructive" : "outline"}>{restanteS === 0 ? "Tempo sugerido da etapa esgotado" : `Tempo sugerido: ${mmss(restanteS)}`}</Badge>
                )}
                <DraftStatusBadge status={draftStatus} lastSavedAt={lastSavedAt} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {bloqueadoSemBpmh ? (
                <div className="space-y-3 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  <Lock className="mx-auto h-6 w-6" />
                  <p>A prescrição ainda não foi liberada. Ela aparece depois do envio da BPMH, para não induzir a sua lista.</p>
                  <Button type="button" variant="outline" onClick={() => setPasso(1)}>Ir para a etapa 2</Button>
                </div>
              ) : travado ? (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />Enviada e travada. Só leitura.</p>
                  <FormAnswersView fields={camposDoPasso} answers={answers} />
                </div>
              ) : (
                <>
                {passo === 1 && estado?.caso.caso_json.origem_vp_id && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3 text-sm">
                    <Button type="button" size="sm" variant="outline" onClick={importarSoap} disabled={importando}>{importando ? "Importando..." : "Importar do meu SOAP"}</Button>
                    <span className="text-xs text-muted-foreground">Se você atendeu este paciente, traz a farmacoterapia que você registrou no SOAP. É um ponto de partida: confira com as fontes.</span>
                  </div>
                )}
                <FormRenderer fields={camposDoPasso} answers={answers} onChange={setAnswers} idPrefix="reconv2-" />
                </>
              )}

              {!bloqueadoSemBpmh && passo >= 1 && !travado && !bpmhEnviada && passo === 1 && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="mb-2 text-sm">Quando a BPMH estiver pronta, envie. Isso libera a prescrição e trava as etapas 1 e 2.</p>
                  <Button type="button" onClick={enviarBpmh} disabled={enviando}><Send className="mr-2 h-4 w-4" />{enviando ? "Enviando..." : "Enviar BPMH e ver a prescrição"}</Button>
                </div>
              )}

              {(passo === 1 || passo >= 2) && !bloqueadoSemBpmh && (
                <div className="rounded-lg border bg-muted/30 p-3" aria-live="polite">
                  <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Verificador de coerência
                    {pendencias.length > 0 ? <Badge variant="outline">{pendencias.length} aviso(s)</Badge> : <Badge variant="secondary">sem avisos</Badge>}
                  </p>
                  <ul className="space-y-1.5 text-sm">
                    {(pendencias.length ? pendencias : [{ id: "ok", nivel: "ok" as const, parte: "3" as const, texto: "Nenhum aviso para esta etapa." }]).map((a) => (
                      <li key={a.id} className="flex items-start gap-2">
                        {a.nivel === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-ink" />}
                        <span>{a.texto}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted-foreground">Os avisos não impedem o envio. Corrija o que concordar.</p>
                </div>
              )}

              {ultimo && (
                <ReconV2Prescritor
                  accessCode={accessCode}
                  email={email}
                  podeLigar={bpmhEnviada}
                  sbarTexto={[["S", RECON_V2.sbarS], ["B", RECON_V2.sbarB], ["A", RECON_V2.sbarA], ["R", RECON_V2.sbarR]]
                    .map(([l, id]) => `${l}: ${String(answers[id] ?? "").trim() || "(em branco)"}`).join("\n")}
                />
              )}

              <div className="flex items-center justify-between gap-2">
                <Button type="button" variant="outline" onClick={() => setPasso(Math.max(0, passo - 1))} disabled={passo === 0}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
                {!ultimo ? (
                  <Button type="button" onClick={() => setPasso(passo + 1)}>Próxima etapa<ArrowRight className="ml-2 h-4 w-4" /></Button>
                ) : (
                  <Button type="button" size="lg" onClick={enviarFinal} disabled={enviando || !bpmhEnviada}><Send className="mr-2 h-4 w-4" />{enviando ? "Enviando..." : "Enviar reconciliação"}</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
