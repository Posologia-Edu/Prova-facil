export type CriterionType = "checkbox" | "stars";

export interface RubricCriterion {
  id: string;
  label: string;
  type: CriterionType;
  /** for stars: max stars (default 3); for checkbox: ignored */
  max?: number;
}

export interface RubricDimension {
  id: string;
  label: string;
  /** relative weight (sum of weights normalizes the final score) */
  weight: number;
  icon?: string;
  criteria: RubricCriterion[];
}

export interface SeminarRubric {
  dimensions: RubricDimension[];
  /** final scale, default 10 */
  scale?: number;
}

export const DEFAULT_SEMINAR_RUBRIC: SeminarRubric = {
  scale: 10,
  dimensions: [
    {
      id: "presence",
      label: "Presença nos casos clínicos",
      icon: "calendar",
      weight: 10,
      criteria: [
        { id: "p1", label: "Presença (dia 1)", type: "checkbox" },
        { id: "p2", label: "Presença (dia 2)", type: "checkbox" },
        { id: "p3", label: "Presença (dia 3)", type: "checkbox" },
      ],
    },
    {
      id: "organization",
      label: "Organização das informações",
      icon: "lightbulb",
      weight: 25,
      criteria: [
        { id: "o1", label: "Apresentou lista de problemas do paciente", type: "stars", max: 3 },
        { id: "o2", label: "Apresentou o MAI do paciente", type: "stars", max: 3 },
        { id: "o3", label: "Apresentou os dados básicos do paciente", type: "stars", max: 3 },
        { id: "o4", label: "Apresentou os exames do paciente", type: "stars", max: 3 },
        { id: "o5", label: "Plano terapêutico do paciente", type: "stars", max: 3 },
        { id: "o6", label: "Parâmetros de monitorização do paciente", type: "stars", max: 3 },
      ],
    },
    {
      id: "presentation",
      label: "Apresentação do caso clínico",
      icon: "presentation",
      weight: 25,
      criteria: [
        { id: "a1", label: "Qualidade dos slides", type: "stars", max: 3 },
        { id: "a2", label: "Despertar e manter o interesse", type: "stars", max: 3 },
        { id: "a3", label: "Dicção e entonação de voz adequados", type: "stars", max: 3 },
        { id: "a4", label: "Motivação e desembaraço", type: "stars", max: 3 },
        { id: "a5", label: "Capacidade de transmissão e conteúdo", type: "stars", max: 3 },
      ],
    },
    {
      id: "answers",
      label: "Respostas aos questionamentos",
      icon: "messages",
      weight: 20,
      criteria: [
        { id: "r1", label: "Informação precisa nas respostas", type: "stars", max: 3 },
        { id: "r2", label: "Capacidade de integrar informações", type: "stars", max: 3 },
      ],
    },
    {
      id: "grade",
      label: "Nota da apresentação",
      icon: "award",
      weight: 20,
      criteria: [
        { id: "g1", label: "Domínio do conteúdo", type: "stars", max: 3 },
        { id: "g2", label: "Clareza e organização geral", type: "stars", max: 3 },
      ],
    },
  ],
};

export type RubricAnswers = Record<string, number>;

export interface ScoreResult {
  perDimension: { id: string; label: string; earned: number; max: number; percent: number; weighted: number }[];
  totalPercent: number;
  finalScore: number;
  scale: number;
}

export function scoreRubric(rubric: SeminarRubric, answers: RubricAnswers): ScoreResult {
  const scale = rubric.scale ?? 10;
  const totalWeight = rubric.dimensions.reduce((s, d) => s + (d.weight || 0), 0) || 1;
  const perDimension = rubric.dimensions.map((d) => {
    let earned = 0;
    let max = 0;
    for (const c of d.criteria) {
      const m = c.type === "checkbox" ? 1 : c.max ?? 3;
      const v = Math.max(0, Math.min(answers[c.id] ?? 0, m));
      earned += v;
      max += m;
    }
    const percent = max > 0 ? (earned / max) * 100 : 0;
    const weighted = (percent * (d.weight || 0)) / totalWeight;
    return { id: d.id, label: d.label, earned, max, percent, weighted };
  });
  const totalPercent = perDimension.reduce((s, x) => s + x.weighted, 0);
  const finalScore = (totalPercent / 100) * scale;
  return { perDimension, totalPercent, finalScore, scale };
}
