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
  /** Correct answer for scoring — index for radio/dropdown, indices for checkbox, text for text/textarea, number for scale/rating */
  correct_answer?: string | number | number[];
  /** Per-option scores for radio/dropdown/checkbox. Maps option index → score value. Allows partial scoring. */
  option_scores?: Record<string, number>;
  /** Feedback shown when answer is correct */
  feedback_correct?: string;
  /** Feedback shown when answer is incorrect */
  feedback_incorrect?: string;
};

/** Compute the proportional score for a field given the answer value.
 * For scale/rating fields, the score is proportional to the position on the scale.
 * E.g., scale 1-4, answer=2, max_score=1 → score = (2/4)*1 = 0.5
 */
export function computeFieldScore(field: FormField, answerValue: any): number {
  if (!field.max_score || answerValue == null) return 0;

  // Handle radio/dropdown: compare selected option to correct_answer (option index)
  if (field.type === "radio" || field.type === "dropdown") {
    if (field.correct_answer != null && field.options) {
      const correctIdx = Number(field.correct_answer);
      const selectedIdx = field.options.indexOf(String(answerValue));
      return selectedIdx === correctIdx ? field.max_score : 0;
    }
    // Fallback: try numeric value
    const numVal = Number(answerValue) || 0;
    return Math.min(numVal, field.max_score);
  }

  // Handle checkbox: compare selected indices to correct_answer (array of indices)
  if (field.type === "checkbox") {
    if (field.correct_answer != null && Array.isArray(field.correct_answer) && field.options) {
      const correctIndices = new Set((field.correct_answer as number[]).map(Number));
      const selectedValues = Array.isArray(answerValue) ? answerValue : [answerValue];
      const selectedIndices = new Set(selectedValues.map((v: any) => field.options!.indexOf(String(v))).filter((i: number) => i >= 0));
      // All correct selected and no extras
      const isCorrect = correctIndices.size === selectedIndices.size && [...correctIndices].every(i => selectedIndices.has(i));
      return isCorrect ? field.max_score : 0;
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
