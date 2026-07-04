import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LessonTemplateRenderer, TemplateSchema } from "./LessonTemplateRenderer";
import { RubricPicker } from "./RubricPicker";
import { LessonVisitsEditor, LessonVisit } from "./LessonVisitsEditor";
import { fetchHolidaysFor, holidayMatchingDate } from "./HolidaysTab";
import { SeminarRubric } from "@/lib/seminar-rubric";
import { toast } from "sonner";
import { Loader2, CalendarOff, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WeeklySlot, slotsForDate, formatSlot, formatSlots,
} from "@/lib/class-schedule-notation";

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
  teacher_id?: string | null;
  time_slot?: string | null;
  is_holiday?: boolean;
  holiday_name?: string | null;
}

const LESSON_TYPES = [
  { value: "theoretical", label: "Aula teórica" },
  { value: "practical", label: "Aula prática" },
  { value: "simulation", label: "Simulação" },
  { value: "seminar", label: "Seminário / Caso clínico" },
  { value: "assessment", label: "Avaliação / Prova" },
  { value: "technical_visit", label: "Visita técnica" },
  { value: "holiday", label: "Feriado" },
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
  classId: string;
  semesterId: string;
  lesson?: LessonItem | null;
  onSaved: () => void;
}

export function LessonDialog({ open, onOpenChange, classId, semesterId, lesson, onSaved }: Props) {
  const [templates, setTemplates] = useState<LessonTemplate[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySlot[]>([]);
  const [holidayHit, setHolidayHit] = useState<{ name: string } | null>(null);
  const [visits, setVisits] = useState<LessonVisit[]>([]);
  const [extraSlots, setExtraSlots] = useState<Array<{ time_slot: string | null; teacher_id: string | null }>>([]);
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
    teacher_id: null,
    time_slot: null,
    is_holiday: false,
    holiday_name: null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from("class_lesson_templates").select("*").order("is_system", { ascending: false }).order("name")
      .then(({ data }) => setTemplates((data as any) || []));
    supabase.from("class_teachers").select("id,name").eq("class_id", classId).order("order_index")
      .then(({ data }) => setTeachers((data as any) || []));
    supabase.from("classes").select("weekly_schedule").eq("id", classId).single()
      .then(({ data }) => setWeeklySchedule(((data as any)?.weekly_schedule || []) as WeeklySlot[]));

    if (lesson) {
      setForm({ ...lesson, semester_id: semesterId });
      if (lesson.id) {
        supabase.from("class_lesson_visits").select("*").eq("lesson_id", lesson.id).order("order_index")
          .then(({ data }) => setVisits(((data as any) || []) as LessonVisit[]));
      } else {
        setVisits([]);
      }
      setExtraSlots([]);
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
        teacher_id: null,
        time_slot: null,
        is_holiday: false,
        holiday_name: null,
      });
      setVisits([]);
      setExtraSlots([]);
    }
  }, [open, lesson, semesterId, classId]);

  // Auto-detect holiday + auto-fill time slot when date changes
  useEffect(() => {
    if (!form.lesson_date) { setHolidayHit(null); return; }
    fetchHolidaysFor(classId).then((hs) => {
      const hit = holidayMatchingDate(hs as any, form.lesson_date!);
      setHolidayHit(hit ? { name: hit.name } : null);
    });
    // auto-fill time_slot from weekly schedule, only when not yet set or matches a previous slot for the previous day
    if (weeklySchedule.length && !form.time_slot && !lesson?.id) {
      const matches = slotsForDate(weeklySchedule, form.lesson_date);
      if (matches.length === 1) {
        setForm((f) => ({ ...f, time_slot: formatSlot(matches[0]) }));
      }
    }
    // eslint-disable-next-line
  }, [form.lesson_date, weeklySchedule, classId]);

  const filteredTemplates = templates.filter((t) => t.lesson_type === form.lesson_type);
  const activeTemplate = templates.find((t) => t.id === form.template_id);
  const daySlotOptions = form.lesson_date ? slotsForDate(weeklySchedule, form.lesson_date) : [];

  function applyHolidayPreset() {
    if (!holidayHit) return;
    setForm((f) => ({
      ...f,
      lesson_type: "holiday",
      is_holiday: true,
      holiday_name: holidayHit.name,
      title: `Feriado — ${holidayHit.name}`,
      status: "cancelled",
    }));
  }

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
      rubric_json: (form.rubric_json ?? {}) as any,
      teacher_id: form.teacher_id ?? null,
      time_slot: form.time_slot ?? null,
      is_holiday: form.lesson_type === "holiday" || !!form.is_holiday,
      holiday_name: form.lesson_type === "holiday" ? (form.holiday_name || form.title.replace(/^Feriado\s*[—-]\s*/, "")) : null,
    };
    let lessonId = lesson?.id;
    if (lessonId) {
      const { error } = await supabase.from("class_schedule_items").update(payload).eq("id", lessonId);
      if (error) { setSaving(false); toast.error("Erro ao salvar aula: " + error.message); return; }
    } else {
      const { data, error } = await supabase.from("class_schedule_items").insert(payload).select("id").single();
      if (error || !data) { setSaving(false); toast.error("Erro ao salvar aula: " + (error?.message || "")); return; }
      lessonId = data.id;
    }

    // Insert additional lesson entries (same date/title/type, different time_slot/teacher)
    if (!lesson?.id && extraSlots.length > 0 && !isHolidayMode) {
      const extraRows = extraSlots
        .filter((s) => s.time_slot || s.teacher_id)
        .map((s) => ({ ...payload, time_slot: s.time_slot ?? null, teacher_id: s.teacher_id ?? null }));
      if (extraRows.length > 0) {
        const { error: ee } = await supabase.from("class_schedule_items").insert(extraRows);
        if (ee) { setSaving(false); toast.error("Erro ao salvar entradas adicionais: " + ee.message); return; }
      }
    }



    // Sync visits
    if (lessonId) {
      // delete existing visits then re-insert (simplest)
      await supabase.from("class_lesson_visits").delete().eq("lesson_id", lessonId);
      if (visits.length > 0) {
        const rows = visits.map((v, idx) => ({
          lesson_id: lessonId!,
          teacher_id: v.teacher_id,
          title: v.title || `Visita ${idx + 1}`,
          location: v.location,
          notes: v.notes,
          student_ids: v.student_ids,
          order_index: idx,
          time_slot: v.time_slot ?? null,
          preceptor_name: v.preceptor_name ?? null,
          preceptor_phone: v.preceptor_phone ?? null,
          template_id: v.template_id ?? null,
        })) as any;
        const { error: ve } = await supabase.from("class_lesson_visits").insert(rows);
        if (ve) { setSaving(false); toast.error("Erro ao salvar visitas: " + ve.message); return; }
      }
    }

    setSaving(false);
    toast.success(lesson?.id ? "Aula atualizada" : "Aula criada");
    onSaved();
    onOpenChange(false);
  };

  const isVisitMode = form.lesson_type === "technical_visit";
  const isHolidayMode = form.lesson_type === "holiday";

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
              {holidayHit && !isHolidayMode && (
                <div className="flex items-center justify-between gap-2 mt-1 p-2 rounded bg-amber-50 border border-amber-200 text-xs">
                  <span className="flex items-center gap-1 text-amber-900">
                    <CalendarOff className="h-3 w-3" />Esta data é feriado: <b>{holidayHit.name}</b>
                  </span>
                  <Button type="button" size="sm" variant="outline" className="h-7" onClick={applyHolidayPreset}>
                    Marcar como feriado
                  </Button>
                </div>
              )}
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
              placeholder={isHolidayMode ? "Ex.: Feriado — Tiradentes" : "Ex.: Entendendo a dor e comorbidades"}
            />
          </div>

          <div className={cn("grid grid-cols-1 gap-3", isVisitMode ? "md:grid-cols-1" : "md:grid-cols-3")}>
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
              {isVisitMode && (
                <p className="text-[11px] text-muted-foreground">
                  Professor e horário são definidos em cada visita abaixo.
                </p>
              )}
            </div>
            {!isVisitMode && (
              <>
                <div className="space-y-1.5">
                  <Label>Professor responsável</Label>
                  <Select
                    value={form.teacher_id ?? "__none__"}
                    onValueChange={(v) => setForm({ ...form, teacher_id: v === "__none__" ? null : v })}
                    disabled={teachers.length === 0}
                  >
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Sem professor —</SelectItem>
                      {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {teachers.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Cadastre os professores na aba <b>Professores</b> para atribuí-los às aulas.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Horário (notação)</Label>
                  {daySlotOptions.length > 0 ? (
                    <Select
                      value={form.time_slot ?? "__custom__"}
                      onValueChange={(v) => setForm({ ...form, time_slot: v === "__custom__" ? form.time_slot : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {daySlotOptions.map((s) => {
                          const code = formatSlot(s);
                          return <SelectItem key={code} value={code}>{code}</SelectItem>;
                        })}
                        <SelectItem value="__custom__">Personalizado…</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={form.time_slot ?? ""}
                      onChange={(e) => setForm({ ...form, time_slot: e.target.value || null })}
                      placeholder="Ex.: 2T23"
                    />
                  )}
                  {weeklySchedule.length > 0 && (
                    <p className="text-[10px] text-muted-foreground font-mono">Grade: {formatSlots(weeklySchedule)}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {!isVisitMode && !isHolidayMode && (
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
          )}

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

          {isVisitMode && (
            <LessonVisitsEditor
              classId={classId}
              semesterId={semesterId}
              visits={visits}
              onChange={setVisits}
              weeklySchedule={weeklySchedule}
              lessonDate={form.lesson_date}
              defaultTimeSlot={form.time_slot}
            />
          )}

          {!lesson?.id && !isVisitMode && !isHolidayMode && (
            <div className="space-y-2 rounded-md border border-dashed p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Horários adicionais (mesma data)</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Crie várias entradas de uma vez (ex.: turma manhã e noite) sem reabrir o formulário.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => setExtraSlots((s) => [...s, { time_slot: null, teacher_id: form.teacher_id ?? null }])}
                >
                  <Plus className="h-3 w-3 mr-1" />Adicionar
                </Button>
              </div>
              {extraSlots.length > 0 && (
                <div className="space-y-2">
                  {extraSlots.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                      {daySlotOptions.length > 0 ? (
                        <Select
                          value={row.time_slot ?? "__custom__"}
                          onValueChange={(v) => setExtraSlots((s) => s.map((r, i) => i === idx ? { ...r, time_slot: v === "__custom__" ? r.time_slot : v } : r))}
                        >
                          <SelectTrigger className="h-9"><SelectValue placeholder="Horário" /></SelectTrigger>
                          <SelectContent>
                            {daySlotOptions.map((s) => {
                              const code = formatSlot(s);
                              return <SelectItem key={code} value={code}>{code}</SelectItem>;
                            })}
                            <SelectItem value="__custom__">Personalizado…</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          className="h-9"
                          value={row.time_slot ?? ""}
                          onChange={(e) => setExtraSlots((s) => s.map((r, i) => i === idx ? { ...r, time_slot: e.target.value || null } : r))}
                          placeholder="Horário (ex.: 6N234)"
                        />
                      )}
                      <Select
                        value={row.teacher_id ?? "__none__"}
                        onValueChange={(v) => setExtraSlots((s) => s.map((r, i) => i === idx ? { ...r, teacher_id: v === "__none__" ? null : v } : r))}
                      >
                        <SelectTrigger className="h-9"><SelectValue placeholder="Professor" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Sem professor —</SelectItem>
                          {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setExtraSlots((s) => s.filter((_, i) => i !== idx))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isHolidayMode && (
            <div className="space-y-1.5">
              <Label>Nome do feriado</Label>
              <Input
                value={form.holiday_name ?? ""}
                onChange={(e) => setForm({ ...form, holiday_name: e.target.value })}
                placeholder="Ex.: Tiradentes"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Anotações livres (markdown)</Label>
            <Textarea
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={4}
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
