import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3, Check, Copy, FileText, HeartPulse, KeyRound, Loader2, Pencil, Plus, Tag,
  ToggleLeft, ToggleRight, Trash2, Upload, UserCog, UserPlus, UsersRound, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useVpCatalog } from "@/lib/vp-catalog";
import { computeExamStatus, examStatusConfig, type ExamEffectiveStatus } from "@/lib/exam-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  group_label?: string | null;
  profession?: string | null;
  group_roles?: boolean;
  mode?: string;
  dificuldade?: string | null;
}

interface VPAssignment {
  id: string;
  class_virtual_patient_id: string;
  class_student_id: string;
  student_email: string;
  student_name: string;
}

const VP_DIFICULDADES = [
  { value: "facil", label: "Fácil" },
  { value: "medio", label: "Médio" },
  { value: "dificil", label: "Difícil" },
] as const;

const vpDificuldadeLabel = (v?: string | null) => VP_DIFICULDADES.find((d) => d.value === v)?.label ?? null;

const VP_PROFESSIONS = [
  { value: "farmaceutico", label: "Farmácia" },
  { value: "enfermeiro", label: "Enfermagem" },
  { value: "medico", label: "Medicina" },
] as const;

const vpProfessionLabel = (v?: string | null) => VP_PROFESSIONS.find((p) => p.value === v)?.label ?? "Farmácia";

const EXAM_TONE: Record<ExamEffectiveStatus, StatusTone> = {
  draft: "neutral",
  in_progress: "ok",
  grading: "warn",
  completed: "brand",
};

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

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

function SectionHeader({ icon: Icon, title, count, action }: { icon: typeof FileText; title: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-brand-soft text-brand-text"><Icon className="h-4 w-4" /></span>
        <h3 className="font-heading text-xl font-medium">{title}</h3>
        {typeof count === "number" && <span className="font-mono text-xs text-muted-foreground">{count}</span>}
      </div>
      {action}
    </div>
  );
}

