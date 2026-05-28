import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Star, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { FormField, getSections } from "./types";
import HandwritingInput from "./HandwritingInput";

function CopyTextButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    if (!text) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast({ title: "Texto copiado!", description: "O conteúdo do campo foi copiado para a área de transferência." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Erro", description: "Não foi possível copiar. Selecione manualmente.", variant: "destructive" });
    }
  };
  return (
    <Button type="button" variant="outline" size="sm" onClick={handle} disabled={!text} className="gap-1.5 h-8">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span className="text-xs">{copied ? "Copiado" : "Copiar texto"}</span>
    </Button>
  );
}

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

    // Image block
    if (field.type === "image_block") {
      if (!field.media_url) return null;
      return (
        <div key={field.id} className="rounded-lg overflow-hidden">
          <img src={field.media_url} alt={field.label || "Imagem"} className="w-full max-h-96 object-contain" />
        </div>
      );
    }

    // Video block
    if (field.type === "video_block") {
      if (!field.media_url) return null;
      return (
        <div key={field.id} className="aspect-video rounded-lg overflow-hidden bg-muted">
          <iframe src={field.media_url} className="w-full h-full" allowFullScreen title={field.label || "Vídeo"} />
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-1.5">
        <Label className="font-medium">
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
          {showScores && field.max_score ? (
            <span className="text-muted-foreground ml-2 font-normal">({field.max_score} pts)</span>
          ) : null}
        </Label>
        {field.description && (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        )}

        {field.type === "text" && (
          <div className="space-y-1.5">
            <Input
              value={answers[field.id] || ""}
              onChange={(e) => onChange({ ...answers, [field.id]: e.target.value })}
              disabled={readOnly}
            />
            {!readOnly && (
              <HandwritingInput
                context={field.label}
                currentValue={answers[field.id] || ""}
                appendMode={false}
                onTranscribe={(text) => onChange({ ...answers, [field.id]: text })}
              />
            )}
          </div>
        )}

        {field.type === "textarea" && (
          <div className="space-y-1.5">
            <Textarea
              value={answers[field.id] || ""}
              onChange={(e) => onChange({ ...answers, [field.id]: e.target.value })}
              disabled={readOnly}
              rows={4}
            />
            {!readOnly && (
              <HandwritingInput
                context={field.label}
                currentValue={answers[field.id] || ""}
                appendMode
                onTranscribe={(text) => onChange({ ...answers, [field.id]: text })}
              />
            )}
          </div>
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

        {field.type === "dropdown" && field.options && (
          <Select
            value={answers[field.id] || ""}
            onValueChange={(v) => onChange({ ...answers, [field.id]: v })}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma opção" />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {field.type === "scale" && (() => {
          const scaleMax = field.scale_max || field.max_score || 10;
          return (
            <div className="space-y-1">
              {(field.scale_min_label || field.scale_max_label) && (
                <div className="flex justify-between text-xs text-muted-foreground px-1">
                  <span>{field.scale_min_label || ""}</span>
                  <span>{field.scale_max_label || ""}</span>
                </div>
              )}
              <div className="flex items-center gap-4">
                <Slider
                  value={[answers[field.id] || 0]}
                  onValueChange={([v]) => onChange({ ...answers, [field.id]: v })}
                  max={scaleMax}
                  step={1}
                  className="flex-1"
                  disabled={readOnly}
                />
                <span className="font-mono text-sm w-12 text-right">
                  {answers[field.id] || 0}/{scaleMax}
                </span>
              </div>
            </div>
          );
        })()}

        {field.type === "rating" && (
          <div className="flex gap-1">
            {Array.from({ length: field.rating_max || 5 }, (_, i) => (
              <button
                key={i}
                type="button"
                disabled={readOnly}
                onClick={() => onChange({ ...answers, [field.id]: i + 1 })}
                className="p-0.5 transition-colors"
              >
                <Star
                  className={`h-6 w-6 ${(answers[field.id] || 0) > i ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`}
                />
              </button>
            ))}
          </div>
        )}

        {field.type === "date" && (
          <Input
            type="date"
            value={answers[field.id] || ""}
            onChange={(e) => onChange({ ...answers, [field.id]: e.target.value })}
            disabled={readOnly}
          />
        )}

        {field.type === "file_upload" && (
          <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground text-sm">
            {readOnly ? (
              answers[field.id] ? <span>Arquivo enviado</span> : <span>Nenhum arquivo</span>
            ) : (
              <Input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onChange({ ...answers, [field.id]: file.name });
                }}
                className="border-none"
              />
            )}
          </div>
        )}
      </div>
    );
  };

  if (!hasSections) {
    return (
      <div className="space-y-4">
        {fields.filter(f => f.type !== "section_header").map(renderField)}
      </div>
    );
  }

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
