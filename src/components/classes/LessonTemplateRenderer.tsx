import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export interface TemplateField {
  id: string;
  label: string;
  type: "text" | "textarea" | "date" | "list";
  placeholder?: string;
}
export interface TemplateSection {
  id: string;
  label: string;
  fields: TemplateField[];
}
export interface TemplateSchema {
  sections: TemplateSection[];
}

interface Props {
  schema: TemplateSchema;
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  readOnly?: boolean;
}

export function LessonTemplateRenderer({ schema, value, onChange, readOnly }: Props) {
  const set = (k: string, v: string) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-6">
      {schema.sections?.map((section) => (
        <div key={section.id} className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
            {section.label}
          </h3>
          <div className="space-y-3">
            {section.fields.map((field) => {
              const v = value?.[field.id] ?? "";
              const common = {
                id: field.id,
                value: v,
                placeholder: field.placeholder,
                disabled: readOnly,
                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  set(field.id, e.target.value),
              };
              return (
                <div key={field.id} className="space-y-1.5">
                  <Label htmlFor={field.id}>{field.label}</Label>
                  {field.type === "textarea" || field.type === "list" ? (
                    <Textarea {...common} rows={4} />
                  ) : (
                    <Input type={field.type === "date" ? "date" : "text"} {...common} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
