import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { FormField, getSections } from "./types";

interface FormRendererProps {
  fields: FormField[];
  answers: Record<string, any>;
  onChange: (answers: Record<string, any>) => void;
  readOnly?: boolean;
  showScores?: boolean;
  idPrefix?: string;
}

export default function FormRenderer({
  fields,
  answers,
  onChange,
  readOnly = false,
  showScores = false,
  idPrefix = "",
}: FormRendererProps) {
  const sections = getSections(fields);
  const hasSections = sections.some(s => s.header !== null);

  const renderField = (field: FormField) => {
    if (field.type === "section_header") return null;

    return (
      <div key={field.id} className="space-y-1.5">
        <Label className="font-medium">
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
          {showScores && field.max_score ? (
            <span className="text-muted-foreground ml-2 font-normal">({field.max_score} pts)</span>
          ) : null}
        </Label>

        {field.type === "text" && (
          <Input
            value={answers[field.id] || ""}
            onChange={(e) => onChange({ ...answers, [field.id]: e.target.value })}
            disabled={readOnly}
          />
        )}

        {field.type === "textarea" && (
          <Textarea
            value={answers[field.id] || ""}
            onChange={(e) => onChange({ ...answers, [field.id]: e.target.value })}
            disabled={readOnly}
            rows={4}
          />
        )}

        {field.type === "radio" && field.options && (
          <RadioGroup
            value={answers[field.id] || ""}
            onValueChange={(v) => onChange({ ...answers, [field.id]: v })}
            disabled={readOnly}
          >
            {field.options.map((opt) => (
              <div key={opt} className="flex items-center gap-2">
                <RadioGroupItem value={opt} id={`${idPrefix}${field.id}-${opt}`} />
                <Label htmlFor={`${idPrefix}${field.id}-${opt}`}>{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {field.type === "checkbox" && field.options && (
          <div className="space-y-2">
            {field.options.map((opt) => (
              <div key={opt} className="flex items-center gap-2">
                <Checkbox
                  id={`${idPrefix}${field.id}-${opt}`}
                  checked={(answers[field.id] || []).includes(opt)}
                  onCheckedChange={(checked) => {
                    const current = answers[field.id] || [];
                    onChange({
                      ...answers,
                      [field.id]: checked
                        ? [...current, opt]
                        : current.filter((v: string) => v !== opt),
                    });
                  }}
                  disabled={readOnly}
                />
                <Label htmlFor={`${idPrefix}${field.id}-${opt}`}>{opt}</Label>
              </div>
            ))}
          </div>
        )}

        {field.type === "scale" && (
          <div className="flex items-center gap-4">
            <Slider
              value={[answers[field.id] || 0]}
              onValueChange={([v]) => onChange({ ...answers, [field.id]: v })}
              max={field.max_score || 10}
              step={1}
              className="flex-1"
              disabled={readOnly}
            />
            <span className="font-mono text-sm w-12 text-right">
              {answers[field.id] || 0}/{field.max_score || 10}
            </span>
          </div>
        )}
      </div>
    );
  };

  if (!hasSections) {
    // Flat rendering (no sections)
    return (
      <div className="space-y-4">
        {fields.filter(f => f.type !== "section_header").map(renderField)}
      </div>
    );
  }

  // Sectioned rendering
  return (
    <div className="space-y-6">
      {sections.map((section, idx) => (
        <div key={section.header?.id || `section-${idx}`} className="space-y-4">
          {section.header && (
            <div className="border-l-4 border-l-primary bg-primary/5 rounded-lg p-4">
              {section.header.label && (
                <h3 className="text-lg font-semibold">{section.header.label}</h3>
              )}
              {section.header.description && (
                <p className="text-sm text-muted-foreground mt-1">{section.header.description}</p>
              )}
            </div>
          )}
          {section.fields.map(renderField)}
        </div>
      ))}
    </div>
  );
}
