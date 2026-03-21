import { useState } from "react";
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
import { ArrowLeft, Plus, Trash2, Users, FileText, Play, BookOpen, Table2, Copy, RotateCcw } from "lucide-react";
import FormBuilder from "@/components/forms/FormBuilder";
import type { FormField } from "@/components/forms/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// FormField type imported from @/components/forms/types

type MedColumn = { id: string; label: string };
type MedFormContent = { columns: MedColumn[]; rows_score: number; answer_rows?: Record<string, string>[] };

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

  // Medication summary builder state
  const [medTitle, setMedTitle] = useState("");
  const [medType, setMedType] = useState<string>("medication_summary");
  const [medColumns, setMedColumns] = useState<MedColumn[]>([]);
  const [medRowsScore, setMedRowsScore] = useState(1);
  const [medAnswerRows, setMedAnswerRows] = useState<Record<string, string>[]>([]);
  const [editingMedFormId, setEditingMedFormId] = useState<string | null>(null);
  const [selectedForPairing, setSelectedForPairing] = useState<string[]>([]);

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
      toast({ title: "Sem alunos", description: "Nenhum aluno encontrado nesta sala de Reconciliação.", variant: "destructive" });
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

  const deleteParticipant = async (id: string) => {
    await supabase.from("documentation_participants").delete().eq("id", id);
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

  // Save referral form
  const saveForm = async () => {
    if (!formTitle.trim()) return;
    const payload = { title: formTitle, content_json: formFields as any, form_type: formType };
    if (editingFormId) {
      await supabase.from("documentation_forms").update(payload).eq("id", editingFormId);
    } else {
      await supabase.from("documentation_forms").insert({ ...payload, room_id: roomId! });
    }
    setEditingFormId(null); setFormTitle(""); setFormFields([]); setFormType("referral");
    refetchForms();
    toast({ title: "Formulário salvo" });
  };

  const editForm = (form: any) => {
    if (form.form_type === "medication_summary" || form.form_type === "medication_answer_key") {
      editMedForm(form);
      return;
    }
    setEditingFormId(form.id);
    setFormTitle(form.title);
    setFormType(form.form_type);
    setFormFields(Array.isArray(form.content_json) ? form.content_json : []);
  };

  const deleteForm = async (id: string) => {
    await supabase.from("documentation_forms").delete().eq("id", id);
    refetchForms();
  };

  const addField = () => {
    setFormFields([...formFields, { id: crypto.randomUUID(), label: "", type: "textarea", max_score: 1, required: true }]);
  };

  const updateField = (idx: number, updates: Partial<FormField>) => {
    setFormFields(formFields.map((f, i) => i === idx ? { ...f, ...updates } : f));
  };

  const removeField = (idx: number) => {
    setFormFields(formFields.filter((_, i) => i !== idx));
  };

  // Medication summary form
  const saveMedForm = async () => {
    if (!medTitle.trim() || !medColumns.length) return;
    const content: MedFormContent = { columns: medColumns, rows_score: medRowsScore };
    if (medType === "medication_answer_key") content.answer_rows = medAnswerRows;

    const payload = { title: medTitle, content_json: content as any, form_type: medType };
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
    const content = form.content_json as MedFormContent;
    setMedColumns(content?.columns || []);
    setMedRowsScore(content?.rows_score || 1);
    setMedAnswerRows(content?.answer_rows || []);
  };

  const resetMedForm = () => {
    setEditingMedFormId(null); setMedTitle(""); setMedType("medication_summary");
    setMedColumns([]); setMedRowsScore(1); setMedAnswerRows([]);
  };

  const addMedColumn = () => {
    setMedColumns([...medColumns, { id: crypto.randomUUID(), label: "" }]);
  };

  const addMedAnswerRow = () => {
    const row: Record<string, string> = {};
    medColumns.forEach(c => { row[c.id] = ""; });
    setMedAnswerRows([...medAnswerRows, row]);
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/simulations/documentation")}>
          <ArrowLeft className="h-4 w-4 mr-1" />Voltar
        </Button>
        <div>
          <h1 className="text-xl font-bold">{room.title}</h1>
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

        {/* Participants - manual pair formation like Reconciliation */}
        <TabsContent value="participants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Importar Alunos da Reconciliação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {reconRooms?.map(rr => (
                  <Button key={rr.id} variant="outline" size="sm" onClick={() => importFromReconciliation(rr.id)}>
                    <Copy className="h-3.5 w-3.5 mr-1" />{rr.title}
                  </Button>
                ))}
                {!reconRooms?.length && <p className="text-sm text-muted-foreground">Nenhuma sala de Reconciliação encontrada</p>}
              </div>
            </CardContent>
          </Card>

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
          {/* Existing referral forms */}
          {forms.filter((f: any) => f.form_type === "referral" || f.form_type === "referral_answer_key").map((form: any) => (
            <Card key={form.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{form.title}</CardTitle>
                    <Badge variant="outline" className="mt-1">{formTypeLabel[form.form_type]}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => editForm(form)}>Editar</Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteForm(form.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{Array.isArray(form.content_json) ? `${form.content_json.length} campos` : "0 campos"}</p>
              </CardContent>
            </Card>
          ))}

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
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="referral">Ficha de Encaminhamento</SelectItem>
                      <SelectItem value="referral_answer_key">Espelho do Encaminhamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formFields.map((field, idx) => (
                <Card key={field.id} className="p-3">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Label className="text-xs">Rótulo</Label>
                      <Input value={field.label} onChange={e => updateField(idx, { label: e.target.value })} placeholder="Nome do campo" />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={field.type} onValueChange={(v: any) => updateField(idx, { type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Texto curto</SelectItem>
                          <SelectItem value="textarea">Texto longo</SelectItem>
                          <SelectItem value="radio">Múltipla escolha</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                          <SelectItem value="scale">Escala</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Pontuação</Label>
                      <Input type="number" value={field.max_score || 0} onChange={e => updateField(idx, { max_score: Number(e.target.value) })} min={0} />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => removeField(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  {(field.type === "radio" || field.type === "checkbox") && (
                    <div className="mt-2">
                      <Label className="text-xs">Opções (separadas por vírgula)</Label>
                      <Input value={field.options?.join(", ") || ""} onChange={e => updateField(idx, { options: e.target.value.split(",").map(o => o.trim()).filter(Boolean) })} />
                    </div>
                  )}
                </Card>
              ))}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addField}><Plus className="h-3.5 w-3.5 mr-1" />Campo</Button>
                <Button size="sm" onClick={saveForm} disabled={!formTitle.trim()}>Salvar</Button>
                {editingFormId && <Button variant="ghost" size="sm" onClick={() => { setEditingFormId(null); setFormTitle(""); setFormFields([]); setFormType("referral"); }}>Cancelar</Button>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medication summary tab */}
        <TabsContent value="medication" className="space-y-4">
          {/* Existing medication forms */}
          {forms.filter((f: any) => f.form_type === "medication_summary" || f.form_type === "medication_answer_key").map((form: any) => (
            <Card key={form.id}>
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
                <p className="text-sm text-muted-foreground">{(form.content_json as MedFormContent)?.columns?.length || 0} colunas</p>
              </CardContent>
            </Card>
          ))}

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
                  <Select value={medType} onValueChange={setMedType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="medication_summary">Quadro Resumo</SelectItem>
                      <SelectItem value="medication_answer_key">Espelho do Quadro Resumo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

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

              {/* Answer rows for answer key */}
              {medType === "medication_answer_key" && medColumns.length > 0 && (
                <div className="space-y-2">
                  <Label>Linhas esperadas (espelho)</Label>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border">
                      <thead>
                        <tr>
                          {medColumns.map(c => <th key={c.id} className="border p-2 text-left">{c.label || "—"}</th>)}
                          <th className="border p-2 w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {medAnswerRows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {medColumns.map(c => (
                              <td key={c.id} className="border p-1">
                                <Input value={row[c.id] || ""} onChange={e => {
                                  const updated = [...medAnswerRows];
                                  updated[rIdx] = { ...updated[rIdx], [c.id]: e.target.value };
                                  setMedAnswerRows(updated);
                                }} className="h-8" />
                              </td>
                            ))}
                            <td className="border p-1">
                              <Button variant="ghost" size="sm" onClick={() => setMedAnswerRows(medAnswerRows.filter((_, i) => i !== rIdx))}><Trash2 className="h-3 w-3" /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button variant="outline" size="sm" onClick={addMedAnswerRow}><Plus className="h-3.5 w-3.5 mr-1" />Linha</Button>
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={saveMedForm} disabled={!medTitle.trim() || !medColumns.length}>Salvar</Button>
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
    </div>
  );
}
