// Shared between the peer-eval submission page, the student feedback page,
// and the teacher analytics dialog — keeps the scoring formula in one place.

export interface PeerEvalCriterion {
  key: "participacao_score" | "contribuicao_score" | "colaboracao_score";
  label: string;
  description: string;
}

export const PEER_EVAL_CRITERIA: PeerEvalCriterion[] = [
  {
    key: "participacao_score",
    label: "Participação ativa",
    description: "Fez perguntas relevantes e se engajou na anamnese.",
  },
  {
    key: "contribuicao_score",
    label: "Contribuição técnica",
    description: "Contribuiu com o raciocínio farmacoterapêutico e o MAI.",
  },
  {
    key: "colaboracao_score",
    label: "Colaboração em equipe",
    description: "Colaborou de forma respeitosa e ativa com o grupo.",
  },
];

// Peer evaluation adjusts, but never dominates, the shared AI-graded score.
export const PEER_EVAL_MAX_ADJUST = 1.0;

export interface PeerEvaluationScores {
  participacao_score: number;
  contribuicao_score: number;
  colaboracao_score: number;
}

/** Mean (0-5) across all evaluators who rated this student, or null if none. */
export function computePeerMean(evaluations: PeerEvaluationScores[]): number | null {
  if (!evaluations.length) return null;
  const perEvaluatorMean = evaluations.map(
    (e) => (e.participacao_score + e.contribuicao_score + e.colaboracao_score) / 3,
  );
  return perEvaluatorMean.reduce((a, b) => a + b, 0) / perEvaluatorMean.length;
}

/** Maps the 0-5 peer mean to a +/-PEER_EVAL_MAX_ADJUST bonus, centered at 2.5. */
export function computePeerBonus(evaluations: PeerEvaluationScores[]): number {
  const mean = computePeerMean(evaluations);
  if (mean == null) return 0;
  const raw = ((mean - 2.5) / 2.5) * PEER_EVAL_MAX_ADJUST;
  return Math.max(-PEER_EVAL_MAX_ADJUST, Math.min(PEER_EVAL_MAX_ADJUST, raw));
}
