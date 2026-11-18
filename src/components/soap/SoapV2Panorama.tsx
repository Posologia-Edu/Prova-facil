import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SOAP_V2_CRITERIOS, type AvaliacaoSoapV2 } from "@/lib/soap-v2-rubrica";

type Linha = { response_id: string; dados: AvaliacaoSoapV2; confirmada: boolean; liberada: boolean };

/** Resumo da turma no SOAP v2: média por critério e quais problemas esperados do caso a turma identificou. Só para o professor. */
export default function SoapV2Panorama({ roomId }: { roomId: string }) {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [lendo, setLendo] = useState(true);

  useEffect(() => {
    let vivo = true;
    (supabase as any).from("soap_v2_avaliacoes").select("response_id, dados, confirmada, liberada").eq("room_id", roomId)
      .then(({ data }: any) => { if (vivo) { setLinhas((data || []).filter((l: any) => l.dados?.respostas)); setLendo(false); } },
        () => { if (vivo) setLendo(false); });
    return () => { vivo = false; };
  }, [roomId]);

  const porCriterio = useMemo(() => SOAP_V2_CRITERIOS.map((c) => {
    const notas = linhas.map((l) => l.dados.respostas?.[c.id]).filter((v) => typeof v === "number") as number[];
    const media = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
    return { id: c.id, rotulo: c.label.split("?")[0], media, n: notas.length };
  }), [linhas]);

  // Problemas esperados: agrupados pelo texto que a IA copiou do gabarito (o mesmo caso gera o mesmo texto).
  const cobertura = useMemo(() => {
    const m = new Map<string, { sim: number; parcial: number; nao: number }>();
    for (const l of linhas) for (const c of l.dados.cobertura || []) {
      const k = c.problema.trim();
      const atual = m.get(k) || { sim: 0, parcial: 0, nao: 0 };
      atual[c.identificado] += 1;
      m.set(k, atual);
    }
    return [...m.entries()].map(([problema, v]) => ({ problema, ...v, total: v.sim + v.parcial + v.nao }))
      .sort((a, b) => (a.sim + a.parcial / 2) / a.total - (b.sim + b.parcial / 2) / b.total);
  }, [linhas]);

  const confirmadas = linhas.filter((l) => l.confirmada).length;
  const comAlerta = linhas.filter((l) => {
    const a = l.dados.auditoria;
    return !!a && a.inventados.length + a.nao_coletados.length + a.contradicoes.length > 0;
  }).length;

  if (lendo) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (linhas.length === 0) {
    return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Ainda não há SOAP corrigido nesta sala. Corrija ao menos um em “Notas do Admin” para ver o resumo da turma.</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {linhas.length} SOAP corrigido(s) pela IA, {confirmadas} com nota confirmada. {comAlerta > 0 ? `${comAlerta} com alertas na auditoria dos fatos.` : "Nenhum alerta na auditoria dos fatos."}
      </p>

      <Card>
        <CardHeader><CardTitle className="font-heading text-lg font-medium">Média da turma por critério</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {porCriterio.map((c) => (
            <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate" title={c.rotulo}>{c.rotulo}</p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={c.media == null ? "sem dados" : `média ${c.media.toFixed(1)} de 4`}>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${c.media == null ? 0 : (c.media / 4) * 100}%` }} />
                </div>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{c.media == null ? "n/a" : `${c.media.toFixed(1)}/4`}</span>
            </div>
          ))}
          <p className="pt-1 text-xs text-muted-foreground">Os critérios mais baixos são o melhor tema para a aula de fechamento. “n/a” = nenhum aluno com nota nesse critério.</p>
        </CardContent>
      </Card>

      {cobertura.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg font-medium">Problemas esperados do caso: quem identificou</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {cobertura.map((c) => (
              <div key={c.problema} className="text-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0">{c.problema}</p>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{c.sim} sim · {c.parcial} em parte · {c.nao} não</span>
                </div>
                <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${c.sim} identificaram, ${c.parcial} em parte, ${c.nao} não`}>
                  <div className="bg-primary" style={{ width: `${(c.sim / c.total) * 100}%` }} />
                  <div className="bg-primary/40" style={{ width: `${(c.parcial / c.total) * 100}%` }} />
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Ordenado do problema menos identificado para o mais identificado. Se o aluno não coletou a informação, a IA marca “não” e isso conta aqui, mas não tirou nota dele.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

