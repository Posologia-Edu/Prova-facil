import { useEffect, useState } from "react";
import { Save, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { categoriaNaranjo, escoreNaranjo, ESQUEMAS_EXTRA, NARANJO_PERGUNTAS, ROTULO_NARANJO, type ExtraId } from "@/lib/doc-v2-extras";

type Props = { caseId: string; extra: ExtraId; casoJson: any; gabarito: any; onSaved: () => void };

/**
 * Ocorrência de um documento extra para um caso (o que o aluno lê) e o gabarito dele (só o servidor lê).
 * A ocorrência vai em caso_json.ocorrencias[extra]; o gabarito em documentation_v2_privado.gabarito.extras[extra].
 * A IA só dá o rascunho; o professor revisa e salva.
 */
export default function DocV2OcorrenciaEditor({ caseId, extra, casoJson, gabarito, onSaved }: Props) {
  const esq = ESQUEMAS_EXTRA[extra];
  const [ocorrencia, setOcorrencia] = useState("");
  const [suspeito, setSuspeito] = useState("");
  const [nar, setNar] = useState<Record<string, string>>({});
  const [obs, setObs] = useState("");
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    setOcorrencia(casoJson?.ocorrencias?.[extra] || "");
    const g = gabarito?.extras?.[extra] || {};
    setSuspeito(g.medicamento_suspeito || ""); setNar(g.naranjo || {}); setObs(g.observacoes || "");
  }, [casoJson, gabarito, extra]);

  const { escore, respondidas } = escoreNaranjo(nar);

  const gerar = async () => {
    if ((ocorrencia.trim() || Object.keys(nar).length) && !window.confirm("Gerar de novo substitui a ocorrência e o gabarito que estão aqui. Continuar?")) return;
    setGerando(true);
    try {
      const { data, error } = await supabase.functions.invoke("doc-v2-extras", { body: { action: "gerar_ocorrencia", case_id: caseId, extra } });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Falha ao chamar a IA");
      setOcorrencia(data.ocorrencia); setSuspeito(data.gabarito?.medicamento_suspeito || ""); setNar(data.gabarito?.naranjo || {}); setObs(data.gabarito?.observacoes || "");
      toast({ title: "Rascunho pronto", description: "Leia a ocorrência, confira as respostas de Naranjo e salve." });
    } catch (e) {
      toast({ title: "Não foi possível gerar", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally { setGerando(false); }
  };

  const salvar = async () => {
    if (!ocorrencia.trim()) { toast({ title: "Escreva a ocorrência", variant: "destructive" }); return; }
    if (respondidas < NARANJO_PERGUNTAS.length) { toast({ title: "Responda as 10 perguntas de Naranjo do gabarito", variant: "destructive" }); return; }
    const novoCaso = { ...(casoJson || {}), ocorrencias: { ...(casoJson?.ocorrencias || {}), [extra]: ocorrencia.trim() } };
    const novoGab = { ...(gabarito || {}), extras: { ...(gabarito?.extras || {}), [extra]: { medicamento_suspeito: suspeito.trim(), naranjo: nar, observacoes: obs.trim() } } };
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
      <div className="space-y-1"><Label className="text-xs">Medicamento suspeito (gabarito)</Label><Input value={suspeito} onChange={(e) => setSuspeito(e.target.value)} /></div>
      <div className="space-y-1">
        <p className="text-xs font-medium">Respostas esperadas de Naranjo (gabarito, o aluno não vê)</p>
        <div className="grid gap-1 sm:grid-cols-2">
          {NARANJO_PERGUNTAS.map((q, i) => (
            <label key={q.id} className="flex items-center gap-2 text-xs"><span className="w-5 shrink-0">{i + 1}.</span>
              <select aria-label={`Naranjo pergunta ${i + 1}`} value={nar[q.id] || ""} onChange={(e) => setNar({ ...nar, [q.id]: e.target.value })} className="h-8 flex-1 rounded-md border border-input bg-background px-1 text-xs">
                <option value="">—</option><option value="sim">Sim</option><option value="nao">Não</option><option value="nsei">Não sei</option>
              </select>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Escore esperado: <b>{respondidas === 10 ? escore : "—"}</b>{respondidas === 10 ? ` · ${ROTULO_NARANJO[categoriaNaranjo(escore)]}` : ""}</p>
      </div>
      <div className="space-y-1"><Label className="text-xs">Observações para você (o que o aluno precisa perceber)</Label><Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
      <Button type="button" size="sm" onClick={salvar}><Save className="mr-1 h-3.5 w-3.5" />Salvar ocorrência</Button>
    </div>
  );
}
