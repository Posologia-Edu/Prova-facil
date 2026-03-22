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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Users, FileText, Play, Copy, BookOpen, CheckSquare, RotateCcw, Download } from "lucide-react";
import FormBuilder from "@/components/forms/FormBuilder";
import type { FormField } from "@/components/forms/types";

// FormField type imported from @/components/forms/types

export default function ReconciliationEditor() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ["reconciliation-room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("reconciliation_rooms").select("*").eq("id", roomId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  const { data: participants = [], refetch: refetchParticipants } = useQuery({
    queryKey: ["reconciliation-participants", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reconciliation_participants")
        .select("*")
        .eq("room_id", roomId!)
        .order("pair_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  const { data: forms = [], refetch: refetchForms } = useQuery({
    queryKey: ["reconciliation-forms", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reconciliation_forms")
        .select("*")
        .eq("room_id", roomId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!roomId,
  });

  const { data: clinicalCases = [], refetch: refetchCases } = useQuery({
    queryKey: ["reconciliation-clinical-cases", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reconciliation_clinical_cases")
        .select("*")
        .eq("room_id", roomId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  // Import from SOAP
  const { data: soapRooms } = useQuery({
    queryKey: ["soap-rooms-for-import"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data } = await supabase.from("soap_rooms").select("id, title, access_code").eq("user_id", session.user.id).order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Import from other reconciliation rooms (forms)
  const { data: otherRooms } = useQuery({
    queryKey: ["other-reconciliation-rooms", roomId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data } = await supabase.from("reconciliation_rooms").select("id, title").eq("user_id", session.user.id).neq("id", roomId!);
      return data || [];
    },
    enabled: !!roomId,
  });

  // Form builder state
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<"reconciliation" | "answer_key">("reconciliation");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  // Per-case answer keys: { [caseId]: FormField[] }
  const [answerKeyByCaseId, setAnswerKeyByCaseId] = useState<Record<string, FormField[]>>({});
  const [activeAnswerKeyCaseId, setActiveAnswerKeyCaseId] = useState<string>("");
  const lastSavedSnapshotRef = useRef("");
  const skipNextAutoSaveRef = useRef(false);

  const getDefaultFormTitle = (type: "reconciliation" | "answer_key") => {
    return type === "answer_key" ? "Espelho de Respostas" : "Ficha de Reconciliação";
  };

  const hasAnswerKeyDraftContent = (cases: Record<string, FormField[]>) => {
    return Object.values(cases).some((fields) => fields.length > 0);
  };

  const canSaveCurrentForm = () => {
    if (formType === "answer_key") {
      return Boolean(formTitle.trim()) || hasAnswerKeyDraftContent(answerKeyByCaseId);
    }

    return Boolean(formTitle.trim());
  };

  // Clinical case editor
  const [caseTitle, setCaseTitle] = useState("");
  const [caseContent, setCaseContent] = useState("");
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [selectedForPairing, setSelectedForPairing] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedImportRoom, setSelectedImportRoom] = useState("");

  const addParticipant = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("reconciliation_participants").insert({
      room_id: roomId!,
      student_name: newName.trim(),
      student_email: newEmail.trim(),
      pair_index: -1,
      pair_position: "X",
      participant_role: "student",
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setNewName("");
    setNewEmail("");
    refetchParticipants();
  };

  const importFromSoapDialog = async () => {
    if (!selectedImportRoom) return;
    await importFromSoap(selectedImportRoom);
    setImportDialogOpen(false);
    setSelectedImportRoom("");
  };

  const students = participants.filter(p => p.participant_role === "student");
  const pairs = students.reduce((acc: Record<number, any[]>, p) => {
    if (p.pair_index >= 0) {
      acc[p.pair_index] = acc[p.pair_index] || [];
      acc[p.pair_index].push(p);
    }
    return acc;
  }, {});

  // Import students from SOAP room (unpaired, admin forms pairs manually)
  const importFromSoap = async (soapRoomId: string) => {
    const { data: soapParticipants } = await supabase
      .from("soap_participants")
      .select("*")
      .eq("room_id", soapRoomId)
      .eq("participant_role", "student");

    if (!soapParticipants?.length) {
      toast({ title: "Sem alunos", description: "Nenhum aluno encontrado nesta sala SOAP.", variant: "destructive" });
      return;
    }

    const inserts = soapParticipants.map(sp => ({
      room_id: roomId!,
      student_name: sp.student_name,
      student_email: sp.student_email,
      pair_index: -1,
      pair_position: "X",
      soap_participant_id: sp.id,
      participant_role: "student" as const,
    }));

    const { error } = await supabase.from("reconciliation_participants").insert(inserts);
    if (error) {
      toast({ title: "Erro", description: "Erro ao importar alunos.", variant: "destructive" });
      return;
    }

    toast({ title: "Importado", description: `${inserts.length} alunos importados do SOAP. Forme as duplas manualmente.` });
    refetchParticipants();
  };

  // Import forms from another reconciliation room
  const importForms = async (sourceRoomId: string) => {
    const { data: sourceForms } = await supabase
      .from("reconciliation_forms")
      .select("*")
      .eq("room_id", sourceRoomId);

    if (!sourceForms?.length) {
      toast({ title: "Sem formulários", description: "Nenhum formulário encontrado.", variant: "destructive" });
      return;
    }

    const inserts = sourceForms.map(f => ({
      room_id: roomId!,
      title: f.title,
      content_json: f.content_json,
      form_type: f.form_type,
    }));

    const { error } = await supabase.from("reconciliation_forms").insert(inserts);
    if (error) {
      toast({ title: "Erro", description: "Erro ao importar formulários.", variant: "destructive" });
      return;
    }

    toast({ title: "Importado", description: `${inserts.length} formulários importados.` });
    refetchForms();
  };

  // Save form
  const saveForm = async (silent = false) => {
    const normalizedTitle = formTitle.trim() || (formType === "answer_key" && hasAnswerKeyDraftContent(answerKeyByCaseId)
      ? getDefaultFormTitle(formType)
      : "");

    if (!normalizedTitle) return;

    const contentToSave = formType === "answer_key"
      ? { case_answers: answerKeyByCaseId } as any
      : formFields as any;

    if (editingFormId) {
      const { error } = await supabase.from("reconciliation_forms").update({
        title: normalizedTitle,
        content_json: contentToSave,
        form_type: formType,
      }).eq("id", editingFormId);
      if (error) { if (!silent) toast({ title: "Erro", variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("reconciliation_forms").insert({
        room_id: roomId!,
        title: normalizedTitle,
        content_json: contentToSave,
        form_type: formType,
      });
      if (error) { if (!silent) toast({ title: "Erro", variant: "destructive" }); return; }
    }

    const snapshotData = formType === "answer_key"
      ? { formType, title: normalizedTitle, content: answerKeyByCaseId }
      : { formType, title: normalizedTitle, content: formFields };
    lastSavedSnapshotRef.current = JSON.stringify(snapshotData);
    if (!editingFormId) {
      await refetchForms();
    } else if (!silent) {
      refetchForms();
    }
    if (!silent) {
      setEditingFormId(null);
      setFormTitle("");
      setFormFields([]);
      setFormType("reconciliation");
      setAnswerKeyByCaseId({});
      setActiveAnswerKeyCaseId("");
      refetchForms();
      toast({ title: "Salvo", description: "Formulário salvo com sucesso." });
    }
  };

  // Auto-save effect
  useEffect(() => {
    if (!roomId || !editingFormId) return;
    if (!formTitle.trim() && formFields.length === 0 && Object.keys(answerKeyByCaseId).length === 0) return;

    const snapshotData = formType === "answer_key"
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

  const deleteForm = async (id: string) => {
    await supabase.from("reconciliation_forms").delete().eq("id", id);
    refetchForms();
  };

  const editForm = (form: any) => {
    skipNextAutoSaveRef.current = true;
    setEditingFormId(form.id);
    setFormTitle(form.title);
    setFormType(form.form_type);
    if (form.form_type === "answer_key") {
      // New per-case structure: { case_answers: { [caseId]: FormField[] } }
      const content = form.content_json;
      if (content && typeof content === "object" && !Array.isArray(content) && content.case_answers) {
        setAnswerKeyByCaseId(content.case_answers);
        setFormFields([]);
        const firstCaseId = clinicalCases.length > 0 ? clinicalCases[0].id : "";
        setActiveAnswerKeyCaseId(firstCaseId);
        lastSavedSnapshotRef.current = JSON.stringify({ formType: form.form_type, title: form.title, content: content.case_answers });
      } else if (Array.isArray(content)) {
        // Legacy: single answer key — migrate to first case if exists
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

  // Add field to form
  // Field management delegated to FormBuilder

  // Clinical cases
  const saveCase = async () => {
    if (!caseTitle.trim()) return;
    if (editingCaseId) {
      await supabase.from("reconciliation_clinical_cases").update({ title: caseTitle, content: caseContent }).eq("id", editingCaseId);
    } else {
      await supabase.from("reconciliation_clinical_cases").insert({
        room_id: roomId!,
        title: caseTitle,
        content: caseContent,
        position: clinicalCases.length,
      });
    }
    setCaseTitle("");
    setCaseContent("");
    setEditingCaseId(null);
    refetchCases();
    toast({ title: "Caso salvo" });
  };

  const deleteCase = async (id: string) => {
    await supabase.from("reconciliation_clinical_cases").delete().eq("id", id);
    refetchCases();
  };

  // Delete participant
  const deleteParticipant = async (id: string) => {
    await supabase.from("reconciliation_participants").delete().eq("id", id);
    refetchParticipants();
  };

  // Activate room
  const activateRoom = async () => {
    const reconciliationForm = forms.find((f: any) => f.form_type === "reconciliation");
    const answerKey = forms.find((f: any) => f.form_type === "answer_key");
    if (!reconciliationForm) {
      toast({ title: "Formulário necessário", description: "Cadastre uma ficha de reconciliação antes de ativar.", variant: "destructive" });
      return;
    }
    if (!students.length) {
      toast({ title: "Sem alunos", description: "Importe alunos do SOAP antes de ativar.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("reconciliation_rooms").update({ status: "active" }).eq("id", roomId!);
    if (error) {
      toast({ title: "Erro", variant: "destructive" });
      return;
    }
    toast({ title: "Sala ativada!" });
    queryClient.invalidateQueries({ queryKey: ["reconciliation-room", roomId] });
  };

  if (roomLoading) return <p className="p-6 text-muted-foreground">Carregando...</p>;
  if (!room) return <p className="p-6">Sala não encontrada.</p>;

  const totalMaxScore = formFields.filter(f => f.type !== "section_header").reduce((sum, f) => sum + (f.max_score || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/simulations/reconciliation")}>
          <ArrowLeft className="h-4 w-4 mr-1" />Voltar
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-chart-3/10 text-chart-3 border-chart-3/30">Reconciliação</Badge>
            <h1 className="text-xl font-bold">{room.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground">PIN: {room.access_code} · Status: {room.status}</p>
        </div>
        {room.status === "draft" && (
          <Button className="ml-auto" onClick={activateRoom}>
            <Play className="h-4 w-4 mr-1" />Ativar Sala
          </Button>
        )}
        {room.status === "active" && (
          <Button className="ml-auto" onClick={() => navigate(`/simulations/reconciliation/control/${roomId}`)}>
            <Play className="h-4 w-4 mr-1" />Painel de Controle
          </Button>
        )}
      </div>

      <Tabs defaultValue="participants">
        <TabsList>
          <TabsTrigger value="participants"><Users className="h-4 w-4 mr-1" />Participantes</TabsTrigger>
          <TabsTrigger value="forms"><FileText className="h-4 w-4 mr-1" />Formulários</TabsTrigger>
          <TabsTrigger value="cases"><BookOpen className="h-4 w-4 mr-1" />Casos Clínicos</TabsTrigger>
        </TabsList>

        {/* Participants Tab */}
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
              <Button variant="outline"><Download className="h-4 w-4 mr-2" />Importar do SOAP</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Importar Alunos do SOAP</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Select value={selectedImportRoom} onValueChange={setSelectedImportRoom}>
                  <SelectTrigger><SelectValue placeholder="Selecione a sala SOAP" /></SelectTrigger>
                  <SelectContent>
                    {soapRooms?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.title} (PIN: {r.access_code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={importFromSoapDialog} disabled={!selectedImportRoom} className="w-full">Importar</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Pair formation - same pattern as SOAP */}
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
              await supabase.from("reconciliation_participants").update({ pair_index: nextPairIdx, pair_position: "A" } as any).eq("id", a);
              await supabase.from("reconciliation_participants").update({ pair_index: nextPairIdx, pair_position: "B" } as any).eq("id", b);
              setSelectedForPairing([]);
              refetchParticipants();
              toast({ title: "Dupla formada!" });
            };

            const undoPair = async (pairIdx: number) => {
              const members = pairGroups[pairIdx] || [];
              for (const m of members) {
                await supabase.from("reconciliation_participants").update({ pair_index: -1, pair_position: "X" } as any).eq("id", m.id);
              }
              refetchParticipants();
              toast({ title: "Dupla desfeita" });
            };

            return (
              <>
                {/* Formed pairs */}
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
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => undoPair(Number(idx))}>
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Unpaired students */}
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

                {/* All paired */}
                {unpaired.length === 0 && paired.length > 0 && (
                  <p className="text-sm text-muted-foreground">Todos os alunos estão em duplas.</p>
                )}

                {/* No students yet */}
                {students.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum participante importado ainda.</p>
                )}
              </>
            );
          })()}
        </TabsContent>

        {/* Forms Tab */}
        <TabsContent value="forms" className="space-y-4">
          {/* Import from other rooms */}
          {otherRooms && otherRooms.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Importar Formulários</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {otherRooms.map(or => (
                    <Button key={or.id} variant="outline" size="sm" onClick={() => importForms(or.id)}>
                      <Copy className="h-3.5 w-3.5 mr-1" />{or.title}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing forms — grouped: reconciliation first, then answer_key below */}
          {[...forms].sort((a, b) => {
            const order: Record<string, number> = { reconciliation: 0, answer_key: 1 };
            return (order[a.form_type] ?? 2) - (order[b.form_type] ?? 2);
          }).map((form: any) => {
            const isAnswerKey = form.form_type === "answer_key";
            const caseAnswers = isAnswerKey && form.content_json?.case_answers;
            const caseCount = caseAnswers ? Object.keys(caseAnswers).length : 0;
            const fieldCount = Array.isArray(form.content_json) ? form.content_json.length : 0;
            return (
            <Card key={form.id} className={isAnswerKey ? "ml-4 border-l-4 border-l-primary/30" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{form.title}</CardTitle>
                    <Badge variant="outline" className="mt-1">
                      {isAnswerKey ? "Espelho de Respostas" : "Ficha de Reconciliação"}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
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

          {/* Form editor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{editingFormId ? "Editar Formulário" : "Novo Formulário"}</CardTitle>
            </CardHeader>
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
                    if (v === "answer_key" && clinicalCases.length > 0 && !activeAnswerKeyCaseId) {
                      setActiveAnswerKeyCaseId(clinicalCases[0].id);
                    }
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reconciliation">Ficha de Reconciliação</SelectItem>
                      <SelectItem value="answer_key">Espelho de Respostas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formType === "answer_key" ? (
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total: {totalMaxScore} pts</span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2">
                <Button onClick={() => saveForm()} disabled={!canSaveCurrentForm()}>Salvar Formulário</Button>
              </div>
              {editingFormId && (
                <Button variant="ghost" onClick={() => { setEditingFormId(null); setFormTitle(""); setFormFields([]); setAnswerKeyByCaseId({}); setActiveAnswerKeyCaseId(""); }}>
                  Cancelar edição
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clinical Cases Tab */}
        <TabsContent value="cases" className="space-y-4">
          {clinicalCases.map((cc: any) => (
            <Card key={cc.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{cc.title}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingCaseId(cc.id); setCaseTitle(cc.title); setCaseContent(cc.content || ""); }}>
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteCase(cc.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{cc.content}</p>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{editingCaseId ? "Editar Caso Clínico" : "Novo Caso Clínico"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input value={caseTitle} onChange={e => setCaseTitle(e.target.value)} placeholder="Ex: Caso Clínico 1 - Diabetes" />
              </div>
              <div>
                <Label>Conteúdo</Label>
                <Textarea value={caseContent} onChange={e => setCaseContent(e.target.value)} rows={8} placeholder="Descreva o caso clínico..." />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveCase} disabled={!caseTitle.trim()}>Salvar Caso</Button>
                {editingCaseId && (
                  <Button variant="ghost" onClick={() => { setEditingCaseId(null); setCaseTitle(""); setCaseContent(""); }}>
                    Cancelar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
