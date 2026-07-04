import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, GraduationCap, Plus, Calendar, FileText, UserCog, Layers,
  Pencil, Trash2, Download, ExternalLink, Upload, Loader2, LayoutDashboard,
  Users, BookOpenCheck, ClipboardCheck, Copy, CalendarOff,
} from "lucide-react";
import { toast } from "sonner";
import { LessonDialog, LessonItem } from "@/components/classes/LessonDialog";
import { SeminarEvaluationDialog } from "@/components/classes/SeminarEvaluationDialog";
import { SeminarRubric } from "@/lib/seminar-rubric";
import { OverviewTab } from "@/components/classes/OverviewTab";
import { GradebookTab } from "@/components/classes/GradebookTab";
import { AttendanceTab } from "@/components/classes/AttendanceTab";
import { StudentsTab } from "@/components/classes/StudentsTab";
import { ScheduleViews, ScheduleLesson } from "@/components/classes/ScheduleViews";
import { WeeklyScheduleEditor } from "@/components/classes/WeeklyScheduleEditor";
import { HolidaysTab } from "@/components/classes/HolidaysTab";
import { WeeklySlot } from "@/lib/class-schedule-notation";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

interface ClassRow {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  weekly_schedule?: WeeklySlot[];
}
interface Semester {
  id: string;
  label: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  order_index: number;
  student_count?: number;
}
interface Teacher { id: string; name: string; email: string | null; role: string; }
interface DocItem {
  id: string; title: string; category: string; description: string | null;
  file_path: string | null; link_url: string | null;
}
interface Lesson extends LessonItem { id: string; rubric_json?: SeminarRubric | null; }

const DOC_CATEGORIES = [
  { value: "calendar", label: "Calendário acadêmico" },
  { value: "regulation", label: "Regulamento" },
  { value: "syllabus", label: "Ementa / Plano de ensino" },
  { value: "bibliography", label: "Bibliografia" },
  { value: "other", label: "Outro" },
];
const TEACHER_ROLES = [
  { value: "titular", label: "Titular" },
  { value: "auxiliar", label: "Auxiliar" },
  { value: "monitor", label: "Monitor" },
  { value: "guest", label: "Convidado" },
];

