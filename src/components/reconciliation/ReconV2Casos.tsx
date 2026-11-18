import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Plus, Save, Sparkles, Trash2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  ARMADILHAS, INTENCIONALIDADES, RISCOS, ROTULO_DISCREPANCIA, ROTULO_FONTE, ROTULO_INTENCAO, ROTULO_RISCO, ROTULO_TRANSICAO,
  TIPOS_DISCREPANCIA, TIPOS_FONTE, TRANSICOES, casoEmBranco, clearanceCreatinina, proximoId, validarCaso,
  type CasoCompleto, type Discrepancia, type Fonte,
} from "@/lib/recon-v2";
import { CASOS_SEMENTE } from "@/lib/recon-v2-seeds";

type Linha = { id: string; position: number; titulo: string; completo: CasoCompleto };

const selClass = "h-10 w-full rounded-md border border-input bg-background px-2 text-sm";
const Sel = ({ value, onChange, children, id, label }: { value: string; onChange: (v: string) => void; children: React.ReactNode; id?: string; label?: string }) => (
  <select id={id} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={selClass}>{children}</select>
);
const numTxt = (n: number | undefined) => (n && n > 0 ? String(n) : "");
const toNum = (s: string) => { const n = Number(s.replace(",", ".")); return Number.isFinite(n) ? n : 0; };

