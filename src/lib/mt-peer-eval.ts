// Peer evaluation for Júri Simulado (mock trial) — mirrors src/lib/vp-peer-eval.ts,
// but criteria are keyed by (case, group) and "atuação" wording adapts per role,
// since prosecution/defense (advocacy) and jury (deliberation) do very different things.

export type MtRole = "prosecution" | "defense" | "jury";

export const MT_ROLE_LABELS: Record<MtRole, string> = {
  prosecution: "Acusação",
  defense: "Defesa",
  jury: "Júri Técnico",
};

export interface MtPeerEvalCriterion {
  key: "preparacao_score" | "atuacao_score" | "colaboracao_score";
  label: string;
  description: string;
}

export function getMtPeerEvalCriteria(role: string): MtPeerEvalCriterion[] {
  const atuacaoDescription =
    role === "jury"
      ? "Qualidade das perguntas feitas e imparcialidade no julgamento."
      : "Qualidade da argumentação e atuação durante o julgamento.";
  return [
    {
      key: "preparacao_score",
      label: "Preparação e estudo do caso",
      description: "Participou das reuniões e contribuiu na construção dos argumentos/perguntas antes do julgamento.",
    },
    {
      key: "atuacao_score",
      label: "Atuação no julgamento",
      description: atuacaoDescription,
    },
    {
      key: "colaboracao_score",
      label: "Colaboração em equipe",
      description: "Postura respeitosa e colaborativa do início ao fim.",
    },
  ];
}

// Same cap/formula as Paciente Virtual — adjusts, never dominates, the group's grade.
export const MT_PEER_EVAL_MAX_ADJUST = 1.0;

export interface MtPeerEvaluationScores {
  preparacao_score: number;
  atuacao_score: number;
  colaboracao_score: number;
}

export function computeMtPeerMean(evaluations: MtPeerEvaluationScores[]): number | null {
  if (!evaluations.length) return null;
  const perEvaluatorMean = evaluations.map(
    (e) => (e.preparacao_score + e.atuacao_score + e.colaboracao_score) / 3,
  );
  return perEvaluatorMean.reduce((a, b) => a + b, 0) / perEvaluatorMean.length;
}

export function computeMtPeerBonus(evaluations: MtPeerEvaluationScores[]): number {
  const mean = computeMtPeerMean(evaluations);
  if (mean == null) return 0;
  const raw = ((mean - 2.5) / 2.5) * MT_PEER_EVAL_MAX_ADJUST;
  return Math.max(-MT_PEER_EVAL_MAX_ADJUST, Math.min(MT_PEER_EVAL_MAX_ADJUST, raw));
}
