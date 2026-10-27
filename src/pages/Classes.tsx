import { useState, useEffect } from "react";
import {
  GraduationCap, Plus, Users, MoreHorizontal, BookOpen, Pencil, Copy, Trash2,
  UserCog, Loader2, UserPlus, X, Upload, Search, LayoutGrid, List, Archive, Layers, ChevronRight, ListChecks, FolderOpen, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";

interface ClassItem {
  id: string;
  name: string;
  semester: string;
  description: string;
  studentCount: number;
  examCount: number;
  is_active?: boolean;
}

interface StudentItem {
  id: string;
  student_name: string;
  student_email: string | null;
  student_registration: string | null;
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

// Lista de turmas. Abrir uma turma leva à página da turma (/classes/:id), onde ficam provas, pacientes virtuais,
// alunos, cronograma, notas e presença.
export default function ClassesPage() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const disciplinaAberta = sp.get("disciplina");
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);

  // Gerenciar alunos (a partir do menu da turma)
  const [manageStudentsOpen, setManageStudentsOpen] = useState(false);
  const [managingClassId, setManagingClassId] = useState<string | null>(null);
  const [studentAddMode, setStudentAddMode] = useState<"single" | "batch">("single");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentReg, setNewStudentReg] = useState("");
  const [batchText, setBatchText] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);

  // Formulário de turma
  const [newName, setNewName] = useState("");
  const [newSemester, setNewSemester] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);
  const [editIsActive, setEditIsActive] = useState(true);

  // Lista: busca, agrupamento e filtros
  const [listSearch, setListSearch] = useState("");
  const [listView, setListView] = useState<"groups" | "all">("groups");
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");
  // Página da disciplina: abas de semestres e diálogo de novo semestre
  const [semTab, setSemTab] = useState<"active" | "inactive">("active");
  const [novoSemOpen, setNovoSemOpen] = useState(false);
  const [novoSemLabel, setNovoSemLabel] = useState("");
  const [novoSemBusy, setNovoSemBusy] = useState(false);

  const fetchClasses = async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setLoading(false); return; }

    const { data } = await supabase
      .from("classes")
      .select("id, name, semester, description, student_count, is_active")
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

    // Semestres: se a turma tem semestres cadastrados e todos estão arquivados,
    // ela é considerada inativa mesmo que o flag da turma esteja ativo.
    const { data: semestersData } = await supabase
      .from("class_semesters")
      .select("class_id, is_active")
      .in("class_id", classIds.length > 0 ? classIds : ["__none__"]);

    const semesterActiveMap: Record<string, boolean> = {};
    (semestersData || []).forEach((s: any) => {
      semesterActiveMap[s.class_id] = (semesterActiveMap[s.class_id] || false) || !!s.is_active;
    });

    setClasses(data.map(c => ({
      id: c.id,
      name: c.name,
      semester: c.semester || "",
      description: c.description || "",
      studentCount: studentCountMap[c.id] || 0,
      examCount: examCountMap[c.id] || 0,
      is_active: (c.is_active ?? true) && (c.id in semesterActiveMap ? semesterActiveMap[c.id] : true),
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
      is_active: newIsActive,
    });

    if (error) { toast.error("Erro ao criar turma."); return; }
    setNewName(""); setNewSemester(""); setNewDescription(""); setNewIsActive(true);
    setCreateOpen(false);
    toast.success("Turma criada com sucesso!");
    fetchClasses();
  };

  const handleEditClass = async () => {
    if (!editingClass || !newName.trim()) return;
    const { error } = await supabase.from("classes")
      .update({ name: newName.trim(), semester: newSemester.trim(), description: newDescription.trim(), is_active: editIsActive })
      .eq("id", editingClass.id);

    if (error) { toast.error("Erro ao editar turma."); return; }
    setEditOpen(false);
    setEditingClass(null);
    toast.success("Turma atualizada!");
    fetchClasses();
  };

  const openEdit = (cls: ClassItem) => {
    setEditingClass(cls);
    setNewName(cls.name);
    setNewSemester(cls.semester);
    setNewDescription(cls.description);
    setEditIsActive(cls.is_active ?? true);
    setEditOpen(true);
  };

  const handleDeleteClass = async (id: string) => {
    const { error } = await supabase.from("classes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error("Erro ao excluir."); return; }
    setDeleteId(null);
    toast.success("Turma movida para a lixeira.");
    fetchClasses();
  };

  const handleToggleActive = async (cls: ClassItem) => {
    const next = !(cls.is_active ?? true);
    const { error } = await supabase.from("classes")
      .update({ is_active: next })
      .eq("id", cls.id);
    if (error) { toast.error("Erro ao atualizar status."); return; }
    toast.success(next ? "Turma ativada." : "Turma inativada.");
    fetchClasses();
  };

  // Com `novoSemestre`, a cópia é o próximo semestre da mesma disciplina: mantém o nome e troca o rótulo.
  const handleDuplicateClass = async (cls: ClassItem, novoSemestre?: string): Promise<boolean> => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return false;
    const tId = toast.loading(novoSemestre ? "Criando novo semestre..." : "Duplicando turma...");
    try {
      const { data: newClass, error } = await supabase.from("classes").insert({
        user_id: user.user.id,
        name: novoSemestre ? cls.name : `${cls.name} (cópia)`,
        semester: novoSemestre ?? cls.semester,
        description: cls.description,
      }).select().single();
      if (error || !newClass) throw error || new Error("Falha ao duplicar");

      // 1. Duplicate teachers (build id map)
      const teacherIdMap: Record<string, string> = {};
      const { data: teachers } = await supabase.from("class_teachers").select("*").eq("class_id", cls.id);
      if (teachers?.length) {
        for (const t of teachers as any[]) {
          const { data: nt } = await supabase.from("class_teachers").insert({
            class_id: newClass.id,
            name: t.name,
            email: t.email,
            role: t.role,
            order_index: t.order_index,
          }).select().single();
          if (nt) teacherIdMap[t.id] = nt.id;
        }
      }

      // 2. Duplicate materials (documents)
      const { data: docs } = await supabase.from("class_documents").select("*").eq("class_id", cls.id);
      if (docs?.length) {
        await supabase.from("class_documents").insert((docs as any[]).map(d => ({
          class_id: newClass.id,
          title: d.title,
          category: d.category,
          description: d.description,
          file_path: d.file_path,
          link_url: d.link_url,
        })));
      }

      // 3. Duplicate visit templates
      const { data: visits } = await supabase.from("class_visit_templates").select("*").eq("class_id", cls.id);
      if (visits?.length) {
        await supabase.from("class_visit_templates").insert((visits as any[]).map(v => ({
          class_id: newClass.id,
          title: v.title,
          location: v.location,
          preceptor_name: v.preceptor_name,
          preceptor_phone: v.preceptor_phone,
          notes: v.notes,
          default_student_ids: v.default_student_ids,
        })));
      }

      // 4. Duplicate semesters + schedule items (map semester + teacher IDs)
      const { data: semesters } = await supabase.from("class_semesters").select("*").eq("class_id", cls.id).order("order_index");
      if (semesters?.length) {
        for (const s of semesters as any[]) {
          const { data: newSem } = await supabase.from("class_semesters").insert({
            class_id: newClass.id,
            label: s.label,
            start_date: s.start_date,
            end_date: s.end_date,
            is_active: s.is_active,
            order_index: s.order_index,
          }).select().single();
          if (!newSem) continue;
          const { data: items } = await supabase.from("class_schedule_items")
            .select("lesson_date,title,lesson_type,template_id,template_data,notes,status,order_index,rubric_json,rubric_id,teacher_id,time_slot,is_holiday,holiday_name")
            .eq("semester_id", s.id);
          if (items?.length) {
            const rows = (items as any[]).map(it => ({
              ...it,
              semester_id: newSem.id,
              teacher_id: it.teacher_id ? (teacherIdMap[it.teacher_id] || null) : null,
              // Skip holiday-only rows (user requested holidays not duplicated)
            })).filter(it => !it.is_holiday);
            if (rows.length) await supabase.from("class_schedule_items").insert(rows);
          }
        }
      }

      toast.success(novoSemestre ? "Novo semestre criado com cronograma, professores e materiais." : "Turma duplicada com cronograma, professores e materiais.", { id: tId });
      fetchClasses();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Erro ao duplicar.", { id: tId });
      return false;
    }
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

  const manageStudentsContent = (
    <Dialog open={manageStudentsOpen} onOpenChange={setManageStudentsOpen}>
      <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>Gerenciar alunos</DialogTitle></DialogHeader>
        <Tabs value={studentAddMode} onValueChange={(v) => setStudentAddMode(v as "single" | "batch")}>
          <TabsList className="w-full">
            <TabsTrigger value="single" className="flex-1 gap-1.5"><UserPlus className="h-3.5 w-3.5" />Discente avulso</TabsTrigger>
            <TabsTrigger value="batch" className="flex-1 gap-1.5"><Upload className="h-3.5 w-3.5" />Discente em lote</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Nome *" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} />
              <Input placeholder="E-mail" value={newStudentEmail} onChange={(e) => setNewStudentEmail(e.target.value)} />
              <Input placeholder="Matrícula" value={newStudentReg} onChange={(e) => setNewStudentReg(e.target.value)} />
            </div>
            <Button size="sm" onClick={addStudent} className="w-full"><UserPlus className="h-4 w-4" />Adicionar aluno</Button>
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
            <Button size="sm" onClick={addBatchStudents} disabled={batchLoading} className="w-full">
              {batchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importar {batchText.trim().split("\n").filter(l => l.trim()).length} aluno(s)
            </Button>
          </TabsContent>
        </Tabs>

        <Separator />
        <h4 className="text-sm font-semibold">Alunos cadastrados ({students.length})</h4>
        {students.length === 0 ? (
          <p className="py-4 text-center text-sm italic text-muted-foreground">Nenhum aluno cadastrado.</p>
        ) : (
          <div className="max-h-[30vh] space-y-2 overflow-y-auto">
            {students.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded border p-2 text-sm">
                <div>
                  <p className="font-medium">{s.student_name}</p>
                  <p className="text-xs text-muted-foreground">{s.student_registration || "—"} · {s.student_email || "—"}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeStudent(s.id)} aria-label="Remover aluno">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  // Visão em lista
  const filteredClasses = classes.filter(c => {
    const matchesTab = activeTab === "active" ? (c.is_active ?? true) : !(c.is_active ?? true);
    if (!listSearch.trim()) return matchesTab;
    const q = listSearch.trim().toLowerCase();
    return matchesTab && (c.name.toLowerCase().includes(q) || (c.semester || "").toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q));
  });
  const totalStudents = filteredClasses.reduce((a, c) => a + c.studentCount, 0);
  const totalExams = filteredClasses.reduce((a, c) => a + c.examCount, 0);

  // Disciplina = turmas de mesmo nome (cada turma é um semestre). Está ativa se tiver ao menos um semestre ativo.
  const qBusca = listSearch.trim().toLowerCase();
  const disciplineMap = new Map<string, ClassItem[]>();
  classes
    .filter(c => !qBusca || c.name.toLowerCase().includes(qBusca) || (c.semester || "").toLowerCase().includes(qBusca) || (c.description || "").toLowerCase().includes(qBusca))
    .forEach(c => {
      if (!disciplineMap.has(c.name)) disciplineMap.set(c.name, []);
      disciplineMap.get(c.name)!.push(c);
    });
  const disciplines = Array.from(disciplineMap.entries())
    .map(([name, items]) => ({ name, items, active: items.some(i => i.is_active ?? true) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const disciplinesShown = disciplines.filter(d => (activeTab === "active" ? d.active : !d.active));
  const activeCount = listView === "groups" ? disciplines.filter(d => d.active).length : classes.filter(c => c.is_active ?? true).length;
  const inactiveCount = listView === "groups" ? disciplines.length - activeCount : classes.length - classes.filter(c => c.is_active ?? true).length;
  const disciplinesCount = new Set(filteredClasses.map(c => c.name)).size;
  const nothingToShow = listView === "groups" ? disciplinesShown.length === 0 : filteredClasses.length === 0;

  // Página da disciplina aberta (todos os semestres, sem filtro de busca)
  const semestres = disciplinaAberta ? classes.filter(c => c.name === disciplinaAberta) : [];
  const semestresAtivos = semestres.filter(c => c.is_active ?? true);
  const semestresMostrados = semTab === "active" ? semestresAtivos : semestres.filter(c => !(c.is_active ?? true));
  const abrirDisciplina = (nome: string) => { setSemTab("active"); setSp({ disciplina: nome }); };
  const fecharDisciplina = () => setSp({});
  const criarNovoSemestre = async () => {
    const base = semestres[0]; // a turma mais recente (a lista vem ordenada por criação, decrescente)
    if (!base) return;
    if (!novoSemLabel.trim()) { toast.error("Informe o semestre (ex.: 2027.1)."); return; }
    setNovoSemBusy(true);
    const ok = await handleDuplicateClass(base, novoSemLabel.trim());
    setNovoSemBusy(false);
    if (ok) { setNovoSemOpen(false); setNovoSemLabel(""); setSemTab("active"); }
  };

  function ClassTile({ cls, compact = false, byTerm = false }: { cls: ClassItem; compact?: boolean; byTerm?: boolean }) {
    const ativa = cls.is_active ?? true;
    return (
      <Card className="surface-hover group cursor-pointer" onClick={() => navigate(`/classes/${cls.id}`)}>
        <CardContent className={cn("flex h-full flex-col gap-3 p-5", compact && "p-4")}>
          <div className="flex items-start justify-between gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft font-heading text-base font-medium text-brand-text">{initials(cls.name)}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100" onClick={(e) => e.stopPropagation()} aria-label="Ações da turma">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/classes/${cls.id}`); }}>
                  <FolderOpen className="mr-2 h-4 w-4" /> Abrir turma
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/classes/${cls.id}?aba=activities`); }}>
                  <ListChecks className="mr-2 h-4 w-4" /> Atividades (provas e pacientes)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(cls); }}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openManageStudents(cls.id); }}>
                  <UserCog className="mr-2 h-4 w-4" /> Gerenciar alunos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicateClass(cls); }}>
                  <Copy className="mr-2 h-4 w-4" /> Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleActive(cls); }}>
                  {ativa ? <Archive className="mr-2 h-4 w-4" /> : <Layers className="mr-2 h-4 w-4" />}
                  {ativa ? "Inativar" : "Reativar"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(cls.id); }}>
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div>
            <h3 className={cn("font-heading text-lg font-medium leading-tight", !ativa && "text-muted-foreground")}>{byTerm ? (cls.semester || "Sem semestre") : cls.name}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {!byTerm && cls.semester && <StatusBadge tone="neutral">{cls.semester}</StatusBadge>}
              {!ativa && <StatusBadge tone="neutral">Inativa</StatusBadge>}
            </div>
          </div>
          {!compact && cls.description && <p className="line-clamp-2 text-sm text-muted-foreground">{cls.description}</p>}
          <div className="mt-auto flex items-center gap-4 border-t pt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5" title="Alunos"><Users className="h-4 w-4" /><span className="font-mono tabular-nums">{cls.studentCount}</span></span>
            <span className="flex items-center gap-1.5" title="Provas"><BookOpen className="h-4 w-4" /><span className="font-mono tabular-nums">{cls.examCount}</span></span>
            <span className="ml-auto text-xs font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100">Abrir →</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const campoTurma = (idSuffix: string, ativo: boolean, setAtivo: (v: boolean) => void) => (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor={`turma-nome-${idSuffix}`}>Nome da turma *</Label>
        <Input id={`turma-nome-${idSuffix}`} placeholder="Ex: Farmacologia 101" value={newName} onChange={(e) => setNewName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`turma-sem-${idSuffix}`}>Semestre</Label>
        <Input id={`turma-sem-${idSuffix}`} placeholder="Ex: 1º Sem. 2026" value={newSemester} onChange={(e) => setNewSemester(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`turma-desc-${idSuffix}`}>Descrição</Label>
        <Textarea id={`turma-desc-${idSuffix}`} placeholder="Breve descrição..." rows={2} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Checkbox id={`turma-ativa-${idSuffix}`} checked={ativo} onCheckedChange={(checked) => setAtivo(Boolean(checked))} />
        <Label htmlFor={`turma-ativa-${idSuffix}`} className="cursor-pointer font-normal">Turma ativa</Label>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      {semestres.length > 0 ? (
        <>
          <div className="space-y-3">
            <Button variant="ghost" size="sm" className="-ml-3" onClick={fecharDisciplina}>
              <ArrowLeft className="h-4 w-4" /> Minhas turmas
            </Button>
            <PageHeader
              eyebrow="Disciplina"
              title={disciplinaAberta!}
              description={`${semestres.length} ${semestres.length === 1 ? "semestre" : "semestres"} · ${semestres.reduce((a, c) => a + c.studentCount, 0)} alunos no total. Deixe como ativo só o semestre em andamento e inative os anteriores.`}
              actions={<Button onClick={() => { setNovoSemLabel(""); setNovoSemOpen(true); }}><Plus className="h-4 w-4" />Novo semestre</Button>}
            />
          </div>

          <div className="flex gap-2" role="tablist" aria-label="Estado do semestre">
            {([["active", "Ativos", semestresAtivos.length], ["inactive", "Inativos", semestres.length - semestresAtivos.length]] as const).map(([v, rotulo, n]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={semTab === v}
                onClick={() => setSemTab(v)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  semTab === v ? "border-transparent bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {rotulo}<span className={cn("font-mono text-[11px]", semTab === v ? "opacity-80" : "")}>{n}</span>
              </button>
            ))}
          </div>

          {semestresMostrados.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              {semTab === "active" ? "Nenhum semestre ativo. Reative um semestre na aba Inativos ou crie um novo." : "Nenhum semestre inativo."}
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {semestresMostrados.map((cls) => <ClassTile key={cls.id} cls={cls} compact byTerm />)}
            </div>
          )}
        </>
      ) : (
      <>
      <PageHeader
        eyebrow="Gestão"
        title="Minhas Turmas"
        description="Organize disciplinas, semestres, alunos, cronograma, presença, notas e as atividades de cada turma em um só lugar."
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Nova turma</Button>}
      />

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Disciplinas", value: disciplinesCount },
          { label: "Turmas", value: filteredClasses.length },
          { label: "Alunos", value: totalStudents },
          { label: "Avaliações", value: totalExams },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5">
              <p className="label-mono">{k.label}</p>
              <p className="num mt-3 text-4xl">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ativas / inativas e busca */}
      {classes.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2" role="tablist" aria-label="Estado da turma">
            {([["active", "Ativas", activeCount], ["inactive", "Inativas", inactiveCount]] as const).map(([v, rotulo, n]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={activeTab === v}
                onClick={() => setActiveTab(v)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeTab === v ? "border-transparent bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {rotulo}<span className={cn("font-mono text-[11px]", activeTab === v ? "opacity-80" : "")}>{n}</span>
              </button>
            ))}
          </div>
          <div className="relative min-w-[220px] max-w-md flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="Buscar disciplina, semestre, descrição..." className="pl-9" aria-label="Buscar turma" />
          </div>
          <div className="ml-auto flex gap-1 rounded-lg bg-muted p-1">
            <Button variant={listView === "groups" ? "outline" : "ghost"} size="sm" className="h-8" onClick={() => setListView("groups")}>
              <LayoutGrid className="h-4 w-4" />Por disciplina
            </Button>
            <Button variant={listView === "all" ? "outline" : "ghost"} size="sm" className="h-8" onClick={() => setListView("all")}>
              <List className="h-4 w-4" />Todas
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : classes.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-accent-soft text-accent-ink"><GraduationCap className="h-8 w-8" /></span>
          <p className="font-heading text-xl font-medium">Nenhuma turma criada</p>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">Cadastre sua primeira turma para organizar alunos, cronograma e notas.</p>
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Criar primeira turma</Button>
        </CardContent></Card>
      ) : nothingToShow ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          {listSearch ? `Nenhum resultado para "${listSearch}".` : activeTab === "active" ? "Nenhuma turma ativa." : "Nenhuma turma inativa."}
        </CardContent></Card>
      ) : listView === "all" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((cls) => <ClassTile key={cls.id} cls={cls} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {disciplinesShown.map((d) => {
            const vigentes = d.items.filter(i => i.is_active ?? true);
            const mostrar = vigentes.length ? vigentes : d.items;
            return (
              <Card key={d.name} className="surface-hover group cursor-pointer" onClick={() => abrirDisciplina(d.name)}>
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft font-heading text-base font-medium text-brand-text">{initials(d.name)}</span>
                  <div>
                    <h3 className={cn("font-heading text-lg font-medium leading-tight", !d.active && "text-muted-foreground")}>{d.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {mostrar.slice(0, 3).map(i => i.semester ? <StatusBadge key={i.id} tone="neutral">{i.semester}</StatusBadge> : null)}
                      {!d.active && <StatusBadge tone="neutral">Inativa</StatusBadge>}
                    </div>
                  </div>
                  <div className="mt-auto flex items-center gap-4 border-t pt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5" title="Semestres"><Layers className="h-4 w-4" /><span className="font-mono tabular-nums">{d.items.length}</span></span>
                    <span className="flex items-center gap-1.5" title="Alunos nos semestres exibidos"><Users className="h-4 w-4" /><span className="font-mono tabular-nums">{mostrar.reduce((a, i) => a + i.studentCount, 0)}</span></span>
                    <span className="flex items-center gap-1.5" title="Provas"><BookOpen className="h-4 w-4" /><span className="font-mono tabular-nums">{d.items.reduce((a, i) => a + i.examCount, 0)}</span></span>
                    <span className="ml-auto flex items-center text-xs font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100">Abrir <ChevronRight className="h-3.5 w-3.5" /></span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      </>
      )}

      {/* Criar turma */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open);
        if (!open) { setNewName(""); setNewSemester(""); setNewDescription(""); setNewIsActive(true); }
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Criar nova turma</DialogTitle></DialogHeader>
          {campoTurma("novo", newIsActive, setNewIsActive)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateClass}>Criar turma</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar turma */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingClass(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar turma</DialogTitle></DialogHeader>
          {campoTurma("edicao", editIsActive, setEditIsActive)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditClass}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Novo semestre da disciplina */}
      <Dialog open={novoSemOpen} onOpenChange={(open) => { if (!novoSemBusy) setNovoSemOpen(open); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo semestre de {disciplinaAberta}</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="novo-semestre">Semestre *</Label>
            <Input id="novo-semestre" placeholder="Ex: 2027.1" value={novoSemLabel} onChange={(e) => setNovoSemLabel(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Cria a turma a partir do semestre mais recente{semestres[0]?.semester ? ` (${semestres[0].semester})` : ""}, com cronograma, professores e materiais. Os alunos não são copiados.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoSemOpen(false)} disabled={novoSemBusy}>Cancelar</Button>
            <Button onClick={criarNovoSemestre} disabled={novoSemBusy}>
              {novoSemBusy && <Loader2 className="h-4 w-4 animate-spin" />}Criar semestre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {manageStudentsContent}

      {/* Confirmar exclusão */}
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
