import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NA_ANSWER } from "@/components/forms/types";
import { ROTULO_DECISAO, ROTULO_DISCREPANCIA, ROTULO_RISCO, type DecisaoPrescritor, type Risco, type TipoDiscrepancia } from "@/lib/recon-v2";
import { RECON_V2_CRITERIOS, type DevolutivaReconV2 } from "@/lib/recon-v2-rubrica";

type Props = { accessCode: string; email: string };

const fmt = (n: number) => n.toFixed(2).replace(".", ",");
const ROT: Record<string, string> = { sim: "sim", parcial: "em parte", nao: "não", na: "—" };
const cor = (v: string) => (v === "sim" ? "text-primary" : v === "parcial" ? "text-warning-ink" : v === "nao" ? "text-destructive" : "text-muted-foreground");

/** Devolutiva da Reconciliação v2 para a dupla. Só aparece depois que o professor confirma a nota e libera. */
export default function ReconV2Devolutiva({ accessCode, email }: Props) {
  const [estado, setEstado] = useState<"carregando" | "erro" | "aguardando" | "liberada">("carregando");
  const [dev, setDev] = useState<DevolutivaReconV2 | null>(null);

  const carregar = useCallback(async () => {
    setEstado("carregando");
    try {
      const { data, error } = await supabase.functions.invoke("recon-v2-devolutiva", { body: { access_code: accessCode, email } });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      if (data?.liberada) { setDev(data as DevolutivaReconV2); setEstado("liberada"); } else setEstado("aguardando");
    } catch (e) {
      console.error("devolutiva", e);
      setEstado("erro");
    }
  }, [accessCode, email]);
  useEffect(() => { void carregar(); }, [carregar]);

  if (estado === "liberada" && dev) {
    const just = dev.justificativas || {};
    const crit = dev.criterios || {};
    return (
      <Card className="w-full text-left">
        <CardHeader>
          <CardTitle className="font-heading text-lg font-medium">Sua devolutiva da reconciliação</CardTitle>
          {dev.nota != null && <p className="text-sm text-muted-foreground">Nota: <b className="text-foreground">{fmt(Number(dev.nota))} de 10</b></p>}
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          {dev.comentario && <div className="rounded-lg border bg-muted/30 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Comentário do professor</p><p className="mt-1 whitespace-pre-wrap">{dev.comentario}</p></div>}

          {(dev.matriz?.length || 0) > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Discrepâncias do caso</p>
              {dev.matriz!.map((l) => (
                <div key={l.id} className="space-y-1 rounded-md border p-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <b>{l.medicamento}</b>
                    <Badge variant="outline">{ROTULO_DISCREPANCIA[l.tipo as TipoDiscrepancia] || l.tipo}</Badge>
                    <Badge variant={l.risco === "grave" ? "destructive" : "secondary"}>{ROTULO_RISCO[l.risco as Risco] || l.risco}</Badge>
                  </div>
                  <p className="text-muted-foreground">{l.descricao}</p>
                  <p className="text-xs">
                    Identificou: <span className={cor(l.achou)}>{ROT[l.achou]}</span> · Classificou: <span className={cor(l.classificou)}>{ROT[l.classificou]}</span> · Dano: <span className={cor(l.risco_avaliado)}>{ROT[l.risco_avaliado]}</span> · Ação: <span className={cor(l.acao)}>{ROT[l.acao]}</span>{l.desfecho ? <> · Prescritor: {ROTULO_DECISAO[l.desfecho as DecisaoPrescritor]}</> : null}
                  </p>
                  {l.comentario && <p>{l.comentario}</p>}
                  <p><b>Ação esperada:</b> {l.acao_esperada}</p>
                  <p className="text-xs text-muted-foreground">Estava em: {l.fontes.join("; ")}{l.fonte_aberta ? "" : " (vocês não abriram esta fonte)"}</p>
                </div>
              ))}
            </div>
          )}

          {(dev.bpmh?.length || 0) > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Sua BPMH comparada com a esperada</p>
              <ul className="list-disc space-y-1 pl-5">{dev.bpmh!.map((b, i) => <li key={i}><b>{b.medicamento}</b>: <span className={cor(b.achou)}>{ROT[b.achou]}</span>{b.comentario ? `. ${b.comentario}` : ""}</li>)}</ul>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Critério por critério</p>
            {RECON_V2_CRITERIOS.map((c) => {
              const v = crit[c.id];
              if (v === undefined) return null;
              const na = v === NA_ANSWER;
              return (
                <div key={c.id} className="rounded-md border p-2.5">
                  <div className="flex items-start justify-between gap-3"><p className="font-medium">{c.label}</p><span className="shrink-0 font-mono text-xs">{na ? "n/a" : `${v}/4`}</span></div>
                  {just[c.id] && <p className="mt-1 text-muted-foreground">{just[c.id]}</p>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
      <p>
        {estado === "carregando" ? "Verificando se a devolutiva já foi liberada..."
          : estado === "erro" ? "Não foi possível verificar a devolutiva agora."
          : "A devolutiva ainda não foi liberada. O professor libera depois de corrigir."}
      </p>
      <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={estado === "carregando"}><RefreshCw className="mr-2 h-3.5 w-3.5" />Verificar de novo</Button>
    </div>
  );
}
