import { useState, useEffect } from "react";
import {
  GraduationCap,
  Plus,
  Users,
  MoreHorizontal,
  BookOpen,
  Pencil,
  Copy,
  Trash2,
  UserCog,
  ArrowLeft,
  Loader2,
  UserPlus,
  X,
  FileText,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface ClassItem {
  id: string;
  name: string;
  semester: string;
  description: string;
  studentCount: number;
  examCount: number;
}

interface StudentItem {
  id: string;
  student_name: string;
  student_email: string | null;
  student_registration: string | null;
}

interface ExamItem {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export default function ClassesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Detail view
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classExams, setClassExams] = useState<ExamItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Manage students dialog
  const [manageStudentsOpen, setManageStudentsOpen] = useState(false);
  const [managingClassId, setManagingClassId] = useState<string | null>(null);
  const [studentAddMode, setStudentAddMode] = useState<"single" | "batch">("single");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentReg, setNewStudentReg] = useState("");
  const [batchText, setBatchText] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);

  // Form state
  const [newName, setNewName] = useState("");
  const [newSemester, setNewSemester] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Profile info for detail view
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  const fetchClasses = async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setLoading(false); return; }

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.user.id).single();
    setProfileName(profile?.full_name || "");
    setProfileEmail(user.user.email || "");

    const { data } = await supabase
      .from("classes")
      .select("id, name, semester, description, student_count")
      .eq("user_id", user.user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (!data) { setClasses([]); setLoading(false); return; }

    const classIds = data.map(c => c.id);
    const { data: examsData } = await supabase
      .from("exams")
      .select("id, class_id")
      .in("class_id", classIds.length > 0 ? classIds : ["__none__"])
      .is("deleted_at", null);

    const examCountMap: Record<string, number> = {};
    (examsData || []).forEach(e => {
      if (e.class_id) examCountMap[e.class_id] = (examCountMap[e.class_id] || 0) + 1;
    });

    const { data: studentCounts } = await supabase
      .from("class_students")
      .select("class_id")
      .in("class_id", classIds.length > 0 ? classIds : ["__none__"]);

    const studentCountMap: Record<string, number> = {};
    (studentCounts || []).forEach(s => {
      studentCountMap[s.class_id] = (studentCountMap[s.class_id] || 0) + 1;
    });

    setClasses(data.map(c => ({
      id: c.id,
      name: c.name,
      semester: c.semester || "",
      description: c.description || "",
      studentCount: studentCountMap[c.id] || 0,
      examCount: examCountMap[c.id] || 0,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchClasses(); }, []);

  const handleCreateClass = async () => {
    if (!newName.trim()) { toast.error("Informe o nome da turma."); return; }
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error } = await supabase.from("classes").insert({
      user_id: user.user.id,
      name: newName.trim(),
      semester: newSemester.trim(),
      description: newDescription.trim(),
    });

    if (error) { toast.error("Erro ao criar turma."); return; }
    setNewName(""); setNewSemester(""); setNewDescription("");
    setCreateOpen(false);
    toast.success("Turma criada com sucesso!");
    fetchClasses();
  };

  const handleEditClass = async () => {
    if (!editingClass || !newName.trim()) return;
    const { error } = await supabase.from("classes")
      .update({ name: newName.trim(), semester: newSemester.trim(), description: newDescription.trim() })
      .eq("id", editingClass.id);

    if (error) { toast.error("Erro ao editar turma."); return; }
    setEditOpen(false);
    setEditingClass(null);
    toast.success("Turma atualizada!");
    fetchClasses();
    if (selectedClass?.id === editingClass.id) {
      setSelectedClass({ ...selectedClass, name: newName.trim(), semester: newSemester.trim(), description: newDescription.trim() });
    }
  };

  const openEdit = (cls: ClassItem) => {
    setEditingClass(cls);
    setNewName(cls.name);
    setNewSemester(cls.semester);
    setNewDescription(cls.description);
    setEditOpen(true);
  };

  const handleDeleteClass = async (id: string) => {
    const { error } = await supabase.from("classes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error("Erro ao excluir."); return; }
    setDeleteId(null);
    toast.success("Turma movida para a lixeira.");
    if (selectedClass?.id === id) setSelectedClass(null);
    fetchClasses();
  };

  const handleDuplicateClass = async (cls: ClassItem) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase.from("classes").insert({
      user_id: user.user.id,
      name: `${cls.name} (cópia)`,
      semester: cls.semester,
      description: cls.description,
    });
    if (error) { toast.error("Erro ao duplicar."); return; }
    toast.success("Turma duplicada.");
    fetchClasses();
  };

  const openClassDetail = async (cls: ClassItem) => {
    setSelectedClass(cls);
    setStudentsLoading(true);

    const [studentsRes, examsRes] = await Promise.all([
      supabase.from("class_students").select("*").eq("class_id", cls.id).order("student_name"),
      supabase.from("exams").select("id, title, status, created_at").eq("class_id", cls.id).is("deleted_at", null).order("created_at", { ascending: false }),
    ]);

    setStudents(studentsRes.data || []);
    setClassExams(examsRes.data || []);
    setStudentsLoading(false);
  };

  const openManageStudents = (classId: string) => {
    setManagingClassId(classId);
    setStudentAddMode("single");
    setBatchText("");
    setManageStudentsOpen(true);
    loadManageStudents(classId);
  };

  const loadManageStudents = async (classId: string) => {
    const { data } = await supabase.from("class_students").select("*").eq("class_id", classId).order("student_name");
    setStudents(data || []);
  };

  const addStudent = async () => {
    if (!managingClassId || !newStudentName.trim()) { toast.error("Informe o nome do aluno."); return; }
    const { error } = await supabase.from("class_students").insert({
      class_id: managingClassId,
      student_name: newStudentName.trim(),
      student_email: newStudentEmail.trim() || null,
      student_registration: newStudentReg.trim() || null,
    });
    if (error) { toast.error("Erro ao adicionar aluno."); return; }
    setNewStudentName(""); setNewStudentEmail(""); setNewStudentReg("");
    toast.success("Aluno adicionado!");
    loadManageStudents(managingClassId);
    fetchClasses();
  };

  const addBatchStudents = async () => {
    if (!managingClassId || !batchText.trim()) { toast.error("Cole os dados dos alunos."); return; }
    setBatchLoading(true);

    const lines = batchText.trim().split("\n").filter(l => l.trim());
    const inserts = lines.map(line => {
      // Support: "Name; email; registration" or "Name\temail\tregistration" or just "Name"
      const parts = line.includes(";") ? line.split(";") : line.split("\t");
      return {
        class_id: managingClassId!,
        student_name: (parts[0] || "").trim(),
        student_email: (parts[1] || "").trim() || null,
        student_registration: (parts[2] || "").trim() || null,
      };
    }).filter(s => s.student_name);

    if (inserts.length === 0) { toast.error("Nenhum aluno válido encontrado."); setBatchLoading(false); return; }

    const { error } = await supabase.from("class_students").insert(inserts);
    setBatchLoading(false);
    if (error) { toast.error("Erro ao importar alunos."); return; }
    setBatchText("");
    toast.success(`${inserts.length} aluno(s) importado(s) com sucesso!`);
    loadManageStudents(managingClassId!);
    fetchClasses();
  };

  const removeStudent = async (studentId: string) => {
    if (!managingClassId) return;
    await supabase.from("class_students").delete().eq("id", studentId);
    toast.success("Aluno removido.");
    loadManageStudents(managingClassId);
    fetchClasses();
  };

  // Shared manage students dialog content
  const manageStudentsContent = (
    <Dialog open={manageStudentsOpen} onOpenChange={setManageStudentsOpen}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Gerenciar Alunos</DialogTitle></DialogHeader>
        <Tabs value={studentAddMode} onValueChange={(v) => setStudentAddMode(v as "single" | "batch")}>
          <TabsList className="w-full">
            <TabsTrigger value="single" className="flex-1 gap-1.5">
              <UserPlus className="h-3.5 w-3.5" /> Discente Avulso
            </TabsTrigger>
            <TabsTrigger value="batch" className="flex-1 gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Discente em Lote
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Nome *" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} />
              <Input placeholder="E-mail" value={newStudentEmail} onChange={(e) => setNewStudentEmail(e.target.value)} />
              <Input placeholder="Matrícula" value={newStudentReg} onChange={(e) => setNewStudentReg(e.target.value)} />
            </div>
            <Button size="sm" onClick={addStudent} className="w-full gap-1.5">
              <UserPlus className="h-3.5 w-3.5" /> Adicionar Aluno
            </Button>
          </TabsContent>

          <TabsContent value="batch" className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Cole os dados dos alunos, um por linha. Separe os campos com <strong>;</strong> ou <strong>Tab</strong>.<br />
              Formato: <code>Nome; E-mail; Matrícula</code> (e-mail e matrícula são opcionais).
            </p>
            <Textarea
              placeholder={"João Silva; joao@email.com; 2024001\nMaria Santos; maria@email.com; 2024002\nPedro Souza"}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              rows={8}
              className="font-mono text-xs"
            />
            <Button size="sm" onClick={addBatchStudents} disabled={batchLoading} className="w-full gap-1.5">
              {batchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Importar {batchText.trim().split("\n").filter(l => l.trim()).length} Aluno(s)
            </Button>
          </TabsContent>
        </Tabs>

        <Separator />
        <h4 className="text-sm font-semibold">Alunos cadastrados ({students.length})</h4>
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">Nenhum aluno cadastrado.</p>
        ) : (
          <div className="space-y-2 max-h-[30vh] overflow-y-auto">
            {students.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded border text-sm">
                <div>
                  <p className="font-medium">{s.student_name}</p>
                  <p className="text-xs text-muted-foreground">{s.student_registration || "—"} · {s.student_email || "—"}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeStudent(s.id)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  // Detail view
  if (selectedClass) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setSelectedClass(null)} className="gap-1.5 mb-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <h1 className="text-2xl font-bold">{selectedClass.name}</h1>

        <div className="flex items-center gap-8 text-sm">
          {selectedClass.semester && <div><span className="text-muted-foreground">Período:</span> <strong>{selectedClass.semester}</strong></div>}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => openEdit(selectedClass)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar Turma
          </Button>
        </div>

        {selectedClass.description && <p className="text-sm text-muted-foreground">{selectedClass.description}</p>}

        <Separator />

        {/* Docentes */}
        <div>
          <h3 className="text-sm font-semibold text-primary mb-3">Docentes (1)</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>{profileName || "Professor"}</TableCell>
                <TableCell>{profileEmail}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <Separator />

        {/* Integrantes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-primary">Integrantes ({students.length})</h3>
            <Button variant="outline" size="sm" onClick={() => openManageStudents(selectedClass.id)}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Gerenciar Alunos
            </Button>
          </div>
          {studentsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : students.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4">Nenhum aluno cadastrado nesta turma.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.student_registration || "—"}</TableCell>
                    <TableCell>{s.student_name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.student_email || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <Separator />

        {/* Provas vinculadas */}
        <div>
          <h3 className="text-sm font-semibold text-primary mb-3">Provas Vinculadas ({classExams.length})</h3>
          {classExams.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4">Nenhuma prova vinculada a esta turma.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {classExams.map((exam) => (
                <Card key={exam.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/exams/${exam.id}`)}>
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">{exam.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(exam.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Edit dialog */}
        <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingClass(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Turma</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nome da Turma *</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Semestre</Label>
                <Input value={newSemester} onChange={(e) => setNewSemester(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea rows={2} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={handleEditClass}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {manageStudentsContent}
      </div>
    );
  }

  // Class list view
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas Turmas</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie suas turmas e listas de alunos.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) { setNewName(""); setNewSemester(""); setNewDescription(""); }
        }}>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nova Turma
          </Button>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Nova Turma</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nome da Turma *</Label>
                <Input placeholder="Ex: Farmacologia 101" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Semestre</Label>
                <Input placeholder="Ex: 1º Sem. 2026" value={newSemester} onChange={(e) => setNewSemester(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea placeholder="Breve descrição..." rows={2} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateClass}>Criar Turma</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : classes.length === 0 ? (
        <div className="text-center py-12">
          <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Nenhuma turma criada.</p>
          <p className="text-sm text-muted-foreground mt-1">Clique em "Nova Turma" para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <Card key={cls.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => openClassDetail(cls)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(cls); }}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openManageStudents(cls.id); }}>
                        <UserCog className="h-4 w-4 mr-2" /> Gerenciar Alunos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicateClass(cls); }}>
                        <Copy className="h-4 w-4 mr-2" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(cls.id); }}>
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h3 className="font-semibold mt-3">{cls.name}</h3>
                {cls.semester && <Badge variant="outline" className="mt-1 text-[11px]">{cls.semester}</Badge>}
                {cls.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{cls.description}</p>}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> {cls.studentCount} alunos
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" /> {cls.examCount} provas
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog (from list) */}
      {!selectedClass && (
        <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingClass(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Turma</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nome da Turma *</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Semestre</Label>
                <Input value={newSemester} onChange={(e) => setNewSemester(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea rows={2} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={handleEditClass}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Manage students dialog (from list) */}
      {!selectedClass && manageStudentsContent}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir turma?</AlertDialogTitle>
            <AlertDialogDescription>A turma será movida para a lixeira. Você poderá restaurá-la em até 30 dias.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId && handleDeleteClass(deleteId)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
