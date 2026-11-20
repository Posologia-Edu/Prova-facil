import { useRef, useState } from "react";
import { Sparkles, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { criteriosAplicaveis } from "@/lib/doc-v2-rubrica";
import { normalizarRespostas, verificarTudo, type ItemReferencia } from "@/lib/doc-v2";

type Resp = { id: string; pair_index: number; clinical_case_id: string | null; respostas: any };
type Props = {
  respostas: Resp[];
  /** Ids das respostas que já têm avaliação (sugestão ou confirmada). */
  corrigidas: Set<string>;
  usaPaciente: boolean;
  referenciaDe: (caseId: string | null) => ItemReferencia[];
  nomeDe: (pairIndex: number) => string;
  onFeito: () => void;
};
type Resultado = { nome: string; ok: boolean; erro?: string };

/**
 * Correção em lote da Documentação v2: corrige com a IA, uma dupla por vez, as respostas que ainda não têm sugestão.
 * Não mexe nas que já foram corrigidas ou confirmadas. Cada uma continua pedindo a confirmação do professor.
 */
export default function DocV2Lote({ respostas, corrigidas, usaPaciente, referenciaDe, nomeDe, onFeito }: Props) {
  const [rodando, setRodando] = useState(false);
  const [feitos, setFeitos] = useState(0);
  const [total, setTotal] = useState(0);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const parar = useRef(false);
  const pendentes = respostas.filter((r) => !corrigidas.has(r.id));

  const rodar = async () => {
    const fila = [...pendentes];
    if (!fila.length) return;
    parar.current = false;
    setRodando(true); setFeitos(0); setTotal(fila.length); setResultados([]);
    const criterios = criteriosAplicaveis(usaPaciente).map((c) => ({ id: c.id, criterio: c.label, peso: c.peso, ancoras: c.ancoras, allow_na: !!c.allowNa }));
    const out: Resultado[] = [];
    for (const r of fila) {
      if (parar.current) break;
      const nome = nomeDe(r.pair_index);
      try {
        const avisos = verificarTudo(normalizarRespostas(r.respostas), referenciaDe(r.clinical_case_id)).filter((a) => a.nivel === "aviso").map((a) => a.texto);
        const { data, error } = await supabase.functions.invoke("grade-doc-v2", { body: { response_id: r.id, criterios, avisos } });
        if (error || data?.error) throw new Error(data?.error || error?.message || "Falha ao chamar a IA");
        out.push({ nome, ok: true });
      } catch (e) {
        out.push({ nome, ok: false, erro: e instanceof Error ? e.message : String(e) });
      }
      setResultados([...out]); setFeitos(out.length);
    }
    setRodando(false);
    onFeito();
    const falhas = out.filter((x) => !x.ok).length;
    toast({
      title: parar.current ? "Correção em lote interrompida" : "Correção em lote concluída",
      description: `${out.length - falhas} corrigida(s)${falhas ? `, ${falhas} com erro` : ""}. Revise e confirme cada nota.`,
      variant: falhas ? "destructive" : undefined,
    });
  };

  if (respostas.length === 0) return null;
  return (
    <Card>
      <CardContent className="space-y-3 py-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground">
            {pendentes.length === 0 ? "Todas as respostas enviadas já têm sugestão da IA." : `${pendentes.length} de ${respostas.length} resposta(s) ainda sem sugestão da IA. A correção é feita uma dupla por vez, com cerca de um minuto cada.`}
          </p>
          {rodando
            ? <Button size="sm" variant="outline" onClick={() => { parar.current = true; }} className="gap-1.5"><Square className="h-3.5 w-3.5" />Parar após esta</Button>
            : <Button size="sm" onClick={rodar} disabled={pendentes.length === 0} className="gap-1.5"><Sparkles className="h-3.5 w-3.5" />Corrigir as pendentes com IA</Button>}
        </div>
        {(rodando || resultados.length > 0) && (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={feitos}>
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${total ? (feitos / total) * 100 : 0}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{feitos} de {total}</p>
            <ul className="space-y-0.5 text-xs">{resultados.map((r, i) => <li key={i} className={r.ok ? "text-muted-foreground" : "text-destructive"}>{r.ok ? "Corrigida" : "Erro"}: {r.nome}{r.erro ? ` (${r.erro})` : ""}</li>)}</ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
