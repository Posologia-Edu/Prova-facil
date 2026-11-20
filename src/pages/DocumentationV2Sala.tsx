import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock, Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import type { ItemReferencia } from "@/lib/doc-v2";
import DocV2Correcao from "@/components/documentation/DocV2Correcao";
import DocV2PersonaEditor from "@/components/documentation/DocV2PersonaEditor";
import { validarPersona } from "@/lib/doc-v2-paciente";
import { notaFinalDocV2, notaRevisao } from "@/lib/doc-v2-nota";
import DocV2Panorama from "@/components/documentation/DocV2Panorama";
import DocV2Lote from "@/components/documentation/DocV2Lote";

type Conduta = ItemReferencia["conduta"];
const CONDUTAS: { v: Conduta; r: string }[] = [{ v: "mantido", r: "Mantido" }, { v: "alterado", r: "Alterado" }, { v: "novo", r: "Novo" }, { v: "suspenso", r: "Suspenso" }];

/** Sala de Documentação v2, lado do professor (E1): configuração, conciliação de referência de cada caso e entregas das duplas. */
export default function DocumentationV2Sala() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: sala } = useQuery({
    queryKey: ["doc-v2-sala", roomId],
    queryFn: async () => (await supabase.from("documentation_rooms").select("*").eq("id", roomId!).maybeSingle()).data as any,
    enabled: !!roomId,
  });
  const { data: casos } = useQuery({
    queryKey: ["doc-v2-casos", roomId],
    queryFn: async () => (await supabase.from("documentation_clinical_cases").select("id, title, caso_json, position").eq("room_id", roomId!).order("position")).data as any[] || [],
    enabled: !!roomId,
  });
  const { data: privados } = useQuery({
    queryKey: ["doc-v2-privados", roomId],
    queryFn: async () => (await supabase.from("documentation_v2_privado" as any).select("case_id, referencia, gabarito").eq("room_id", roomId!)).data as any[] || [],
    enabled: !!roomId,
  });
  const { data: partes } = useQuery({
    queryKey: ["doc-v2-partes", roomId],
    queryFn: async () => (await supabase.from("documentation_participants").select("id, student_name, student_email, pair_index, pair_position").eq("room_id", roomId!).eq("participant_role", "student").order("pair_index")).data as any[] || [],
    enabled: !!roomId,
  });
  const { data: respostas } = useQuery({
    queryKey: ["doc-v2-respostas", roomId],
    queryFn: async () => (await supabase.from("documentation_v2_respostas" as any).select("id, pair_index, clinical_case_id, respostas, submitted_at, aconselhamento_concluido_at").eq("room_id", roomId!)).data as any[] || [],
    enabled: !!roomId,
    refetchInterval: 15000,
  });
  const { data: avaliacoes } = useQuery({
    queryKey: ["doc-v2-avaliacoes", roomId],
    queryFn: async () => (await supabase.from("documentation_v2_avaliacoes" as any).select("response_id, nota, confirmada, liberada, dados").eq("room_id", roomId!)).data as any[] || [],
    enabled: !!roomId,
  });
  const { data: revisoes } = useQuery({
    queryKey: ["doc-v2-revisoes", roomId],
    queryFn: async () => (await supabase.from("documentation_v2_revisoes" as any).select("reviewed_pair, answers_json, submitted_at").eq("room_id", roomId!).not("submitted_at", "is", null)).data as any[] || [],
    enabled: !!roomId,
    refetchInterval: 15000,
  });
  const [aberta, setAberta] = useState<number | null>(null);

  const [tempo, setTempo] = useState("");
  const [base, setBase] = useState("validada");
  const [usa, setUsa] = useState(false);
  useEffect(() => { if (sala) { setTempo(sala.tempo_sugerido_min ? String(sala.tempo_sugerido_min) : ""); setBase(sala.base_conciliacao || "validada"); setUsa(!!sala.usa_paciente); } }, [sala]);

  const [refs, setRefs] = useState<Record<string, ItemReferencia[]>>({});
  useEffect(() => {
    if (!privados || !casos) return;
    const m: Record<string, ItemReferencia[]> = {};
    for (const c of casos) m[c.id] = (privados.find((p: any) => p.case_id === c.id)?.referencia as ItemReferencia[]) || [];
    setRefs(m);
  }, [privados, casos]);

  const salvarConfig = async () => {
    const t = tempo.trim() ? Number(tempo) : null;
    if (t !== null && (!Number.isFinite(t) || t <= 0)) { toast({ title: "Tempo inválido", variant: "destructive" }); return; }
    const { error } = await supabase.from("documentation_rooms").update({ tempo_sugerido_min: t, base_conciliacao: base, usa_paciente: usa } as any).eq("id", roomId!);
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else { toast({ title: "Configuração salva" }); qc.invalidateQueries({ queryKey: ["doc-v2-sala", roomId] }); }
  };

  const salvarReferencia = async (caseId: string) => {
    const limpa = (refs[caseId] || []).filter((m) => m.medicamento.trim()).map((m) => ({ ...m, medicamento: m.medicamento.trim(), frequencia: (m.frequencia || "").trim() }));
    const existe = (privados || []).some((p: any) => p.case_id === caseId);
    const { error } = existe
      ? await supabase.from("documentation_v2_privado" as any).update({ referencia: limpa, updated_at: new Date().toISOString() } as any).eq("case_id", caseId)
      : await supabase.from("documentation_v2_privado" as any).insert({ case_id: caseId, room_id: roomId, referencia: limpa } as any);
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else { toast({ title: "Conciliação do caso salva" }); qc.invalidateQueries({ queryKey: ["doc-v2-privados", roomId] }); }
  };

  const mudarStatus = async (status: string) => {
    await supabase.from("documentation_rooms").update({ status }).eq("id", roomId!);
    qc.invalidateQueries({ queryKey: ["doc-v2-sala", roomId] });
    toast({ title: status === "active" ? "Sala ativada" : "Sala encerrada" });
  };

  if (!sala) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
  if (sala.schema_version !== 2) return <div className="p-6 text-sm">Esta sala não é da Documentação v2.</div>;

  const duplas = new Map<number, any[]>();
  for (const p of partes || []) duplas.set(p.pair_index, [...(duplas.get(p.pair_index) || []), p]);
  // Revisão cruzada que a dupla RECEBEU (0 a 10) e a nota final 80/20 (só existe depois da rubrica confirmada).
  const revisaoRecebida = (i: number) => notaRevisao((revisoes || []).find((r: any) => r.reviewed_pair === i)?.answers_json);
  const referenciaDe = (caseId: string | null) => (refs[caseId || ""] || []) as ItemReferencia[];
  const nomeDupla = (i: number) => `Dupla ${i + 1}: ${(duplas.get(i) || []).map((p) => p.student_name).join(" e ")}`;
  const enviou = (i: number) => !!(respostas || []).find((r: any) => r.pair_index === i)?.submitted_at;
  const semReferencia = (casos || []).filter((c) => !(refs[c.id] || []).length).length;
  // Com o paciente virtual, todo caso precisa de persona válida antes de ativar (o salvo, não o que está na tela).
  const semPersona = sala.usa_paciente ? (casos || []).filter((c) => validarPersona((privados || []).find((p: any) => p.case_id === c.id)?.gabarito?.paciente_virtual).some((a) => a.nivel === "erro")).length : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/simulations/documentation")}><ArrowLeft className="mr-1 h-4 w-4" />Salas</Button>
          <div>
            <h1 className="font-heading text-2xl font-medium">{sala.title} <Badge variant="secondary">v2</Badge></h1>
            <p className="text-sm text-muted-foreground">PIN <b className="font-mono text-foreground">{sala.access_code}</b> · status: {sala.status === "active" ? "ativa" : sala.status === "finished" ? "encerrada" : "rascunho"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {sala.status !== "active" && <Button onClick={() => mudarStatus("active")} disabled={semReferencia > 0 || semPersona > 0 || !(casos || []).length} title={semReferencia > 0 ? "Cadastre a conciliação de todos os casos antes de ativar" : semPersona > 0 ? "Complete a persona do paciente em todos os casos antes de ativar" : undefined}>Ativar sala</Button>}
          {sala.status === "active" && <Button variant="outline" onClick={() => mudarStatus("finished")}>Encerrar</Button>}
        </div>
      </div>

      {semPersona > 0 && <p className="rounded border border-warning/40 bg-warning/10 p-3 text-sm">{semPersona} caso(s) sem persona completa do paciente virtual. Complete abaixo (barreiras e mensagens-chave) antes de ativar.</p>}
      {semReferencia > 0 && <p className="rounded border border-warning/40 bg-warning/10 p-3 text-sm">{semReferencia} caso(s) sem conciliação de referência. O aluno precisa dela como base; preencha abaixo antes de ativar.</p>}

      <Card>
        <CardHeader><CardTitle className="font-heading text-base font-medium">Configuração</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div className="flex items-end">
            <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={usa} onChange={(e) => setUsa(e.target.checked)} />Usar paciente virtual de aconselhamento</label>
          </div>
          <div>
            <Label htmlFor="base">Base dos documentos</Label>
            <select id="base" value={base} onChange={(e) => setBase(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
              <option value="validada">Conciliação validada do caso</option>
              <option value="propria" disabled>A da própria dupla (em breve)</option>
            </select>
          </div>
          <div><Label htmlFor="tempo">Tempo sugerido (min)</Label><Input id="tempo" inputMode="numeric" value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="Sem tempo sugerido" /></div>
          <div className="flex items-end"><Button onClick={salvarConfig}><Save className="mr-1 h-4 w-4" />Salvar</Button></div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="font-heading text-lg font-medium">Casos e conciliação de referência</h2>
        <p className="text-sm text-muted-foreground">É o que o paciente deve usar depois da transição, e o que o aluno recebe como base. Veio como rascunho da Reconciliação (prescrição + ação esperada de cada discrepância): revise cada linha.</p>
        {(casos || []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum caso v2 foi importado. A sala de Reconciliação de origem precisa ter casos v2.</p>}
        {(casos || []).map((c) => (
          <Card key={c.id}>
            <CardHeader><CardTitle className="font-heading text-base font-medium">{c.title}</CardTitle><p className="text-xs text-muted-foreground">{c.caso_json?.paciente?.nome}, {c.caso_json?.paciente?.idade} anos</p></CardHeader>
            <CardContent className="space-y-2">
              {(refs[c.id] || []).map((m, i) => {
                const mudar = (patch: Partial<ItemReferencia>) => setRefs((a) => ({ ...a, [c.id]: a[c.id].map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
                return (
                  <div key={i} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                    <Input aria-label={`Medicamento ${i + 1}`} value={m.medicamento} onChange={(e) => mudar({ medicamento: e.target.value })} placeholder="Medicamento e dose" />
                    <select aria-label={`Conduta ${i + 1}`} value={m.conduta} onChange={(e) => mudar({ conduta: e.target.value as Conduta })} className="h-10 rounded-md border border-input bg-background px-2 text-sm">{CONDUTAS.map((o) => <option key={o.v} value={o.v}>{o.r}</option>)}</select>
                    <Input aria-label={`Frequência ${i + 1}`} value={m.frequencia || ""} onChange={(e) => mudar({ frequencia: e.target.value })} placeholder="Frequência" />
                    <Button type="button" variant="ghost" size="sm" aria-label={`Remover ${i + 1}`} onClick={() => setRefs((a) => ({ ...a, [c.id]: a[c.id].filter((_, j) => j !== i) }))}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                );
              })}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setRefs((a) => ({ ...a, [c.id]: [...(a[c.id] || []), { medicamento: "", conduta: "mantido", frequencia: "" }] }))}><Plus className="mr-1 h-3.5 w-3.5" />Adicionar</Button>
                <Button type="button" size="sm" onClick={() => salvarReferencia(c.id)}><Save className="mr-1 h-3.5 w-3.5" />Salvar este caso</Button>
              </div>
              {usa && (privados || []).some((p: any) => p.case_id === c.id) && (
                <DocV2PersonaEditor caseId={c.id} gabarito={(privados || []).find((p: any) => p.case_id === c.id)?.gabarito} onSaved={() => qc.invalidateQueries({ queryKey: ["doc-v2-privados", roomId] })} />
              )}
              {usa && !(privados || []).some((p: any) => p.case_id === c.id) && <p className="text-xs text-muted-foreground">Salve a conciliação deste caso para criar a persona do paciente.</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <DocV2Panorama totalDuplas={duplas.size} respostas={(respostas || []).filter((r: any) => r.submitted_at)} avaliacoes={avaliacoes || []} revisoesEnviadas={(revisoes || []).length} usaPaciente={!!sala.usa_paciente} />
      <DocV2Lote respostas={(respostas || []).filter((r: any) => r.submitted_at)} corrigidas={new Set((avaliacoes || []).map((a: any) => a.response_id as string))}
        usaPaciente={!!sala.usa_paciente} referenciaDe={referenciaDe} nomeDe={nomeDupla}
        onFeito={() => qc.invalidateQueries({ queryKey: ["doc-v2-avaliacoes", roomId] })} />

      <Card>
        <CardHeader><CardTitle className="font-heading text-base font-medium">Duplas e entregas</CardTitle><p className="text-xs text-muted-foreground">Só entraram as duplas completas da Reconciliação. A IA sugere a nota; você confirma e libera a devolutiva.</p></CardHeader>
        <CardContent>
          {duplas.size === 0 ? <p className="text-sm text-muted-foreground">Nenhuma dupla.</p> : (
            <ul className="divide-y text-sm">
              {[...duplas.entries()].map(([i, g]) => {
                const resp = (respostas || []).find((r: any) => r.pair_index === i && r.submitted_at);
                const av = resp ? (avaliacoes || []).find((a: any) => a.response_id === resp.id) : null;
                const casoDaDupla = resp ? (casos || []).find((c) => c.id === resp.clinical_case_id) : null;
                return (
                  <li key={i} className="space-y-2 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span><b>Dupla {i + 1}</b>: {g.map((p) => p.student_name).join(" e ")}</span>
                      <span className="flex items-center gap-2">
                        {av?.confirmada && <Badge variant="secondary" title={`Rubrica ${Number(av.nota).toFixed(2)} · revisão recebida ${revisaoRecebida(i) == null ? "—" : revisaoRecebida(i)!.toFixed(2)}`}>Final {(notaFinalDocV2(Number(av.nota), revisaoRecebida(i)) ?? 0).toFixed(2).replace(".", ",")}/10{av.liberada ? " · liberada" : ""}</Badge>}
                        {resp && sala.usa_paciente && !resp.aconselhamento_concluido_at && <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Aconselhamento pendente</Badge>}
                        {resp ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Enviada</Badge> : <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pendente</Badge>}
                        {resp && <Button size="sm" variant="outline" onClick={() => setAberta(aberta === i ? null : i)}>{aberta === i ? "Fechar" : "Corrigir"}</Button>}
                      </span>
                    </div>
                    {resp && aberta === i && (
                      <DocV2Correcao roomId={roomId!} usaPaciente={!!sala.usa_paciente} response={{ id: resp.id, respostas: resp.respostas }}
                        referencia={(refs[casoDaDupla?.id || ""] || []) as ItemReferencia[]}
                        totalBarreiras={((privados || []).find((p: any) => p.case_id === casoDaDupla?.id)?.gabarito?.paciente_virtual?.barreiras || []).length}
                        onSaved={() => qc.invalidateQueries({ queryKey: ["doc-v2-avaliacoes", roomId] })} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
