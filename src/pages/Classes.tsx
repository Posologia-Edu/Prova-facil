import { useState, useEffect } from "react";
import {
  GraduationCap, Plus, Users, MoreHorizontal, BookOpen, Pencil, Copy, Trash2,
  UserCog, ArrowLeft, Loader2, UserPlus, X, FileText, Upload, HeartPulse,
  KeyRound, ToggleLeft, ToggleRight, BarChart3, UsersRound, Check,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { computeExamStatus, examStatusConfig, type ExamEffectiveStatus } from "@/lib/exam-status";

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
  class_id?: string | null;
  publication?: {
    access_code: string;
    is_active: boolean;
    created_at: string;
  } | null;
}

interface ClassVirtualPatient {
  id: string;
  patient_id: string;
  access_code: string;
  status: string;
}

interface VPAssignment {
  id: string;
  class_virtual_patient_id: string;
  class_student_id: string;
  student_email: string;
  student_name: string;
}

const VP_CATALOG = [
  { id: "pain_helena", name: "Dona Helena, 67 anos", module: "Dor", desc: "Dor neuropática pós-herpética" },
  { id: "pain_luciana", name: "Luciana, 42 anos", module: "Dor", desc: "Fibromialgia" },
  { id: "pain_rogerio", name: "Rogério, 58 anos", module: "Dor", desc: "Lombalgia crônica" },
  { id: "pain_pedro", name: "Pedro, 65 anos", module: "Dor", desc: "Dor oncológica" },
  { id: "pain_ana", name: "Ana, 36 anos", module: "Dor", desc: "Cefaleia por uso excessivo" },
  { id: "inflammation_maria", name: "Dona Maria, 72 anos", module: "Inflamação", desc: "Osteoartrite de joelho" },
  { id: "inflammation_antonio", name: "Seu Antônio, 66 anos", module: "Inflamação", desc: "Osteoartrite de quadril" },
  { id: "inflammation_renata", name: "Renata, 39 anos", module: "Inflamação", desc: "Artrite reumatoide inicial" },
  { id: "inflammation_wilson", name: "Seu Wilson, 57 anos", module: "Inflamação", desc: "AR refratária" },
  { id: "inflammation_jose", name: "José, 57 anos", module: "Inflamação", desc: "Complicações do corticoide" },
];

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
  const [classVPs, setClassVPs] = useState<ClassVirtualPatient[]>([]);
  const [linkVPOpen, setLinkVPOpen] = useState(false);
  const [linkExamOpen, setLinkExamOpen] = useState(false);

  // VP student assignments
  const [vpAssignments, setVpAssignments] = useState<VPAssignment[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningVP, setAssigningVP] = useState<ClassVirtualPatient | null>(null);
  const [assignSelectedIds, setAssignSelectedIds] = useState<Set<string>>(new Set());
  const [assignSaving, setAssignSaving] = useState(false);
  const [availableExams, setAvailableExams] = useState<ExamItem[]>([]);

  // Assessment mode: "exam" or "vp"
  const [assessmentMode, setAssessmentMode] = useState<"exam" | "vp" | null>(null);

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

  const buildPublicationMap = (
    publications: Array<{ exam_id: string; access_code: string; is_active: boolean; created_at: string }> | null,
  ) => {
    const publicationMap: Record<string, ExamItem["publication"]> = {};

    for (const publication of publications || []) {
      const current = publicationMap[publication.exam_id];
      if (!current || (publication.is_active && !current.is_active)) {
        publicationMap[publication.exam_id] = {
          access_code: publication.access_code,
          is_active: publication.is_active,
          created_at: publication.created_at,
        };
      }
    }

    return publicationMap;
  };

  const loadClassExams = async (classId: string) => {
    const { data: examsData, error } = await supabase
      .from("exams")
      .select("id, title, status, created_at, class_id")
      .eq("class_id", classId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error || !examsData) {
      setClassExams([]);
      return [] as ExamItem[];
    }

    const examIds = examsData.map((exam) => exam.id);
    const { data: publicationRows } = await supabase
      .from("exam_publications")
      .select("exam_id, access_code, is_active, created_at")
      .in("exam_id", examIds.length > 0 ? examIds : ["__none__"])
      .order("created_at", { ascending: false });

    const publicationMap = buildPublicationMap(publicationRows);
    const linkedExams: ExamItem[] = examsData.map((exam) => ({
      ...exam,
      publication: publicationMap[exam.id] ?? null,
    }));

    setClassExams(linkedExams);
    return linkedExams;
  };

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

    const [studentsRes, examsData, vpsRes] = await Promise.all([
      supabase.from("class_students").select("*").eq("class_id", cls.id).order("student_name"),
      loadClassExams(cls.id),
      supabase.from("class_virtual_patients").select("id, patient_id, access_code, status").eq("class_id", cls.id).order("created_at"),
    ]);

    setStudents(studentsRes.data || []);
    const vps = (vpsRes.data as ClassVirtualPatient[]) || [];
    setClassVPs(vps);
    await loadVPAssignments(cls.id);

    // Determine mode based on existing data
    if (vps.length > 0) {
      setAssessmentMode("vp");
    } else if (examsData.length > 0) {
      setAssessmentMode("exam");
    } else {
      setAssessmentMode(null);
    }

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

  // Virtual patient linking
  const linkVirtualPatient = async (patientId: string) => {
    if (!selectedClass) return;
    const { error } = await supabase.from("class_virtual_patients").insert({
      class_id: selectedClass.id,
      patient_id: patientId,
    });
    if (error) {
      if (error.code === "23505") toast.error("Este paciente já está vinculado a esta turma.");
      else toast.error("Erro ao vincular paciente.");
      return;
    }
    toast.success("Paciente virtual vinculado!");
    setLinkVPOpen(false);
    const { data } = await supabase.from("class_virtual_patients").select("id, patient_id, access_code, status").eq("class_id", selectedClass.id).order("created_at");
    setClassVPs((data as ClassVirtualPatient[]) || []);
  };

  const toggleVPStatus = async (vp: ClassVirtualPatient) => {
    const newStatus = vp.status === "active" ? "draft" : "active";
    await supabase.from("class_virtual_patients").update({ status: newStatus }).eq("id", vp.id);
    setClassVPs(prev => prev.map(v => v.id === vp.id ? { ...v, status: newStatus } : v));
    toast.success(newStatus === "active" ? "Paciente virtual ativado!" : "Paciente virtual desativado.");
  };

  const removeVP = async (vpId: string) => {
    await supabase.from("class_virtual_patients").delete().eq("id", vpId);
    setClassVPs(prev => prev.filter(v => v.id !== vpId));
    toast.success("Paciente virtual removido da turma.");
  };

  const getVPInfo = (patientId: string) => VP_CATALOG.find(p => p.id === patientId);

  // VP Assignments helpers
  const loadVPAssignments = async (classId: string) => {
    const { data } = await supabase
      .from("class_vp_assignments" as any)
      .select("id, class_virtual_patient_id, class_student_id, student_email, student_name")
      .eq("class_id", classId);
    setVpAssignments(((data as any) || []) as VPAssignment[]);
  };

  const openAssignDialog = (vp: ClassVirtualPatient) => {
    setAssigningVP(vp);
    const currentIds = vpAssignments
      .filter(a => a.class_virtual_patient_id === vp.id)
      .map(a => a.class_student_id);
    setAssignSelectedIds(new Set(currentIds));
    setAssignDialogOpen(true);
  };

  const toggleAssignStudent = (studentId: string) => {
    setAssignSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const saveAssignments = async () => {
    if (!assigningVP || !selectedClass) return;
    setAssignSaving(true);

    const targetIds = Array.from(assignSelectedIds);
    const currentForVP = vpAssignments.filter(a => a.class_virtual_patient_id === assigningVP.id);
    const currentIds = new Set(currentForVP.map(a => a.class_student_id));

    const toRemove = currentForVP.filter(a => !assignSelectedIds.has(a.class_student_id)).map(a => a.id);
    const toAddIds = targetIds.filter(id => !currentIds.has(id));

    // Remove deselected
    if (toRemove.length > 0) {
      await supabase.from("class_vp_assignments" as any).delete().in("id", toRemove);
    }

    // Insert new ones (only students with email)
    const inserts = toAddIds
      .map(sid => students.find(s => s.id === sid))
      .filter((s): s is StudentItem => !!s && !!s.student_email)
      .map(s => ({
        class_virtual_patient_id: assigningVP.id,
        class_id: selectedClass.id,
        class_student_id: s.id,
        student_email: (s.student_email || "").trim().toLowerCase(),
        student_name: s.student_name,
      }));

    if (inserts.length > 0) {
      const { error } = await supabase.from("class_vp_assignments" as any).insert(inserts);
      if (error) {
        if (error.code === "23505") {
          toast.error("Um ou mais alunos já estão atribuídos a outro paciente desta turma.");
        } else {
          toast.error("Erro ao salvar atribuições.");
        }
        setAssignSaving(false);
        return;
      }
    }

    await loadVPAssignments(selectedClass.id);
    setAssignSaving(false);
    setAssignDialogOpen(false);
    const mode = targetIds.length > 1 ? "grupo" : targetIds.length === 1 ? "individual" : "sem alunos";
    toast.success(`Atribuições salvas (${mode}).`);
  };

  const getVPAssignedStudents = (vpId: string) =>
    vpAssignments.filter(a => a.class_virtual_patient_id === vpId);


  // Handle assessment mode change
  const handleAssessmentModeChange = async (mode: "exam" | "vp") => {
    if (!selectedClass) return;

    if (mode === "vp" && classExams.length > 0) {
      toast.error("Remova as provas vinculadas antes de trocar para Paciente Virtual.");
      return;
    }
    if (mode === "exam" && classVPs.length > 0) {
      toast.error("Remova os pacientes virtuais vinculados antes de trocar para Prova Online.");
      return;
    }

    setAssessmentMode(mode);
  };

  // Exam linking
  const openLinkExamDialog = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data: examsData, error } = await supabase
      .from("exams")
      .select("id, title, status, created_at, class_id")
      .eq("user_id", user.user.id)
      .is("deleted_at", null)
      .is("class_id", null)
      .order("created_at", { ascending: false });

    if (error || !examsData) {
      toast.error("Erro ao carregar provas.");
      return;
    }

    const examIds = examsData.map((exam) => exam.id);
    const { data: publicationsData } = await supabase
      .from("exam_publications")
      .select("exam_id, access_code, is_active, created_at")
      .in("exam_id", examIds.length > 0 ? examIds : ["__none__"])
      .order("created_at", { ascending: false });

    const publicationMap = buildPublicationMap(publicationsData || null);

    const eligibleExams: ExamItem[] = examsData
      .map((exam) => ({
        ...exam,
        publication: publicationMap[exam.id] ?? null,
      }))
      .sort((a, b) => {
        const publicationPriority = Number(Boolean(b.publication?.is_active)) - Number(Boolean(a.publication?.is_active));
        if (publicationPriority !== 0) return publicationPriority;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    setAvailableExams(eligibleExams);
    setLinkExamOpen(true);
  };

  const linkExamToClass = async (examId: string) => {
    if (!selectedClass) return;
    const { error } = await supabase
      .from("exams")
      .update({ class_id: selectedClass.id })
      .eq("id", examId);
    if (error) { toast.error("Erro ao vincular prova."); return; }
    toast.success("Prova vinculada à turma!");
    setLinkExamOpen(false);
    await loadClassExams(selectedClass.id);
    fetchClasses();
  };

  const unlinkExam = async (examId: string) => {
    const { error } = await supabase
      .from("exams")
      .update({ class_id: null })
      .eq("id", examId);
    if (error) { toast.error("Erro ao desvincular prova."); return; }
    toast.success("Prova desvinculada da turma.");
    if (selectedClass) {
      await loadClassExams(selectedClass.id);
    }
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

        {/* Assessment Mode Selector */}
        <div>
          <h3 className="text-sm font-semibold text-primary mb-3">Tipo de Avaliação</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Escolha o tipo de avaliação para esta turma. Uma turma pode ter <strong>provas online</strong> ou <strong>pacientes virtuais</strong>, mas não ambos ao mesmo tempo.
          </p>
          <RadioGroup
            value={assessmentMode || ""}
            onValueChange={(v) => handleAssessmentModeChange(v as "exam" | "vp")}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="exam" id="mode-exam" />
              <Label htmlFor="mode-exam" className="flex items-center gap-1.5 cursor-pointer">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Prova Online
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="vp" id="mode-vp" />
              <Label htmlFor="mode-vp" className="flex items-center gap-1.5 cursor-pointer">
                <HeartPulse className="h-4 w-4 text-muted-foreground" />
                Paciente Virtual
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {/* Provas vinculadas - only shown when exam mode */}
        {(assessmentMode === "exam" || (!assessmentMode && classExams.length > 0)) && (
          <>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                  <FileText className="h-4 w-4" /> Provas Vinculadas ({classExams.length})
                </h3>
                <Button variant="outline" size="sm" onClick={openLinkExamDialog}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Vincular Prova Online
                </Button>
              </div>
              {classExams.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4">Nenhuma prova vinculada a esta turma.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {classExams.map((exam) => (
                    <Card key={exam.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 cursor-pointer" onClick={() => navigate(`/exams/${exam.id}`)}>
                          <FileText className="h-4 w-4 text-primary mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold">{exam.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(exam.created_at).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        {(() => {
                          const effective = computeExamStatus(exam.status, exam.publication ? { is_active: exam.publication.is_active } : null);
                          const cfg = examStatusConfig[effective];
                          return (
                            <Badge className={`text-[10px] ${cfg.className}`}>
                              {cfg.label}
                            </Badge>
                          );
                        })()}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        {exam.publication?.access_code ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <KeyRound className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="font-mono text-xs font-bold tracking-widest uppercase truncate">{exam.publication.access_code}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => {
                                navigator.clipboard.writeText(exam.publication?.access_code || "");
                                toast.success("PIN copiado!");
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Publique a prova para gerar o PIN de acesso.</p>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => unlinkExam(exam.id)} title="Desvincular prova">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Pacientes Virtuais vinculados - only shown when vp mode */}
        {(assessmentMode === "vp" || (!assessmentMode && classVPs.length > 0)) && (
          <>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                  <HeartPulse className="h-4 w-4" /> Pacientes Virtuais ({classVPs.length})
                </h3>
                <Button variant="outline" size="sm" onClick={() => setLinkVPOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Vincular Paciente
                </Button>
              </div>
              {classVPs.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4">Nenhum paciente virtual vinculado a esta turma.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {classVPs.map((vp) => {
                    const info = getVPInfo(vp.patient_id);
                    const assigned = getVPAssignedStudents(vp.id);
                    const mode = assigned.length > 1 ? "Grupo" : assigned.length === 1 ? "Individual" : null;
                    return (
                      <Card key={vp.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <HeartPulse className="h-4 w-4 text-primary mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold">{info?.name || vp.patient_id}</p>
                              <p className="text-xs text-muted-foreground">{info?.desc}</p>
                              <Badge variant="outline" className="text-[10px] mt-1">{info?.module}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant={vp.status === "active" ? "default" : "secondary"} className="text-[10px]">
                              {vp.status === "active" ? "Ativo" : "Rascunho"}
                            </Badge>
                          </div>
                        </div>

                        {/* Assigned students summary */}
                        <div className="mt-3 p-2 rounded-md bg-muted/40 border border-dashed">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <UsersRound className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="text-xs font-medium">
                                {assigned.length === 0
                                  ? "Nenhum aluno atribuído"
                                  : `${assigned.length} aluno(s) atribuído(s)`}
                              </span>
                              {mode && (
                                <Badge variant="outline" className="text-[9px] ml-1">
                                  {mode}
                                </Badge>
                              )}
                            </div>
                            <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2" onClick={() => openAssignDialog(vp)}>
                              <UserCog className="h-3 w-3 mr-1" /> Atribuir
                            </Button>
                          </div>
                          {assigned.length > 0 && (
                            <p className="text-[11px] text-muted-foreground mt-1 truncate">
                              {assigned.map(a => a.student_name).join(", ")}
                            </p>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <KeyRound className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono text-xs font-bold tracking-widest uppercase">{vp.access_code}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                              navigator.clipboard.writeText(vp.access_code);
                              toast.success("PIN copiado!");
                            }}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleVPStatus(vp)} title={vp.status === "active" ? "Desativar" : "Ativar"}>
                              {vp.status === "active" ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/virtual-patients/analytics`)} title="Ver Resultados">
                              <BarChart3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeVP(vp.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Link VP Dialog */}
        <Dialog open={linkVPOpen} onOpenChange={setLinkVPOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Vincular Paciente Virtual</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground mb-4">Selecione um paciente para vincular a esta turma. Um PIN será gerado automaticamente.</p>
            <div className="space-y-2">
              {VP_CATALOG.filter(p => !classVPs.some(v => v.patient_id === p.id)).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">{p.module}</Badge>
                  </div>
                  <Button size="sm" onClick={() => linkVirtualPatient(p.id)}>Vincular</Button>
                </div>
              ))}
              {VP_CATALOG.filter(p => !classVPs.some(v => v.patient_id === p.id)).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Todos os pacientes já estão vinculados.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign Students to VP Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Atribuir Alunos ao Paciente Virtual</DialogTitle>
            </DialogHeader>
            {assigningVP && (
              <p className="text-sm text-muted-foreground mb-3">
                <strong>{getVPInfo(assigningVP.patient_id)?.name || assigningVP.patient_id}</strong>.
                Selecione 1 aluno para atendimento <strong>individual</strong> ou 2+ alunos para atendimento <strong>em grupo</strong>.
                Cada aluno só pode ser atribuído a um único paciente nesta turma.
              </p>
            )}
            <div className="space-y-1 border rounded-md p-2 max-h-[50vh] overflow-y-auto">
              {students.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum aluno cadastrado nesta turma.</p>
              )}
              {students.map(s => {
                const otherAssignment = vpAssignments.find(
                  a => a.class_student_id === s.id && a.class_virtual_patient_id !== assigningVP?.id
                );
                const otherVP = otherAssignment
                  ? classVPs.find(v => v.id === otherAssignment.class_virtual_patient_id)
                  : null;
                const otherVPName = otherVP ? getVPInfo(otherVP.patient_id)?.name : null;
                const noEmail = !s.student_email;
                const disabled = !!otherAssignment || noEmail;
                const checked = assignSelectedIds.has(s.id);
                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between gap-2 p-2 rounded-md ${disabled ? "opacity-60" : "hover:bg-muted/50 cursor-pointer"}`}
                    onClick={() => !disabled && toggleAssignStudent(s.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Checkbox checked={checked} disabled={disabled} onCheckedChange={() => !disabled && toggleAssignStudent(s.id)} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.student_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {s.student_email || <span className="italic">sem e-mail (não pode ser atribuído)</span>}
                        </p>
                      </div>
                    </div>
                    {otherAssignment && (
                      <Badge variant="outline" className="text-[9px] shrink-0">
                        Em: {otherVPName || "outro paciente"}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
            <DialogFooter className="mt-3">
              <div className="flex w-full items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {assignSelectedIds.size === 0 && "Nenhum selecionado"}
                  {assignSelectedIds.size === 1 && "1 aluno → atendimento individual"}
                  {assignSelectedIds.size > 1 && `${assignSelectedIds.size} alunos → atendimento em grupo`}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAssignDialogOpen(false)} disabled={assignSaving}>Cancelar</Button>
                  <Button onClick={saveAssignments} disabled={assignSaving}>
                    {assignSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                    Salvar
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Link Exam Dialog */}
        <Dialog open={linkExamOpen} onOpenChange={setLinkExamOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Vincular Prova Online</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground mb-4">Selecione uma prova para vincular a esta turma.</p>
            <div className="space-y-2">
              {availableExams.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma prova disponível para vínculo. Salve uma prova sem turma em "Minhas Provas" ou desvincule uma prova já associada.</p>
              ) : (
                availableExams.map((exam) => (
                  <div key={exam.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{exam.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(exam.created_at).toLocaleDateString("pt-BR")}
                      </p>
                      <div className="flex flex-wrap items-center gap-1 mt-2">
                        <Badge variant={exam.publication?.is_active ? "default" : "secondary"} className="text-[10px]">
                          {exam.publication?.is_active ? `PIN ${exam.publication.access_code.toUpperCase()}` : "Sem publicação"}
                        </Badge>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => linkExamToClass(exam.id)}>Vincular</Button>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>


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
        <div className="text-center py-16">
          <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="font-semibold text-foreground text-lg">Nenhuma turma criada</p>
          <p className="text-sm text-muted-foreground mt-1 mb-5">Cadastre sua primeira turma para organizar alunos e vincular provas.</p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Criar Primeira Turma
          </Button>
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
