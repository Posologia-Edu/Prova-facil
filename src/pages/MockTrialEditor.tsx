import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Users, FileText, Sparkles, Copy, Shuffle, Gavel, ClipboardList, BarChart3, Upload, X, Pencil, RefreshCw, CheckCircle2, Library, Save, Loader2, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import FormBuilder from "@/components/forms/FormBuilder";
import type { FormField } from "@/components/forms/types";
import { generateDistribution } from "@/lib/mock-trial-distribution";
import ModuleHelpGuide from "@/components/ModuleHelpGuide";
import { MockTrialEvaluationForm } from "@/components/mock-trial/MockTrialEvaluationForm";
import { ensureEvaluationForms, consolidateScores } from "@/lib/mock-trial-evaluations";
import { ROLE_LABELS as EVAL_ROLE_LABELS } from "@/lib/mock-trial-evaluation-templates";
import { ResultsPanel } from "@/components/mock-trial/ResultsPanel";
import { MockTrialCaseBankDialog } from "@/components/mock-trial/MockTrialCaseBankDialog";
import { CaseImagesPanel } from "@/components/mock-trial/CaseImagesPanel";
import { WitnessesEditor } from "@/components/mock-trial/WitnessesEditor";

export default function MockTrialEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Trial data
  const { data: trial, isLoading } = useQuery({
    queryKey: ["mock-trial", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mock_trials").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Cases
  const { data: cases = [], refetch: refetchCases } = useQuery({
    queryKey: ["mock-trial-cases", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mock_trial_cases").select("*").eq("mock_trial_id", id!).order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Groups
  const { data: groups = [], refetch: refetchGroups, isFetched: groupsFetched } = useQuery({
    queryKey: ["mock-trial-groups", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mock_trial_groups").select("*").eq("mock_trial_id", id!).order("group_number");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Students
  const { data: students = [], refetch: refetchStudents } = useQuery({
    queryKey: ["mock-trial-students", id, groups],
    queryFn: async () => {
      if (groups.length === 0) return [];
      const groupIds = groups.map(g => g.id);
      const { data, error } = await supabase.from("mock_trial_students").select("*").in("group_id", groupIds).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: groups.length > 0,
  });

  // Assignments
  const { data: assignments = [], refetch: refetchAssignments } = useQuery({
    queryKey: ["mock-trial-assignments", id, cases],
    queryFn: async () => {
      if (cases.length === 0) return [];
      const caseIds = cases.map(c => c.id);
      const { data, error } = await supabase.from("mock_trial_assignments").select("*").in("case_id", caseIds);
      if (error) throw error;
      return data;
    },
    enabled: cases.length > 0,
  });

  // Forms
  const { data: forms = [], refetch: refetchForms } = useQuery({
    queryKey: ["mock-trial-forms", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mock_trial_forms").select("*").eq("mock_trial_id", id!).order("created_at");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  // Sessions (one per case)
  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ["mock-trial-sessions", id, cases.length],
    queryFn: async () => {
      if (cases.length === 0) return [];
      const caseIds = cases.map(c => c.id);
      const { data, error } = await supabase
        .from("mock_trial_sessions")
        .select("*")
        .in("case_id", caseIds);
      if (error) throw error;
      return data || [];
    },
    enabled: cases.length > 0,
  });

  // Responses (FIX: query keyed on form ids, refetched on realtime)
  const { data: responses = [], refetch: refetchResponses } = useQuery({
    queryKey: ["mock-trial-responses", id, forms.map((f: any) => f.id).join(",")],
    queryFn: async () => {
      if (forms.length === 0) return [];
      const formIds = forms.map((f: any) => f.id);
      const { data, error } = await supabase
        .from("mock_trial_responses")
        .select("*")
        .in("form_id", formIds)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
    enabled: forms.length > 0,
  });

  // Evaluations (judge / teacher / ai_jury)
  const { data: evaluations = [], refetch: refetchEvaluations } = useQuery({
    queryKey: ["mock-trial-evaluations", id, cases.length],
    queryFn: async () => {
      if (cases.length === 0) return [];
      const caseIds = cases.map(c => c.id);
      const { data, error } = await supabase
        .from("mock_trial_evaluations")
        .select("*")
        .in("case_id", caseIds);
      if (error) throw error;
      return data || [];
    },
    enabled: cases.length > 0,
  });

  // Evaluation forms (judge / teacher templates)
  const { data: evaluationForms = [], refetch: refetchEvaluationForms } = useQuery({
    queryKey: ["mock-trial-evaluation-forms", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mock_trial_evaluation_forms")
        .select("*")
        .eq("mock_trial_id", id!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Realtime: refresh responses + evaluations live
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`mt-editor-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "mock_trial_responses" }, () => {
        refetchResponses();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "mock_trial_evaluations" }, () => {
        refetchEvaluations();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, refetchResponses, refetchEvaluations]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [judgeName, setJudgeName] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [selectedGroupForAdd, setSelectedGroupForAdd] = useState<string>("");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiObjectives, setAiObjectives] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPdfFile, setAiPdfFile] = useState<File | null>(null);
  const [aiPdfExtracting, setAiPdfExtracting] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editingCaseContent, setEditingCaseContent] = useState("");
  const [regeneratingCaseId, setRegeneratingCaseId] = useState<string | null>(null);
  const [formDrafts, setFormDrafts] = useState<Record<string, FormField[]>>({});
  const formSaveTimersRef = useRef<Record<string, number>>({});
  const [bankOpen, setBankOpen] = useState(false);
  const [savingToBankId, setSavingToBankId] = useState<string | null>(null);

  const saveCaseToBank = async (c: any) => {
    setSavingToBankId(c.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar autenticado");
        return;
      }
      const { error } = await (supabase as any).from("mock_trial_case_bank").insert({
        user_id: user.id,
        title: c.title || "Processo sem título",
        case_number: c.case_number || null,
        learning_objectives: c.learning_objectives || null,
        process_content: c.process_content || "",
        characters_json: c.characters_json || [],
        source_case_id: c.id,
      });
      if (error) throw error;
      toast.success("Processo salvo no banco — disponível para reuso em outros Júris Simulados");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar no banco");
    } finally {
      setSavingToBankId(null);
    }
  };

  useEffect(() => {
    if (trial) {
      setTitle(trial.title);
      setDescription(trial.description || "");
      setJudgeName(trial.judge_name || "");
    }
  }, [trial]);

  // Garantir templates de avaliação (juiz/professor)
  useEffect(() => {
    if (id) {
      ensureEvaluationForms(id).then(() => refetchEvaluationForms());
    }
  }, [id, refetchEvaluationForms]);

  useEffect(() => {
    setFormDrafts((prev) => {
      const next: Record<string, FormField[]> = {};
      for (const form of forms) {
        next[form.id] = prev[form.id] ?? ((form.fields_json || []) as FormField[]);
      }
      return next;
    });
  }, [forms]);

  useEffect(() => {
    return () => {
      Object.values(formSaveTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  // Auto-save trial metadata
  const saveTrial = useCallback(async (updates: Record<string, any>) => {
    if (!id) return;
    await supabase.from("mock_trials").update(updates).eq("id", id);
  }, [id]);

  useEffect(() => {
    if (!trial) return;
    const timer = setTimeout(() => {
      saveTrial({ title, description, judge_name: judgeName });
    }, 800);
    return () => clearTimeout(timer);
  }, [title, description, judgeName, saveTrial, trial]);

  // CASES
  const addCase = async () => {
    if (!id) return;
    const position = cases.length;
    const { error } = await supabase.from("mock_trial_cases").insert({
      mock_trial_id: id,
      position,
      case_number: `${String(position + 1).padStart(3, "0")}/${new Date().getFullYear()}`,
      title: `Processo ${position + 1}`,
    });
    if (error) toast.error("Erro ao adicionar processo");
    else refetchCases();
  };

  const deleteCase = async (caseId: string) => {
    await supabase.from("mock_trial_cases").delete().eq("id", caseId);
    refetchCases();
  };

  const saveCaseContent = async (caseId: string, content: string) => {
    await supabase.from("mock_trial_cases").update({ process_content: content }).eq("id", caseId);
    refetchCases();
    toast.success("Processo salvo");
  };

  const extractPdfText = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Send as base64 to edge function for extraction
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsDataURL(file);
    });
  };

  // ---- Job-based generation (async, multi-step, validated) ----
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<any>(null);

  // On mount / trial change: resume tracking any in-flight job for this trial
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("mock_trial_generation_jobs")
        .select("*")
        .eq("mock_trial_id", id)
        .in("status", ["queued", "planning", "generating_section", "generating_annex", "assembling"])
        .order("created_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      const job = (data || [])[0];
      if (job) {
        setActiveJobId(job.id);
        setJobProgress(job);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);


    let cancelled = false;
    const fetchJob = async () => {
      const { data } = await (supabase as any)
        .from("mock_trial_generation_jobs")
        .select("*")
        .eq("id", activeJobId)
        .single();
      if (cancelled || !data) return;
      setJobProgress(data);
      if (data.status === "completed") {
        toast.success("Processo gerado com sucesso!");
        setActiveJobId(null);
        setRegeneratingCaseId(null);
        setAiGenerating(false);
        setAiDialogOpen(false);
        setAiObjectives("");
        setAiPdfFile(null);
        refetchCases();
      } else if (data.status === "failed") {
        toast.error(data.last_error || "Falha na geração do processo");
        setActiveJobId(null);
        setRegeneratingCaseId(null);
        setAiGenerating(false);
      }
    };
    fetchJob();
    const ch = supabase
      .channel(`mt-job-${activeJobId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "mock_trial_generation_jobs",
        filter: `id=eq.${activeJobId}`,
      }, (payload) => {
        setJobProgress(payload.new);
        const s = (payload.new as any).status;
        if (s === "completed" || s === "failed") fetchJob();
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [activeJobId, refetchCases]);

  const generateWithAI = async () => {
    if (!aiObjectives.trim() && !aiPdfFile) {
      toast.error("Informe os objetivos ou envie um PDF");
      return;
    }
    setAiGenerating(true);
    try {
      let pdfContent: string | undefined;
      if (aiPdfFile) {
        pdfContent = await extractPdfText(aiPdfFile);
      }
      const caseNumber = `${String(cases.length + 1).padStart(3, "0")}/${new Date().getFullYear()}`;
      const { data, error } = await supabase.functions.invoke("mock-trial-job", {
        body: {
          mockTrialId: id,
          mode: "create",
          learningObjectives: aiObjectives,
          caseNumber,
          pdfContent,
        },
      });
      if (error || !data?.jobId) {
        throw new Error(error?.message || data?.error || "Falha ao iniciar geração");
      }
      setActiveJobId(data.jobId);
      toast.info("Geração iniciada — acompanhe o progresso na tela");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar processo");
      setAiGenerating(false);
    }
  };

  const regenerateCase = async (existingCase: any) => {
    const objectives = (existingCase.learning_objectives || "").trim();
    if (!objectives) {
      toast.error("Este processo não tem objetivos de aprendizagem salvos. Edite-o ou gere um novo.");
      return;
    }
    if (!confirm(`Substituir o conteúdo do processo "${existingCase.title}" por uma nova geração de IA? O conteúdo atual será perdido.`)) {
      return;
    }
    setRegeneratingCaseId(existingCase.id);
    try {
      const { data, error } = await supabase.functions.invoke("mock-trial-job", {
        body: {
          mockTrialId: id,
          caseId: existingCase.id,
          mode: "regenerate",
          learningObjectives: objectives,
          caseNumber: existingCase.case_number,
        },
      });
      if (error || !data?.jobId) {
        throw new Error(error?.message || data?.error || "Falha ao iniciar regeneração");
      }
      setActiveJobId(data.jobId);
      toast.info("Regeneração iniciada — acompanhe o progresso na tela");
    } catch (e: any) {
      toast.error(e.message || "Erro ao regenerar processo");
      setRegeneratingCaseId(null);
    }
  };


  const initGroupsRanRef = useRef(false);
  const initGroups = async () => {
    if (!id || initGroupsRanRef.current) return;
    initGroupsRanRef.current = true;
    const inserts = Array.from({ length: 5 }, (_, i) => ({
      mock_trial_id: id,
      group_number: i + 1,
      name: `Grupo ${i + 1}`,
    }));
    // ON CONFLICT DO NOTHING via unique constraint (mock_trial_id, group_number)
    await supabase.from("mock_trial_groups").upsert(inserts, { onConflict: "mock_trial_id,group_number", ignoreDuplicates: true });
    refetchGroups();
  };

  useEffect(() => {
    if (id && groupsFetched && groups.length === 0 && !initGroupsRanRef.current) {
      initGroups();
    }
  }, [id, groupsFetched, groups.length]);

  const addStudent = async () => {
    if (!newStudentName.trim() || !selectedGroupForAdd) return;
    const { error } = await supabase.from("mock_trial_students").insert({
      group_id: selectedGroupForAdd,
      student_name: newStudentName.trim(),
      student_email: newStudentEmail.trim() || null,
    });
    if (error) toast.error("Erro ao adicionar aluno");
    else {
      setNewStudentName("");
      setNewStudentEmail("");
      refetchStudents();
    }
  };

  const removeStudent = async (studentId: string) => {
    await supabase.from("mock_trial_students").delete().eq("id", studentId);
    refetchStudents();
  };

  const moveStudent = async (studentId: string, newGroupId: string) => {
    await supabase.from("mock_trial_students").update({ group_id: newGroupId }).eq("id", studentId);
    refetchStudents();
  };

  const deleteGroup = async (groupId: string) => {
    const grp = groups.find(g => g.id === groupId);
    const studentCount = students.filter(s => s.group_id === groupId).length;
    const confirmMsg = studentCount > 0
      ? `Excluir "${grp?.name}"? Os ${studentCount} aluno(s) deste grupo também serão removidos e as distribuições do grupo serão apagadas.`
      : `Excluir "${grp?.name}"? Distribuições associadas serão apagadas.`;
    if (!window.confirm(confirmMsg)) return;
    // Cascade manually: students, assignments, then group
    await supabase.from("mock_trial_students").delete().eq("group_id", groupId);
    await supabase.from("mock_trial_assignments").delete().eq("group_id", groupId);
    const { error } = await supabase.from("mock_trial_groups").delete().eq("id", groupId);
    if (error) { toast.error("Erro ao excluir grupo: " + error.message); return; }
    toast.success("Grupo excluído");
    refetchGroups();
    refetchStudents();
    refetchAssignments();
  };

  // DISTRIBUTION
  const generateAutoDistribution = async () => {
    if (groups.length < 3 || cases.length === 0) {
      toast.error("Necessário pelo menos 3 grupos e 1 processo");
      return;
    }

    // Delete existing
    const caseIds = cases.map(c => c.id);
    await supabase.from("mock_trial_assignments").delete().in("case_id", caseIds);

    const dist = generateDistribution(
      groups.map(g => ({ id: g.id, group_number: g.group_number })),
      cases.map(c => ({ id: c.id, position: c.position }))
    );

    const inserts = dist.flatMap(d =>
      d.assignments.map(a => ({
        case_id: d.caseId,
        group_id: a.groupId,
        role: a.role,
      }))
    );

    const { error } = await supabase.from("mock_trial_assignments").insert(inserts);
    if (error) toast.error("Erro ao gerar distribuição");
    else {
      toast.success("Distribuição gerada!");
      refetchAssignments();
    }
  };

  // FORMS
  const addForm = async (targetRole: string) => {
    if (!id) return;
    const roleLabels: Record<string, string> = { prosecution: "Acusação", defense: "Defesa", jury: "Júri" };
    const { error } = await supabase.from("mock_trial_forms").insert({
      mock_trial_id: id,
      target_role: targetRole,
      title: `Formulário - ${roleLabels[targetRole] || targetRole}`,
    });
    if (error) toast.error("Erro ao criar formulário");
    else refetchForms();
  };

  const deleteForm = async (formId: string) => {
    await supabase.from("mock_trial_forms").delete().eq("id", formId);
    refetchForms();
  };

  const saveFormFields = (formId: string, fields: FormField[]) => {
    setFormDrafts((prev) => ({ ...prev, [formId]: fields }));

    const existingTimer = formSaveTimersRef.current[formId];
    if (existingTimer) window.clearTimeout(existingTimer);

    formSaveTimersRef.current[formId] = window.setTimeout(async () => {
      const { error } = await supabase
        .from("mock_trial_forms")
        .update({ fields_json: fields as any })
        .eq("id", formId);

      if (error) {
        toast.error("Erro ao salvar formulário");
        return;
      }

      queryClient.setQueryData(["mock-trial-forms", id], (current: any[] | undefined) =>
        current?.map((form) => (form.id === formId ? { ...form, fields_json: fields } : form)) || []
      );

      delete formSaveTimersRef.current[formId];
    }, 500);
  };

  const roleLabels: Record<string, string> = { prosecution: "Acusação", defense: "Defesa", jury: "Júri" };

  const accessCode = trial?.access_code || "";
  const judgeLink = trial ? `${window.location.origin}/mock-trial/judge/${accessCode}` : "";

  if (isLoading) return <div className="p-6"><div className="animate-pulse h-8 bg-muted rounded w-1/3" /></div>;

  return (
    <div className="p-6 space-y-6">
      <ModuleHelpGuide moduleKey="mock_trial" />
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/mock-trials")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div className="flex-1">
          <Input value={title} onChange={e => setTitle(e.target.value)} className="text-xl font-bold border-none px-0 focus-visible:ring-0" placeholder="Título do Júri Simulado" />
        </div>
        <Badge variant={trial?.status === "active" ? "default" : trial?.status === "finished" ? "outline" : "secondary"}>
          {trial?.status === "active" ? "Ativo" : trial?.status === "finished" ? "Finalizado" : "Rascunho"}
        </Badge>
        {trial?.status !== "active" ? (
          <Button
            size="sm"
            onClick={async () => {
              const { error } = await supabase.from("mock_trials").update({ status: "active" }).eq("id", id!);
              if (error) { toast.error("Erro ao ativar"); return; }
              toast.success("Júri Simulado ativado! Os alunos já podem acessar.");
              queryClient.invalidateQueries({ queryKey: ["mock-trial", id] });
            }}
          >
            <Gavel className="h-4 w-4 mr-1" /> Ativar
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const { error } = await supabase.from("mock_trials").update({ status: "draft" }).eq("id", id!);
              if (error) { toast.error("Erro ao desativar"); return; }
              toast.success("Júri Simulado desativado");
              queryClient.invalidateQueries({ queryKey: ["mock-trial", id] });
            }}
          >
            Desativar
          </Button>
        )}
      </div>

      <Tabs defaultValue="cases" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="cases"><FileText className="h-4 w-4 mr-1" />Processos</TabsTrigger>
          <TabsTrigger value="groups"><Users className="h-4 w-4 mr-1" />Grupos</TabsTrigger>
          <TabsTrigger value="distribution"><Shuffle className="h-4 w-4 mr-1" />Distribuição</TabsTrigger>
          <TabsTrigger value="forms"><ClipboardList className="h-4 w-4 mr-1" />Formulários</TabsTrigger>
          <TabsTrigger value="judge"><Gavel className="h-4 w-4 mr-1" />Painel do Juiz</TabsTrigger>
          <TabsTrigger value="results"><BarChart3 className="h-4 w-4 mr-1" />Resultados</TabsTrigger>
        </TabsList>

        {/* PROCESSOS TAB */}
        <TabsContent value="cases" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={addCase} disabled={!!activeJobId}><Plus className="h-4 w-4 mr-1" />Adicionar Processo</Button>
            <Button variant="secondary" onClick={() => setAiDialogOpen(true)} disabled={!!activeJobId}>
              <Sparkles className="h-4 w-4 mr-1" />
              {activeJobId ? "Gerando..." : "Gerar com IA"}
            </Button>
            <Button variant="outline" onClick={() => setBankOpen(true)} disabled={!!activeJobId}>
              <Library className="h-4 w-4 mr-1" />Banco de Processos
            </Button>
          </div>

          {activeJobId && jobProgress && (
            <Card className="border-primary/40 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  {jobProgress.mode === "regenerate" ? "Regenerando processo" : "Gerando novo processo"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{jobProgress.current_step || "Aguardando…"}</span>
                  <span className="font-mono">{Math.min(100, Math.round(jobProgress.progress || 0))}%</span>
                </div>
                <Progress value={Math.min(100, jobProgress.progress || 0)} />
                {typeof jobProgress.completed_steps === "number" && typeof jobProgress.total_steps === "number" && jobProgress.total_steps > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Etapa {jobProgress.completed_steps} de {jobProgress.total_steps} • Status: {jobProgress.status}
                  </p>
                )}
                {Array.isArray(jobProgress.validation_issues) && jobProgress.validation_issues.length > 0 && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-300 flex gap-2">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <div>
                      <strong>Avisos de validação:</strong>
                      <ul className="list-disc ml-4 mt-1 space-y-0.5">
                        {jobProgress.validation_issues.slice(-5).map((iss: string, i: number) => (
                          <li key={i}>{iss}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  A geração roda em segundo plano (até ~6 min). Você pode navegar por outras abas — o progresso continua.
                </p>
              </CardContent>
            </Card>
          )}

          {cases.map((c: any) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex-1 min-w-[260px] space-y-1">
                    <Input
                      value={c.title || ""}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        queryClient.setQueryData(["mock-trial-cases", id], (curr: any[] | undefined) =>
                          curr?.map(x => x.id === c.id ? { ...x, title: newTitle } : x) || []
                        );
                      }}
                      onBlur={async (e) => {
                        await supabase.from("mock_trial_cases").update({ title: e.target.value }).eq("id", c.id);
                      }}
                      className="text-base font-semibold border-none px-0 focus-visible:ring-0 h-auto"
                      placeholder="Título do processo"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Processo nº</span>
                      <Input
                        value={c.case_number || ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          queryClient.setQueryData(["mock-trial-cases", id], (curr: any[] | undefined) =>
                            curr?.map(x => x.id === c.id ? { ...x, case_number: v } : x) || []
                          );
                        }}
                        onBlur={async (e) => {
                          await supabase.from("mock_trial_cases").update({ case_number: e.target.value }).eq("id", c.id);
                        }}
                        className="h-7 text-xs w-40"
                        placeholder="000/2026"
                      />
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => { setEditingCaseId(c.id); setEditingCaseContent(c.process_content || ""); }}>
                      <FileText className="h-3 w-3 mr-1" />Editar Processo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => regenerateCase(c)}
                      disabled={regeneratingCaseId === c.id || !!activeJobId || !c.learning_objectives}
                      title={c.learning_objectives ? "Substituir o conteúdo deste processo por uma nova geração de IA" : "Sem objetivos de aprendizagem salvos para regenerar"}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {regeneratingCaseId === c.id ? "Regenerando..." : "Regerar com IA"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveCaseToBank(c)}
                      disabled={savingToBankId === c.id || !c.process_content}
                      title="Salvar este processo no banco para reutilizar em outros Júris Simulados"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      {savingToBankId === c.id ? "Salvando..." : "Salvar no banco"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteCase(c.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <WitnessesEditor
                  caseId={c.id}
                  characters={(c.characters_json as any[]) || []}
                  onChange={(updated) => {
                    queryClient.setQueryData(["mock-trial-cases", id], (curr: any[] | undefined) =>
                      curr?.map(x => x.id === c.id ? { ...x, characters_json: updated } : x) || []
                    );
                  }}
                />
                {c.process_content && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{c.process_content.substring(0, 200)}...</p>
                )}
                <CaseImagesPanel caseId={c.id} />
              </CardContent>
            </Card>
          ))}

          {/* AI Generation Dialog */}
          <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Gerar Processo com IA</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Objetivos de Aprendizagem</Label>
                  <Textarea value={aiObjectives} onChange={e => setAiObjectives(e.target.value)} placeholder="Descreva os objetivos de aprendizagem para o caso clínico..." rows={4} />
                </div>
                <div>
                  <Label>PDF de Referência (opcional)</Label>
                  <div className="mt-1.5">
                    {aiPdfFile ? (
                      <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/50">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm truncate flex-1">{aiPdfFile.name}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setAiPdfFile(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 p-4 rounded-md border-2 border-dashed cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Clique para enviar um PDF da aula</span>
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 20 * 1024 * 1024) {
                                toast.error("Arquivo muito grande (máx. 20MB)");
                                return;
                              }
                              setAiPdfFile(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <Button onClick={generateWithAI} disabled={aiGenerating || !!activeJobId || (!aiObjectives.trim() && !aiPdfFile)} className="w-full">
                  {aiGenerating || activeJobId ? "Gerando…" : "Gerar Processo"}
                  <Sparkles className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Case Content Dialog */}
          <Dialog open={!!editingCaseId} onOpenChange={(open) => { if (!open) setEditingCaseId(null); }}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Editar Processo</DialogTitle>
              </DialogHeader>
              <Textarea value={editingCaseContent} onChange={e => setEditingCaseContent(e.target.value)} rows={20} className="font-mono text-sm" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingCaseId(null)}>Cancelar</Button>
                <Button onClick={() => { saveCaseContent(editingCaseId!, editingCaseContent); setEditingCaseId(null); }}>Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Banco de Processos */}
          <MockTrialCaseBankDialog
            open={bankOpen}
            onOpenChange={setBankOpen}
            mockTrialId={id!}
            nextPosition={cases.length}
            onImported={() => refetchCases()}
          />
        </TabsContent>

        {/* GRUPOS TAB */}
        <TabsContent value="groups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar Aluno</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 items-end flex-wrap">
                <div className="flex-1 min-w-[150px]">
                  <Label>Nome</Label>
                  <Input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} placeholder="Nome do aluno" />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <Label>Email</Label>
                  <Input value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)} placeholder="email@exemplo.com" />
                </div>
                <div className="w-40">
                  <Label>Grupo</Label>
                  <Select value={selectedGroupForAdd} onValueChange={setSelectedGroupForAdd}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addStudent} disabled={!newStudentName.trim() || !selectedGroupForAdd}>
                  <Plus className="h-4 w-4 mr-1" />Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {groups.map(g => {
              const groupStudents = students.filter(s => s.group_id === g.id);
              return (
                <Card key={g.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm truncate">{g.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{groupStudents.length} aluno(s)</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteGroup(g.id)}
                        title="Excluir grupo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {groupStudents.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                        <div className="truncate flex-1">
                          <p className="font-medium text-xs">{s.student_name}</p>
                          {s.student_email && <p className="text-xs text-muted-foreground truncate">{s.student_email}</p>}
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Select onValueChange={(val) => moveStudent(s.id, val)}>
                            <SelectTrigger className="h-6 w-6 p-0 border-none"><Shuffle className="h-3 w-3" /></SelectTrigger>
                            <SelectContent>
                              {groups.filter(og => og.id !== g.id).map(og => (
                                <SelectItem key={og.id} value={og.id}>{og.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => removeStudent(s.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {groupStudents.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Sem alunos</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* DISTRIBUIÇÃO TAB */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={generateAutoDistribution}>
              <Shuffle className="h-4 w-4 mr-1" />Gerar Distribuição Automática
            </Button>
          </div>

          {cases.length > 0 && groups.length > 0 && (
            <Card>
              <CardContent className="pt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Grupo</th>
                      {cases.map((c: any) => (
                        <th key={c.id} className="text-center p-2 font-medium">{c.title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(g => (
                      <tr key={g.id} className="border-b">
                        <td className="p-2 font-medium">{g.name}</td>
                        {cases.map((c: any) => {
                          const assignment = assignments.find((a: any) => a.case_id === c.id && a.group_id === g.id);
                          return (
                            <td key={c.id} className="text-center p-2">
                              {assignment ? (
                                <Badge variant={
                                  (assignment as any).role === "prosecution" ? "destructive" : 
                                  (assignment as any).role === "defense" ? "default" : "secondary"
                                }>
                                  {roleLabels[(assignment as any).role] || (assignment as any).role}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* FORMULÁRIOS TAB */}
        <TabsContent value="forms" className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => addForm("prosecution")} variant="destructive" size="sm">
              <Plus className="h-4 w-4 mr-1" />Formulário Acusação
            </Button>
            <Button onClick={() => addForm("defense")} size="sm">
              <Plus className="h-4 w-4 mr-1" />Formulário Defesa
            </Button>
            <Button onClick={() => addForm("jury")} variant="secondary" size="sm">
              <Plus className="h-4 w-4 mr-1" />Formulário Júri
            </Button>
          </div>

          {forms.map((form: any) => (
            <Card key={form.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{form.title}</CardTitle>
                    <Badge variant={
                      form.target_role === "prosecution" ? "destructive" :
                      form.target_role === "defense" ? "default" : "secondary"
                    }>
                      {roleLabels[form.target_role] || form.target_role}
                    </Badge>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteForm(form.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <FormBuilder
                  fields={(formDrafts[form.id] ?? form.fields_json ?? []) as FormField[]}
                  onChange={(fields) => saveFormFields(form.id, fields)}
                />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* PAINEL DO JUIZ TAB */}
        <TabsContent value="judge" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configurações do Juiz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome do(a) Juiz(a)</Label>
                <Input value={judgeName} onChange={e => setJudgeName(e.target.value)} placeholder="Nome do juiz" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição do júri simulado" rows={3} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acesso via Portal de Avaliação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>PIN de Acesso (alunos e juiz)</Label>
                <div className="flex gap-2">
                  <Input readOnly value={accessCode} className="font-mono uppercase tracking-widest text-center text-lg" />
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(accessCode); toast.success("PIN copiado!"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Alunos e juiz acessam pelo Portal de Avaliação informando email e este PIN.
                </p>
              </div>
              <div>
                <Label>Link direto do Juiz (opcional)</Label>
                <div className="flex gap-2">
                  <Input readOnly value={judgeLink} />
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(judgeLink); toast.success("Link copiado!"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RESULTADOS TAB */}
        <TabsContent value="results" className="space-y-6">
          <ResultsPanel
            cases={cases}
            groups={groups}
            assignments={assignments}
            forms={forms}
            responses={responses}
            evaluations={evaluations}
            sessions={sessions}
            evaluationForms={evaluationForms}
            onRefresh={() => { refetchEvaluations(); refetchResponses(); }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
