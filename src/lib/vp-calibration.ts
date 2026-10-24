// P16: calibração entre a nota da IA e o ajuste do docente (Pacientes Virtuais).
// Funções puras, sem acesso ao banco, para a tela de análise e o painel de calibração.

export const GRADE_SNAPSHOT_FIELDS = [
  "subscores",
  "bonus_penalidades",
  "nota_final",
  "nota_microlearning",
  "feedback_resumido",
  "orientacoes_melhoria",
  "flags_seguranca",
  "grading_model",
  "rubric_version",
] as const;

/** Colunas lidas do banco para montar o instantâneo da nota da IA (use em .select()). */
export const GRADE_SNAPSHOT_SELECT = GRADE_SNAPSHOT_FIELDS.join(", ");

export const ADJUSTMENT_REASONS: Array<{ value: string; label: string }> = [
  { value: "ia_rigorosa", label: "A IA foi rigorosa demais" },
  { value: "ia_benevolente", label: "A IA foi benevolente demais" },
  { value: "ia_errou_fato", label: "A IA errou um fato da conversa" },
  { value: "outro", label: "Outro motivo" },
];

export const reasonLabel = (value: string | null | undefined): string =>
  ADJUSTMENT_REASONS.find((r) => r.value === value)?.label ?? (value || "—");

/** Instantâneo dos campos que o ajuste do docente pode alterar. */
export function pickSnapshot(row: Record<string, any> | null | undefined): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of GRADE_SNAPSHOT_FIELDS) out[k] = row?.[k] ?? null;
  return out;
}

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Diferença docente − IA por dimensão (só as dimensões presentes em alguma das duas notas). */
export function subscoreDeltas(
  ia: Record<string, any> | null | undefined,
  docente: Record<string, any> | null | undefined,
): Record<string, number> {
  const keys = new Set([...Object.keys(ia || {}), ...Object.keys(docente || {})]);
  const out: Record<string, number> = {};
  keys.forEach((k) => {
    out[k] = Math.round((num(docente?.[k]) - num(ia?.[k])) * 100) / 100;
  });
  return out;
}

export interface AdjustedGradeLike {
  group_id?: string | null;
  session_id: string;
  nota_final: number | null;
  subscores: any;
  adjusted_at?: string | null;
  adjustment_reason?: string | null;
  ia_original?: Record<string, any> | null;
}

export interface CalibrationRow {
  key: string;
  iaNota: number;
  docenteNota: number;
  delta: number;
  deltas: Record<string, number>;
  reason: string | null;
  model: string;
  rubric: string;
}

/** Notas ajustadas com o original da IA, contando cada grupo uma vez (os integrantes compartilham a mesma nota). */
export function calibrationRows(grades: AdjustedGradeLike[]): CalibrationRow[] {
  const seen = new Set<string>();
  const rows: CalibrationRow[] = [];
  for (const g of grades) {
    if (!g.adjusted_at || !g.ia_original) continue;
    const key = g.group_id || g.session_id;
    if (seen.has(key)) continue;
    seen.add(key);
    const iaNota = num(g.ia_original.nota_final);
    const docenteNota = num(g.nota_final);
    rows.push({
      key,
      iaNota,
      docenteNota,
      delta: Math.round((docenteNota - iaNota) * 100) / 100,
      deltas: subscoreDeltas(g.ia_original.subscores, g.subscores),
      reason: g.adjustment_reason ?? null,
      model: g.ia_original.grading_model || "—",
      rubric: g.ia_original.rubric_version || "—",
    });
  }
  return rows;
}

const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 100) / 100 : 0);

export function calibrationSummary(rows: CalibrationRow[]) {
  const dimKeys = new Set<string>();
  rows.forEach((r) => Object.keys(r.deltas).forEach((k) => dimKeys.add(k)));
  const byDimension: Record<string, number> = {};
  dimKeys.forEach((k) => { byDimension[k] = mean(rows.map((r) => r.deltas[k] ?? 0)); });

  const byVersion = new Map<string, number[]>();
  rows.forEach((r) => {
    const label = `${r.model} · ${r.rubric}`;
    byVersion.set(label, [...(byVersion.get(label) || []), r.delta]);
  });

  return {
    n: rows.length,
    meanDelta: mean(rows.map((r) => r.delta)),
    byDimension,
    byVersion: Array.from(byVersion.entries()).map(([label, ds]) => ({ label, n: ds.length, meanDelta: mean(ds) })),
  };
}
