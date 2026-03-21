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
  /** Scale labels */
  scale_min_label?: string;
  scale_max_label?: string;
  /** Correct answer for scoring — index for radio/dropdown, indices for checkbox, text for text/textarea, number for scale/rating */
  correct_answer?: string | number | number[];
  /** Feedback shown when answer is correct */
  feedback_correct?: string;
  /** Feedback shown when answer is incorrect */
  feedback_incorrect?: string;
};

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
