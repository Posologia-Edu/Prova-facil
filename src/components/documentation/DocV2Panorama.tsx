import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { criteriosAplicaveis } from "@/lib/doc-v2-rubrica";

type Props = {
  totalDuplas: number;
  respostas: { id: string; aconselhamento_concluido_at?: string | null }[];
  avaliacoes: { response_id: string; nota: number | null; confirmada: boolean; liberada: boolean; dados: any }[];
  revisoesEnviadas: number;
  usaPaciente: boolean;
};

/** Panorama da turma: andamento, média por critério (só notas confirmadas) e os riscos mais citados. Só o professor vê. */
export default function DocV2Panorama({ totalDuplas, respostas, avaliacoes, revisoesEnviadas, usaPaciente }: Props) {
  const confirmadas = avaliacoes.filter((a) => a.confirmada);
  const criterios = useMemo(() => criteriosAplicaveis(usaPaciente), [usaPaciente]);

  const medias = useMemo(() => criterios.map((c) => {
    const notas = confirmadas.map((a) => a.dados?.respostas?.[c.id]).filter((v) => typeof v === "number") as number[];
    return { c, n: notas.length, media: notas.length ? notas.reduce((s, x) => s + x, 0) / notas.length : null };
  }), [criterios, confirmadas]);

  const riscos = useMemo(() => {
    const cont = new Map<string, number>();
    for (const a of avaliacoes) for (const t of (a.dados?.alertas || []) as string[]) cont.set(t, (cont.get(t) || 0) + 1);
    return [...cont.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [avaliacoes]);

  const notas = confirmadas.map((a) => Number(a.nota)).filter((n) => Number.isFinite(n));
  const media = notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : null;
  const conselhos = respostas.filter((r) => r.aconselhamento_concluido_at).length;
  const fmt = (n: number) => n.toFixed(2).replace(".", ",");

  const contadores: [string, string][] = [
    ["Duplas", String(totalDuplas)],
    ["Enviaram", `${respostas.length}`],
    ...(usaPaciente ? [["Aconselhamento concluído", `${conselhos}`] as [string, string]] : []),
    ["Corrigidas (IA)", `${avaliacoes.length}`],
    ["Confirmadas", `${confirmadas.length}`],
    ["Liberadas", `${avaliacoes.filter((a) => a.liberada).length}`],
    ["Revisões enviadas", `${revisoesEnviadas}`],
    ["Média da rubrica", media == null ? "—" : fmt(media)],
  ];

  return (
    <Card>
      <CardHeader><CardTitle className="font-heading text-base font-medium">Panorama da turma</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {contadores.map(([k, v]) => <div key={k} className="rounded border p-2"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="text-lg font-medium">{v}</dd></div>)}
        </dl>
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Média por critério (notas confirmadas, de 0 a 4)</p>
          {confirmadas.length === 0 && <p className="text-xs text-muted-foreground">Ainda não há notas confirmadas.</p>}
          {confirmadas.length > 0 && medias.map(({ c, media: m, n }) => (
            <div key={c.id} className="space-y-0.5">
              <div className="flex justify-between gap-2 text-xs"><span className="min-w-0">{c.label}</span><span className="shrink-0 font-medium">{m == null ? "—" : m.toFixed(1).replace(".", ",")}{n ? ` (${n})` : ""}</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${m == null ? 0 : (m / 4) * 100}%` }} /></div>
            </div>
          ))}
        </div>
        {riscos.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Riscos para o paciente apontados pela IA</p>
            <ul className="list-disc pl-5 text-xs">{riscos.map(([t, n]) => <li key={t}>{t}{n > 1 ? ` (${n} duplas)` : ""}</li>)}</ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