// Atividades da turma: provas online, pacientes virtuais, integrantes e docente responsável.
// Reúne tudo o que antes ficava na vista simples da lista de turmas.
export function ClassActivitiesTab({ classId, onChanged }: { classId: string; onChanged?: () => void }) {
  const navigate = useNavigate();
  const { entries: vpCatalog } = useVpCatalog();

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [classExams, setClassExams] = useState<ExamItem[]>([]);
  const [classVPs, setClassVPs] = useState<ClassVirtualPatient[]>([]);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  const [linkVPOpen, setLinkVPOpen] = useState(false);
  const [linkVPProfession, setLinkVPProfession] = useState<string>("farmaceutico");
  const [linkVPMode, setLinkVPMode] = useState<"avaliativo" | "treino">("avaliativo");
  const [linkVPDificuldade, setLinkVPDificuldade] = useState<string>("medio");
  const [removingVP, setRemovingVP] = useState<{ vp: ClassVirtualPatient; sessions: number } | null>(null);
  const [linkExamOpen, setLinkExamOpen] = useState(false);
  const [availableExams, setAvailableExams] = useState<ExamItem[]>([]);

  const [vpAssignments, setVpAssignments] = useState<VPAssignment[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningVP, setAssigningVP] = useState<ClassVirtualPatient | null>(null);
  const [assignSelectedIds, setAssignSelectedIds] = useState<Set<string>>(new Set());
  const [assignSaving, setAssignSaving] = useState(false);
  const [editingLabelVPId, setEditingLabelVPId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");

  const [manageStudentsOpen, setManageStudentsOpen] = useState(false);
  const [studentAddMode, setStudentAddMode] = useState<"single" | "batch">("single");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentReg, setNewStudentReg] = useState("");
  const [batchText, setBatchText] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);

  const loadClassExams = async () => {
    const { data: examsData, error } = await supabase
      .from("exams")
      .select("id, title, status, created_at, class_id")
      .eq("class_id", classId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error || !examsData) {
      setClassExams([]);
      return;
    }
    const examIds = examsData.map((exam) => exam.id);
    const { data: publicationRows } = await supabase
      .from("exam_publications")
      .select("exam_id, access_code, is_active, created_at")
      .in("exam_id", examIds.length > 0 ? examIds : ["__none__"])
      .order("created_at", { ascending: false });
    const publicationMap = buildPublicationMap(publicationRows);
    setClassExams(examsData.map((exam) => ({ ...exam, publication: publicationMap[exam.id] ?? null })));
  };

  const loadStudents = async () => {
    const { data } = await supabase.from("class_students").select("*").eq("class_id", classId).order("student_name");
    setStudents(data || []);
  };

  const loadVPAssignments = async () => {
    const { data } = await supabase
      .from("class_vp_assignments" as any)
      .select("id, class_virtual_patient_id, class_student_id, student_email, student_name")
      .eq("class_id", classId);
    setVpAssignments(((data as any) || []) as VPAssignment[]);
  };

  // Divisão de funções no grupo. Consulta à parte e tolerante a erro: a lista de pacientes não depende da coluna.
  const loadGroupRoles = async () => {
    const { data, error } = await (supabase as any).from("class_virtual_patients").select("id, group_roles").eq("class_id", classId);
    if (error || !data) return;
    const m = new Map((data as any[]).map((r) => [r.id, !!r.group_roles]));
    setClassVPs((prev) => prev.map((v) => ({ ...v, group_roles: m.get(v.id) ?? false })));
  };

  // Modo treino e dificuldade. Consulta à parte e tolerante a erro, como a divisão de funções.
  const loadVpMode = async () => {
    const { data, error } = await (supabase as any).from("class_virtual_patients").select("id, mode, dificuldade").eq("class_id", classId);
    if (error || !data) return;
    const m = new Map((data as any[]).map((r) => [r.id, r]));
    setClassVPs((prev) => prev.map((v) => ({ ...v, mode: m.get(v.id)?.mode ?? "avaliativo", dificuldade: m.get(v.id)?.dificuldade ?? null })));
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setStudentsLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        setProfileEmail(user.user.email || "");
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.user.id).maybeSingle();
        if (active) setProfileName(profile?.full_name || "");
      }
      const [studentsRes, vpsRes] = await Promise.all([
        supabase.from("class_students").select("*").eq("class_id", classId).order("student_name"),
        supabase.from("class_virtual_patients").select("id, patient_id, access_code, status, group_label, profession").eq("class_id", classId).order("created_at"),
      ]);
      if (!active) return;
      setStudents(studentsRes.data || []);
      setClassVPs((vpsRes.data as ClassVirtualPatient[]) || []);
      await loadClassExams();
      void loadGroupRoles();
      void loadVpMode();
      await loadVPAssignments();
      if (active) setStudentsLoading(false);
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  // ───────── alunos ─────────
  const openManageStudents = () => {
    setStudentAddMode("single");
    setBatchText("");
    setManageStudentsOpen(true);
    loadStudents();
  };

  const addStudent = async () => {
    if (!newStudentName.trim()) { toast.error("Informe o nome do aluno."); return; }
    const { error } = await supabase.from("class_students").insert({
      class_id: classId,
      student_name: newStudentName.trim(),
      student_email: newStudentEmail.trim() || null,
      student_registration: newStudentReg.trim() || null,
    });
    if (error) { toast.error("Erro ao adicionar aluno."); return; }
    setNewStudentName(""); setNewStudentEmail(""); setNewStudentReg("");
    toast.success("Aluno adicionado!");
    loadStudents();
    onChanged?.();
  };

  const addBatchStudents = async () => {
    if (!batchText.trim()) { toast.error("Cole os dados dos alunos."); return; }
    setBatchLoading(true);
    const lines = batchText.trim().split("\n").filter((l) => l.trim());
    const inserts = lines.map((line) => {
      const parts = line.includes(";") ? line.split(";") : line.split("\t");
      return {
        class_id: classId,
        student_name: (parts[0] || "").trim(),
        student_email: (parts[1] || "").trim() || null,
        student_registration: (parts[2] || "").trim() || null,
      };
    }).filter((s) => s.student_name);
    if (inserts.length === 0) { toast.error("Nenhum aluno válido encontrado."); setBatchLoading(false); return; }
    const { error } = await supabase.from("class_students").insert(inserts);
    setBatchLoading(false);
    if (error) { toast.error("Erro ao importar alunos."); return; }
    setBatchText("");
    toast.success(`${inserts.length} aluno(s) importado(s) com sucesso!`);
    loadStudents();
    onChanged?.();
  };

  const removeStudent = async (studentId: string) => {
    await supabase.from("class_students").delete().eq("id", studentId);
    toast.success("Aluno removido.");
    loadStudents();
    onChanged?.();
  };

  // ───────── pacientes virtuais ─────────
  const linkVirtualPatient = async (patientId: string) => {
    const { error } = await supabase.from("class_virtual_patients").insert({
      class_id: classId,
      patient_id: patientId,
      profession: linkVPProfession,
      // Só envia as colunas do modo treino quando é treino: o avaliativo funciona mesmo antes da migração.
      ...(linkVPMode === "treino" ? { mode: "treino", dificuldade: linkVPDificuldade } : {}),
    } as any);
    if (error) {
      if (error.code === "23505") toast.error("Este paciente já está vinculado a esta turma.");
      else toast.error("Erro ao vincular paciente.");
      return;
    }
    toast.success("Paciente virtual vinculado!");
    setLinkVPOpen(false);
    const { data } = await supabase.from("class_virtual_patients").select("id, patient_id, access_code, status, group_label, profession").eq("class_id", classId).order("created_at");
    setClassVPs((data as ClassVirtualPatient[]) || []);
    void loadGroupRoles();
    void loadVpMode();
  };

  const toggleVPStatus = async (vp: ClassVirtualPatient) => {
    const newStatus = vp.status === "active" ? "draft" : "active";
    await supabase.from("class_virtual_patients").update({ status: newStatus }).eq("id", vp.id);
    setClassVPs((prev) => prev.map((v) => v.id === vp.id ? { ...v, status: newStatus } : v));
    toast.success(newStatus === "active" ? "Paciente virtual ativado!" : "Paciente virtual desativado.");
  };

  const askRemoveVP = async (vp: ClassVirtualPatient) => {
    const { count } = await supabase
      .from("virtual_patient_sessions")
      .select("id", { count: "exact", head: true })
      .eq("class_virtual_patient_id", vp.id);
    setRemovingVP({ vp, sessions: count ?? 0 });
  };

  const removeVP = async (vpId: string) => {
    const { error } = await supabase.from("class_virtual_patients").delete().eq("id", vpId);
    if (error) {
      console.error("removeVP", error);
      toast.error(error.code === "23503"
        ? "Não foi possível remover: há sessões de alunos vinculadas a este paciente."
        : "Não foi possível remover o paciente da turma.");
      return;
    }
    setClassVPs((prev) => prev.filter((v) => v.id !== vpId));
    // O banco apaga as atribuições junto (cascata); a lista em memória precisa acompanhar para liberar os alunos.
    setVpAssignments((prev) => prev.filter((a) => a.class_virtual_patient_id !== vpId));
    toast.success("Paciente virtual removido da turma.");
  };

  const toggleGroupRoles = async (vp: ClassVirtualPatient, value: boolean) => {
    const { error } = await (supabase as any).from("class_virtual_patients").update({ group_roles: value }).eq("id", vp.id);
    if (error) { toast.error("Não foi possível alterar a divisão de funções."); return; }
    setClassVPs((prev) => prev.map((v) => v.id === vp.id ? { ...v, group_roles: value } : v));
    toast.success(value ? "Divisão de funções ligada para este paciente." : "Divisão de funções desligada.");
  };

  const updateVPGroupLabel = async (vpId: string, label: string) => {
    const trimmed = label.trim();
    const value = trimmed.length > 0 ? trimmed : null;
    setClassVPs((prev) => prev.map((v) => v.id === vpId ? { ...v, group_label: value } : v));
    const { error } = await supabase.from("class_virtual_patients").update({ group_label: value }).eq("id", vpId);
    if (error) { toast.error("Erro ao salvar rótulo do grupo."); return; }
    toast.success(value ? "Rótulo do grupo salvo!" : "Rótulo do grupo removido.");
  };

  const getVPInfo = (patientId: string) => {
    const e = vpCatalog.find((p) => p.id === patientId);
    return e ? { id: e.id, name: e.label, module: e.module, desc: e.desc } : undefined;
  };

  const openAssignDialog = (vp: ClassVirtualPatient) => {
    setAssigningVP(vp);
    const currentIds = vpAssignments.filter((a) => a.class_virtual_patient_id === vp.id).map((a) => a.class_student_id);
    setAssignSelectedIds(new Set(currentIds));
    setAssignDialogOpen(true);
  };

  const toggleAssignStudent = (studentId: string) => {
    setAssignSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const saveAssignments = async () => {
    if (!assigningVP) return;
    setAssignSaving(true);

    const targetIds = Array.from(assignSelectedIds);
    const currentForVP = vpAssignments.filter((a) => a.class_virtual_patient_id === assigningVP.id);
    const currentIds = new Set(currentForVP.map((a) => a.class_student_id));

    const toRemove = currentForVP.filter((a) => !assignSelectedIds.has(a.class_student_id)).map((a) => a.id);
    const toAddIds = targetIds.filter((id) => !currentIds.has(id));

    if (toRemove.length > 0) {
      await supabase.from("class_vp_assignments" as any).delete().in("id", toRemove);
    }

    // Insere só alunos com e-mail.
    const inserts = toAddIds
      .map((sid) => students.find((s) => s.id === sid))
      .filter((s): s is StudentItem => !!s && !!s.student_email)
      .map((s) => ({
        class_virtual_patient_id: assigningVP.id,
        class_id: classId,
        class_student_id: s.id,
        student_email: (s.student_email || "").trim().toLowerCase(),
        student_name: s.student_name,
        // Só envia a coluna no treino: a atribuição avaliativa funciona mesmo antes da migração.
        ...(assigningVP.mode === "treino" ? { is_treino: true } : {}),
      }));

    if (inserts.length > 0) {
      const { error } = await supabase.from("class_vp_assignments" as any).insert(inserts);
      if (error) {
        if (error.code === "23505") {
          toast.error(assigningVP.mode === "treino" ? "Um ou mais alunos já estão atribuídos a este paciente." : "Um ou mais alunos já estão atribuídos a outro paciente desta turma.");
        } else {
          toast.error("Erro ao salvar atribuições.");
        }
        setAssignSaving(false);
        return;
      }
    }

    await loadVPAssignments();
    setAssignSaving(false);
    setAssignDialogOpen(false);
    const mode = assigningVP.mode === "treino" ? "treino individual" : targetIds.length > 1 ? "grupo" : targetIds.length === 1 ? "individual" : "sem alunos";
    toast.success(`Atribuições salvas (${mode}).`);
  };

  const getVPAssignedStudents = (vpId: string) => vpAssignments.filter((a) => a.class_virtual_patient_id === vpId);
  const isTreinoVP = (vpId: string | undefined) => !!vpId && classVPs.find((v) => v.id === vpId)?.mode === "treino";

  // ───────── provas online ─────────
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
      .map((exam) => ({ ...exam, publication: publicationMap[exam.id] ?? null }))
      .sort((a, b) => {
        const publicationPriority = Number(Boolean(b.publication?.is_active)) - Number(Boolean(a.publication?.is_active));
        if (publicationPriority !== 0) return publicationPriority;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    setAvailableExams(eligibleExams);
    setLinkExamOpen(true);
  };

  const linkExamToClass = async (examId: string) => {
    const { error } = await supabase.from("exams").update({ class_id: classId }).eq("id", examId);
    if (error) { toast.error("Erro ao vincular prova."); return; }
    toast.success("Prova vinculada à turma!");
    setLinkExamOpen(false);
    await loadClassExams();
    onChanged?.();
  };

  const unlinkExam = async (examId: string) => {
    const { error } = await supabase.from("exams").update({ class_id: null }).eq("id", examId);
    if (error) { toast.error("Erro ao desvincular prova."); return; }
    toast.success("Prova desvinculada da turma.");
    await loadClassExams();
    onChanged?.();
  };

  const copyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    toast.success("PIN copiado!");
  };

  const catalogDisponivel = vpCatalog.filter((p) => p.published && !classVPs.some((v) => v.patient_id === p.id));

  return (
    <div className="space-y-10">
      {/* Provas online */}
      <section>
        <SectionHeader
          icon={FileText}
          title="Provas online"
          count={classExams.length}
          action={<Button variant="outline" size="sm" onClick={openLinkExamDialog}><Plus className="h-4 w-4" />Vincular prova online</Button>}
        />
        {classExams.length === 0 ? (
          <Card className="shadow-none"><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhuma prova vinculada a esta turma.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {classExams.map((exam) => {
              const effective = computeExamStatus(exam.status, exam.publication ? { is_active: exam.publication.is_active } : null);
              return (
                <Card key={exam.id} className="surface-hover">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <button type="button" className="min-w-0 text-left" onClick={() => navigate(`/exams/${exam.id}`)}>
                        <p className="truncate font-medium hover:underline">{exam.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(exam.created_at).toLocaleDateString("pt-BR")}</p>
                      </button>
                      <StatusBadge tone={EXAM_TONE[effective]} dot>{examStatusConfig[effective].label}</StatusBadge>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t pt-3">
                      {exam.publication?.access_code ? (
                        <div className="flex min-w-0 items-center gap-2">
                          <KeyRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate font-mono text-sm font-medium uppercase tracking-widest">{exam.publication.access_code}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyPin(exam.publication!.access_code)} aria-label="Copiar PIN">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Publique a prova para gerar o PIN de acesso.</p>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => unlinkExam(exam.id)} title="Desvincular prova" aria-label="Desvincular prova">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Pacientes virtuais */}
      <section>
        <SectionHeader
          icon={HeartPulse}
          title="Pacientes virtuais"
          count={classVPs.length}
          action={
            <Button variant="outline" size="sm" onClick={() => { setLinkVPProfession("farmaceutico"); setLinkVPMode("avaliativo"); setLinkVPDificuldade("medio"); setLinkVPOpen(true); }}>
              <Plus className="h-4 w-4" />Vincular paciente
            </Button>
          }
        />
        {classVPs.length === 0 ? (
          <Card className="shadow-none"><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhum paciente virtual vinculado a esta turma.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {classVPs.map((vp) => {
              const info = getVPInfo(vp.patient_id);
              const assigned = getVPAssignedStudents(vp.id);
              const mode = vp.mode === "treino" ? (assigned.length > 0 ? "Treino individual" : null) : assigned.length > 1 ? "Grupo" : assigned.length === 1 ? "Individual" : null;
              return (
                <Card key={vp.id} className="surface-hover">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-soft font-heading text-base font-medium text-brand-text">{initials(info?.name || vp.patient_id)}</span>
                        <div className="min-w-0">
                          <p className="truncate font-heading text-lg font-medium leading-tight">{info?.name || vp.patient_id}</p>
                          <p className="truncate text-xs text-muted-foreground">{info?.desc}</p>
                        </div>
                      </div>
                      <StatusBadge tone={vp.status === "active" ? "ok" : "warn"} dot>{vp.status === "active" ? "Ativo" : "Rascunho"}</StatusBadge>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {info?.module && <StatusBadge tone="neutral">{info.module}</StatusBadge>}
                      <StatusBadge tone="accent">{vpProfessionLabel(vp.profession)}</StatusBadge>
                      {vp.mode === "treino"
                        ? <StatusBadge tone="info">Treino{vpDificuldadeLabel(vp.dificuldade) ? ` · ${vpDificuldadeLabel(vp.dificuldade)}` : ""}</StatusBadge>
                        : <StatusBadge tone="brand">Avaliativo</StatusBadge>}
                    </div>

                    {/* Rótulo do grupo (editável) */}
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {editingLabelVPId === vp.id ? (
                        <>
                          <Input
                            autoFocus
                            value={labelDraft}
                            onChange={(e) => setLabelDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { updateVPGroupLabel(vp.id, labelDraft); setEditingLabelVPId(null); }
                              else if (e.key === "Escape") setEditingLabelVPId(null);
                            }}
                            placeholder="Ex: Grupo A, Equipe Vermelha…"
                            maxLength={40}
                            className="h-8 text-xs"
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { updateVPGroupLabel(vp.id, labelDraft); setEditingLabelVPId(null); }} title="Salvar" aria-label="Salvar rótulo">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setEditingLabelVPId(null)} title="Cancelar" aria-label="Cancelar">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {vp.group_label
                            ? <StatusBadge tone="accent">{vp.group_label}</StatusBadge>
                            : <span className="text-xs italic text-muted-foreground">Sem rótulo de grupo</span>}
                          <Button size="sm" variant="ghost" className="ml-auto h-7 px-2 text-xs" onClick={() => { setLabelDraft(vp.group_label || ""); setEditingLabelVPId(vp.id); }}>
                            <Pencil className="h-3 w-3" />{vp.group_label ? "Editar rótulo" : "Adicionar rótulo"}
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Alunos atribuídos */}
                    <div className="rounded-lg border border-dashed bg-sunken/50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <UsersRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm font-medium">{assigned.length === 0 ? "Nenhum aluno atribuído" : `${assigned.length} aluno(s) atribuído(s)`}</span>
                          {mode && <StatusBadge tone="neutral">{mode}</StatusBadge>}
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={() => openAssignDialog(vp)}>
                          <UserCog className="h-3.5 w-3.5" />Atribuir
                        </Button>
                      </div>
                      {assigned.length > 0 && <p className="mt-1.5 truncate text-xs text-muted-foreground">{assigned.map((a) => a.student_name).join(", ")}</p>}
                    </div>

                    {assigned.length > 1 && vp.mode !== "treino" && (
                      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                        <Checkbox checked={!!vp.group_roles} onCheckedChange={(c) => toggleGroupRoles(vp, c === true)} className="mt-0.5" />
                        <span>
                          <span className="font-medium">Dividir funções no grupo</span>
                          <span className="block text-xs text-muted-foreground">
                            Um conduz a conversa e outro registra a ficha, com rodízio entre os encontros. Cada aluno precisa usar o próprio dispositivo.
                          </span>
                        </span>
                      </label>
                    )}

                    <div className="flex items-center justify-between gap-3 border-t pt-3">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono text-sm font-medium uppercase tracking-widest">{vp.access_code}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyPin(vp.access_code)} aria-label="Copiar PIN">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleVPStatus(vp)} title={vp.status === "active" ? "Desativar" : "Ativar"} aria-label={vp.status === "active" ? "Desativar" : "Ativar"}>
                          {vp.status === "active" ? <ToggleRight className="h-5 w-5 text-success" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/virtual-patients/analytics`)} title="Ver resultados" aria-label="Ver resultados">
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => askRemoveVP(vp)} title="Remover da turma" aria-label="Remover da turma">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Integrantes */}
      <section>
        <SectionHeader
          icon={UsersRound}
          title="Integrantes"
          count={students.length}
          action={<Button variant="outline" size="sm" onClick={openManageStudents}><UserPlus className="h-4 w-4" />Gerenciar alunos</Button>}
        />
        {studentsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : students.length === 0 ? (
          <Card className="shadow-none"><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhum aluno cadastrado nesta turma.</CardContent></Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Matrícula</TableHead><TableHead>Nome</TableHead><TableHead>E-mail</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.student_registration || "—"}</TableCell>
                    <TableCell className="font-medium">{s.student_name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.student_email || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>

      {/* Docente responsável */}
      <section>
        <p className="label-mono mb-3">Docente responsável</p>
        <Card className="shadow-none">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft font-heading text-sm font-medium text-accent-ink">{initials(profileName || "Professor")}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{profileName || "Professor"}</p>
              <p className="truncate text-xs text-muted-foreground">{profileEmail}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Remover paciente */}
      <AlertDialog open={!!removingVP} onOpenChange={(open) => !open && setRemovingVP(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover paciente da turma?</AlertDialogTitle>
            <AlertDialogDescription>
              {removingVP && removingVP.sessions > 0
                ? `Existem ${removingVP.sessions} sessão(ões) de alunos com este paciente. Remover apaga também as conversas e as notas dessas sessões, e não pode ser desfeito. Para só impedir novos acessos, desative o paciente em vez de removê-lo.`
                : "O paciente deixa de aparecer nesta turma e o PIN deixa de funcionar."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (removingVP) removeVP(removingVP.vp.id); setRemovingVP(null); }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vincular paciente */}
      <Dialog open={linkVPOpen} onOpenChange={setLinkVPOpen}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Vincular paciente virtual</DialogTitle></DialogHeader>
          <p className="mb-4 text-sm text-muted-foreground">Selecione um paciente para vincular a esta turma. Um PIN será gerado automaticamente.</p>
          <div className="mb-4">
            <Label className="text-xs font-semibold">Profissão do aluno nesta atividade</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {VP_PROFESSIONS.map((p) => (
                <Button key={p.value} type="button" size="sm" variant={linkVPProfession === p.value ? "default" : "outline"} onClick={() => setLinkVPProfession(p.value)}>{p.label}</Button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Define o papel do aluno, o cenário e o gabarito usados na conversa e na correção. Não pode ser trocada depois de vinculado.
            </p>
          </div>
          <div className="mb-4">
            <Label className="text-xs font-semibold">Tipo da atividade</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <Button type="button" size="sm" variant={linkVPMode === "avaliativo" ? "default" : "outline"} onClick={() => setLinkVPMode("avaliativo")}>Avaliativo</Button>
              <Button type="button" size="sm" variant={linkVPMode === "treino" ? "default" : "outline"} onClick={() => setLinkVPMode("treino")}>Treino</Button>
            </div>
            {linkVPMode === "treino" ? (
              <>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {VP_DIFICULDADES.map((d) => (
                    <Button key={d.value} type="button" size="sm" variant={linkVPDificuldade === d.value ? "default" : "outline"} onClick={() => setLinkVPDificuldade(d.value)}>{d.label}</Button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Treino: individual, uma tentativa, feedback e nota liberados ao aluno assim que a correção termina. Não entra nas médias da turma nem na pesquisa. A dificuldade é só um selo informativo.
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-[11px] text-muted-foreground">Avaliativo: você libera o feedback depois, como hoje.</p>
            )}
          </div>
          <div className="space-y-2">
            {catalogDisponivel.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <StatusBadge tone="neutral">{p.module}</StatusBadge>
                    {p.isLegacy && <StatusBadge tone="accent">Legado</StatusBadge>}
                  </div>
                </div>
                <Button size="sm" onClick={() => linkVirtualPatient(p.id)}>Vincular</Button>
              </div>
            ))}
            {catalogDisponivel.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">Todos os pacientes já estão vinculados.</p>
            )}
            {vpCatalog.some((p) => !p.published) && (
              <div className="rounded-lg border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
                <strong>{vpCatalog.filter((p) => !p.published).length} caso(s) em rascunho não aparecem aqui.</strong>{" "}
                Abra o caso em Pacientes Virtuais, revise e publique para poder vinculá-lo à turma:{" "}
                {vpCatalog.filter((p) => !p.published).map((p) => p.label).join("; ")}.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Atribuir alunos */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Atribuir alunos ao paciente virtual</DialogTitle></DialogHeader>
          {assigningVP && (
            <p className="mb-3 text-sm text-muted-foreground">
              <strong>{getVPInfo(assigningVP.patient_id)?.name || assigningVP.patient_id}</strong>.{" "}
              {assigningVP.mode === "treino"
                ? <>Paciente de <strong>treino</strong>: cada aluno atribuído treina <strong>individualmente</strong>, com o próprio e-mail, e vários alunos podem treinar o mesmo paciente. Um aluno pode ser atribuído a mais de um paciente de treino.</>
                : <>Selecione 1 aluno para atendimento <strong>individual</strong> ou 2+ alunos para atendimento <strong>em grupo</strong>. Cada aluno só pode ser atribuído a um único paciente avaliativo nesta turma.</>}
            </p>
          )}
          <div className="max-h-[50vh] space-y-1 overflow-y-auto rounded-md border p-2">
            {students.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Nenhum aluno cadastrado nesta turma.</p>}
            {students.map((s) => {
              // Treino não conflita com nada: o aluno pode treinar vários pacientes. No avaliativo, só os outros avaliativos contam.
              const otherAssignment = assigningVP?.mode === "treino" ? undefined : vpAssignments.find(
                (a) => a.class_student_id === s.id && a.class_virtual_patient_id !== assigningVP?.id && !isTreinoVP(a.class_virtual_patient_id),
              );
              const otherVP = otherAssignment ? classVPs.find((v) => v.id === otherAssignment.class_virtual_patient_id) : null;
              const otherVPName = otherVP ? getVPInfo(otherVP.patient_id)?.name : null;
              const noEmail = !s.student_email;
              const disabled = !!otherAssignment || noEmail;
              const checked = assignSelectedIds.has(s.id);
              return (
                <div
                  key={s.id}
                  className={`flex items-center justify-between gap-2 rounded-md p-2 ${disabled ? "opacity-60" : "cursor-pointer hover:bg-muted/50"}`}
                  onClick={() => !disabled && toggleAssignStudent(s.id)}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Checkbox checked={checked} disabled={disabled} onCheckedChange={() => !disabled && toggleAssignStudent(s.id)} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.student_name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{s.student_email || <span className="italic">sem e-mail (não pode ser atribuído)</span>}</p>
                    </div>
                  </div>
                  {otherAssignment && <StatusBadge tone="neutral" className="shrink-0">Em: {otherVPName || "outro paciente"}</StatusBadge>}
                </div>
              );
            })}
          </div>
          <DialogFooter className="mt-3">
            <div className="flex w-full items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {assignSelectedIds.size === 0 && "Nenhum selecionado"}
                {assigningVP?.mode === "treino" && assignSelectedIds.size > 0 && `${assignSelectedIds.size} aluno(s) → treino individual`}
                {assigningVP?.mode !== "treino" && assignSelectedIds.size === 1 && "1 aluno → atendimento individual"}
                {assigningVP?.mode !== "treino" && assignSelectedIds.size > 1 && `${assignSelectedIds.size} alunos → atendimento em grupo`}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setAssignDialogOpen(false)} disabled={assignSaving}>Cancelar</Button>
                <Button onClick={saveAssignments} disabled={assignSaving}>
                  {assignSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Salvar
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vincular prova */}
      <Dialog open={linkExamOpen} onOpenChange={setLinkExamOpen}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Vincular prova online</DialogTitle></DialogHeader>
          <p className="mb-4 text-sm text-muted-foreground">Selecione uma prova para vincular a esta turma.</p>
          <div className="space-y-2">
            {availableExams.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma prova disponível para vínculo. Salve uma prova sem turma em "Minhas Provas" ou desvincule uma prova já associada.</p>
            ) : (
              availableExams.map((exam) => (
                <div key={exam.id} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{exam.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(exam.created_at).toLocaleDateString("pt-BR")}</p>
                    <div className="mt-2">
                      <StatusBadge tone={exam.publication?.is_active ? "ok" : "neutral"}>
                        {exam.publication?.is_active ? `PIN ${exam.publication.access_code.toUpperCase()}` : "Sem publicação"}
                      </StatusBadge>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => linkExamToClass(exam.id)}>Vincular</Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Gerenciar alunos */}
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
                Importar {batchText.trim().split("\n").filter((l) => l.trim()).length} aluno(s)
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
    </div>
  );
}
