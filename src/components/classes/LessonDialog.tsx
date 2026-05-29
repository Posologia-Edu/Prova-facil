import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LessonTemplateRenderer, TemplateSchema } from "./LessonTemplateRenderer";
import { RubricPicker } from "./RubricPicker";
import { SeminarRubric } from "@/lib/seminar-rubric";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export interface LessonTemplate {
  id: string;
  name: string;
  lesson_type: string;
  schema: TemplateSchema;
  is_system: boolean;
  user_id: string | null;
}

export interface LessonItem {
  id?: string;
  semester_id: string;
  lesson_date: string | null;
  title: string;
  lesson_type: string;
  template_id: string | null;
  template_data: Record<string, string>;
  notes: string | null;
  status: string;
  rubric_id?: string | null;
  rubric_json?: SeminarRubric | null;
}

const LESSON_TYPES = [
  { value: "theoretical", label: "Aula teórica" },
  { value: "practical", label: "Aula prática" },
  { value: "simulation", label: "Simulação" },
  { value: "seminar", label: "Seminário / Caso clínico" },
  { value: "assessment", label: "Avaliação / Prova" },
  { value: "other", label: "Outro / Livre" },
];
const STATUSES = [
  { value: "planned", label: "Planejada" },
  { value: "done", label: "Realizada" },
  { value: "cancelled", label: "Cancelada" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  semesterId: string;
  lesson?: LessonItem | null;
  onSaved: () => void;
}

export function LessonDialog({ open, onOpenChange, semesterId, lesson, onSaved }: Props) {
  const [templates, setTemplates] = useState<LessonTemplate[]>([]);
  const [form, setForm] = useState<LessonItem>({
    semester_id: semesterId,
    lesson_date: null,
    title: "",
    lesson_type: "theoretical",
    template_id: null,
    template_data: {},
    notes: "",
    status: "planned",
    rubric_id: null,
    rubric_json: null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("class_lesson_templates")
      .select("*")
      .order("is_system", { ascending: false })
      .order("name")
      .then(({ data }) => setTemplates((data as any) || []));

    if (lesson) {
      setForm({ ...lesson, semester_id: semesterId });
    } else {
      setForm({
        semester_id: semesterId,
        lesson_date: null,
        title: "",
        lesson_type: "theoretical",
        template_id: null,
        template_data: {},
        notes: "",
        status: "planned",
        rubric_id: null,
        rubric_json: null,
      });
    }
  }, [open, lesson, semesterId]);

  const filteredTemplates = templates.filter((t) => t.lesson_type === form.lesson_type);
  const activeTemplate = templates.find((t) => t.id === form.template_id);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Informe o título da aula");
      return;
    }
    setSaving(true);
    const payload = {
      semester_id: semesterId,
      lesson_date: form.lesson_date || null,
      title: form.title.trim(),
      lesson_type: form.lesson_type,
      template_id: form.template_id,
      template_data: form.template_data,
      notes: form.notes,
      status: form.status,
      rubric_id: form.rubric_id ?? null,
      rubric_json: (form.rubric_json ?? null) as any,
    };
    const { error } = lesson?.id
      ? await supabase.from("class_schedule_items").update(payload).eq("id", lesson.id)
      : await supabase.from("class_schedule_items").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar aula: " + error.message);
      return;
    }
    toast.success(lesson?.id ? "Aula atualizada" : "Aula criada");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lesson?.id ? "Editar aula" : "Nova aula"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input
                type="date"
                value={form.lesson_date ?? ""}
                onChange={(e) => setForm({ ...form, lesson_date: e.target.value || null })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Título da aula</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex.: Entendendo a dor e comorbidades"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de aula</Label>
              <Select
                value={form.lesson_type}
                onValueChange={(v) => setForm({ ...form, lesson_type: v, template_id: null, template_data: {} })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LESSON_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Template (opcional)</Label>
              <Select
                value={form.template_id ?? "__none__"}
                onValueChange={(v) =>
                  setForm({ ...form, template_id: v === "__none__" ? null : v, template_data: {} })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Sem template —</SelectItem>
                  {filteredTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}{t.is_system ? "" : " (meu)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {activeTemplate && (
            <LessonTemplateRenderer
              schema={activeTemplate.schema}
              value={form.template_data}
              onChange={(next) => setForm({ ...form, template_data: next })}
            />
          )}

          {(form.lesson_type === "seminar" || form.lesson_type === "assessment") && (
            <RubricPicker
              value={form.rubric_id ?? null}
              onChange={(id, json) => setForm({ ...form, rubric_id: id, rubric_json: json ?? form.rubric_json })}
              scope="seminar"
              label="Rubrica de avaliação (biblioteca)"
            />
          )}

          <div className="space-y-1.5">
            <Label>Anotações livres (markdown)</Label>
            <Textarea
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={5}
              placeholder="Observações pessoais, lembretes, links..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

