import { useEffect, useState } from "react";
import { Check, Compass } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreRing } from "@/components/ui/score-ring";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Info { id: string; descricao: string; importancia: string; obtida: boolean | null }
export interface DebriefEncontro { numero: number; interlocutor: string; nome: string | null }

export interface Debrief {
  available: boolean;
  profissao?: string;
  encontros?: DebriefEncontro[];
  obtidas_disponivel?: boolean;
  cobertura?: number | null;
  informacoes?: Info[];
  problemas?: Array<{ problema: string; tipo: string; justificativa: string }>;
  red_flags?: Array<{ sinal: string; conduta_esperada: string }>;
  conduta_esperada?: string[];
  orientacoes_esperadas?: string[];
  encaminhamentos?: string[];
  objetivos_aprendizagem?: string[];
}

const ORDEM = ["Essencial", "Importante", "Complementar"];
// A cor do rótulo acompanha o peso do item no gabarito; o resto da linha fica neutro.
const ROTULO_COR: Record<string, string> = {
  Essencial: "text-destructive",
  Importante: "text-warning-ink",
  Complementar: "text-muted-foreground",
};

function Lista({ titulo, itens }: { titulo: string; itens?: string[] }) {
  if (!itens || itens.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="label-mono">{titulo}</p>
      <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">{itens.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}

// Debrief (P15): o caminho esperado do caso ao lado do que o aluno conseguiu levantar. Só aparece depois que o docente
// libera o feedback; a função vp-debrief é quem garante isso. Casos sem gabarito (legados) não mostram o cartão.
export function DebriefCard({ cvpId, email, onLoaded }: { cvpId: string; email: string; onLoaded?: (d: Debrief) => void }) {
  const [data, setData] = useState<Debrief | null>(null);

  useEffect(() => {
    let active = true;
    supabase.functions
      .invoke("vp-debrief", { body: { class_virtual_patient_id: cvpId, email } })
      .then(({ data: d, error }) => {
        if (active && !error && d?.available) { setData(d as Debrief); onLoaded?.(d as Debrief); }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [cvpId, email]);

  if (!data) return null;
  return <DebriefCardView data={data} />;
}

// Parte visual separada da busca de dados: o guia de estilo a usa com dados de exemplo.
export function DebriefCardView({ data }: { data: Debrief }) {
  const infos = data.informacoes || [];
  const obtidas = infos.filter((i) => i.obtida).length;
  const cobertura = typeof data.cobertura === "number" ? data.cobertura : null;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 border-b">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Compass className="h-4 w-4 text-primary" /> Caminho esperado do caso
          </CardTitle>
          <p className="max-w-[52ch] text-sm text-muted-foreground">
            Compare com o que você fez. Este é o gabarito do caso para a sua profissão, liberado junto com o feedback.
          </p>
        </div>
        {data.obtidas_disponivel && cobertura !== null && (
          <ScoreRing
            value={cobertura}
            size={76}
            stroke={8}
            label={`${Math.round(cobertura * 100)}%`}
            aria-label={`Cobertura ponderada de ${Math.round(cobertura * 100)} por cento`}
          />
        )}
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {infos.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Informações que o atendimento deveria levantar</p>
              {data.obtidas_disponivel && (
                <StatusBadge tone={obtidas > 0 ? "ok" : "neutral"}>
                  {obtidas} de {infos.length} obtidas
                </StatusBadge>
              )}
            </div>
            {ORDEM.map((imp) => {
              const grupo = infos.filter((i) => i.importancia === imp);
              if (grupo.length === 0) return null;
              return (
                <div key={imp} className="space-y-1">
                  <div className="flex items-center gap-3">
                    <p className={cn("label-mono", ROTULO_COR[imp])}>{imp}</p>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <ul>
                    {grupo.map((i) => (
                      <li key={i.id} className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-start gap-3 border-t py-2.5 text-sm first:border-t-0">
                        {i.obtida ? (
                          <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-success text-success-foreground">
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                        ) : (
                          <span className="mt-0.5 h-5 w-5 rounded-full border-[1.5px] border-dashed border-muted-foreground/40" />
                        )}
                        <span className={cn("leading-relaxed", i.obtida === false && "text-muted-foreground")}>{i.descricao}</span>
                        {i.obtida === true && <span className="pt-0.5 text-xs font-medium text-success">obtida</span>}
                        {i.obtida === false && <span className="pt-0.5 text-xs text-muted-foreground">não levantada</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {data.problemas && data.problemas.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Problemas que o caso embutia</p>
            <ul className="space-y-2">
              {data.problemas.map((p, i) => (
                <li key={i} className="space-y-1.5 rounded-lg border bg-sunken/40 p-3.5 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="font-medium">{p.problema}</strong>
                    {p.tipo && <Badge variant="outline" className="text-[10px]">{p.tipo}</Badge>}
                  </div>
                  {p.justificativa && <p className="text-xs leading-relaxed text-muted-foreground">{p.justificativa}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.red_flags && data.red_flags.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Sinais de alerta e conduta esperada</p>
            <ul className="space-y-2 text-sm">
              {data.red_flags.map((r, i) => (
                <li key={i} className="rounded-lg border-l-2 border-destructive bg-destructive-soft/60 px-3.5 py-2.5">
                  <strong className="font-medium">{r.sinal}</strong>
                  <span className="text-muted-foreground"> · {r.conduta_esperada}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Lista titulo="Condutas esperadas" itens={data.conduta_esperada} />
        <Lista titulo="Orientações esperadas" itens={data.orientacoes_esperadas} />
        <Lista titulo="Encaminhamentos" itens={data.encaminhamentos} />
        <Lista titulo="Objetivos de aprendizagem" itens={data.objetivos_aprendizagem} />
      </CardContent>
    </Card>
  );
}
