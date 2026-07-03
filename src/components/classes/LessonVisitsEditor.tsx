import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, MapPin, Users as UsersIcon, Clock } from "lucide-react";
import { WeeklySlot, slotsForDate, formatSlot } from "@/lib/class-schedule-notation";

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

  useEffect(() => {
    supabase.from("class_teachers").select("id,name").eq("class_id", classId).order("order_index")
      .then(({ data }) => setTeachers((data as any) || []));
    supabase.from("class_students").select("id,student_name").eq("semester_id", semesterId).order("student_name")
      .then(({ data }) => setStudents((data as any) || []));
  }, [classId, semesterId]);

  const daySlotOptions = lessonDate ? slotsForDate(weeklySchedule, lessonDate) : [];

  function add() {
    onChange([
      ...visits,
      { teacher_id: null, title: "", location: null, notes: null, student_ids: [], order_index: visits.length, time_slot: defaultTimeSlot ?? null },
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

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Visitas técnicas paralelas</h4>
            <p className="text-xs text-muted-foreground">
              Vários professores no mesmo horário — ou em turnos diferentes na mesma data (manhã e noite) —
              cada um com um grupo diferente de alunos. O mesmo professor pode ser reutilizado em horários diferentes.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={add}>
            <Plus className="h-4 w-4 mr-1" />Adicionar visita
          </Button>
        </div>

        {visits.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhuma visita paralela.</p>
        ) : (
          visits.map((v, i) => (
            <div key={i} className="border rounded-md p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">#{i + 1}</Badge>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                  <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" />Local</Label>
                  <Input value={v.location ?? ""} onChange={(e) => update(i, { location: e.target.value })} className="h-9" />
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
    </Card>
  );
}
