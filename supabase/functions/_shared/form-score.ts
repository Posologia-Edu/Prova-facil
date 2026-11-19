// Nota de um formulário calculada no servidor. Porte fiel de computeFormScore/computeFieldScore de src/components/forms/types.ts:
// quem avalia (observador, professor) não pode mandar a própria nota; o servidor a recalcula a partir das respostas.
// Se mudar a regra lá, mude aqui também.

const NA_ANSWER = "__na__";
const isNotApplicable = (v: unknown) => v === NA_ANSWER;

// deno-lint-ignore no-explicit-any
export function computeFieldScore(field: any, answerValue: any): number {
  if (!field.max_score || answerValue == null) return 0;

  if (field.type === "radio" || field.type === "dropdown") {
    if (field.options) {
      const selectedIdx = field.options.indexOf(String(answerValue));
      if (field.option_scores && selectedIdx >= 0) {
        const optScore = field.option_scores[String(selectedIdx)];
        if (optScore != null) return Math.min(optScore, field.max_score);
      }
      if (field.correct_answer != null) {
        const correctIdx = Number(field.correct_answer);
        return selectedIdx === correctIdx ? field.max_score : 0;
      }
    }
    const numVal = Number(answerValue) || 0;
    return Math.min(numVal, field.max_score);
  }

  if (field.type === "checkbox") {
    if (field.options) {
      const selectedValues = Array.isArray(answerValue) ? answerValue : [answerValue];
      const selectedIndices = selectedValues.map((v: unknown) => field.options.indexOf(String(v))).filter((i: number) => i >= 0);
      if (field.option_scores && Object.keys(field.option_scores).length > 0) {
        const total = selectedIndices.reduce((sum: number, idx: number) => {
          const optScore = field.option_scores[String(idx)];
          return sum + (optScore != null ? optScore : 0);
        }, 0);
        return Math.min(total, field.max_score);
      }
      if (field.correct_answer != null && Array.isArray(field.correct_answer)) {
        const correctSet = new Set((field.correct_answer as number[]).map(Number));
        const selectedSet = new Set(selectedIndices);
        const isCorrect = correctSet.size === selectedSet.size && [...correctSet].every((i) => selectedSet.has(i));
        return isCorrect ? field.max_score : 0;
      }
    }
    const numVal = Number(answerValue) || 0;
    return Math.min(numVal, field.max_score);
  }

  const value = Number(answerValue) || 0;

  if (field.type === "scale") {
    const scaleMax = field.scale_max || field.max_score || 10;
    if (scaleMax === 0) return 0;
    return (value / scaleMax) * field.max_score;
  }

  if (field.type === "rating") {
    const ratingMax = field.rating_max || 5;
    if (ratingMax === 0) return 0;
    return (value / ratingMax) * field.max_score;
  }

  return Math.min(value, field.max_score);
}

// deno-lint-ignore no-explicit-any
export function computeFormScore(fields: any[], answers: Record<string, any>): number {
  let earned = 0;
  let maxAll = 0;
  let maxApplicable = 0;
  let anyNa = false;
  for (const field of fields) {
    if (!field.max_score) continue;
    maxAll += field.max_score;
    if (field.allow_na && isNotApplicable(answers[field.id])) {
      anyNa = true;
      continue;
    }
    maxApplicable += field.max_score;
    if (answers[field.id]) earned += computeFieldScore(field, answers[field.id]);
  }
  if (!anyNa) return earned;
  if (maxApplicable === 0) return 0;
  return Math.round((earned / maxApplicable) * maxAll * 100) / 100;
}