async function chamarGerador(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("generate-recon-v2-case", { body });
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* mantém */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Aba "Casos Clínicos" da sala de Reconciliação v2: gerar, importar caso-semente, editar por blocos, validar e ver a prévia. */
export default function ReconV2Casos({ roomId }: { roomId: string }) {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [rascunho, setRascunho] = useState<CasoCompleto | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [revisando, setRevisando] = useState(false);
  const [revisao, setRevisao] = useState<{ tipo: string; onde: string; texto: string }[] | null>(null);
  const [verPrevia, setVerPrevia] = useState(false);
  // parâmetros do gerador
  const [gTransicao, setGTransicao] = useState("admissao");
  const [gNivel, setGNivel] = useState("intermediario");
  const [gTema, setGTema] = useState("");
  const [gMeds, setGMeds] = useState("6");
  const [gArm, setGArm] = useState<string[]>([]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data: casos } = await supabase.from("reconciliation_clinical_cases").select("id, position, title, caso_json").eq("room_id", roomId).order("position", { ascending: true });
    const { data: priv } = await supabase.from("reconciliation_v2_privado" as any).select("case_id, prescricao, gabarito").eq("room_id", roomId);
    const porCaso = new Map<string, any>(((priv as any[]) || []).map((x) => [x.case_id, x]));
    setLinhas(
      (casos || []).filter((c: any) => c.caso_json).map((c: any) => ({
        id: c.id, position: c.position, titulo: c.title,
        completo: { caso: c.caso_json, prescricao: porCaso.get(c.id)?.prescricao || [], gabarito: porCaso.get(c.id)?.gabarito || { discrepancias: [], bpmh: [], outros_problemas: [] } },
      })),
    );
    setCarregando(false);
  }, [roomId]);
  useEffect(() => { void carregar(); }, [carregar]);

  // Tempo sugerido por etapa (minutos). Só avisa o aluno, não bloqueia. Vazio = sem cronômetro.
  const [tempo, setTempo] = useState("");
  useEffect(() => {
    supabase.from("reconciliation_rooms").select("*").eq("id", roomId).maybeSingle()
      .then(({ data }) => setTempo((data as any)?.tempo_etapa_min ? String((data as any).tempo_etapa_min) : ""));
  }, [roomId]);
  const salvarTempo = async () => {
    const n = Math.round(Number(tempo.replace(",", ".")));
    const valor = Number.isFinite(n) && n > 0 ? Math.min(n, 240) : null;
    const { error } = await supabase.from("reconciliation_rooms").update({ tempo_etapa_min: valor } as any).eq("id", roomId);
    if (error) { toast({ title: "Erro ao salvar o tempo", description: error.message, variant: "destructive" }); return; }
    setTempo(valor ? String(valor) : "");
    toast({ title: valor ? `Tempo sugerido: ${valor} min por etapa` : "Cronômetro desligado" });
  };

  const avisos = useMemo(() => (rascunho ? validarCaso(rascunho) : []), [rascunho]);
  const erros = avisos.filter((a) => a.nivel === "erro");

  const editar = (fn: (d: CasoCompleto) => void) => setRascunho((atual) => {
    if (!atual) return atual;
    const copia = structuredClone(atual);
    fn(copia);
    return copia;
  });

  const abrir = (c: CasoCompleto, id: string | null) => { setRascunho(structuredClone(c)); setEditandoId(id); setRevisao(null); setVerPrevia(false); };

  const gerar = async () => {
    setGerando(true);
    try {
      const r = await chamarGerador({ action: "gerar", transicao: gTransicao, nivel: gNivel, tema: gTema, n_medicamentos: Number(gMeds) || 6, armadilhas: gArm });
      abrir({ caso: r.caso, prescricao: r.prescricao, gabarito: r.gabarito }, null);
      toast({ title: "Caso gerado", description: "Revise os blocos e os avisos antes de salvar." });
    } catch (e: any) {
      toast({ title: "Não foi possível gerar", description: e?.message, variant: "destructive" });
    } finally { setGerando(false); }
  };

  const revisar = async () => {
    if (!rascunho) return;
    setRevisando(true);
    try {
      const r = await chamarGerador({ action: "revisar", caso: rascunho.caso, prescricao: rascunho.prescricao, gabarito: rascunho.gabarito });
      setRevisao(r.problemas || []);
    } catch (e: any) {
      toast({ title: "Não foi possível revisar", description: e?.message, variant: "destructive" });
    } finally { setRevisando(false); }
  };

  const salvar = async () => {
    if (!rascunho) return;
    setSalvando(true);
    try {
      let id = editandoId;
      const titulo = rascunho.caso.titulo.trim() || "Caso sem título";
      if (id) {
        const { error } = await supabase.from("reconciliation_clinical_cases").update({ title: titulo, caso_json: rascunho.caso } as any).eq("id", id);
        if (error) throw error;
      } else {
        const posicao = linhas.length ? Math.max(...linhas.map((l) => l.position)) + 1 : 0;
        const { data, error } = await supabase.from("reconciliation_clinical_cases").insert({ room_id: roomId, title: titulo, content: "", position: posicao, caso_json: rascunho.caso } as any).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      const { error: e2 } = await supabase.from("reconciliation_v2_privado" as any).upsert({
        case_id: id, room_id: roomId, prescricao: rascunho.prescricao, gabarito: { ...rascunho.gabarito, outros_problemas: rascunho.gabarito.outros_problemas.map((t) => t.trim()).filter(Boolean) }, updated_at: new Date().toISOString(),
      } as any);
      if (e2) throw e2;
      toast({ title: "Caso salvo" });
      setRascunho(null); setEditandoId(null);
      await carregar();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" });
    } finally { setSalvando(false); }
  };

  const excluir = async (id: string) => {
    if (!window.confirm("Excluir este caso da sala?")) return;
    await supabase.from("reconciliation_clinical_cases").delete().eq("id", id);
    await carregar();
  };

  // ---------- lista ----------
  if (!rascunho) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 py-4">
            <div>
              <Label htmlFor="tempo-etapa">Tempo sugerido por etapa (minutos, opcional)</Label>
              <Input id="tempo-etapa" inputMode="numeric" value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="Sem cronômetro" className="w-48" />
            </div>
            <Button variant="outline" onClick={salvarTempo}>Salvar</Button>
            <p className="text-xs text-muted-foreground">O aluno vê uma contagem regressiva em cada etapa. Ela só avisa, não bloqueia nada.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg font-medium">Novo caso</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <div><Label htmlFor="g-trans">Transição</Label><Sel id="g-trans" value={gTransicao} onChange={setGTransicao}>{TRANSICOES.map((t) => <option key={t} value={t}>{ROTULO_TRANSICAO[t]}</option>)}</Sel></div>
              <div><Label htmlFor="g-nivel">Nível</Label><Sel id="g-nivel" value={gNivel} onChange={setGNivel}><option value="iniciante">Iniciante</option><option value="intermediario">Intermediário</option><option value="avancado">Avançado</option></Sel></div>
              <div><Label htmlFor="g-meds">Nº de medicamentos</Label><Input id="g-meds" inputMode="numeric" value={gMeds} onChange={(e) => setGMeds(e.target.value)} /></div>
              <div className="sm:col-span-4"><Label htmlFor="g-tema">Tema ou cenário (opcional)</Label><Input id="g-tema" value={gTema} onChange={(e) => setGTema(e.target.value)} placeholder="Ex.: idosa com infecção urinária e uso de anti-inflamatório por conta própria" /></div>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">Armadilhas a trabalhar <span className="font-normal text-muted-foreground">(se não marcar, a IA escolhe)</span></p>
              <div className="flex flex-wrap gap-1.5">
                {ARMADILHAS.map((a) => (
                  <button key={a} type="button" aria-pressed={gArm.includes(a)} onClick={() => setGArm((l) => (l.includes(a) ? l.filter((x) => x !== a) : [...l, a]))}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${gArm.includes(a) ? "border-primary bg-primary/10 text-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>{a}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={gerar} disabled={gerando}>{gerando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}{gerando ? "Gerando (até 1 minuto)..." : "Gerar com IA"}</Button>
              <Button variant="outline" onClick={() => abrir(casoEmBranco(), null)}><Plus className="mr-2 h-4 w-4" />Caso em branco</Button>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-2 text-sm font-medium">Casos-semente (escritos para revisão)</p>
              <div className="flex flex-wrap gap-2">
                {CASOS_SEMENTE.map((s) => (
                  <Button key={s.caso.titulo} variant="outline" size="sm" onClick={() => abrir(s, null)}>Importar: {s.caso.titulo}</Button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Abre o caso para você revisar e só entra na sala quando você salvar.</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <p className="text-sm font-medium">Casos desta sala ({linhas.length})</p>
          {carregando ? <p className="text-sm text-muted-foreground">Carregando...</p> : linhas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum caso v2 ainda. Gere um, importe um caso-semente ou comece em branco.</p>
          ) : linhas.map((l) => {
            const n = validarCaso(l.completo).filter((a) => a.nivel === "erro").length;
            return (
              <Card key={l.id}><CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{l.titulo}</p>
                  <p className="text-xs text-muted-foreground">{ROTULO_TRANSICAO[l.completo.caso.transicao]} · {l.completo.caso.fontes.length} fontes · {l.completo.gabarito.discrepancias.length} discrepâncias</p>
                </div>
                <div className="flex items-center gap-2">
                  {n > 0 ? <Badge variant="outline" className="text-warning-ink">{n} erro(s)</Badge> : <Badge variant="secondary">válido</Badge>}
                  <Button size="sm" variant="outline" onClick={() => abrir(l.completo, l.id)}>Editar</Button>
                  <Button size="sm" variant="ghost" aria-label="Excluir caso" onClick={() => void excluir(l.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent></Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------- editor ----------
  const { caso, prescricao, gabarito } = rascunho;
  const p = caso.paciente;
  const clcr = clearanceCreatinina(p.idade, p.peso_kg, p.creatinina_mg_dl || 0, p.sexo);
  const idsFontes = caso.fontes.map((f) => f.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-lg font-medium">{editandoId ? "Editar caso" : "Novo caso"}</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setVerPrevia((v) => !v)}>{verPrevia ? "Voltar à edição" : "Ver como o aluno verá"}</Button>
          <Button variant="outline" onClick={revisar} disabled={revisando}>{revisando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}Revisar com IA</Button>
          <Button variant="ghost" onClick={() => { setRascunho(null); setEditandoId(null); }}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}><Save className="mr-2 h-4 w-4" />{salvando ? "Salvando..." : "Salvar caso"}</Button>
        </div>
      </div>

      <Card><CardContent className="space-y-2 py-4" aria-live="polite">
        <p className="flex items-center gap-2 text-sm font-medium">
          {erros.length ? <AlertTriangle className="h-4 w-4 text-warning-ink" /> : <CheckCircle2 className="h-4 w-4 text-primary" />}
          Validação automática: {erros.length} erro(s), {avisos.length - erros.length} aviso(s)
        </p>
        {avisos.length > 0 && <ul className="space-y-1 text-sm">{avisos.map((a, i) => <li key={i} className={a.nivel === "erro" ? "text-destructive" : "text-muted-foreground"}>{a.nivel === "erro" ? "Erro: " : "Aviso: "}{a.texto}</li>)}</ul>}
        {revisao && (
          <div className="mt-2 rounded-md border bg-muted/30 p-3 text-sm">
            <p className="mb-1 font-medium">Revisão da IA</p>
            {revisao.length === 0 ? <p className="text-muted-foreground">Nenhum problema encontrado.</p> : <ul className="space-y-1">{revisao.map((r, i) => <li key={i}><span className="font-mono text-xs uppercase text-primary">{r.tipo.replace(/_/g, " ")}</span> · {r.onde}: {r.texto}</li>)}</ul>}
          </div>
        )}
      </CardContent></Card>

      {verPrevia ? (
        <Card><CardContent className="space-y-4 py-4">
          <p className="text-xs text-muted-foreground">É isto que a dupla lê. A prescrição só aparece depois do envio da BPMH, e o gabarito nunca aparece.</p>
          <h2 className="font-heading text-lg font-medium">{caso.titulo}</h2>
          <Badge variant="outline">{ROTULO_TRANSICAO[caso.transicao]}</Badge>
          <p className="text-sm text-muted-foreground">{caso.resumo}</p>
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p><b>{p.nome}</b>, {p.idade} anos, {p.sexo === "F" ? "feminino" : "masculino"}, {p.peso_kg} kg{p.altura_m ? `, ${p.altura_m} m` : ""}</p>
            <p>Motivo: {p.motivo}</p>
            {p.creatinina_mg_dl ? <p>Creatinina: {p.creatinina_mg_dl} mg/dL</p> : null}
            <p>Alergias registradas: {p.alergias_registradas || "nenhuma registrada"}</p>
          </div>
          {caso.fontes.map((f) => (
            <details key={f.id} className="rounded-lg border bg-card" open>
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium"><span className="mr-2 font-mono text-[0.7rem] uppercase text-primary">{ROTULO_FONTE[f.tipo]}</span>{f.titulo}</summary>
              <div className="px-3 pb-3 text-sm"><p className="whitespace-pre-wrap">{f.texto}</p>{f.nota && <p className="mt-1 text-xs text-muted-foreground">{f.nota}</p>}</div>
            </details>
          ))}
        </CardContent></Card>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Caso e paciente</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-4">
              <div className="sm:col-span-4"><Label htmlFor="c-titulo">Título</Label><Input id="c-titulo" value={caso.titulo} onChange={(e) => editar((d) => { d.caso.titulo = e.target.value; })} /></div>
              <div className="sm:col-span-4"><Label htmlFor="c-resumo">Resumo (o aluno lê)</Label><Textarea id="c-resumo" rows={2} value={caso.resumo} onChange={(e) => editar((d) => { d.caso.resumo = e.target.value; })} /></div>
              <div><Label htmlFor="c-trans">Transição</Label><Sel id="c-trans" value={caso.transicao} onChange={(v) => editar((d) => { d.caso.transicao = v as any; })}>{TRANSICOES.map((t) => <option key={t} value={t}>{ROTULO_TRANSICAO[t]}</option>)}</Sel></div>
              <div><Label htmlFor="c-nivel">Nível</Label><Sel id="c-nivel" value={caso.nivel} onChange={(v) => editar((d) => { d.caso.nivel = v as any; })}><option value="iniciante">Iniciante</option><option value="intermediario">Intermediário</option><option value="avancado">Avançado</option></Sel></div>
              <div className="sm:col-span-2"><Label htmlFor="p-nome">Nome do paciente</Label><Input id="p-nome" value={p.nome} onChange={(e) => editar((d) => { d.caso.paciente.nome = e.target.value; })} /></div>
              <div><Label htmlFor="p-idade">Idade</Label><Input id="p-idade" inputMode="numeric" value={numTxt(p.idade)} onChange={(e) => editar((d) => { d.caso.paciente.idade = toNum(e.target.value); })} /></div>
              <div><Label htmlFor="p-sexo">Sexo</Label><Sel id="p-sexo" value={p.sexo} onChange={(v) => editar((d) => { d.caso.paciente.sexo = v as any; })}><option value="F">Feminino</option><option value="M">Masculino</option></Sel></div>
              <div><Label htmlFor="p-peso">Peso (kg)</Label><Input id="p-peso" inputMode="decimal" value={numTxt(p.peso_kg)} onChange={(e) => editar((d) => { d.caso.paciente.peso_kg = toNum(e.target.value); })} /></div>
              <div><Label htmlFor="p-alt">Altura (m)</Label><Input id="p-alt" inputMode="decimal" value={numTxt(p.altura_m)} onChange={(e) => editar((d) => { d.caso.paciente.altura_m = toNum(e.target.value) || undefined; })} /></div>
              <div><Label htmlFor="p-cr">Creatinina (mg/dL)</Label><Input id="p-cr" inputMode="decimal" value={numTxt(p.creatinina_mg_dl)} onChange={(e) => editar((d) => { d.caso.paciente.creatinina_mg_dl = toNum(e.target.value) || undefined; })} /></div>
              <div className="sm:col-span-2"><Label htmlFor="p-aler">Alergias que CONSTAM no prontuário</Label><Input id="p-aler" value={p.alergias_registradas} onChange={(e) => editar((d) => { d.caso.paciente.alergias_registradas = e.target.value; })} placeholder="nenhuma registrada" /></div>
              <div className="sm:col-span-2"><Label htmlFor="p-motivo">Motivo da transição</Label><Input id="p-motivo" value={p.motivo} onChange={(e) => editar((d) => { d.caso.paciente.motivo = e.target.value; })} /></div>
              <p className="text-xs text-muted-foreground sm:col-span-2">Clearance (Cockcroft-Gault): <b>{clcr == null ? "—" : `${clcr.toFixed(1)} mL/min`}</b></p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0"><CardTitle className="text-base">Fontes do dossiê (o aluno lê)</CardTitle>
              <Button size="sm" variant="outline" onClick={() => editar((d) => { d.caso.fontes.push({ id: proximoId("f", d.caso.fontes.map((f) => f.id)), tipo: "outro", titulo: "", texto: "" }); })}><Plus className="mr-1 h-4 w-4" />Fonte</Button></CardHeader>
            <CardContent className="space-y-3">
              {caso.fontes.map((f: Fonte, i) => (
                <div key={f.id} className="space-y-2 rounded-lg border p-3">
                  <div className="grid gap-2 sm:grid-cols-[8rem_12rem_1fr_auto]">
                    <div className="flex items-center font-mono text-xs text-muted-foreground">{f.id}</div>
                    <Sel label={`Tipo da fonte ${f.id}`} value={f.tipo} onChange={(v) => editar((d) => { d.caso.fontes[i].tipo = v as any; })}>{TIPOS_FONTE.map((t) => <option key={t} value={t}>{ROTULO_FONTE[t]}</option>)}</Sel>
                    <Input aria-label={`Título da fonte ${f.id}`} value={f.titulo} onChange={(e) => editar((d) => { d.caso.fontes[i].titulo = e.target.value; })} placeholder="Título" />
                    <Button size="icon" variant="ghost" aria-label={`Remover fonte ${f.id}`} onClick={() => editar((d) => { d.caso.fontes.splice(i, 1); })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <Textarea aria-label={`Texto da fonte ${f.id}`} rows={4} value={f.texto} onChange={(e) => editar((d) => { d.caso.fontes[i].texto = e.target.value; })} placeholder="O que a fonte mostra, no tom de quem a produziu" />
                  <Input aria-label={`Nota da fonte ${f.id}`} value={f.nota || ""} onChange={(e) => editar((d) => { d.caso.fontes[i].nota = e.target.value || undefined; })} placeholder="Nota de leitura neutra (opcional)" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0"><CardTitle className="text-base">Prescrição do serviço (privada até o envio da BPMH)</CardTitle>
              <Button size="sm" variant="outline" onClick={() => editar((d) => { d.prescricao.push({ medicamento: "", dose: "", via: "", frequencia: "" }); })}><Plus className="mr-1 h-4 w-4" />Linha</Button></CardHeader>
            <CardContent className="space-y-2">
              {prescricao.map((m, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[2fr_1fr_6rem_1fr_auto]">
                  <Input aria-label={`Medicamento da linha ${i + 1}`} value={m.medicamento} onChange={(e) => editar((d) => { d.prescricao[i].medicamento = e.target.value; })} placeholder="Medicamento (só o nome)" />
                  <Input aria-label={`Dose da linha ${i + 1}`} value={m.dose} onChange={(e) => editar((d) => { d.prescricao[i].dose = e.target.value; })} placeholder="Dose" />
                  <Input aria-label={`Via da linha ${i + 1}`} value={m.via} onChange={(e) => editar((d) => { d.prescricao[i].via = e.target.value; })} placeholder="Via" />
                  <Input aria-label={`Frequência da linha ${i + 1}`} value={m.frequencia} onChange={(e) => editar((d) => { d.prescricao[i].frequencia = e.target.value; })} placeholder="Frequência" />
                  <Button size="icon" variant="ghost" aria-label={`Remover linha ${i + 1}`} onClick={() => editar((d) => { d.prescricao.splice(i, 1); })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0"><CardTitle className="text-base">Gabarito: discrepâncias (privado, nunca vai ao aluno)</CardTitle>
              <Button size="sm" variant="outline" onClick={() => editar((d) => { d.gabarito.discrepancias.push({ id: proximoId("d", d.gabarito.discrepancias.map((x) => x.id)), medicamento: "", tipo: "omissao", intencionalidade: "nao_intencional", risco: "leve", critica: false, fontes: [], descricao: "", acao_esperada: "" }); })}><Plus className="mr-1 h-4 w-4" />Discrepância</Button></CardHeader>
            <CardContent className="space-y-3">
              {gabarito.discrepancias.map((x: Discrepancia, i) => (
                <div key={x.id} className="space-y-2 rounded-lg border p-3">
                  <div className="grid gap-2 sm:grid-cols-[3rem_1.5fr_1fr_1fr_1fr_auto]">
                    <div className="flex items-center font-mono text-xs text-muted-foreground">{x.id}</div>
                    <Input aria-label={`Medicamento da discrepância ${x.id}`} value={x.medicamento} onChange={(e) => editar((d) => { d.gabarito.discrepancias[i].medicamento = e.target.value; })} placeholder="Medicamento" />
                    <Sel label={`Tipo ${x.id}`} value={x.tipo} onChange={(v) => editar((d) => { d.gabarito.discrepancias[i].tipo = v as any; })}>{TIPOS_DISCREPANCIA.map((t) => <option key={t} value={t}>{ROTULO_DISCREPANCIA[t]}</option>)}</Sel>
                    <Sel label={`Intencionalidade ${x.id}`} value={x.intencionalidade} onChange={(v) => editar((d) => { d.gabarito.discrepancias[i].intencionalidade = v as any; })}>{INTENCIONALIDADES.map((t) => <option key={t} value={t}>{ROTULO_INTENCAO[t]}</option>)}</Sel>
                    <Sel label={`Risco ${x.id}`} value={x.risco} onChange={(v) => editar((d) => { d.gabarito.discrepancias[i].risco = v as any; })}>{RISCOS.map((t) => <option key={t} value={t}>{ROTULO_RISCO[t]}</option>)}</Sel>
                    <Button size="icon" variant="ghost" aria-label={`Remover discrepância ${x.id}`} onClick={() => editar((d) => { d.gabarito.discrepancias.splice(i, 1); })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <Textarea aria-label={`Descrição ${x.id}`} rows={2} value={x.descricao} onChange={(e) => editar((d) => { d.gabarito.discrepancias[i].descricao = e.target.value; })} placeholder="O que acontece" />
                  <Textarea aria-label={`Ação esperada ${x.id}`} rows={2} value={x.acao_esperada} onChange={(e) => editar((d) => { d.gabarito.discrepancias[i].acao_esperada = e.target.value; })} placeholder="O que o farmacêutico deve propor" />
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={x.critica} onChange={(e) => editar((d) => { d.gabarito.discrepancias[i].critica = e.target.checked; })} />Crítica (alerta e peso maior)</label>
                    <span className="text-muted-foreground">Onde o aluno descobre:</span>
                    {idsFontes.map((fid) => (
                      <label key={fid} className="flex items-center gap-1.5"><input type="checkbox" checked={x.fontes.includes(fid)} onChange={(e) => editar((d) => { const l = d.gabarito.discrepancias[i].fontes; d.gabarito.discrepancias[i].fontes = e.target.checked ? [...l, fid] : l.filter((y) => y !== fid); })} />{fid}</label>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0"><CardTitle className="text-base">Gabarito: BPMH esperada (privado)</CardTitle>
              <Button size="sm" variant="outline" onClick={() => editar((d) => { d.gabarito.bpmh.push({ medicamento: "", uso_real: "", fontes: [] }); })}><Plus className="mr-1 h-4 w-4" />Linha</Button></CardHeader>
            <CardContent className="space-y-2">
              {gabarito.bpmh.map((b, i) => (
                <div key={i} className="space-y-1.5 rounded-lg border p-2.5">
                  <div className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
                    <Input aria-label={`Medicamento da BPMH ${i + 1}`} value={b.medicamento} onChange={(e) => editar((d) => { d.gabarito.bpmh[i].medicamento = e.target.value; })} placeholder="Medicamento, concentração e forma" />
                    <Input aria-label={`Uso real da BPMH ${i + 1}`} value={b.uso_real} onChange={(e) => editar((d) => { d.gabarito.bpmh[i].uso_real = e.target.value; })} placeholder="Como realmente usa" />
                    <Button size="icon" variant="ghost" aria-label={`Remover BPMH ${i + 1}`} onClick={() => editar((d) => { d.gabarito.bpmh.splice(i, 1); })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm"><span className="text-muted-foreground">Fontes:</span>
                    {idsFontes.map((fid) => (
                      <label key={fid} className="flex items-center gap-1.5"><input type="checkbox" checked={b.fontes.includes(fid)} onChange={(e) => editar((d) => { const l = d.gabarito.bpmh[i].fontes; d.gabarito.bpmh[i].fontes = e.target.checked ? [...l, fid] : l.filter((y) => y !== fid); })} />{fid}</label>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Gabarito: outros problemas de segurança (privado, um por linha)</CardTitle></CardHeader>
            <CardContent>
              <Textarea aria-label="Outros problemas de segurança" rows={3} value={gabarito.outros_problemas.join("\n")} onChange={(e) => editar((d) => { d.gabarito.outros_problemas = e.target.value.split("\n"); })} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
