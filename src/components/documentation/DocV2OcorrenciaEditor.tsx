import { useEffect, useState } from "react";
import { Save, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  categoriaNaranjo, escoreNaranjo, ESQUEMAS_EXTRA, NARANJO_PERGUNTAS, ROTULO_DANO, ROTULO_NARANJO, ROTULO_TIPO_INCIDENTE,
  type ExtraId, type GrauDano, type TipoIncidente,
} from "@/lib/doc-v2-extras";

type Props = { caseId: string; extra: ExtraId; casoJson: any; gabarito: any; onSaved: () => void };

const SELECT = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";
const ETAPAS: [string, string][] = [["prescricao", "Prescrição"], ["transcricao", "Transcrição"], ["dispensacao", "Dispensação"], ["preparo", "Preparo"], ["administracao", "Administração"], ["monitorizacao", "Monitorização"]];

/**
 * Ocorrência de um documento extra para um caso (o que o aluno lê) e o gabarito dele (só o servidor lê).
 * A ocorrência vai em caso_json.ocorrencias[extra]; o gabarito em documentation_v2_privado.gabarito.extras[extra].
 * A IA só dá o rascunho; o professor revisa e salva.
 */
export default function DocV2OcorrenciaEditor({ caseId, extra, casoJson, gabarito, onSaved }: Props) {
  const esq = ESQUEMAS_EXTRA[extra];
  const [ocorrencia, setOcorrencia] = useState("");
  const [gab, setGab] = useState<Record<string, any>>({});
  const [gerando, setGerando] = useState(false);
  const [fatoresRaw, setFatoresRaw] = useState("");
  const juntar = (v: unknown) => (Array.isArray(v) ? v.join("\n") : "");

  useEffect(() => {
    setOcorrencia(casoJson?.ocorrencias?.[extra] || "");
    const g = gabarito?.extras?.[extra] || {};
    setGab(g);
    setFatoresRaw(juntar(g.fatores_esperados));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [casoJson, gabarito, extra]);
  const mudar = (patch: Record<string, any>) => setGab((g) => ({ ...g, ...patch }));

  const nar: Record<string, string> = gab.naranjo || {};
  const { escore, respondidas } = escoreNaranjo(nar);

  const gerar = async () => {
    if ((ocorrencia.trim() || Object.keys(gab).length) && !window.confirm("Gerar de novo substitui a ocorrência e o gabarito que estão aqui. Continuar?")) return;
    setGerando(true);
    try {
      const { data, error } = await supabase.functions.invoke("doc-v2-extras", { body: { action: "gerar_ocorrencia", case_id: caseId, extra } });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Falha ao chamar a IA");
      setOcorrencia(data.ocorrencia); setGab(data.gabarito || {}); setFatoresRaw(juntar(data.gabarito?.fatores_esperados));
      toast({ title: "Rascunho pronto", description: "Leia a ocorrência, confira o gabarito e salve." });
    } catch (e) {
      toast({ title: "Não foi possível gerar", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally { setGerando(false); }
  };

  const salvar = async () => {
    if (!ocorrencia.trim()) { toast({ title: "Escreva a ocorrência", variant: "destructive" }); return; }
    if (extra === "ram" && respondidas < NARANJO_PERGUNTAS.length) { toast({ title: "Responda as 10 perguntas de Naranjo do gabarito", variant: "destructive" }); return; }
    if (extra === "incidente" && (!gab.tipo_esperado || !gab.dano_esperado)) { toast({ title: "Marque o tipo e o dano esperados", variant: "destructive" }); return; }
    const novoCaso = { ...(casoJson || {}), ocorrencias: { ...(casoJson?.ocorrencias || {}), [extra]: ocorrencia.trim() } };
    const novoGab = { ...(gabarito || {}), extras: { ...(gabarito?.extras || {}), [extra]: gab } };
    const r1 = await supabase.from("documentation_clinical_cases").update({ caso_json: novoCaso } as any).eq("id", caseId);
    const r2 = r1.error ? { error: null } : await supabase.from("documentation_v2_privado" as any).update({ gabarito: novoGab, updated_at: new Date().toISOString() } as any).eq("case_id", caseId);
    const erro = r1.error || r2.error;
    if (erro) { toast({ title: "Erro ao salvar", description: erro.message, variant: "destructive" }); return; }
    toast({ title: "Ocorrência salva" });
    onSaved();
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{esq.titulo}: ocorrência e gabarito</p>
        <Button type="button" size="sm" variant="outline" onClick={gerar} disabled={gerando}><Sparkles className="mr-1 h-3.5 w-3.5" />{gerando ? "Gerando..." : "Gerar rascunho com IA"}</Button>
      </div>
      <div className="space-y-1"><Label className="text-xs">O que aconteceu depois (o aluno lê isto). {esq.dicaOcorrencia}</Label><Textarea rows={4} value={ocorrencia} onChange={(e) => setOcorrencia(e.target.value)} /></div>

      {extra === "ram" && (
        <>
          <div className="space-y-1"><Label className="text-xs">Medicamento suspeito (gabarito)</Label><Input value={gab.medicamento_suspeito || ""} onChange={(e) => mudar({ medicamento_suspeito: e.target.value })} /></div>
          <div className="space-y-1">
            <p className="text-xs font-medium">Respostas esperadas de Naranjo (gabarito, o aluno não vê)</p>
            <div className="grid gap-1 sm:grid-cols-2">
              {NARANJO_PERGUNTAS.map((q, i) => (
                <label key={q.id} className="flex items-center gap-2 text-xs"><span className="w-5 shrink-0">{i + 1}.</span>
                  <select aria-label={`Naranjo pergunta ${i + 1}`} value={nar[q.id] || ""} onChange={(e) => mudar({ naranjo: { ...nar, [q.id]: e.target.value } })} className="h-8 flex-1 rounded-md border border-input bg-background px-1 text-xs">
                    <option value="">—</option><option value="sim">Sim</option><option value="nao">Não</option><option value="nsei">Não sei</option>
                  </select>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Escore esperado: <b>{respondidas === 10 ? escore : "—"}</b>{respondidas === 10 ? ` · ${ROTULO_NARANJO[categoriaNaranjo(escore)]}` : ""}</p>
          </div>
        </>
      )}

      {extra === "incidente" && (
        <div className="space-y-2">
          <p className="text-xs font-medium">Gabarito da classificação (o aluno não vê)</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-xs">Tipo esperado
              <select aria-label="Tipo esperado" value={gab.tipo_esperado || ""} onChange={(e) => mudar({ tipo_esperado: e.target.value })} className={SELECT}>
                <option value="">Escolha</option>{(Object.keys(ROTULO_TIPO_INCIDENTE) as TipoIncidente[]).map((k) => <option key={k} value={k}>{ROTULO_TIPO_INCIDENTE[k]}</option>)}
              </select></label>
            <label className="space-y-1 text-xs">Dano esperado
              <select aria-label="Dano esperado" value={gab.dano_esperado || ""} onChange={(e) => mudar({ dano_esperado: e.target.value })} className={SELECT}>
                <option value="">Escolha</option>{(Object.keys(ROTULO_DANO) as GrauDano[]).map((k) => <option key={k} value={k}>{ROTULO_DANO[k]}</option>)}
              </select></label>
            <label className="space-y-1 text-xs">Etapa do circuito
              <select aria-label="Etapa esperada" value={gab.etapa || ""} onChange={(e) => mudar({ etapa: e.target.value })} className={SELECT}>
                <option value="">Escolha</option>{ETAPAS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </select></label>
            <label className="space-y-1 text-xs">Foi interceptado?
              <select aria-label="Interceptado esperado" value={gab.interceptado || ""} onChange={(e) => mudar({ interceptado: e.target.value })} className={SELECT}>
                <option value="">Escolha</option><option value="sim">Sim</option><option value="nao">Não, chegou ao paciente</option>
              </select></label>
          </div>
          <div className="space-y-1"><Label className="text-xs">Fatores contribuintes esperados (um por linha, começando pela categoria)</Label>
            <Textarea rows={3} value={fatoresRaw} onChange={(e) => { setFatoresRaw(e.target.value); mudar({ fatores_esperados: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) }); }} /></div>
        </div>
      )}

      <div className="space-y-1"><Label className="text-xs">Observações para você (o que o aluno precisa perceber)</Label><Textarea rows={2} value={gab.observacoes || ""} onChange={(e) => mudar({ observacoes: e.target.value })} /></div>
      <Button type="button" size="sm" onClick={salvar}><Save className="mr-1 h-3.5 w-3.5" />Salvar ocorrência</Button>
    </div>
  );
}
