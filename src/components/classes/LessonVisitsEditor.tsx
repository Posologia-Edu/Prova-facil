import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, MapPin, Users as UsersIcon, Clock, User, Phone, BookMarked, Settings2 } from "lucide-react";
import { WeeklySlot, slotsForDate, formatSlot } from "@/lib/class-schedule-notation";
import { VisitTemplateManager, VisitTemplate } from "./VisitTemplateManager";

export interface LessonVisit {
  id?: string;
  lesson_id?: string;
  teacher_id: string | null;
  title: string;
  location: string | null;
  notes: string | null;
  student_ids: string[];
  order_index: number;
  time_slot?: string | null;
  preceptor_name?: string | null;
  preceptor_phone?: string | null;
  template_id?: string | null;
}

interface Teacher { id: string; name: string; }
interface Student { id: string; student_name: string; }

interface Props {
  classId: string;
  semesterId: string;
  visits: LessonVisit[];
  onChange: (v: LessonVisit[]) => void;
  weeklySchedule?: WeeklySlot[];
  lessonDate?: string | null;
  defaultTimeSlot?: string | null;
}

export function LessonVisitsEditor({ classId, semesterId, visits, onChange, weeklySchedule = [], lessonDate = null, defaultTimeSlot = null }: Props) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [templates, setTemplates] = useState<VisitTemplate[]>([]);
  const [managerOpen, setManagerOpen] = useState(false);

  async function loadTemplates() {
    const { data } = await supabase.from("class_visit_templates" as any).select("*").eq("class_id", classId).order("title");
    setTemplates(((data as any) || []).map((x: any) => ({ ...x, default_student_ids: x.default_student_ids || [] })));
  }

  useEffect(() => {
    supabase.from("class_teachers").select("id,name").eq("class_id", classId).order("order_index")
      .then(({ data }) => setTeachers((data as any) || []));
    supabase.from("class_students").select("id,student_name").eq("semester_id", semesterId).order("student_name")
      .then(({ data }) => setStudents((data as any) || []));
    loadTemplates();
  }, [classId, semesterId]);

  const daySlotOptions = lessonDate ? slotsForDate(weeklySchedule, lessonDate) : [];

  function add() {
    onChange([
      ...visits,
      { teacher_id: null, title: "", location: null, notes: null, student_ids: [], order_index: visits.length, time_slot: defaultTimeSlot ?? null, preceptor_name: null, preceptor_phone: null, template_id: null },
    ]);
  }
  function update(i: number, patch: Partial<LessonVisit>) {
    onChange(visits.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }
  function remove(i: number) {
    onChange(visits.filter((_, idx) => idx !== i));
  }
  function toggleStudent(i: number, studentId: string) {
    const cur = visits[i].student_ids;
    update(i, {
      student_ids: cur.includes(studentId) ? cur.filter((x) => x !== studentId) : [...cur, studentId],
    });
  }
  function applyTemplate(i: number, templateId: string) {
    if (templateId === "__none__") {
      update(i, { template_id: null });
      return;
    }
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    update(i, {
      template_id: t.id,
      title: t.title,
      location: t.location,
      preceptor_name: t.preceptor_name,
      preceptor_phone: t.preceptor_phone,
      notes: t.notes,
      student_ids: [...(t.default_student_ids || [])],
    });
  }
  function addFromTemplate(templateId: string) {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    onChange([
      ...visits,
      {
        teacher_id: null,
        title: t.title,
        location: t.location,
        notes: t.notes,
        student_ids: [...(t.default_student_ids || [])],
        order_index: visits.length,
        time_slot: defaultTimeSlot ?? null,
        preceptor_name: t.preceptor_name,
        preceptor_phone: t.preceptor_phone,
        template_id: t.id,
      },
    ]);
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-semibold">Visitas técnicas paralelas</h4>
            <p className="text-xs text-muted-foreground">
              Vários professores no mesmo horário — ou em turnos diferentes na mesma data — cada um com um grupo diferente de alunos.
              Use o catálogo para cadastrar cada local uma única vez e apenas selecioná-lo nas datas em que ele ocorrer.
            </p>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <Button size="sm" variant="outline" onClick={() => setManagerOpen(true)}>
              <Settings2 className="h-4 w-4 mr-1" />Catálogo
            </Button>
            <Button size="sm" variant="outline" onClick={add}>
              <Plus className="h-4 w-4 mr-1" />Vazia
            </Button>
          </div>
        </div>

        {templates.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap p-2 rounded-md bg-muted/40 border border-dashed">
            <BookMarked className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Adicionar do catálogo:</span>
            <Select value="__pick__" onValueChange={(val) => { if (val !== "__pick__") addFromTemplate(val); }}>
              <SelectTrigger className="h-8 w-64"><SelectValue placeholder="Selecione uma visita" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__pick__">— Selecione —</SelectItem>
                {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {visits.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhuma visita paralela.</p>
        ) : (
          visits.map((v, i) => (
            <div key={i} className="border rounded-md p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">#{i + 1}</Badge>
                <Select value={v.template_id ?? "__none__"} onValueChange={(val) => applyTemplate(i, val)}>
                  <SelectTrigger className="h-9 w-56"><SelectValue placeholder="Do catálogo…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Sem catálogo —</SelectItem>
                    {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  value={v.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                  placeholder="Ex.: Visita ao Hospital X"
                  className="flex-1"
                />
                <Button variant="ghost" size="icon" onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Professor responsável</Label>
                  <Select
                    value={v.teacher_id ?? "__none__"}
                    onValueChange={(val) => update(i, { teacher_id: val === "__none__" ? null : val })}
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Sem professor —</SelectItem>
                      {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" />Horário</Label>
                  {daySlotOptions.length > 0 ? (
                    <Select
                      value={v.time_slot ?? "__none__"}
                      onValueChange={(val) => update(i, { time_slot: val === "__none__" ? null : val })}
                    >
                      <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Herda da aula —</SelectItem>
                        {daySlotOptions.map((s) => {
                          const code = formatSlot(s);
                          return <SelectItem key={code} value={code}>{code}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={v.time_slot ?? ""}
                      onChange={(e) => update(i, { time_slot: e.target.value || null })}
                      placeholder="Ex.: 6M234"
                      className="h-9"
                    />
                  )}
                </div>
                <div className="space-y-1 md:col-span-1">
                  <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" />Local (URL do Google Maps)</Label>
                  <Input value={v.location ?? ""} onChange={(e) => update(i, { location: e.target.value })} className="h-9" placeholder="https://maps.google.com/..." />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" />Preceptor</Label>
                  <Input value={v.preceptor_name ?? ""} onChange={(e) => update(i, { preceptor_name: e.target.value || null })} className="h-9" placeholder="Nome do preceptor" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />Telefone</Label>
                  <Input value={v.preceptor_phone ?? ""} onChange={(e) => update(i, { preceptor_phone: e.target.value || null })} className="h-9" placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <UsersIcon className="h-3 w-3" />Alunos do grupo ({v.student_ids.length})
                </Label>
                <div className="max-h-40 overflow-y-auto border rounded p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                  {students.length === 0 ? (
                    <p className="text-xs text-muted-foreground col-span-2">Sem alunos no semestre.</p>
                  ) : students.map((st) => (
                    <label key={st.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={v.student_ids.includes(st.id)}
                        onCheckedChange={() => toggleStudent(i, st.id)}
                      />
                      <span className="truncate">{st.student_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
      <VisitTemplateManager
        open={managerOpen}
        onOpenChange={setManagerOpen}
        classId={classId}
        semesterId={semesterId}
        onChanged={loadTemplates}
      />
    </Card>
  );
}
