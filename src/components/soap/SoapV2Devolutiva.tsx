import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NA_ANSWER } from "@/components/forms/types";
import { SOAP_V2_CRITERIOS, type DevolutivaSoapV2 } from "@/lib/soap-v2-rubrica";

type Props = { roomId: string; accessCode: string; participantId: string; email: string };

const fmt = (n: number) => n.toFixed(2).replace(".", ",");

/** Devolutiva do SOAP v2 para o aluno. Só aparece depois que o professor confirma a nota e libera. */
export default function SoapV2Devolutiva({ roomId, accessCode, participantId, email }: Props) {
  const [estado, setEstado] = useState<"carregando" | "erro" | "aguardando" | "liberada">("carregando");
  const [dev, setDev] = useState<DevolutivaSoapV2 | null>(null);

  const carregar = useCallback(async () => {
    setEstado("carregando");
    try {
      const { data, error } = await supabase.functions.invoke("soap-v2-devolutiva", { body: { access_code: accessCode, email } });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      if (data?.liberada) { setDev(data as DevolutivaSoapV2); setEstado("liberada"); } else setEstado("aguardando");
    } catch (e) {
      console.error("devolutiva", e);
      setEstado("erro");
    }
  }, [roomId, accessCode, participantId, email]);

  useEffect(() => { void carregar(); }, [carregar]);

  if (estado === "liberada" && dev) {
    const just = dev.justificativas || {};
    const crit = dev.criterios || {};
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-heading text-lg font-medium">Sua devolutiva do SOAP</CardTitle>
          {dev.nota != null && <p className="text-sm text-muted-foreground">Nota da rubrica: <b className="text-foreground">{fmt(Number(dev.nota))} de 10</b>. A nota final do SOAP também considera a revisão do colega.</p>}
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          {dev.comentario && <div className="rounded-lg border bg-muted/30 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Comentário do professor</p><p className="mt-1 whitespace-pre-wrap">{dev.comentario}</p></div>}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Critério por critério</p>
            {SOAP_V2_CRITERIOS.map((c) => {
              const v = crit[c.id];
              if (v === undefined) return null;
              const na = v === NA_ANSWER;
              return (
                <div key={c.id} className="rounded-md border p-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{c.label}</p>
                    <span className="shrink-0 font-mono text-xs">{na ? "n/a" : `${v}/4`}</span>
                  </div>
                  {just[c.id] && <p className="mt-1 text-muted-foreground">{just[c.id]}</p>}
                </div>
              );
            })}
          </div>

          {(dev.iceberg?.length || 0) > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">O que o paciente sabia e não entrou no seu registro</p>
              <p className="mt-1 text-xs text-muted-foreground">Isso não reduziu a sua nota. É para você ver o que a entrevista ainda poderia ter revelado.</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">{dev.iceberg!.map((i, k) => <li key={k}>{i.fato}{i.nivel ? <span className="text-muted-foreground"> ({i.nivel})</span> : null}. {i.impacto}</li>)}</ul>
            </div>
          )}

          {(dev.calibracao?.length || 0) > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Sua confiança em cada problema</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">{dev.calibracao!.map((c, k) => <li key={k}><b>{c.problema}</b> (você marcou confiança {c.confianca_aluno || "não informada"}): {c.avaliacao}. {c.comentario}</li>)}</ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
        <p className="text-muted-foreground">
          {estado === "carregando" ? "Verificando a sua devolutiva..."
            : estado === "erro" ? "Não foi possível verificar a devolutiva agora."
            : "A devolutiva do seu SOAP aparece aqui quando o professor liberar."}
        </p>
        <Button size="sm" variant="outline" onClick={carregar} disabled={estado === "carregando"} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />Verificar de novo
        </Button>
      </CardContent>
    </Card>
  );
}
