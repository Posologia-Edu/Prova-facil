import { useState, useRef, useEffect } from "react";
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
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Users, FileText, Play, BookOpen, RotateCcw, Star, BookmarkPlus, FileDown } from "lucide-react";
import { exportFormToPDF } from "@/lib/form-pdf-export";
import FormBuilder from "@/components/forms/FormBuilder";
import type { FormField } from "@/components/forms/types";
import { nutritionModuleLabel, type NutritionModuleType } from "@/lib/nutrition-modules";
import FormTemplateDialog, { SaveAsTemplateDialog } from "@/components/forms/FormTemplateDialog";
import ModuleHelpGuide from "@/components/ModuleHelpGuide";

export default function NutritionEditor() {
  const { roomId, moduleType } = useParams<{ roomId: string; moduleType: string }>();
  const mt = (moduleType || "anamnese_nutricional") as NutritionModuleType;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ["nutrition-room", roomId],
    queryFn: async () => { const { data, error } = await supabase.from("nutrition_rooms").select("*").eq("id", roomId!).single(); if (error) throw error; return data; },
    enabled: !!roomId,
  });

  const { data: participants = [], refetch: refetchParticipants } = useQuery({
    queryKey: ["nutrition-participants", roomId],
    queryFn: async () => { const { data, error } = await supabase.from("nutrition_participants").select("*").eq("room_id", roomId!).order("pair_index", { ascending: true }); if (error) throw error; return data; },
    enabled: !!roomId,
  });

  const { data: forms = [], refetch: refetchForms } = useQuery({
    queryKey: ["nutrition-forms", roomId],
    queryFn: async () => { const { data, error } = await supabase.from("nutrition_forms").select("*").eq("room_id", roomId!).order("created_at", { ascending: true }); if (error) throw error; return data as any[]; },
    enabled: !!roomId,
  });

  const { data: clinicalCases = [], refetch: refetchCases } = useQuery({
    queryKey: ["nutrition-clinical-cases", roomId],
    queryFn: async () => { const { data, error } = await supabase.from("nutrition_clinical_cases").select("*").eq("room_id", roomId!).order("position", { ascending: true }); if (error) throw error; return data; },
    enabled: !!roomId,
  });

  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<string>("standard");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [answerKeyByCaseId, setAnswerKeyByCaseId] = useState<Record<string, FormField[]>>({});
  const [activeAnswerKeyCaseId, setActiveAnswerKeyCaseId] = useState("");
  const lastSavedSnapshotRef = useRef("");
  const skipNextAutoSaveRef = useRef(false);
  const [selectedForPairing, setSelectedForPairing] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCaseContent, setNewCaseContent] = useState("");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [saveTemplateForm, setSaveTemplateForm] = useState<any>(null);

  const students = participants.filter(p => p.participant_role === "student");
  const pairs = students.reduce((acc: Record<number, any[]>, p) => {
    if (p.pair_index >= 0) { acc[p.pair_index] = acc[p.pair_index] || []; acc[p.pair_index].push(p); }
    return acc;
  }, {});

  const addParticipant = async () => {
    if (!newName.trim()) return;
    await supabase.from("nutrition_participants").insert({ room_id: roomId!, student_name: newName.trim(), student_email: newEmail.trim(), pair_index: -1, pair_position: "X", participant_role: "student" });
    setNewName(""); setNewEmail(""); refetchParticipants();
  };

  const addCase = async () => {
    if (!newCaseTitle.trim()) return;
    await supabase.from("nutrition_clinical_cases").insert({ room_id: roomId!, title: newCaseTitle.trim(), content: newCaseContent.trim(), position: clinicalCases.length });
    setNewCaseTitle(""); setNewCaseContent(""); refetchCases();
    toast({ title: "Caso clínico adicionado" });
  };

  const deleteCase = async (id: string) => { await supabase.from("nutrition_clinical_cases").delete().eq("id", id); refetchCases(); };

  const saveForm = async (silent = false) => {
    const normalizedTitle = formTitle.trim();
    if (!normalizedTitle) return;
    const contentToSave = formType === "answer_key" ? { case_answers: answerKeyByCaseId } as any : formFields as any;
    const payload = { title: normalizedTitle, content_json: contentToSave, form_type: formType };
    if (editingFormId) { await supabase.from("nutrition_forms").update(payload).eq("id", editingFormId); }
    else { await supabase.from("nutrition_forms").insert({ ...payload, room_id: roomId! }); }
    const snapshotData = formType === "answer_key" ? { formType, title: normalizedTitle, content: answerKeyByCaseId } : { formType, title: normalizedTitle, content: formFields };
    lastSavedSnapshotRef.current = JSON.stringify(snapshotData);
    if (!silent) { setEditingFormId(null); setFormTitle(""); setFormFields([]); setFormType("standard"); setAnswerKeyByCaseId({}); setActiveAnswerKeyCaseId(""); refetchForms(); toast({ title: "Formulário salvo" }); }
  };

  useEffect(() => {
    if (!roomId || !editingFormId) return;
    if (!formTitle.trim() && formFields.length === 0 && Object.keys(answerKeyByCaseId).length === 0) return;
    const snapshotData = formType === "answer_key" ? { formType, title: formTitle, content: answerKeyByCaseId } : { formType, title: formTitle, content: formFields };
    const currentSnapshot = JSON.stringify(snapshotData);
    if (skipNextAutoSaveRef.current) { skipNextAutoSaveRef.current = false; lastSavedSnapshotRef.current = currentSnapshot; return; }
    if (currentSnapshot === lastSavedSnapshotRef.current) return;
    const timeout = window.setTimeout(() => { void saveForm(true); }, 800);
    return () => window.clearTimeout(timeout);
  }, [roomId, editingFormId, formType, formTitle, formFields, answerKeyByCaseId]);

  const editForm = (form: any) => {
    skipNextAutoSaveRef.current = true;
    setEditingFormId(form.id); setFormTitle(form.title); setFormType(form.form_type);
    if (form.form_type === "answer_key") {
      const content = form.content_json;
      if (content?.case_answers) { setAnswerKeyByCaseId(content.case_answers); setFormFields([]); setActiveAnswerKeyCaseId(clinicalCases.length > 0 ? clinicalCases[0].id : ""); lastSavedSnapshotRef.current = JSON.stringify({ formType: form.form_type, title: form.title, content: content.case_answers }); }
      else if (Array.isArray(content)) { const migrated: Record<string, FormField[]> = {}; if (clinicalCases.length > 0) { migrated[clinicalCases[0].id] = content; setActiveAnswerKeyCaseId(clinicalCases[0].id); } setAnswerKeyByCaseId(migrated); setFormFields([]); lastSavedSnapshotRef.current = JSON.stringify({ formType: form.form_type, title: form.title, content: migrated }); }
      else { setAnswerKeyByCaseId({}); setFormFields([]); }
    } else { setFormFields(Array.isArray(form.content_json) ? form.content_json : []); setAnswerKeyByCaseId({}); lastSavedSnapshotRef.current = JSON.stringify({ formType: form.form_type, title: form.title, content: form.content_json }); }
  };

  const deleteForm = async (id: string) => { await supabase.from("nutrition_forms").delete().eq("id", id); refetchForms(); };

  const activateRoom = async () => {
    const standardForm = forms.find((f: any) => f.form_type === "standard");
    if (!standardForm) { toast({ title: "Formulário necessário", description: "Cadastre um formulário antes de ativar.", variant: "destructive" }); return; }
    if (!students.length) { toast({ title: "Sem alunos", description: "Adicione alunos antes de ativar.", variant: "destructive" }); return; }
    await supabase.from("nutrition_rooms").update({ status: "active" }).eq("id", roomId!);
    toast({ title: "Sala ativada!" });
    queryClient.invalidateQueries({ queryKey: ["nutrition-room", roomId] });
  };

  if (roomLoading) return <p className="p-6 text-muted-foreground">Carregando...</p>;
  if (!room) return <p className="p-6">Sala não encontrada.</p>;

  const formTypeLabel: Record<string, string> = { standard: "Formulário", answer_key: "Espelho de Respostas" };

  return (
    <div className="space-y-6">
      <ModuleHelpGuide moduleKey={mt} />
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/nutrition")}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/30">{nutritionModuleLabel[mt]}</Badge>
            <h1 className="text-xl font-bold">{room.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground">PIN: {room.access_code} · Status: {room.status}</p>
        </div>
        {room.status === "draft" && <Button className="ml-auto" onClick={activateRoom}><Play className="h-4 w-4 mr-1" />Ativar Sala</Button>}
        {room.status === "active" && <Button className="ml-auto" onClick={() => navigate(`/nutrition/${mt}/control/${roomId}`)}><Play className="h-4 w-4 mr-1" />Painel de Controle</Button>}
      </div>

      <Tabs defaultValue="participants">
        <TabsList>
          <TabsTrigger value="participants"><Users className="h-4 w-4 mr-1" />Participantes</TabsTrigger>
          <TabsTrigger value="forms"><FileText className="h-4 w-4 mr-1" />Formulários</TabsTrigger>
          <TabsTrigger value="cases"><BookOpen className="h-4 w-4 mr-1" />Casos Clínicos</TabsTrigger>
        </TabsList>

        <TabsContent value="participants" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base">Adicionar Aluno</CardTitle></CardHeader>
            <CardContent><div className="flex gap-2"><Input placeholder="Nome" value={newName} onChange={e => setNewName(e.target.value)} /><Input placeholder="E-mail" value={newEmail} onChange={e => setNewEmail(e.target.value)} /><Button onClick={addParticipant} disabled={!newName.trim()}><Plus className="h-4 w-4" /></Button></div></CardContent>
          </Card>
          {(() => {
            const unpaired = students.filter(s => s.pair_index < 0);
            const paired = students.filter(s => s.pair_index >= 0);
            const pairGroups: Record<number, typeof paired> = {};
            paired.forEach(p => { (pairGroups[p.pair_index] ||= []).push(p); });
            const nextPairIdx = paired.length > 0 ? Math.max(0, ...paired.map(p => p.pair_index)) + 1 : 0;
            const toggleSelect = (id: string) => setSelectedForPairing(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 2 ? prev : [...prev, id]);
            const formPair = async () => {
              if (selectedForPairing.length !== 2) return;
              const [a, b] = selectedForPairing;
              await supabase.from("nutrition_participants").update({ pair_index: nextPairIdx, pair_position: "A" } as any).eq("id", a);
              await supabase.from("nutrition_participants").update({ pair_index: nextPairIdx, pair_position: "B" } as any).eq("id", b);
              setSelectedForPairing([]); refetchParticipants(); toast({ title: "Dupla formada!" });
            };
            const undoPair = async (pairIdx: number) => {
              const members = pairGroups[pairIdx] || [];
              for (const m of members) await supabase.from("nutrition_participants").update({ pair_index: -1, pair_position: "X" } as any).eq("id", m.id);
              refetchParticipants(); toast({ title: "Dupla desfeita" });
            };
            return (
              <>
                {Object.keys(pairGroups).length > 0 && (
                  <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">Duplas Formadas <Badge variant="secondary">{Object.keys(pairGroups).length}</Badge></CardTitle></CardHeader>
                    <CardContent className="p-4 pt-0"><div className="space-y-2">
                      {Object.entries(pairGroups).map(([idx, members]) => (
                        <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg bg-primary/5 border border-primary/10">
                          <div className="flex items-center gap-3"><Badge variant="outline">Dupla {Number(idx) + 1}</Badge>{members.map(m => <span key={m.id} className="text-sm"><span className="font-medium">{m.student_name}</span><span className="text-muted-foreground ml-1">({m.pair_position})</span></span>)}</div>
                          <Button variant="ghost" size="icon" onClick={() => undoPair(Number(idx))}><RotateCcw className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div></CardContent>
                  </Card>
                )}
                {unpaired.length > 0 && (
                  <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">Alunos sem dupla <Badge variant="secondary">{unpaired.length}</Badge></CardTitle><p className="text-sm text-muted-foreground">Selecione 2 alunos para formar uma dupla</p></CardHeader>
                    <CardContent className="p-4 pt-0"><div className="grid grid-cols-2 gap-2">
                      {unpaired.map(p => {
                        const isSelected = selectedForPairing.includes(p.id);
                        return (<button key={p.id} onClick={() => toggleSelect(p.id)} className={`p-3 rounded-lg border text-left text-sm transition-colors ${isSelected ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-border hover:border-primary/50"}`}><span className="font-medium">{p.student_name}</span>{p.student_email && <p className="text-xs text-muted-foreground">{p.student_email}</p>}</button>);
                      })}
                    </div>{selectedForPairing.length === 2 && <Button onClick={formPair} className="w-full mt-3" size="sm"><Users className="h-4 w-4 mr-1" />Formar Dupla</Button>}</CardContent>
                  </Card>
                )}
                {students.length === 0 && <p className="text-sm text-muted-foreground">Nenhum participante adicionado ainda.</p>}
              </>
            );
          })()}
        </TabsContent>

        <TabsContent value="forms" className="space-y-4">
          <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}><Star className="h-4 w-4 mr-2" />Usar Template</Button>
          {forms.map((form: any) => (
            <Card key={form.id} className={form.form_type === "answer_key" ? "ml-4 border-l-4 border-l-primary/30" : ""}>
              <CardHeader className="pb-2"><div className="flex items-center justify-between"><div><CardTitle className="text-base">{form.title}</CardTitle><Badge variant="outline" className="mt-1">{formTypeLabel[form.form_type] || form.form_type}</Badge></div>
                <div className="flex gap-1">{form.form_type !== "answer_key" && Array.isArray(form.content_json) && (<Button variant="ghost" size="sm" onClick={() => exportFormToPDF({ title: form.title, fields: form.content_json, formType: formTypeLabel[form.form_type] || form.form_type })} title="Baixar PDF"><FileDown className="h-3.5 w-3.5" /></Button>)}<Button variant="ghost" size="sm" onClick={() => { setSaveTemplateForm(form); setSaveTemplateDialogOpen(true); }} title="Salvar como Template"><BookmarkPlus className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" onClick={() => editForm(form)}>Editar</Button><Button variant="ghost" size="sm" onClick={() => deleteForm(form.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
              </div></CardHeader>
            </Card>
          ))}
          <Card><CardHeader><CardTitle className="text-base">{editingFormId ? "Editando Formulário" : "Novo Formulário"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1"><Label>Título</Label><Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Ex: Ficha de Anamnese Nutricional" /></div>
                <div><Label>Tipo</Label><select className="w-full h-10 border rounded px-3 bg-background" value={formType} onChange={e => setFormType(e.target.value)}><option value="standard">Formulário</option><option value="answer_key">Espelho de Respostas</option></select></div>
              </div>
              {formType === "answer_key" ? (
                <div className="space-y-3">
                  {clinicalCases.length === 0 ? <p className="text-sm text-muted-foreground">Cadastre casos clínicos na aba "Casos Clínicos" para configurar espelhos por caso.</p> : (
                    <><div className="flex gap-2 flex-wrap">{clinicalCases.map(c => (<Button key={c.id} variant={activeAnswerKeyCaseId === c.id ? "default" : "outline"} size="sm" onClick={() => setActiveAnswerKeyCaseId(c.id)}>{c.title}</Button>))}</div>
                    {activeAnswerKeyCaseId && <FormBuilder fields={answerKeyByCaseId[activeAnswerKeyCaseId] || []} onChange={(fields) => setAnswerKeyByCaseId(prev => ({ ...prev, [activeAnswerKeyCaseId]: fields }))} />}</>
                  )}
                </div>
              ) : <FormBuilder fields={formFields} onChange={setFormFields} />}
              <Button onClick={() => saveForm(false)}>Salvar</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cases" className="space-y-4">
          {clinicalCases.map((c: any) => (
            <Card key={c.id}><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base">{c.title}</CardTitle><Button variant="ghost" size="sm" onClick={() => deleteCase(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></CardHeader>
              {c.content && <CardContent><p className="text-sm whitespace-pre-wrap">{c.content}</p></CardContent>}
            </Card>
          ))}
          <Card><CardHeader><CardTitle className="text-base">Novo Caso Clínico</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Título do caso" value={newCaseTitle} onChange={e => setNewCaseTitle(e.target.value)} />
              <Textarea placeholder="Conteúdo do caso clínico..." value={newCaseContent} onChange={e => setNewCaseContent(e.target.value)} rows={4} />
              <Button onClick={addCase} disabled={!newCaseTitle.trim()}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <FormTemplateDialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen} area="nutrition" moduleType={mt} onApply={(title, ft, fields) => { setEditingFormId(null); setFormTitle(title); setFormType(ft); setFormFields(fields); setAnswerKeyByCaseId({}); }} />
      {saveTemplateForm && <SaveAsTemplateDialog open={saveTemplateDialogOpen} onOpenChange={setSaveTemplateDialogOpen} area="nutrition" moduleType={mt} formTitle={saveTemplateForm.title} formType={saveTemplateForm.form_type} contentJson={Array.isArray(saveTemplateForm.content_json) ? saveTemplateForm.content_json : []} />}
    </div>
  );
}