export default function ClassDetail() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();

  const [klass, setKlass] = useState<ClassRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [activeSemesterId, setActiveSemesterId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [semesterStudents, setSemesterStudents] = useState<{ id: string; student_name: string }[]>([]);
  const [activeTab, setActiveTab] = useState<string>("overview");

  const [semDialog, setSemDialog] = useState<{ open: boolean; editing?: Semester | null }>({ open: false });
  const [teacherDialog, setTeacherDialog] = useState<{ open: boolean; editing?: Teacher | null }>({ open: false });
  const [docDialog, setDocDialog] = useState<{ open: boolean; editing?: DocItem | null }>({ open: false });
  const [lessonDialog, setLessonDialog] = useState<{ open: boolean; editing?: Lesson | null }>({ open: false });
  const [seminarEval, setSeminarEval] = useState<{ open: boolean; lesson?: Lesson | null }>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<null | { kind: string; id: string; label: string }>(null);

  useEffect(() => { if (classId) load(); /* eslint-disable-next-line */ }, [classId]);

  async function load() {
    setLoading(true);
    const [c, sem, tch, doc] = await Promise.all([
      supabase.from("classes").select("id,name,description,user_id,weekly_schedule").eq("id", classId!).single(),
      supabase.from("class_semesters").select("*").eq("class_id", classId!).order("order_index"),
      supabase.from("class_teachers").select("*").eq("class_id", classId!).order("order_index"),
      supabase.from("class_documents").select("*").eq("class_id", classId!).order("created_at", { ascending: false }),
    ]);
    if (c.error) { toast.error("Turma não encontrada"); navigate("/classes"); return; }
    setKlass(c.data as any);

    const semList = (sem.data as Semester[]) || [];
    const ids = semList.map((s) => s.id);
    const counts: Record<string, number> = {};
    if (ids.length) {
      const { data: stu } = await supabase.from("class_students").select("semester_id").in("semester_id", ids);
      stu?.forEach((s: any) => { counts[s.semester_id] = (counts[s.semester_id] || 0) + 1; });
    }
    const decorated = semList.map((s) => ({ ...s, student_count: counts[s.id] || 0 }));
    setSemesters(decorated);
    setTeachers((tch.data as any) || []);
    setDocuments((doc.data as any) || []);
    if (!activeSemesterId && decorated.length) {
      // prefer active semester
      const preferred = decorated.find(s => s.is_active) || decorated[0];
      setActiveSemesterId(preferred.id);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!activeSemesterId) { setSemesterStudents([]); return; }
    loadLessons(activeSemesterId);
    supabase.from("class_students").select("id,student_name").eq("semester_id", activeSemesterId).order("student_name")
      .then(({ data }) => setSemesterStudents((data as any) || []));
  }, [activeSemesterId]);

  async function loadLessons(semId: string) {
    const { data } = await supabase
      .from("class_schedule_items")
      .select("*")
      .eq("semester_id", semId)
      .order("lesson_date", { ascending: true, nullsFirst: false })
      .order("order_index");
    const rows = (data as any[]) || [];
    if (rows.length) {
      const ids = rows.map((r) => r.id);
      const { data: vc } = await supabase
        .from("class_lesson_visits")
        .select("*")
        .in("lesson_id", ids)
        .order("order_index");
      const byLesson: Record<string, any[]> = {};
      (vc || []).forEach((v: any) => {
        if (!byLesson[v.lesson_id]) byLesson[v.lesson_id] = [];
        byLesson[v.lesson_id].push(v);
      });
      rows.forEach((r) => {
        r.visits = byLesson[r.id] || [];
        r.visits_count = r.visits.length;
      });
    }
    setLessons(rows as any);
  }

  async function saveSemester(form: Partial<Semester>) {
    const payload = {
      class_id: classId,
      label: form.label?.trim() || "Semestre",
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      is_active: form.is_active ?? true,
      order_index: form.order_index ?? semesters.length,
    };
    const { error } = semDialog.editing
      ? await supabase.from("class_semesters").update(payload).eq("id", semDialog.editing.id)
      : await supabase.from("class_semesters").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Semestre salvo");
    setSemDialog({ open: false });
    load();
  }

  async function duplicateSemester(src: Semester) {
    const newLabel = window.prompt("Rótulo do novo semestre:", `${src.label} (cópia)`);
    if (!newLabel?.trim()) return;
    const tId = toast.loading("Duplicando semestre...");
    try {
      const { data: created, error: e1 } = await supabase
        .from("class_semesters")
        .insert({
          class_id: classId,
          label: newLabel.trim(),
          start_date: null,
          end_date: null,
          is_active: true,
          order_index: semesters.length,
        })
        .select()
        .single();
      if (e1 || !created) throw e1 || new Error("Falha ao criar semestre");

      // Copy schedule items from source semester
      const { data: items, error: e2 } = await supabase
        .from("class_schedule_items")
        .select("lesson_date,title,lesson_type,template_id,template_data,notes,status,order_index,rubric_json,rubric_id")
        .eq("semester_id", src.id);
      if (e2) throw e2;

      if (items && items.length) {
        const rows = items.map((it: any) => ({ ...it, semester_id: created.id }));
        const { error: e3 } = await supabase.from("class_schedule_items").insert(rows);
        if (e3) throw e3;
      }

      toast.success(`Semestre duplicado (${items?.length || 0} aulas copiadas). Professores e materiais são compartilhados pela turma.`, { id: tId });
      setActiveSemesterId(created.id);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao duplicar", { id: tId });
    }
  }

  async function saveTeacher(form: Partial<Teacher>) {
    if (!form.name?.trim()) return toast.error("Informe o nome");
    const payload = {
      class_id: classId, name: form.name.trim(),
      email: form.email?.trim() || null,
      role: form.role || "titular",
      order_index: teachers.length,
    };
    const { error } = teacherDialog.editing
      ? await supabase.from("class_teachers").update(payload).eq("id", teacherDialog.editing.id)
      : await supabase.from("class_teachers").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Professor salvo");
    setTeacherDialog({ open: false });
    load();
  }

  async function uploadAndSaveDoc(file: File | null, form: Partial<DocItem>) {
    if (!form.title?.trim()) return toast.error("Informe o título");
    let file_path = form.file_path || null;
    if (file) {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return toast.error("Sessão inválida");
      const path = `${uid}/${classId}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("class-documents").upload(path, file);
      if (upErr) return toast.error("Upload falhou: " + upErr.message);
      file_path = path;
    }
    const payload = {
      class_id: classId,
      title: form.title.trim(),
      category: form.category || "other",
      description: form.description || null,
      file_path, link_url: form.link_url?.trim() || null,
    };
    const { error } = docDialog.editing
      ? await supabase.from("class_documents").update(payload).eq("id", docDialog.editing.id)
      : await supabase.from("class_documents").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Documento salvo");
    setDocDialog({ open: false });
    load();
  }

  async function downloadDoc(d: DocItem) {
    if (d.file_path) {
      const { data, error } = await supabase.storage.from("class-documents").createSignedUrl(d.file_path, 3600);
      if (error || !data) return toast.error("Não foi possível gerar o link");
      window.open(data.signedUrl, "_blank");
    } else if (d.link_url) {
      window.open(d.link_url, "_blank");
    }
  }

  async function performDelete() {
    if (!confirmDelete) return;
    const tableMap: Record<string, string> = {
      semester: "class_semesters",
      teacher: "class_teachers",
      document: "class_documents",
      lesson: "class_schedule_items",
    };
    const tbl = tableMap[confirmDelete.kind];
    if (!tbl) return;
    const { error } = await supabase.from(tbl as any).delete().eq("id", confirmDelete.id);
    if (error) toast.error(error.message);
    else { toast.success("Excluído"); load(); if (activeSemesterId) loadLessons(activeSemesterId); }
    setConfirmDelete(null);
  }

  async function rescheduleLesson(lessonId: string, newDate: string) {
    const { error } = await supabase.from("class_schedule_items").update({ lesson_date: newDate }).eq("id", lessonId);
    if (error) throw error;
    if (activeSemesterId) loadLessons(activeSemesterId);
  }

  useKeyboardShortcuts({
    "1": () => setActiveTab("overview"),
    "2": () => setActiveTab("schedule"),
    "3": () => setActiveTab("students"),
    "4": () => setActiveTab("grades"),
    "5": () => setActiveTab("attendance"),
    "6": () => setActiveTab("semesters"),
    "7": () => setActiveTab("teachers"),
    "8": () => setActiveTab("documents"),
    "n": () => { if (activeTab === "schedule" && activeSemesterId) setLessonDialog({ open: true, editing: null }); },
  });

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
  if (!klass) return null;

  const activeSemester = semesters.find(s => s.id === activeSemesterId) || null;

  return (
    <div className="min-h-screen bg-background">
      {/* HERO */}
      <div className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--secondary)),transparent_50%)]" />
        <div className="relative container mx-auto px-6 py-6 max-w-7xl">
          <div className="flex items-center gap-2 text-primary-foreground/70 text-sm mb-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/classes")} className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 h-7 px-2">
              <ArrowLeft className="w-4 h-4 mr-1" />Turmas
            </Button>
            <span>/</span>
            <span className="text-primary-foreground/90">{klass.name}</span>
            {activeSemester && <><span>/</span><span className="font-medium text-secondary">{activeSemester.label}</span></>}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold text-primary-foreground flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-secondary/20 backdrop-blur flex items-center justify-center border border-secondary/30">
                  <GraduationCap className="h-6 w-6 text-secondary" />
                </div>
                {klass.name}
              </h1>
              {klass.description && <p className="text-sm text-primary-foreground/80 mt-2 max-w-2xl">{klass.description}</p>}
            </div>

            <div className="flex items-center gap-2 bg-background/10 backdrop-blur-md rounded-lg p-2 border border-primary-foreground/10">
              <Label className="text-primary-foreground/90 text-xs uppercase tracking-wider">Semestre</Label>
              {semesters.length ? (
                <Select value={activeSemesterId ?? ""} onValueChange={setActiveSemesterId}>
                  <SelectTrigger className="w-48 bg-background/90 border-0 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {semesters.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label} {!s.is_active && "(arquivado)"} · {s.student_count} alunos
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Button size="sm" onClick={() => setSemDialog({ open: true })} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  <Plus className="w-4 h-4 mr-1" />Criar semestre
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 max-w-7xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="-mx-2 px-2 overflow-x-auto md:overflow-visible">
            <TabsList className="flex md:flex-wrap h-auto w-max md:w-auto">
              <TabsTrigger value="overview"><LayoutDashboard className="w-4 h-4 mr-1" />Visão geral</TabsTrigger>
              <TabsTrigger value="schedule"><Calendar className="w-4 h-4 mr-1" />Cronograma</TabsTrigger>
              <TabsTrigger value="students"><Users className="w-4 h-4 mr-1" />Alunos</TabsTrigger>
              <TabsTrigger value="grades"><BookOpenCheck className="w-4 h-4 mr-1" />Notas</TabsTrigger>
              <TabsTrigger value="attendance"><ClipboardCheck className="w-4 h-4 mr-1" />Presença</TabsTrigger>
              <TabsTrigger value="semesters"><Layers className="w-4 h-4 mr-1" />Semestres</TabsTrigger>
              <TabsTrigger value="teachers"><UserCog className="w-4 h-4 mr-1" />Professores</TabsTrigger>
              <TabsTrigger value="documents"><FileText className="w-4 h-4 mr-1" />Materiais</TabsTrigger>
              <TabsTrigger value="holidays"><CalendarOff className="w-4 h-4 mr-1" />Feriados</TabsTrigger>
            </TabsList>
          </div>

          {/* OVERVIEW */}
          <TabsContent value="overview">
            <OverviewTab classId={classId!} semesterId={activeSemesterId} onNavigateTab={setActiveTab} />
          </TabsContent>

          {/* SCHEDULE */}
          <TabsContent value="schedule" className="space-y-3">
            {!activeSemesterId ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">
                Crie um semestre primeiro para registrar aulas.
              </CardContent></Card>
            ) : (
              <>
                <div className="flex justify-end">
                  <Button onClick={() => setLessonDialog({ open: true, editing: null })}>
                    <Plus className="w-4 h-4 mr-1" />Nova aula
                  </Button>
                </div>
                <ScheduleViews
                  lessons={lessons as ScheduleLesson[]}
                  teachers={teachers}
                  calendarName={`${klass.name}${activeSemester ? " - " + activeSemester.label : ""}`}
                  onOpenLesson={(l) => setLessonDialog({ open: true, editing: l as Lesson })}
                  onDeleteLesson={(l) => setConfirmDelete({ kind: "lesson", id: l.id, label: l.title })}
                  onOpenSeminarEval={(l) => setSeminarEval({ open: true, lesson: l as Lesson })}
                  onReschedule={rescheduleLesson}
                />
              </>
            )}
          </TabsContent>

          {/* STUDENTS */}
          <TabsContent value="students">
            {activeSemesterId ? (
              <StudentsTab classId={classId!} semesterId={activeSemesterId} onChanged={load} />
            ) : (
              <Card><CardContent className="py-10 text-center text-muted-foreground">Crie um semestre primeiro.</CardContent></Card>
            )}
          </TabsContent>

          {/* GRADES */}
          <TabsContent value="grades">
            {activeSemesterId ? (
              <GradebookTab classId={classId!} semesterId={activeSemesterId} />
            ) : (
              <Card><CardContent className="py-10 text-center text-muted-foreground">Crie um semestre primeiro.</CardContent></Card>
            )}
          </TabsContent>

          {/* ATTENDANCE */}
          <TabsContent value="attendance">
            {activeSemesterId ? (
              <AttendanceTab semesterId={activeSemesterId} />
            ) : (
              <Card><CardContent className="py-10 text-center text-muted-foreground">Crie um semestre primeiro.</CardContent></Card>
            )}
          </TabsContent>

          {/* SEMESTERS */}
          <TabsContent value="semesters" className="space-y-4">
            <WeeklyScheduleEditor
              classId={classId!}
              initial={(klass.weekly_schedule as WeeklySlot[]) || []}
              onSaved={(slots) => setKlass((k) => k ? { ...k, weekly_schedule: slots } : k)}
            />
            <div className="flex justify-end">
              <Button onClick={() => setSemDialog({ open: true, editing: null })}>
                <Plus className="w-4 h-4 mr-1" />Novo semestre
              </Button>
            </div>
            {semesters.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">
                Nenhum semestre cadastrado. Crie o primeiro para começar.
              </CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {semesters.map((s) => (
                  <Card key={s.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-lg flex items-center gap-2">
                          {s.label}
                          {s.is_active && <Badge className="text-[10px]">Ativo</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {s.student_count || 0} alunos
                          {s.start_date && ` · ${s.start_date} a ${s.end_date || "?"}`}
                        </div>
                        {!s.is_active && <Badge variant="outline" className="mt-2">Arquivado</Badge>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" title="Duplicar (cronograma)" onClick={() => duplicateSemester(s)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Editar" onClick={() => setSemDialog({ open: true, editing: s })}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Excluir" onClick={() => setConfirmDelete({ kind: "semester", id: s.id, label: s.label })}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TEACHERS */}
          <TabsContent value="teachers" className="space-y-3">
            <div className="flex justify-end">
              <Button onClick={() => setTeacherDialog({ open: true, editing: null })}>
                <Plus className="w-4 h-4 mr-1" />Novo professor
              </Button>
            </div>
            {teachers.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">
                Cadastre os professores que ministram esta disciplina.
              </CardContent></Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-32">Função</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachers.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="text-muted-foreground">{t.email ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline">{TEACHER_ROLES.find((r) => r.value === t.role)?.label ?? t.role}</Badge></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setTeacherDialog({ open: true, editing: t })}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setConfirmDelete({ kind: "teacher", id: t.id, label: t.name })}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* DOCUMENTS */}
          <TabsContent value="documents" className="space-y-3">
            <div className="flex justify-end">
              <Button onClick={() => setDocDialog({ open: true, editing: null })}>
                <Plus className="w-4 h-4 mr-1" />Novo documento
              </Button>
            </div>
            {documents.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">
                Faça upload do calendário acadêmico, regulamento, ementa, etc.
              </CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {documents.map((d) => (
                  <Card key={d.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-medium truncate">{d.title}</span>
                        </div>
                        <Badge variant="outline" className="mt-1">
                          {DOC_CATEGORIES.find((c) => c.value === d.category)?.label ?? d.category}
                        </Badge>
                        {d.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{d.description}</p>}
                      </div>
                      <div className="flex flex-col gap-1">
                        {(d.file_path || d.link_url) && (
                          <Button variant="ghost" size="icon" onClick={() => downloadDoc(d)}>
                            {d.link_url ? <ExternalLink className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => setDocDialog({ open: true, editing: d })}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setConfirmDelete({ kind: "document", id: d.id, label: d.title })}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* HOLIDAYS */}
          <TabsContent value="holidays" className="space-y-3">
            <HolidaysTab classId={classId!} />
          </TabsContent>
        </Tabs>

        <SemesterDialog state={semDialog} onClose={() => setSemDialog({ open: false })} onSave={saveSemester} />
        <TeacherDialog state={teacherDialog} onClose={() => setTeacherDialog({ open: false })} onSave={saveTeacher} />
        <DocumentDialog state={docDialog} onClose={() => setDocDialog({ open: false })} onSave={uploadAndSaveDoc} />

        {activeSemesterId && (
          <LessonDialog
            open={lessonDialog.open}
            onOpenChange={(v) => setLessonDialog({ open: v })}
            classId={classId!}
            semesterId={activeSemesterId}
            lesson={lessonDialog.editing ?? null}
            onSaved={() => loadLessons(activeSemesterId)}
          />
        )}

        {seminarEval.lesson && activeSemesterId && (
          <SeminarEvaluationDialog
            open={seminarEval.open}
            onOpenChange={(v) => setSeminarEval({ open: v, lesson: v ? seminarEval.lesson : null })}
            lessonId={seminarEval.lesson.id}
            lessonTitle={seminarEval.lesson.title}
            semesterId={activeSemesterId}
            initialRubric={seminarEval.lesson.rubric_json ?? null}
          />
        )}

        <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir "{confirmDelete?.label}"?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={performDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// ============== Inline dialog components ===============

function SemesterDialog({
  state, onClose, onSave,
}: { state: { open: boolean; editing?: Semester | null }; onClose: () => void; onSave: (f: Partial<Semester>) => void; }) {
  const [form, setForm] = useState<Partial<Semester>>({});
  useEffect(() => { setForm(state.editing ?? { label: "", is_active: true }); }, [state]);
  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state.editing ? "Editar semestre" : "Novo semestre"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Rótulo</Label>
            <Input value={form.label ?? ""} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex.: 2026.1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input type="date" value={form.start_date ?? ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Input type="date" value={form.end_date ?? ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            <Label>Ativo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeacherDialog({
  state, onClose, onSave,
}: { state: { open: boolean; editing?: Teacher | null }; onClose: () => void; onSave: (f: Partial<Teacher>) => void; }) {
  const [form, setForm] = useState<Partial<Teacher>>({});
  useEffect(() => { setForm(state.editing ?? { name: "", role: "titular" }); }, [state]);
  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state.editing ? "Editar professor" : "Novo professor"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Função</Label>
            <Select value={form.role ?? "titular"} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEACHER_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocumentDialog({
  state, onClose, onSave,
}: {
  state: { open: boolean; editing?: DocItem | null };
  onClose: () => void;
  onSave: (file: File | null, f: Partial<DocItem>) => Promise<unknown>;
}) {
  const [form, setForm] = useState<Partial<DocItem>>({});
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(state.editing ?? { category: "other" }); setFile(null); }, [state]);
  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state.editing ? "Editar documento" : "Novo documento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={form.category ?? "other"} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição (opcional)</Label>
            <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Arquivo</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {form.file_path && !file && <p className="text-xs text-muted-foreground">Arquivo atual mantido se nenhum novo for selecionado.</p>}
          </div>
          <div className="space-y-1.5">
            <Label>OU Link externo</Label>
            <Input value={form.link_url ?? ""} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={async () => { setSaving(true); await onSave(file, form); setSaving(false); }} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {file ? <><Upload className="w-4 h-4 mr-1" />Salvar e enviar</> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
