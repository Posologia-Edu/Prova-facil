import { useState, useEffect, useCallback } from "react";
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
import { ArrowLeft, Plus, Trash2, Users, FileText, Sparkles, Copy, Shuffle, Gavel, ClipboardList, BarChart3, Upload, X } from "lucide-react";
import FormBuilder from "@/components/forms/FormBuilder";
import type { FormField } from "@/components/forms/types";
import { generateDistribution } from "@/lib/mock-trial-distribution";

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
  const { data: groups = [], refetch: refetchGroups } = useQuery({
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

  // Responses
  const { data: responses = [] } = useQuery({
    queryKey: ["mock-trial-responses", id],
    queryFn: async () => {
      if (forms.length === 0) return [];
      const formIds = forms.map(f => f.id);
      const { data, error } = await supabase.from("mock_trial_responses").select("*").in("form_id", formIds).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: forms.length > 0,
  });

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

  useEffect(() => {
    if (trial) {
      setTitle(trial.title);
      setDescription(trial.description || "");
      setJudgeName(trial.judge_name || "");
    }
  }, [trial]);

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

  const generateWithAI = async () => {
    if (!aiObjectives.trim() && !aiPdfFile) {
      toast.error("Informe os objetivos ou envie um PDF");
      return;
    }
    setAiGenerating(true);
    try {
      let pdfBase64: string | undefined;
      if (aiPdfFile) {
        pdfBase64 = await extractPdfText(aiPdfFile);
      }

      const caseNumber = `${String(cases.length + 1).padStart(3, "0")}/${new Date().getFullYear()}`;
      const { data, error } = await supabase.functions.invoke("generate-mock-trial", {
        body: { learningObjectives: aiObjectives, caseNumber, pdfBase64 },
      });
      if (error) throw error;
      
      const { error: insertError } = await supabase.from("mock_trial_cases").insert({
        mock_trial_id: id!,
        position: cases.length,
        case_number: caseNumber,
        title: data.title || `Processo ${cases.length + 1}`,
        process_content: data.process_content,
        learning_objectives: aiObjectives,
        characters_json: data.characters || [],
      });
      if (insertError) throw insertError;

      toast.success("Processo gerado com sucesso!");
      setAiDialogOpen(false);
      setAiObjectives("");
      setAiPdfFile(null);
      refetchCases();
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar processo");
    } finally {
      setAiGenerating(false);
    }
  };

  // GROUPS
  const initGroups = async () => {
    if (!id || groups.length > 0) return;
    const inserts = Array.from({ length: 5 }, (_, i) => ({
      mock_trial_id: id,
      group_number: i + 1,
      name: `Grupo ${i + 1}`,
    }));
    await supabase.from("mock_trial_groups").insert(inserts);
    refetchGroups();
  };

  useEffect(() => {
    if (id && groups.length === 0 && !isLoading) {
      initGroups();
    }
  }, [id, groups.length, isLoading]);

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

  const saveFormFields = async (formId: string, fields: FormField[]) => {
    await supabase.from("mock_trial_forms").update({ fields_json: fields as any }).eq("id", formId);
    refetchForms();
  };

  const roleLabels: Record<string, string> = { prosecution: "Acusação", defense: "Defesa", jury: "Júri" };

  const judgeLink = trial ? `${window.location.origin}/mock-trial/judge/${id}` : "";
  const studentLink = trial ? `${window.location.origin}/mock-trial/student/${id}` : "";

  if (isLoading) return <div className="p-6"><div className="animate-pulse h-8 bg-muted rounded w-1/3" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/mock-trials")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div className="flex-1">
          <Input value={title} onChange={e => setTitle(e.target.value)} className="text-xl font-bold border-none px-0 focus-visible:ring-0" placeholder="Título do Júri Simulado" />
        </div>
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
          <div className="flex gap-2">
            <Button onClick={addCase}><Plus className="h-4 w-4 mr-1" />Adicionar Processo</Button>
            <Button variant="secondary" onClick={() => setAiDialogOpen(true)}><Sparkles className="h-4 w-4 mr-1" />Gerar com IA</Button>
          </div>

          {cases.map((c: any) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{c.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">Processo nº {c.case_number}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => { setEditingCaseId(c.id); setEditingCaseContent(c.process_content || ""); }}>
                      <FileText className="h-3 w-3 mr-1" />Editar Processo
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteCase(c.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {c.characters_json && (c.characters_json as any[]).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Personagens:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(c.characters_json as any[]).map((char: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-lg bg-muted/50 border">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={char.side === "prosecution" ? "destructive" : "default"}>
                              {char.side === "prosecution" ? "Acusação" : "Defesa"}
                            </Badge>
                            <span className="text-sm font-medium">{char.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{char.profession}</p>
                          {char.instructions && <p className="text-xs mt-1 line-clamp-3">{char.instructions}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {c.process_content && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{c.process_content.substring(0, 200)}...</p>
                )}
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
                  <Textarea value={aiObjectives} onChange={e => setAiObjectives(e.target.value)} placeholder="Descreva os objetivos de aprendizagem para o caso clínico..." rows={5} />
                </div>
                <Button onClick={generateWithAI} disabled={aiGenerating} className="w-full">
                  {aiGenerating ? "Gerando..." : "Gerar Processo"}
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
                    <CardTitle className="text-sm">{g.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{groupStudents.length} aluno(s)</p>
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
                  fields={(form.fields_json || []) as FormField[]}
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
              <CardTitle className="text-base">Links de Acesso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Link do Juiz</Label>
                <div className="flex gap-2">
                  <Input readOnly value={judgeLink} />
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(judgeLink); toast.success("Link copiado!"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Link dos Alunos</Label>
                <div className="flex gap-2">
                  <Input readOnly value={studentLink} />
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(studentLink); toast.success("Link copiado!"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RESULTADOS TAB */}
        <TabsContent value="results" className="space-y-4">
          {responses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Sem respostas ainda</h3>
                <p className="text-muted-foreground">As respostas aparecerão aqui após os alunos preencherem os formulários</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {forms.map((form: any) => {
                const formResponses = responses.filter((r: any) => r.form_id === form.id);
                return (
                  <Card key={form.id}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{form.title}</CardTitle>
                        <Badge variant="secondary">{formResponses.length} resposta(s)</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {formResponses.map((r: any) => (
                        <div key={r.id} className="p-3 border rounded mb-2">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium">{r.student_name || "Anônimo"}</span>
                            {r.student_email && <span className="text-xs text-muted-foreground">{r.student_email}</span>}
                          </div>
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(r.response_json, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
