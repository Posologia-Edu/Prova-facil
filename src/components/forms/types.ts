export type FormFieldType =
  | "text"
  | "textarea"
  | "radio"
  | "checkbox"
  | "scale"
  | "dropdown"
  | "date"
  | "file_upload"
  | "rating"
  | "table"
  | "section_header"
  | "image_block"
  | "video_block";

export type FormField = {
  id: string;
  label: string;
  type: FormFieldType;
  description?: string;
  options?: string[];
  max_score?: number;
  required?: boolean;
  /** URL for image_block or video_block */
  media_url?: string;
  /** Max value for rating (default 5) */
  rating_max?: number;
  /** Scale range max (separate from points). For scale type, the slider goes 0..scale_max. Defaults to max_score for backward compat. */
  scale_max?: number;
  /** Scale labels */
  scale_min_label?: string;
  scale_max_label?: string;
  /** Tabela: cabeçalhos das colunas que o aluno preenche. */
  table_columns?: string[];
  /** Tabela: linhas em branco (padrão 3). Ignorado se houver table_row_labels. */
  table_rows?: number;
  /** Tabela: rótulos fixos das linhas (primeira coluna, não editável). O número de linhas passa a ser o de rótulos. */
  table_row_labels?: string[];
  /** Tabela: título da coluna dos rótulos fixos (ex.: "Parâmetro"). */
  table_row_header?: string;
  /** Correct answer for scoring — index for radio/dropdown, indices for checkbox, text for text/textarea, number for scale/rating */
  correct_answer?: string | number | number[];
  /** Per-option scores for radio/dropdown/checkbox. Maps option index → score value. Allows partial scoring. */
  option_scores?: Record<string, number>;
  /** Feedback shown when answer is correct */
  feedback_correct?: string;
  /** Feedback shown when answer is incorrect */
  feedback_incorrect?: string;
  /** Mostra "Não se aplica" ao responder: o item sai da conta e a nota é recalculada sobre o que se aplicava. */
  allow_na?: boolean;
};

/** Valor gravado na resposta de um campo marcado como "Não se aplica". */
export const NA_ANSWER = "__na__";

export function isNotApplicable(answerValue: any): boolean {
  return answerValue === NA_ANSWER;
}

/**
 * Nota total do formulário. Os campos marcados "Não se aplica" saem da conta e a nota é recalculada sobre o total do
 * que se aplicava (ex.: 6 de 9 pontos aplicáveis num formulário de 10 vale 6,67). Sem nenhum "Não se aplica", é a soma simples.
 */
export function computeFormScore(fields: FormField[], answers: Record<string, any>): number {
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

/** Compute the proportional score for a field given the answer value.
 * For scale/rating fields, the score is proportional to the position on the scale.
 * E.g., scale 1-4, answer=2, max_score=1 → score = (2/4)*1 = 0.5
 */
export function computeFieldScore(field: FormField, answerValue: any): number {
  if (!field.max_score || answerValue == null) return 0;

  // Handle radio/dropdown: use per-option scores if available, else binary correct/incorrect
  if (field.type === "radio" || field.type === "dropdown") {
    if (field.options) {
      const selectedIdx = field.options.indexOf(String(answerValue));
      // Per-option scores take priority
      if (field.option_scores && selectedIdx >= 0) {
        const optScore = field.option_scores[String(selectedIdx)];
        if (optScore != null) return Math.min(optScore, field.max_score);
      }
      // Fallback to binary correct_answer
      if (field.correct_answer != null) {
        const correctIdx = Number(field.correct_answer);
        return selectedIdx === correctIdx ? field.max_score : 0;
      }
    }
    const numVal = Number(answerValue) || 0;
    return Math.min(numVal, field.max_score);
  }

  // Handle checkbox: use per-option scores if available (sum selected), else binary
  if (field.type === "checkbox") {
    if (field.options) {
      const selectedValues = Array.isArray(answerValue) ? answerValue : [answerValue];
      const selectedIndices = selectedValues.map((v: any) => field.options!.indexOf(String(v))).filter((i: number) => i >= 0);
      // Per-option scores: sum the scores of selected options
      if (field.option_scores && Object.keys(field.option_scores).length > 0) {
        const total = selectedIndices.reduce((sum: number, idx: number) => {
          const optScore = field.option_scores![String(idx)];
          return sum + (optScore != null ? optScore : 0);
        }, 0);
        return Math.min(total, field.max_score);
      }
      // Fallback to binary
      if (field.correct_answer != null && Array.isArray(field.correct_answer)) {
        const correctSet = new Set((field.correct_answer as number[]).map(Number));
        const selectedSet = new Set(selectedIndices);
        const isCorrect = correctSet.size === selectedSet.size && [...correctSet].every(i => selectedSet.has(i));
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

  // For other field types, the raw value is the score (capped at max)
  return Math.min(value, field.max_score);
}

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: "Resposta curta",
  textarea: "Parágrafo",
  radio: "Múltipla escolha",
  checkbox: "Caixas de seleção",
  dropdown: "Lista suspensa",
  scale: "Escala linear",
  rating: "Classificação",
  date: "Data",
  file_upload: "Upload de arquivo",
  table: "Tabela",
  section_header: "Cabeçalho de seção",
  image_block: "Imagem",
  video_block: "Vídeo",
};

/** Helper to get sections from a flat field list. Each section starts at a section_header (or index 0 if no header). */
export function getSections(fields: FormField[]): { header: FormField | null; fields: FormField[]; startIndex: number }[] {
  const sections: { header: FormField | null; fields: FormField[]; startIndex: number }[] = [];
  let current: { header: FormField | null; fields: FormField[]; startIndex: number } | null = null;

  fields.forEach((field, index) => {
    if (field.type === "section_header") {
      if (current) sections.push(current);
      current = { header: field, fields: [], startIndex: index };
    } else {
      if (!current) current = { header: null, fields: [], startIndex: index };
      current.fields.push(field);
    }
  });

  if (current) sections.push(current);
  if (sections.length === 0) sections.push({ header: null, fields: [], startIndex: 0 });

  return sections;
}

/** Tabela: colunas efetivas (nunca vazio) e número de linhas. A resposta é uma matriz de texto linhas x colunas. */
export function tableColumns(field: FormField): string[] {
  return field.table_columns && field.table_columns.length > 0 ? field.table_columns : ["Coluna 1", "Coluna 2"];
}
export function tableRowCount(field: FormField): number {
  if (field.table_row_labels && field.table_row_labels.length > 0) return field.table_row_labels.length;
  return Math.max(1, Math.min(30, field.table_rows || 3));
}
