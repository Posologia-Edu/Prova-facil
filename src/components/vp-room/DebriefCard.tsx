import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Compass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

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

function Lista({ titulo, itens }: { titulo: string; itens?: string[] }) {
  if (!itens || itens.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <ul className="list-disc pl-5 text-sm space-y-0.5">{itens.map((t, i) => <li key={i}>{t}</li>)}</ul>
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

  const infos = data.informacoes || [];
  const obtidas = infos.filter((i) => i.obtida).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" /> Caminho esperado do caso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-xs text-muted-foreground">
          Compare com o que você fez. Este é o gabarito do caso para a sua profissão, liberado junto com o feedback.
        </p>

        {infos.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm font-medium">Informações que o atendimento deveria levantar</p>
              {data.obtidas_disponivel && (
                <Badge variant="secondary">{obtidas} de {infos.length} obtidas{typeof data.cobertura === "number" ? ` · cobertura ponderada ${Math.round(data.cobertura * 100)}%` : ""}</Badge>
              )}
            </div>
            {ORDEM.map((imp) => {
              const grupo = infos.filter((i) => i.importancia === imp);
              if (grupo.length === 0) return null;
              return (
                <div key={imp} className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{imp}</p>
                  <ul className="space-y-1">
                    {grupo.map((i) => (
                      <li key={i.id} className="flex items-start gap-2 text-sm">
                        {i.obtida === null ? <Circle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          : i.obtida ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                          : <Circle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />}
                        <span className={i.obtida === false ? "text-muted-foreground" : ""}>
                          {i.descricao}
                          {i.obtida === false && <span className="ml-2 text-xs text-destructive">não levantada</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {data.problemas && data.problemas.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Problemas que o caso embutia</p>
            <ul className="space-y-2">
              {data.problemas.map((p, i) => (
                <li key={i} className="rounded-md border p-3 text-sm space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{p.problema}</strong>
                    {p.tipo && <Badge variant="outline" className="text-[10px]">{p.tipo}</Badge>}
                  </div>
                  {p.justificativa && <p className="text-xs text-muted-foreground">{p.justificativa}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.red_flags && data.red_flags.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Sinais de alerta e conduta esperada</p>
            <ul className="space-y-1 text-sm">
              {data.red_flags.map((r, i) => (
                <li key={i}><strong>{r.sinal}:</strong> <span className="text-muted-foreground">{r.conduta_esperada}</span></li>
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
