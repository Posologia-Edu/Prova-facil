export type FormFieldType = "text" | "textarea" | "radio" | "checkbox" | "scale" | "section_header";

export type FormField = {
  id: string;
  label: string;
  type: FormFieldType;
  description?: string;
  options?: string[];
  max_score?: number;
  required?: boolean;
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
