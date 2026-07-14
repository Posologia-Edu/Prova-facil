import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Clock, FileText, Calendar, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { getLessonTypeStyle } from "@/lib/lesson-type-style";
import { cn } from "@/lib/utils";
import { QrCheckinDialog } from "./QrCheckinDialog";

interface Lesson {
  id: string;
  title: string;
  lesson_date: string | null;
  lesson_type: string;
  status: string;
}
interface Student { id: string; student_name: string; }
interface AttendanceRow {
  id?: string;
  lesson_id: string;
  student_id: string;
  status: "present" | "absent" | "late" | "justified";
  justification?: string | null;
}

const STATUS_META: Record<string, { label: string; icon: any; cls: string }> = {
  present:   { label: "Presente",   icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300" },
  absent:    { label: "Ausente",    icon: XCircle,      cls: "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-300" },
  late:      { label: "Atrasado",   icon: Clock,        cls: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300" },
  justified: { label: "Justificado",icon: FileText,     cls: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-300" },
};

interface Props { semesterId: string; }

export function AttendanceTab({ semesterId }: Props) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, AttendanceRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ls, st] = await Promise.all([
        supabase.from("class_schedule_items").select("id,title,lesson_date,lesson_type,status").eq("semester_id", semesterId).order("lesson_date", { ascending: true, nullsFirst: false }),
        supabase.from("class_students").select("id,student_name").eq("semester_id", semesterId).order("student_name"),
      ]);
      const lessonList = (ls.data as Lesson[]) || [];
      setLessons(lessonList);
      setStudents((st.data as Student[]) || []);
      if (lessonList.length) setActiveLessonId(lessonList[0].id);
      setLoading(false);
    })();
  }, [semesterId]);

  useEffect(() => {
    if (!activeLessonId) return;
    (async () => {
      const { data } = await supabase.from("class_attendance").select("*").eq("lesson_id", activeLessonId);
      const map: Record<string, AttendanceRow> = {};
      (data as AttendanceRow[] || []).forEach(r => { map[r.student_id] = r; });
      setRows(map);
    })();
  }, [activeLessonId]);

  async function setStatus(studentId: string, status: AttendanceRow["status"]) {
    if (!activeLessonId) return;
    setSaving(studentId);
    const existing = rows[studentId];
    const payload = { lesson_id: activeLessonId, student_id: studentId, status };
    const { data, error } = existing?.id
      ? await supabase.from("class_attendance").update(payload).eq("id", existing.id).select().single()
      : await supabase.from("class_attendance").insert(payload).select().single();
    setSaving(null);
    if (error) return toast.error("Erro ao salvar.");
    setRows(prev => ({ ...prev, [studentId]: data as AttendanceRow }));
  }

  async function setJustification(studentId: string, text: string) {
    const existing = rows[studentId];
    if (!existing?.id) return;
    await supabase.from("class_attendance").update({ justification: text }).eq("id", existing.id);
    setRows(prev => ({ ...prev, [studentId]: { ...existing, justification: text } }));
  }

  async function markAll(status: AttendanceRow["status"]) {
    if (!activeLessonId) return;
    setSaving("__all__");
    const upserts = students.map(s => ({ lesson_id: activeLessonId, student_id: s.id, status }));
    const { error } = await supabase.from("class_attendance").upsert(upserts, { onConflict: "lesson_id,student_id" });
    setSaving(null);
    if (error) return toast.error("Erro ao marcar em lote.");
    const { data } = await supabase.from("class_attendance").select("*").eq("lesson_id", activeLessonId);
    const map: Record<string, AttendanceRow> = {};
    (data as AttendanceRow[] || []).forEach(r => { map[r.student_id] = r; });
    setRows(map);
    toast.success("Presença atualizada.");
  }

  const stats = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, justified: 0, unmarked: 0 };
    students.forEach(s => {
      const r = rows[s.id];
      if (!r) counts.unmarked++;
      else counts[r.status]++;
    });
    return counts;
  }, [students, rows]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!lessons.length) return (
    <Card><CardContent className="py-12 text-center text-muted-foreground">
      <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
      Cadastre aulas no cronograma para registrar presença.
    </CardContent></Card>
  );

  const activeLesson = lessons.find(l => l.id === activeLessonId);
  const style = activeLesson ? getLessonTypeStyle(activeLesson.lesson_type) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={activeLessonId ?? ""} onValueChange={setActiveLessonId}>
            <SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger>
            <SelectContent>
              {lessons.map(l => (
                <SelectItem key={l.id} value={l.id}>
                  {l.lesson_date ?? "Sem data"} · {l.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {style && <Badge variant="outline" className={cn("gap-1", style.badge)}><style.icon className="h-3 w-3" />{style.label}</Badge>}
        </div>
        <div className="flex gap-1">
          <Button size="sm" onClick={() => setQrOpen(true)} disabled={!activeLessonId} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white">
            <QrCode className="h-4 w-4 mr-1" />Check-in por QR
          </Button>
          <Button size="sm" variant="outline" onClick={() => markAll("present")} disabled={saving === "__all__"}>Todos presentes</Button>
          <Button size="sm" variant="outline" onClick={() => markAll("absent")} disabled={saving === "__all__"}>Todos ausentes</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {(["present","absent","late","justified"] as const).map(k => {
          const meta = STATUS_META[k]; const Icon = meta.icon;
          return (
            <Card key={k} className={cn("border", meta.cls)}>
              <CardContent className="p-3 flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <div>
                  <div className="text-lg font-bold leading-none">{stats[k]}</div>
                  <div className="text-[11px] opacity-80">{meta.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="text-muted-foreground">—</div>
            <div>
              <div className="text-lg font-bold leading-none">{stats.unmarked}</div>
              <div className="text-[11px] text-muted-foreground">Não marcado</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {students.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Cadastre alunos no semestre primeiro.</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead className="w-[420px]">Status</TableHead>
                <TableHead>Justificativa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map(s => {
                const r = rows[s.id];
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.student_name}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(["present","absent","late","justified"] as const).map(k => {
                          const meta = STATUS_META[k]; const Icon = meta.icon;
                          const active = r?.status === k;
                          return (
                            <Button key={k} size="sm" variant={active ? "default" : "outline"} className={cn("h-8", active && meta.cls)}
                              onClick={() => setStatus(s.id, k)} disabled={saving === s.id}>
                              <Icon className="h-3.5 w-3.5 mr-1" />{meta.label}
                            </Button>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(r?.status === "justified" || r?.status === "absent" || r?.status === "late") && (
                        <Input defaultValue={r?.justification ?? ""} placeholder="Motivo..." className="h-8 text-xs"
                          onBlur={(e) => setJustification(s.id, e.target.value)} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
