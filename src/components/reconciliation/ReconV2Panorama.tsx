import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROTULO_FONTE, type CasoV2 } from "@/lib/recon-v2";
import { computeFormScore, type FormField } from "@/components/forms/types";
import { RECON_V2_REVISAO, reconciliationV2PeerTemplate } from "@/lib/form-templates/pharmacy-reconciliation-v2";
import { RECON_V2_CRITERIOS, criticasEmRisco, type AvaliacaoReconV2 } from "@/lib/recon-v2-rubrica";

type Linha = { response_id: string; dados: AvaliacaoReconV2; confirmada: boolean };
type Resp = { id: string; clinical_case_id: string | null; fontes_json: { id: string }[] | null; submitted_at: string | null };
type Caso = { id: string; title: string; caso_json: CasoV2 | null };
type Revisao = { reviewer_pair: number; reviewed_pair: number; answers_json: Record<string, any>; submitted_at: string | null };

/** Resumo da turma na Reconciliação v2: média por critério, discrepâncias que a turma mais deixou passar e fontes que quase ninguém abriu. */
export default function ReconV2Panorama({ roomId }: { roomId: string }) {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [respostas, setRespostas] = useState<Resp[]>([]);
  const [casos, setCasos] = useState<Caso[]>([]);
  const [revisoes, setRevisoes] = useState<Revisao[]>([]);
  const [nomes, setNomes] = useState<Record<number, string>>({});
  const [camposRev, setCamposRev] = useState<FormField[]>(reconciliationV2PeerTemplate.content_json as FormField[]);
  const [lendo, setLendo] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const [av, rs, cs, rv, ps, fr] = await Promise.all([
        (supabase as any).from("reconciliation_v2_avaliacoes").select("response_id, dados, confirmada").eq("room_id", roomId),
        supabase.from("reconciliation_responses").select("id, clinical_case_id, fontes_json, submitted_at").eq("room_id", roomId),
        supabase.from("reconciliation_clinical_cases").select("id, title, caso_json").eq("room_id", roomId),
        (supabase as any).from("reconciliation_v2_revisoes").select("reviewer_pair, reviewed_pair, answers_json, submitted_at").eq("room_id", roomId),
        supabase.from("reconciliation_participants").select("pair_index, student_name").eq("room_id", roomId).eq("participant_role", "student"),
        supabase.from("reconciliation_forms").select("content_json").eq("room_id", roomId).eq("form_type", "peer_evaluation").limit(1).maybeSingle(),
      ]);
      if (!vivo) return;
      setLinhas(((av.data as any[]) || []).filter((l) => l.dados?.respostas));
      setRespostas(((rs.data as any[]) || []).filter((r) => r.submitted_at));
      setCasos(((cs.data as any[]) || []).filter((c) => c.caso_json));
      setRevisoes(((rv.data as any[]) || []).filter((r) => r.submitted_at));
      const nm: Record<number, string[]> = {};
      for (const p of (ps.data as any[]) || []) if (p.pair_index >= 0) (nm[p.pair_index] ||= []).push(p.student_name);
      setNomes(Object.fromEntries(Object.entries(nm).map(([k, v]) => [Number(k), v.join(" e ")])));
      if (Array.isArray((fr.data as any)?.content_json)) setCamposRev((fr.data as any).content_json);
      setLendo(false);
    })().catch(() => { if (vivo) setLendo(false); });
    return () => { vivo = false; };
  }, [roomId]);

  const porCriterio = useMemo(() => RECON_V2_CRITERIOS.map((c) => {
    const notas = linhas.map((l) => l.dados.respostas?.[c.id]).filter((v) => typeof v === "number") as number[];
    return { id: c.id, rotulo: c.label.split("?")[0], media: notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null };
  }), [linhas]);

  // Discrepâncias: agrupadas por caso e id. Ordenadas das menos identificadas para as mais.
  const discrepancias = useMemo(() => {
    const m = new Map<string, { caso: string; medicamento: string; critica: boolean; sim: number; parcial: number; nao: number; naoAbriu: number }>();
    for (const l of linhas) for (const d of l.dados.matriz || []) {
      const k = `${l.dados.caso_id}|${d.id}`;
      const a = m.get(k) || { caso: l.dados.caso_titulo || "", medicamento: d.medicamento, critica: d.critica, sim: 0, parcial: 0, nao: 0, naoAbriu: 0 };
      a[d.achou] += 1;
      if (d.achou !== "sim" && !d.fonte_aberta) a.naoAbriu += 1;
      m.set(k, a);
    }
    return [...m.values()].map((v) => ({ ...v, total: v.sim + v.parcial + v.nao }))
      .sort((a, b) => (a.sim + a.parcial / 2) / a.total - (b.sim + b.parcial / 2) / b.total);
  }, [linhas]);

  // Fontes: quantas duplas que receberam o caso abriram cada fonte.
  const fontes = useMemo(() => casos.flatMap((c) => {
    const duplas = respostas.filter((r) => r.clinical_case_id === c.id);
    if (!duplas.length) return [];
    return (c.caso_json?.fontes || []).map((f) => {
      const abriram = duplas.filter((r) => (r.fontes_json || []).some((x) => x.id === f.id)).length;
      return { caso: c.title, titulo: f.titulo, tipo: f.tipo, abriram, total: duplas.length };
    });
  }).sort((a, b) => a.abriram / a.total - b.abriram / b.total), [casos, respostas]);

  // Revisões cruzadas: nota de 0 a 10 de cada uma, pelo checklist da sala.
  const notaRevisao = (r: Revisao) => {
    const max = camposRev.reduce((s, c) => s + (c.type === "section_header" ? 0 : c.max_score || 0), 0);
    return max > 0 ? (computeFormScore(camposRev, r.answers_json || {}) / max) * 10 : null;
  };
  const nomeDupla = (i: number) => nomes[i] || `Dupla ${i + 1}`;
  const paresComResposta = new Set(respostas.map((r: any) => (r as any).pair_index)).size;
  const mediaRevisoes = (() => {
    const notas = revisoes.map(notaRevisao).filter((n): n is number => n != null);
    return notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
  })();

  const confirmadas = linhas.filter((l) => l.confirmada).length;
  const criticas = linhas.filter((l) => criticasEmRisco(l.dados.matriz).length > 0).length;

  if (lendo) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (linhas.length === 0 && revisoes.length === 0) {
    return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Ainda não há reconciliação corrigida nesta sala. Corrija ao menos uma em “Notas do Admin” para ver o resumo da turma.</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {linhas.length} resposta(s) corrigida(s) pela IA, {confirmadas} com nota confirmada.{" "}
        {criticas > 0 ? `${criticas} com discrepância crítica em risco.` : "Nenhuma com discrepância crítica em risco."}
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
          <p className="pt-1 text-xs text-muted-foreground">Os critérios mais baixos são o melhor tema para a aula de fechamento.</p>
        </CardContent>
      </Card>

      {discrepancias.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg font-medium">Discrepâncias: quem identificou</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {discrepancias.map((d, i) => (
              <div key={i} className="text-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0"><b>{d.medicamento}</b> {d.critica && <Badge variant="destructive" className="ml-1">crítica</Badge>} <span className="text-xs text-muted-foreground">{d.caso}</span></p>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{d.sim} sim · {d.parcial} em parte · {d.nao} não</span>
                </div>
                <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${d.sim} identificaram, ${d.parcial} em parte, ${d.nao} não`}>
                  <div className="bg-primary" style={{ width: `${(d.sim / d.total) * 100}%` }} />
                  <div className="bg-primary/40" style={{ width: `${(d.parcial / d.total) * 100}%` }} />
                </div>
                {d.naoAbriu > 0 && <p className="mt-0.5 text-xs text-muted-foreground">{d.naoAbriu} dupla(s) que não identificaram nem abriram a fonte que a revelava.</p>}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Ordenado da menos identificada para a mais identificada.</p>
          </CardContent>
        </Card>
      )}

      {revisoes.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg font-medium">Revisões cruzadas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{revisoes.length} revisão(ões) enviada(s){paresComResposta ? ` para ${paresComResposta} dupla(s) com resposta` : ""}. Média das notas: {mediaRevisoes == null ? "—" : `${mediaRevisoes.toFixed(1).replace(".", ",")}/10`}.</p>
            {revisoes.map((r, i) => {
              const n = notaRevisao(r);
              return (
                <div key={i} className="rounded-md border p-2.5 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p><b>{nomeDupla(r.reviewer_pair)}</b> revisou <b>{nomeDupla(r.reviewed_pair)}</b></p>
                    <span className="font-mono text-xs">{n == null ? "—" : `${n.toFixed(1).replace(".", ",")}/10`}</span>
                  </div>
                  <p className="mt-1"><span className="text-muted-foreground">Ficou muito bem:</span> {String(r.answers_json?.[RECON_V2_REVISAO.comentarioBem] || "—")}</p>
                  <p><span className="text-muted-foreground">Dúvida:</span> {String(r.answers_json?.[RECON_V2_REVISAO.comentarioDuvida] || "—")}</p>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground">A nota da revisão que uma dupla RECEBE entra com 20% na nota final dela. Dupla sem revisão recebida fica só com a rubrica.</p>
          </CardContent>
        </Card>
      )}

      {fontes.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg font-medium">Fontes abertas pelas duplas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {fontes.map((f, i) => (
              <div key={i} className="flex items-start justify-between gap-3 text-sm">
                <p className="min-w-0"><span className="mr-2 font-mono text-[0.7rem] uppercase text-primary">{ROTULO_FONTE[f.tipo]}</span>{f.titulo} <span className="text-xs text-muted-foreground">{f.caso}</span></p>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{f.abriram} de {f.total}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">As fontes que menos duplas abriram são as que mais escondem discrepâncias.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
