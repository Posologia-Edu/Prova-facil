import { useEffect, useState } from "react";
import { Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { personaEmBranco, ROTULO_LETRAMENTO, validarPersona, type Letramento, type PersonaPaciente } from "@/lib/doc-v2-paciente";

type Props = { caseId: string; gabarito: any; onSaved: () => void };

/** Persona do paciente virtual de um caso: perfil, barreiras escondidas e mensagens-chave. A IA só dá o rascunho; o professor revisa. */
export default function DocV2PersonaEditor({ caseId, gabarito, onSaved }: Props) {
  const [p, setP] = useState<PersonaPaciente>(personaEmBranco());
  const [gerando, setGerando] = useState(false);
  useEffect(() => { setP((gabarito?.paciente_virtual as PersonaPaciente) || personaEmBranco()); }, [gabarito]);

  const avisos = validarPersona(p);
  const erros = avisos.filter((a) => a.nivel === "erro");

  const gerar = async () => {
    if ((p.barreiras.length || p.mensagens_chave.length || p.perfil.trim()) && !window.confirm("Gerar de novo substitui o que está escrito aqui. Continuar?")) return;
    setGerando(true);
    try {
      const { data, error } = await supabase.functions.invoke("doc-v2-paciente", { body: { action: "gerar_persona", case_id: caseId } });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Falha ao chamar a IA");
      setP(data.persona as PersonaPaciente);
      toast({ title: "Rascunho pronto", description: "Revise as barreiras e as mensagens-chave e salve." });
    } catch (e) {
      toast({ title: "Não foi possível gerar", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally { setGerando(false); }
  };

  const salvar = async () => {
    const novo = { ...(gabarito || {}), paciente_virtual: p };
    const { error } = await supabase.from("documentation_v2_privado" as any).update({ gabarito: novo, updated_at: new Date().toISOString() } as any).eq("case_id", caseId);
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Persona salva" });
    onSaved();
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Paciente virtual</p>
        <Button type="button" size="sm" variant="outline" onClick={gerar} disabled={gerando}><Sparkles className="mr-1 h-3.5 w-3.5" />{gerando ? "Gerando..." : "Gerar rascunho com IA"}</Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1"><Label className="text-xs">Perfil (como fala, rotina, o que valoriza e teme)</Label><Textarea rows={3} value={p.perfil} onChange={(e) => setP({ ...p, perfil: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs" htmlFor={`let-${caseId}`}>Letramento em saúde</Label>
          <select id={`let-${caseId}`} value={p.letramento} onChange={(e) => setP({ ...p, letramento: e.target.value as Letramento })} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
            {(Object.keys(ROTULO_LETRAMENTO) as Letramento[]).map((k) => <option key={k} value={k}>{ROTULO_LETRAMENTO[k]}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium">Barreiras escondidas (o paciente só conta se o aluno perguntar bem)</p>
        {p.barreiras.map((b, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input aria-label={`Barreira ${i + 1}`} placeholder="Barreira (ex.: parte o comprimido para economizar)" value={b.descricao} onChange={(e) => setP({ ...p, barreiras: p.barreiras.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)) })} />
            <Input aria-label={`Como revela ${i + 1}`} placeholder="Revela quando o aluno perguntar..." value={b.como_revela} onChange={(e) => setP({ ...p, barreiras: p.barreiras.map((x, j) => (j === i ? { ...x, como_revela: e.target.value } : x)) })} />
            <Button type="button" variant="ghost" size="sm" aria-label={`Remover barreira ${i + 1}`} onClick={() => setP({ ...p, barreiras: p.barreiras.filter((_, j) => j !== i) })}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setP({ ...p, barreiras: [...p.barreiras, { id: `b${p.barreiras.length + 1}`, descricao: "", como_revela: "" }] })}><Plus className="mr-1 h-3.5 w-3.5" />Barreira</Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium">Mensagens-chave (o que o paciente precisa ter entendido ao final)</p>
        {p.mensagens_chave.map((m, i) => (
          <div key={i} className="flex gap-2">
            <Input aria-label={`Mensagem-chave ${i + 1}`} value={m.texto} onChange={(e) => setP({ ...p, mensagens_chave: p.mensagens_chave.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)) })} />
            <Button type="button" variant="ghost" size="sm" aria-label={`Remover mensagem ${i + 1}`} onClick={() => setP({ ...p, mensagens_chave: p.mensagens_chave.filter((_, j) => j !== i) })}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setP({ ...p, mensagens_chave: [...p.mensagens_chave, { id: `m${p.mensagens_chave.length + 1}`, texto: "" }] })}><Plus className="mr-1 h-3.5 w-3.5" />Mensagem-chave</Button>
      </div>

      {avisos.length > 0 && <ul className="list-disc pl-5 text-xs text-warning-ink">{avisos.map((a, i) => <li key={i}>{a.texto}</li>)}</ul>}
      <Button type="button" size="sm" onClick={salvar} disabled={erros.length > 0} title={erros.length ? "Corrija os avisos para salvar" : undefined}><Save className="mr-1 h-3.5 w-3.5" />Salvar persona</Button>
    </div>
  );
}
