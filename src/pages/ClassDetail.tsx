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
  Pencil, Trash2, Download, ExternalLink, Upload, Loader2, ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { LessonDialog, LessonItem } from "@/components/classes/LessonDialog";
import { SeminarEvaluationDialog } from "@/components/classes/SeminarEvaluationDialog";
import { getLessonTypeStyle } from "@/lib/lesson-type-style";
import { cn } from "@/lib/utils";
import { SeminarRubric } from "@/lib/seminar-rubric";

interface ClassRow {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
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
interface Teacher {
  id: string;
  name: string;
  email: string | null;
  role: string;
}
interface DocItem {
  id: string;
  title: string;
  category: string;
  description: string | null;
  file_path: string | null;
  link_url: string | null;
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
const LESSON_TYPE_LABEL: Record<string, string> = {
  theoretical: "Teórica", practical: "Prática", simulation: "Simulação",
  seminar: "Seminário", assessment: "Avaliação", other: "Outro",
};

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

  // dialogs
  const [semDialog, setSemDialog] = useState<{ open: boolean; editing?: Semester | null }>({ open: false });
  const [teacherDialog, setTeacherDialog] = useState<{ open: boolean; editing?: Teacher | null }>({ open: false });
  const [docDialog, setDocDialog] = useState<{ open: boolean; editing?: DocItem | null }>({ open: false });
  const [lessonDialog, setLessonDialog] = useState<{ open: boolean; editing?: Lesson | null }>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<null | { kind: string; id: string; label: string }>(null);

  useEffect(() => { if (classId) load(); /* eslint-disable-next-line */ }, [classId]);

  async function load() {
    setLoading(true);
    const [c, sem, tch, doc] = await Promise.all([
      supabase.from("classes").select("id,name,description,user_id").eq("id", classId!).single(),
      supabase.from("class_semesters").select("*").eq("class_id", classId!).order("order_index"),
      supabase.from("class_teachers").select("*").eq("class_id", classId!).order("order_index"),
      supabase.from("class_documents").select("*").eq("class_id", classId!).order("created_at", { ascending: false }),
    ]);
    if (c.error) {
      toast.error("Turma não encontrada");
      navigate("/classes");
      return;
    }
    setKlass(c.data as any);

    // student counts per semester
    const semList = (sem.data as Semester[]) || [];
    const ids = semList.map((s) => s.id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: stu } = await supabase
        .from("class_students")
        .select("semester_id")
        .in("semester_id", ids);
      stu?.forEach((s: any) => { counts[s.semester_id] = (counts[s.semester_id] || 0) + 1; });
    }
    const decorated = semList.map((s) => ({ ...s, student_count: counts[s.id] || 0 }));
    setSemesters(decorated);
    setTeachers((tch.data as any) || []);
    setDocuments((doc.data as any) || []);
    if (!activeSemesterId && decorated.length) setActiveSemesterId(decorated[0].id);
    setLoading(false);
  }

  useEffect(() => { if (activeSemesterId) loadLessons(activeSemesterId); }, [activeSemesterId]);

  async function loadLessons(semId: string) {
    const { data } = await supabase
      .from("class_schedule_items")
      .select("*")
      .eq("semester_id", semId)
      .order("lesson_date", { ascending: true, nullsFirst: false })
      .order("order_index");
    setLessons((data as any) || []);
  }

  // ===== Semesters =====
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

  // ===== Teachers =====
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

  // ===== Documents =====
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
      file_path,
      link_url: form.link_url?.trim() || null,
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

  // ===== Delete handler =====
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
  if (!klass) return null;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/classes")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            {klass.name}
          </h1>
          {klass.description && <p className="text-sm text-muted-foreground">{klass.description}</p>}
        </div>
        <Badge variant="secondary">{semesters.length} semestre(s)</Badge>
      </div>

      <Tabs defaultValue="semesters" className="space-y-4">
        <TabsList>
          <TabsTrigger value="semesters"><Layers className="w-4 h-4 mr-1" />Semestres</TabsTrigger>
          <TabsTrigger value="schedule"><Calendar className="w-4 h-4 mr-1" />Cronograma</TabsTrigger>
          <TabsTrigger value="teachers"><UserCog className="w-4 h-4 mr-1" />Professores</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="w-4 h-4 mr-1" />Documentos</TabsTrigger>
        </TabsList>

        {/* SEMESTERS */}
        <TabsContent value="semesters" className="space-y-3">
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
                      <div className="font-semibold text-lg">{s.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {s.student_count || 0} alunos
                        {s.start_date && ` · ${s.start_date} a ${s.end_date || "?"}`}
                      </div>
                      {!s.is_active && <Badge variant="outline" className="mt-2">Arquivado</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setSemDialog({ open: true, editing: s })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setConfirmDelete({ kind: "semester", id: s.id, label: s.label })}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* SCHEDULE */}
        <TabsContent value="schedule" className="space-y-3">
          {semesters.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">
              Crie um semestre primeiro para registrar aulas.
            </CardContent></Card>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Semestre:</Label>
                  <Select value={activeSemesterId ?? ""} onValueChange={setActiveSemesterId}>
                    <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {semesters.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => setLessonDialog({ open: true, editing: null })}>
                  <Plus className="w-4 h-4 mr-1" />Nova aula
                </Button>
              </div>

              {lessons.length === 0 ? (
                <Card><CardContent className="py-10 text-center text-muted-foreground">
                  Sem aulas registradas neste semestre.
                </CardContent></Card>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Data</TableHead>
                        <TableHead>Aula</TableHead>
                        <TableHead className="w-32">Tipo</TableHead>
                        <TableHead className="w-32">Status</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lessons.map((l) => (
                        <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setLessonDialog({ open: true, editing: l })}>
                          <TableCell>{l.lesson_date ?? "—"}</TableCell>
                          <TableCell className="font-medium">{l.title}</TableCell>
                          <TableCell><Badge variant="outline">{LESSON_TYPE_LABEL[l.lesson_type] ?? l.lesson_type}</Badge></TableCell>
                          <TableCell>
                            <Badge variant={l.status === "done" ? "default" : l.status === "cancelled" ? "destructive" : "secondary"}>
                              {l.status === "done" ? "Realizada" : l.status === "cancelled" ? "Cancelada" : "Planejada"}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon"
                              onClick={() => setConfirmDelete({ kind: "lesson", id: l.id, label: l.title })}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </>
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
                <Card key={d.id}>
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
      </Tabs>

      {/* SEMESTER DIALOG */}
      <SemesterDialog
        state={semDialog}
        onClose={() => setSemDialog({ open: false })}
        onSave={saveSemester}
      />

      {/* TEACHER DIALOG */}
      <TeacherDialog
        state={teacherDialog}
        onClose={() => setTeacherDialog({ open: false })}
        onSave={saveTeacher}
      />

      {/* DOCUMENT DIALOG */}
      <DocumentDialog
        state={docDialog}
        onClose={() => setDocDialog({ open: false })}
        onSave={uploadAndSaveDoc}
      />

      {/* LESSON DIALOG */}
      {activeSemesterId && (
        <LessonDialog
          open={lessonDialog.open}
          onOpenChange={(v) => setLessonDialog({ open: v })}
          semesterId={activeSemesterId}
          lesson={lessonDialog.editing ?? null}
          onSaved={() => loadLessons(activeSemesterId)}
        />
      )}

      {/* CONFIRM DELETE */}
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
