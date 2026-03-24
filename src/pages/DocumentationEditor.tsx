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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Users, FileText, Play, BookOpen, Table2, Copy, RotateCcw, Download, Star, BookmarkPlus } from "lucide-react";
import FormBuilder from "@/components/forms/FormBuilder";
import type { FormField } from "@/components/forms/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import FormTemplateDialog, { SaveAsTemplateDialog } from "@/components/forms/FormTemplateDialog";
import ModuleHelpGuide from "@/components/ModuleHelpGuide";

type MedColumn = { id: string; label: string };
type MedFormContent = { columns: MedColumn[]; rows_score: number; answer_rows?: Record<string, string>[] };
type MedCaseContent = { columns: MedColumn[]; rows_score: number; answer_rows: Record<string, string>[] };

export default function DocumentationEditor() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ["documentation-room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("documentation_rooms").select("*").eq("id", roomId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  const { data: participants = [], refetch: refetchParticipants } = useQuery({
    queryKey: ["documentation-participants", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("documentation_participants").select("*").eq("room_id", roomId!).order("pair_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  const { data: forms = [], refetch: refetchForms } = useQuery({
    queryKey: ["documentation-forms", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("documentation_forms").select("*").eq("room_id", roomId!).order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!roomId,
  });

  const { data: clinicalCases = [] } = useQuery({
    queryKey: ["documentation-clinical-cases", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("documentation_clinical_cases").select("*").eq("room_id", roomId!).order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  // Referral form builder state
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<string>("referral");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  // Per-case answer keys for referral: { [caseId]: FormField[] }
  const [answerKeyByCaseId, setAnswerKeyByCaseId] = useState<Record<string, FormField[]>>({});
  const [activeAnswerKeyCaseId, setActiveAnswerKeyCaseId] = useState<string>("");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [saveTemplateForm, setSaveTemplateForm] = useState<any>(null);
  const lastSavedSnapshotRef = useRef("");
  const skipNextAutoSaveRef = useRef(false);

  // Medication summary builder state
  const [medTitle, setMedTitle] = useState("");
  const [medType, setMedType] = useState<string>("medication_summary");
  const [medColumns, setMedColumns] = useState<MedColumn[]>([]);
  const [medRowsScore, setMedRowsScore] = useState(1);
  const [medAnswerRows, setMedAnswerRows] = useState<Record<string, string>[]>([]);
  // Per-case answer keys for medication: { [caseId]: { columns, rows_score, answer_rows } }
  const [medAnswerKeyByCaseId, setMedAnswerKeyByCaseId] = useState<Record<string, MedCaseContent>>({});
  const [activeMedAnswerKeyCaseId, setActiveMedAnswerKeyCaseId] = useState<string>("");
  const [editingMedFormId, setEditingMedFormId] = useState<string | null>(null);
  const [selectedForPairing, setSelectedForPairing] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedImportRoom, setSelectedImportRoom] = useState("");

  const addParticipant = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("documentation_participants").insert({
      room_id: roomId!,
      student_name: newName.trim(),
      student_email: newEmail.trim(),
      pair_index: -1,
      pair_position: "X",
      reconciliation_participant_id: null,
      participant_role: "student",
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setNewName("");
    setNewEmail("");
    refetchParticipants();
  };

  const importFromReconDialog = async () => {
    if (!selectedImportRoom) return;
    await importFromReconciliation(selectedImportRoom);
    setImportDialogOpen(false);
    setSelectedImportRoom("");
  };

  const getDefaultFormTitle = (type: string) => {
    const defaultTitles: Record<string, string> = {
      referral: "Ficha de Encaminhamento",
      referral_answer_key: "Espelho do Encaminhamento",
      medication_summary: "Quadro Resumo",
      medication_answer_key: "Espelho do Quadro Resumo",
    };

    return defaultTitles[type] || "Formulário";
  };

  const hasReferralAnswerKeyDraftContent = (cases: Record<string, FormField[]>) => {
    return Object.values(cases).some((fields) => fields.length > 0);
  };

  const hasMedicationAnswerKeyDraftContent = (cases: Record<string, MedCaseContent>) => {
    return Object.values(cases).some((content) => content.columns.length > 0 || content.answer_rows.length > 0);
  };

  const canSaveReferralForm = () => {
    if (formType === "referral_answer_key") {
      return Boolean(formTitle.trim()) || hasReferralAnswerKeyDraftContent(answerKeyByCaseId);
    }

    return Boolean(formTitle.trim());
  };

  const canSaveMedicationForm = () => {
    if (medType === "medication_answer_key") {
      return Boolean(medTitle.trim()) || hasMedicationAnswerKeyDraftContent(medAnswerKeyByCaseId);
    }

    return Boolean(medTitle.trim());
  };

  // Reconciliation rooms for import
  const { data: reconRooms } = useQuery({
    queryKey: ["recon-rooms-for-doc-import"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data } = await supabase.from("reconciliation_rooms").select("id, title, access_code").eq("user_id", session.user.id).order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Import students from reconciliation room (unpaired, admin forms pairs manually)
  const importFromReconciliation = async (reconRoomId: string) => {
    const { data: reconParticipants } = await supabase
      .from("reconciliation_participants")
      .select("*")
      .eq("room_id", reconRoomId)
      .eq("participant_role", "student");

    if (!reconParticipants?.length) {
      toast({ title: "Sem alunos", description: "Nenhum aluno encontrado nesta sala.", variant: "destructive" });
      return;
    }

    const inserts = reconParticipants.map(rp => ({
      room_id: roomId!,
      student_name: rp.student_name,
      student_email: rp.student_email,
      pair_index: -1,
      pair_position: "X",
      reconciliation_participant_id: rp.id,
      participant_role: "student" as const,
    }));

    const { error } = await supabase.from("documentation_participants").insert(inserts);
    if (error) {
      toast({ title: "Erro", description: "Erro ao importar alunos.", variant: "destructive" });
      return;
    }

    toast({ title: "Importado", description: `${inserts.length} alunos importados. Forme as duplas manualmente.` });
    refetchParticipants();
  };

  const students = participants.filter(p => p.participant_role === "student");
  const pairs = students.reduce((acc: Record<number, any[]>, p) => {
    if (p.pair_index >= 0) {
      acc[p.pair_index] = acc[p.pair_index] || [];
      acc[p.pair_index].push(p);
    }
    return acc;
  }, {});

  // ─── Referral form save ───
  const saveForm = async (silent = false) => {
    const normalizedTitle = formTitle.trim() || (formType === "referral_answer_key" && hasReferralAnswerKeyDraftContent(answerKeyByCaseId)
      ? getDefaultFormTitle(formType)
      : "");

    if (!normalizedTitle) return;

    const contentToSave = formType === "referral_answer_key"
      ? { case_answers: answerKeyByCaseId } as any
      : formFields as any;

    const payload = { title: normalizedTitle, content_json: contentToSave, form_type: formType };

    if (editingFormId) {
      await supabase.from("documentation_forms").update(payload).eq("id", editingFormId);
    } else {
      await supabase.from("documentation_forms").insert({ ...payload, room_id: roomId! });
    }

    const snapshotData = formType === "referral_answer_key"
      ? { formType, title: normalizedTitle, content: answerKeyByCaseId }
      : { formType, title: normalizedTitle, content: formFields };
    lastSavedSnapshotRef.current = JSON.stringify(snapshotData);

    if (!editingFormId) {
      await refetchForms();
    } else if (!silent) {
      refetchForms();
    }
    if (!silent) {
      setEditingFormId(null); setFormTitle(""); setFormFields([]); setFormType("referral");
      setAnswerKeyByCaseId({}); setActiveAnswerKeyCaseId("");
      refetchForms();
      toast({ title: "Formulário salvo" });
    }
  };

  // Auto-save for referral forms
  useEffect(() => {
    if (!roomId || !editingFormId) return;
    if (!formTitle.trim() && formFields.length === 0 && Object.keys(answerKeyByCaseId).length === 0) return;

    const snapshotData = formType === "referral_answer_key"
      ? { formType, title: formTitle, content: answerKeyByCaseId }
      : { formType, title: formTitle, content: formFields };
    const currentSnapshot = JSON.stringify(snapshotData);

    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      lastSavedSnapshotRef.current = currentSnapshot;
      return;
    }

    if (currentSnapshot === lastSavedSnapshotRef.current) return;

    const timeout = window.setTimeout(() => {
      void saveForm(true);
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [roomId, editingFormId, formType, formTitle, formFields, answerKeyByCaseId]);

  const editForm = (form: any) => {
    if (form.form_type === "medication_summary" || form.form_type === "medication_answer_key") {
      editMedForm(form);
      return;
    }
    skipNextAutoSaveRef.current = true;
    setEditingFormId(form.id);
    setFormTitle(form.title);
    setFormType(form.form_type);

    if (form.form_type === "referral_answer_key") {
      const content = form.content_json;
      if (content && typeof content === "object" && !Array.isArray(content) && content.case_answers) {
        setAnswerKeyByCaseId(content.case_answers);
        setFormFields([]);
        const firstCaseId = clinicalCases.length > 0 ? clinicalCases[0].id : "";
        setActiveAnswerKeyCaseId(firstCaseId);
        lastSavedSnapshotRef.current = JSON.stringify({ formType: form.form_type, title: form.title, content: content.case_answers });
      } else if (Array.isArray(content)) {
        // Legacy migration: single array → assign to first case
        const migrated: Record<string, FormField[]> = {};
        if (clinicalCases.length > 0) {
          migrated[clinicalCases[0].id] = content;
          setActiveAnswerKeyCaseId(clinicalCases[0].id);
        }
        setAnswerKeyByCaseId(migrated);
        setFormFields([]);
        lastSavedSnapshotRef.current = JSON.stringify({ formType: form.form_type, title: form.title, content: migrated });
      } else {
        setAnswerKeyByCaseId({});
        setFormFields([]);
        setActiveAnswerKeyCaseId(clinicalCases.length > 0 ? clinicalCases[0].id : "");
        lastSavedSnapshotRef.current = JSON.stringify({ formType: form.form_type, title: form.title, content: {} });
      }
    } else {
      const fields = Array.isArray(form.content_json) ? form.content_json : [];
      setFormFields(fields);
      setAnswerKeyByCaseId({});
      lastSavedSnapshotRef.current = JSON.stringify({ formType: form.form_type, title: form.title, content: fields });
    }
  };

  const deleteForm = async (id: string) => {
    await supabase.from("documentation_forms").delete().eq("id", id);
    refetchForms();
  };

  // ─── Medication summary form ───
  const saveMedForm = async () => {
    const normalizedTitle = medTitle.trim() || (medType === "medication_answer_key" && hasMedicationAnswerKeyDraftContent(medAnswerKeyByCaseId)
      ? getDefaultFormTitle(medType)
      : "");

    if (!normalizedTitle) return;

    let contentToSave: any;
    if (medType === "medication_answer_key") {
      contentToSave = { case_answers: medAnswerKeyByCaseId };
    } else {
      if (!medColumns.length) return;
      const content: MedFormContent = { columns: medColumns, rows_score: medRowsScore };
      contentToSave = content;
    }

    const payload = { title: normalizedTitle, content_json: contentToSave, form_type: medType };
    if (editingMedFormId) {
      await supabase.from("documentation_forms").update(payload).eq("id", editingMedFormId);
    } else {
      await supabase.from("documentation_forms").insert({ ...payload, room_id: roomId! });
    }
    resetMedForm();
    refetchForms();
    toast({ title: "Quadro resumo salvo" });
  };

  const editMedForm = (form: any) => {
    setEditingMedFormId(form.id);
    setMedTitle(form.title);
    setMedType(form.form_type);

    if (form.form_type === "medication_answer_key") {
      const content = form.content_json;
      if (content && typeof content === "object" && !Array.isArray(content) && content.case_answers) {
        setMedAnswerKeyByCaseId(content.case_answers);
        setMedColumns([]);
        setMedRowsScore(1);
        setMedAnswerRows([]);
        const firstCaseId = clinicalCases.length > 0 ? clinicalCases[0].id : "";
        setActiveMedAnswerKeyCaseId(firstCaseId);
      } else {
        // Legacy: single content → migrate to first case
        const legacy = content as MedFormContent;
        const migrated: Record<string, MedCaseContent> = {};
        if (clinicalCases.length > 0) {
          migrated[clinicalCases[0].id] = {
            columns: legacy?.columns || [],
            rows_score: legacy?.rows_score || 1,
            answer_rows: legacy?.answer_rows || [],
          };
          setActiveMedAnswerKeyCaseId(clinicalCases[0].id);
        }
        setMedAnswerKeyByCaseId(migrated);
        setMedColumns([]);
        setMedRowsScore(1);
        setMedAnswerRows([]);
      }
    } else {
      const content = form.content_json as MedFormContent;
      setMedColumns(content?.columns || []);
      setMedRowsScore(content?.rows_score || 1);
      setMedAnswerRows(content?.answer_rows || []);
      setMedAnswerKeyByCaseId({});
    }
  };

  const resetMedForm = () => {
    setEditingMedFormId(null); setMedTitle(""); setMedType("medication_summary");
    setMedColumns([]); setMedRowsScore(1); setMedAnswerRows([]);
    setMedAnswerKeyByCaseId({}); setActiveMedAnswerKeyCaseId("");
  };

  const addMedColumn = () => {
    setMedColumns([...medColumns, { id: crypto.randomUUID(), label: "" }]);
  };

  const addMedAnswerRow = () => {
    const row: Record<string, string> = {};
    medColumns.forEach(c => { row[c.id] = ""; });
    setMedAnswerRows([...medAnswerRows, row]);
  };

  // Per-case medication helpers
  const getActiveMedCase = (): MedCaseContent => {
    return medAnswerKeyByCaseId[activeMedAnswerKeyCaseId] || { columns: [], rows_score: 1, answer_rows: [] };
  };

  const updateActiveMedCase = (update: Partial<MedCaseContent>) => {
    setMedAnswerKeyByCaseId(prev => ({
      ...prev,
      [activeMedAnswerKeyCaseId]: { ...getActiveMedCase(), ...update },
    }));
  };

  const addMedCaseColumn = () => {
    const current = getActiveMedCase();
    updateActiveMedCase({ columns: [...current.columns, { id: crypto.randomUUID(), label: "" }] });
  };

  const addMedCaseAnswerRow = () => {
    const current = getActiveMedCase();
    const row: Record<string, string> = {};
    current.columns.forEach(c => { row[c.id] = ""; });
    updateActiveMedCase({ answer_rows: [...current.answer_rows, row] });
  };

  const importColumnsFromSummary = () => {
    const summaryForm = forms.find((f: any) => f.form_type === "medication_summary");
    if (!summaryForm) {
      toast({ title: "Nenhum Quadro Resumo encontrado", description: "Cadastre um Quadro Resumo primeiro.", variant: "destructive" });
      return;
    }
    const content = summaryForm.content_json as MedFormContent;
    if (!content?.columns?.length) {
      toast({ title: "Sem colunas", description: "O Quadro Resumo não possui colunas definidas.", variant: "destructive" });
      return;
    }
    const importedColumns = content.columns.map(c => ({ id: crypto.randomUUID(), label: c.label }));
    const current = getActiveMedCase();
    updateActiveMedCase({
      columns: importedColumns,
      rows_score: content.rows_score || current.rows_score,
      answer_rows: [],
    });
    toast({ title: "Colunas importadas", description: `${importedColumns.length} colunas importadas do Quadro Resumo.` });
  };

  // Activate room
  const activateRoom = async () => {
    const referralForm = forms.find((f: any) => f.form_type === "referral");
    if (!referralForm) {
      toast({ title: "Formulário necessário", description: "Cadastre uma ficha de encaminhamento antes de ativar.", variant: "destructive" });
      return;
    }
    if (!students.length) {
      toast({ title: "Sem alunos", description: "Importe alunos antes de ativar.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("documentation_rooms").update({ status: "active" }).eq("id", roomId!);
    if (error) { toast({ title: "Erro", variant: "destructive" }); return; }
    toast({ title: "Sala ativada!" });
    queryClient.invalidateQueries({ queryKey: ["documentation-room", roomId] });
  };

  if (roomLoading) return <p className="p-6 text-muted-foreground">Carregando...</p>;
  if (!room) return <p className="p-6">Sala não encontrada.</p>;

  const formTypeLabel: Record<string, string> = {
    referral: "Ficha de Encaminhamento",
    referral_answer_key: "Espelho do Encaminhamento",
    medication_summary: "Quadro Resumo",
    medication_answer_key: "Espelho do Quadro Resumo",
  };

  return (
    <div className="space-y-6">
      <ModuleHelpGuide moduleKey="documentacao" />
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/simulations/documentation")}>
          <ArrowLeft className="h-4 w-4 mr-1" />Voltar
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-chart-4/10 text-chart-4 border-chart-4/30">Documentação</Badge>
            <h1 className="text-xl font-bold">{room.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground">PIN: {room.access_code} · Status: {room.status}</p>
        </div>
        {room.status === "draft" && (
          <Button className="ml-auto" onClick={activateRoom}><Play className="h-4 w-4 mr-1" />Ativar Sala</Button>
        )}
        {room.status === "active" && (
          <Button className="ml-auto" onClick={() => navigate(`/simulations/documentation/control/${roomId}`)}>
            <Play className="h-4 w-4 mr-1" />Painel de Controle
          </Button>
        )}
      </div>

      <Tabs defaultValue="participants">
        <TabsList>
          <TabsTrigger value="participants"><Users className="h-4 w-4 mr-1" />Participantes</TabsTrigger>
          <TabsTrigger value="referral"><FileText className="h-4 w-4 mr-1" />Encaminhamento</TabsTrigger>
          <TabsTrigger value="medication"><Table2 className="h-4 w-4 mr-1" />Quadro Resumo</TabsTrigger>
          <TabsTrigger value="cases"><BookOpen className="h-4 w-4 mr-1" />Casos Clínicos</TabsTrigger>
        </TabsList>

        {/* Participants - manual pair formation */}
        <TabsContent value="participants" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Adicionar Aluno</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input placeholder="Nome" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <Input placeholder="E-mail" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                <Button onClick={addParticipant} disabled={!newName.trim()}><Plus className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>

          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Download className="h-4 w-4 mr-2" />Importar da Reconciliação</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Importar Alunos da Reconciliação</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Select value={selectedImportRoom} onValueChange={setSelectedImportRoom}>
                  <SelectTrigger><SelectValue placeholder="Selecione a sala de reconciliação" /></SelectTrigger>
                  <SelectContent>
                    {reconRooms?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.title} (PIN: {r.access_code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={importFromReconDialog} disabled={!selectedImportRoom} className="w-full">Importar</Button>
              </div>
            </DialogContent>
          </Dialog>

          {(() => {
            const unpaired = students.filter(s => s.pair_index < 0);
            const paired = students.filter(s => s.pair_index >= 0);
            const pairGroups: Record<number, typeof paired> = {};
            paired.forEach(p => { (pairGroups[p.pair_index] ||= []).push(p); });
            const nextPairIdx = paired.length > 0 ? Math.max(0, ...paired.map(p => p.pair_index)) + 1 : 0;

            const toggleSelect = (id: string) => {
              setSelectedForPairing(prev => {
                if (prev.includes(id)) return prev.filter(x => x !== id);
                if (prev.length >= 2) return prev;
                return [...prev, id];
              });
            };

            const formPair = async () => {
              if (selectedForPairing.length !== 2) return;
              const [a, b] = selectedForPairing;
              await supabase.from("documentation_participants").update({ pair_index: nextPairIdx, pair_position: "A" } as any).eq("id", a);
              await supabase.from("documentation_participants").update({ pair_index: nextPairIdx, pair_position: "B" } as any).eq("id", b);
              setSelectedForPairing([]);
              refetchParticipants();
              toast({ title: "Dupla formada!" });
            };

            const undoPair = async (pairIdx: number) => {
              const members = pairGroups[pairIdx] || [];
              for (const m of members) {
                await supabase.from("documentation_participants").update({ pair_index: -1, pair_position: "X" } as any).eq("id", m.id);
              }
              refetchParticipants();
              toast({ title: "Dupla desfeita" });
            };

            return (
              <>
                {Object.keys(pairGroups).length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        Duplas Formadas
                        <Badge variant="secondary">{Object.keys(pairGroups).length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-2">
                        {Object.entries(pairGroups).map(([idx, members]) => (
                          <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg bg-primary/5 border border-primary/10">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">Dupla {Number(idx) + 1}</Badge>
                              {members.map(m => (
                                <span key={m.id} className="text-sm">
                                  <span className="font-medium">{m.student_name}</span>
                                  <span className="text-muted-foreground ml-1">({m.pair_position})</span>
                                </span>
                              ))}
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => undoPair(Number(idx))}>
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {unpaired.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        Alunos sem dupla
                        <Badge variant="secondary">{unpaired.length}</Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Selecione 2 alunos para formar uma dupla</p>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="grid grid-cols-2 gap-2">
                        {unpaired.map(p => {
                          const isSelected = selectedForPairing.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              onClick={() => toggleSelect(p.id)}
                              className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                                isSelected
                                  ? "border-primary bg-primary/10 ring-2 ring-primary"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <span className="font-medium">{p.student_name}</span>
                              {p.student_email && <p className="text-xs text-muted-foreground">{p.student_email}</p>}
                            </button>
                          );
                        })}
                      </div>
                      {selectedForPairing.length === 2 && (
                        <Button onClick={formPair} className="w-full mt-3" size="sm">
                          <Users className="h-4 w-4 mr-1" />Formar Dupla
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {unpaired.length === 0 && paired.length > 0 && (
                  <p className="text-sm text-muted-foreground">Todos os alunos estão em duplas.</p>
                )}

                {students.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum participante importado ainda.</p>
                )}
              </>
            );
          })()}
        </TabsContent>

        {/* Referral form tab */}
        <TabsContent value="referral" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}><Star className="h-4 w-4 mr-2" />Usar Template</Button>
          </div>
          {/* Existing referral forms */}
          {[...forms.filter((f: any) => f.form_type === "referral" || f.form_type === "referral_answer_key")].sort((a, b) => {
            const order: Record<string, number> = { referral: 0, referral_answer_key: 1 };
            return (order[a.form_type] ?? 2) - (order[b.form_type] ?? 2);
          }).map((form: any) => {
            const isAnswerKey = form.form_type === "referral_answer_key";
            const caseAnswers = isAnswerKey && form.content_json?.case_answers;
            const caseCount = caseAnswers ? Object.keys(caseAnswers).length : 0;
            const fieldCount = Array.isArray(form.content_json) ? form.content_json.length : 0;

            return (
              <Card key={form.id} className={isAnswerKey ? "ml-4 border-l-4 border-l-primary/30" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{form.title}</CardTitle>
                      <Badge variant="outline" className="mt-1">{formTypeLabel[form.form_type]}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setSaveTemplateForm(form); setSaveTemplateDialogOpen(true); }} title="Salvar como Template"><BookmarkPlus className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => editForm(form)}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteForm(form.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {isAnswerKey
                      ? (caseCount > 0 ? `${caseCount} caso(s) com espelho` : (fieldCount > 0 ? `${fieldCount} campos (legado)` : "Sem espelhos"))
                      : `${fieldCount} campos`
                    }
                  </p>
                </CardContent>
              </Card>
            );
          })}

          {/* Form builder */}
          <Card>
            <CardHeader><CardTitle className="text-base">{editingFormId ? "Editar Formulário" : "Novo Formulário de Encaminhamento"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Título</Label>
                  <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Nome do formulário" />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={formType} onValueChange={(v: any) => {
                    setFormType(v);
                    if (!formTitle.trim()) {
                      setFormTitle(getDefaultFormTitle(v));
                    }
                    if (v === "referral_answer_key" && clinicalCases.length > 0 && !activeAnswerKeyCaseId) {
                      setActiveAnswerKeyCaseId(clinicalCases[0].id);
                    }
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="referral">Ficha de Encaminhamento</SelectItem>
                      <SelectItem value="referral_answer_key">Espelho do Encaminhamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formType === "referral_answer_key" ? (
                /* Per-case answer key editor */
                clinicalCases.length === 0 ? (
                  <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
                    <p className="text-sm">Cadastre casos clínicos na aba "Casos Clínicos" primeiro para definir espelhos de resposta por caso.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Defina o espelho de respostas para cada caso clínico:</p>
                    <div className="flex gap-2 flex-wrap">
                      {clinicalCases.map((cc: any) => (
                        <Button
                          key={cc.id}
                          variant={activeAnswerKeyCaseId === cc.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setActiveAnswerKeyCaseId(cc.id)}
                        >
                          {cc.title}
                          {answerKeyByCaseId[cc.id]?.length ? ` (${answerKeyByCaseId[cc.id].length})` : ""}
                        </Button>
                      ))}
                    </div>
                    {activeAnswerKeyCaseId && (
                      <FormBuilder
                        fields={answerKeyByCaseId[activeAnswerKeyCaseId] || []}
                        onChange={(fields) => setAnswerKeyByCaseId(prev => ({ ...prev, [activeAnswerKeyCaseId]: fields }))}
                        showScores={true}
                        scoreLabel="Pts"
                      />
                    )}
                    {activeAnswerKeyCaseId && (
                      <p className="text-sm text-muted-foreground">
                        Total ({clinicalCases.find((c: any) => c.id === activeAnswerKeyCaseId)?.title}): {
                          (answerKeyByCaseId[activeAnswerKeyCaseId] || []).filter(f => f.type !== "section_header").reduce((sum, f) => sum + (f.max_score || 0), 0)
                        } pts
                      </p>
                    )}
                  </div>
                )
              ) : (
                <>
                  <FormBuilder
                    fields={formFields}
                    onChange={setFormFields}
                    showScores={true}
                    scoreLabel="Pts"
                  />
                </>
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveForm()} disabled={!canSaveReferralForm()}>Salvar</Button>
                {editingFormId && <Button variant="ghost" size="sm" onClick={() => { setEditingFormId(null); setFormTitle(""); setFormFields([]); setFormType("referral"); setAnswerKeyByCaseId({}); setActiveAnswerKeyCaseId(""); }}>Cancelar</Button>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medication summary tab */}
        <TabsContent value="medication" className="space-y-4">
          {/* Existing medication forms */}
          {[...forms.filter((f: any) => f.form_type === "medication_summary" || f.form_type === "medication_answer_key")].sort((a, b) => {
            const order: Record<string, number> = { medication_summary: 0, medication_answer_key: 1 };
            return (order[a.form_type] ?? 2) - (order[b.form_type] ?? 2);
          }).map((form: any) => {
            const isAnswerKey = form.form_type === "medication_answer_key";
            const caseAnswers = isAnswerKey && form.content_json?.case_answers;
            const caseCount = caseAnswers ? Object.keys(caseAnswers).length : 0;

            return (
              <Card key={form.id} className={isAnswerKey ? "ml-4 border-l-4 border-l-primary/30" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{form.title}</CardTitle>
                      <Badge variant="outline" className="mt-1">{formTypeLabel[form.form_type]}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => editMedForm(form)}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteForm(form.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {isAnswerKey
                      ? (caseCount > 0 ? `${caseCount} caso(s) com espelho` : `${(form.content_json as MedFormContent)?.columns?.length || 0} colunas (legado)`)
                      : `${(form.content_json as MedFormContent)?.columns?.length || 0} colunas`
                    }
                  </p>
                </CardContent>
              </Card>
            );
          })}

          {/* Medication form builder */}
          <Card>
            <CardHeader><CardTitle className="text-base">{editingMedFormId ? "Editar Quadro Resumo" : "Novo Quadro Resumo"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Título</Label>
                  <Input value={medTitle} onChange={e => setMedTitle(e.target.value)} placeholder="Quadro Resumo dos Medicamentos" />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={medType} onValueChange={(v) => {
                    setMedType(v);
                    if (!medTitle.trim()) {
                      setMedTitle(getDefaultFormTitle(v));
                    }
                    if (v === "medication_answer_key" && clinicalCases.length > 0 && !activeMedAnswerKeyCaseId) {
                      setActiveMedAnswerKeyCaseId(clinicalCases[0].id);
                    }
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="medication_summary">Quadro Resumo</SelectItem>
                      <SelectItem value="medication_answer_key">Espelho do Quadro Resumo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {medType === "medication_answer_key" ? (
                /* Per-case medication answer key editor */
                clinicalCases.length === 0 ? (
                  <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
                    <p className="text-sm">Cadastre casos clínicos na aba "Casos Clínicos" primeiro para definir espelhos por caso.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Defina o espelho do quadro resumo para cada caso clínico:</p>
                    <div className="flex gap-2 flex-wrap">
                      {clinicalCases.map((cc: any) => {
                        const caseData = medAnswerKeyByCaseId[cc.id];
                        const rowCount = caseData?.answer_rows?.length || 0;
                        return (
                          <Button
                            key={cc.id}
                            variant={activeMedAnswerKeyCaseId === cc.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => setActiveMedAnswerKeyCaseId(cc.id)}
                          >
                            {cc.title}
                            {rowCount > 0 ? ` (${rowCount} linhas)` : ""}
                          </Button>
                        );
                      })}
                    </div>

                    {activeMedAnswerKeyCaseId && (() => {
                      const caseData = getActiveMedCase();
                      return (
                        <div className="space-y-4">
                          <div>
                            <Label>Pontuação por linha</Label>
                            <Input
                              type="number"
                              value={caseData.rows_score}
                              onChange={e => updateActiveMedCase({ rows_score: Number(e.target.value) })}
                              min={0}
                              className="w-32"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Colunas da tabela</Label>
                            {caseData.columns.map((col, idx) => (
                              <div key={col.id} className="flex gap-2 items-center">
                                <Input
                                  value={col.label}
                                  onChange={e => {
                                    const updated = [...caseData.columns];
                                    updated[idx] = { ...updated[idx], label: e.target.value };
                                    updateActiveMedCase({ columns: updated });
                                  }}
                                  placeholder={`Coluna ${idx + 1}`}
                                />
                                <Button variant="ghost" size="sm" onClick={() => updateActiveMedCase({ columns: caseData.columns.filter((_, i) => i !== idx) })}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={addMedCaseColumn}>
                                <Plus className="h-3.5 w-3.5 mr-1" />Coluna
                              </Button>
                              {forms.some((f: any) => f.form_type === "medication_summary") && (
                                <Button variant="outline" size="sm" onClick={importColumnsFromSummary}>
                                  <Download className="h-3.5 w-3.5 mr-1" />Importar do Quadro Resumo
                                </Button>
                              )}
                            </div>
                          </div>

                          {caseData.columns.length > 0 && (
                            <div className="space-y-2">
                              <Label>Linhas esperadas (espelho)</Label>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm border">
                                  <thead>
                                    <tr>
                                      {caseData.columns.map(c => <th key={c.id} className="border p-2 text-left">{c.label || "—"}</th>)}
                                      <th className="border p-2 w-12"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {caseData.answer_rows.map((row, rIdx) => (
                                      <tr key={rIdx}>
                                        {caseData.columns.map(c => (
                                          <td key={c.id} className="border p-1">
                                            <Input
                                              value={row[c.id] || ""}
                                              onChange={e => {
                                                const updated = [...caseData.answer_rows];
                                                updated[rIdx] = { ...updated[rIdx], [c.id]: e.target.value };
                                                updateActiveMedCase({ answer_rows: updated });
                                              }}
                                              className="h-8"
                                            />
                                          </td>
                                        ))}
                                        <td className="border p-1">
                                          <Button variant="ghost" size="sm" onClick={() => updateActiveMedCase({ answer_rows: caseData.answer_rows.filter((_, i) => i !== rIdx) })}>
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <Button variant="outline" size="sm" onClick={addMedCaseAnswerRow}>
                                <Plus className="h-3.5 w-3.5 mr-1" />Linha
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )
              ) : (
                /* Regular medication summary builder */
                <>
                  <div>
                    <Label>Pontuação por linha</Label>
                    <Input type="number" value={medRowsScore} onChange={e => setMedRowsScore(Number(e.target.value))} min={0} className="w-32" />
                  </div>

                  <div className="space-y-2">
                    <Label>Colunas da tabela</Label>
                    {medColumns.map((col, idx) => (
                      <div key={col.id} className="flex gap-2 items-center">
                        <Input value={col.label} onChange={e => {
                          const updated = [...medColumns];
                          updated[idx] = { ...updated[idx], label: e.target.value };
                          setMedColumns(updated);
                        }} placeholder={`Coluna ${idx + 1}`} />
                        <Button variant="ghost" size="sm" onClick={() => setMedColumns(medColumns.filter((_, i) => i !== idx))}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addMedColumn}><Plus className="h-3.5 w-3.5 mr-1" />Coluna</Button>
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={saveMedForm} disabled={!canSaveMedicationForm()}>Salvar</Button>
                {editingMedFormId && <Button variant="ghost" size="sm" onClick={resetMedForm}>Cancelar</Button>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clinical cases - readonly */}
        <TabsContent value="cases" className="space-y-4">
          {clinicalCases.length > 0 ? (
            clinicalCases.map((c, idx) => (
              <Card key={c.id}>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Caso {idx + 1}: {c.title}</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.content}</p></CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum caso clínico. Vincule a sala a uma Reconciliação para importar automaticamente.</p>
          )}
        </TabsContent>
      </Tabs>
      <FormTemplateDialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen} area="pharmacy" moduleType="documentacao" onApply={(title, ft, fields) => { setEditingFormId(null); setFormTitle(title); setFormType(ft); setFormFields(fields); setAnswerKeyByCaseId({}); }} />
      {saveTemplateForm && <SaveAsTemplateDialog open={saveTemplateDialogOpen} onOpenChange={setSaveTemplateDialogOpen} area="pharmacy" moduleType="documentacao" formTitle={saveTemplateForm.title} formType={saveTemplateForm.form_type} contentJson={Array.isArray(saveTemplateForm.content_json) ? saveTemplateForm.content_json : []} />}
    </div>
  );
}
