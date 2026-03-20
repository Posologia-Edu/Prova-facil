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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Users, FileText, Play, Copy, BookOpen, CheckSquare, RotateCcw } from "lucide-react";

type FormField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "radio" | "checkbox" | "scale";
  options?: string[];
  max_score?: number;
  required?: boolean;
};

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

  // Clinical case editor
  const [caseTitle, setCaseTitle] = useState("");
  const [caseContent, setCaseContent] = useState("");
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [selectedForPairing, setSelectedForPairing] = useState<string[]>([]);

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
  const saveForm = async () => {
    if (!formTitle.trim()) return;

    if (editingFormId) {
      const { error } = await supabase.from("reconciliation_forms").update({
        title: formTitle,
        content_json: formFields as any,
        form_type: formType,
      }).eq("id", editingFormId);
      if (error) { toast({ title: "Erro", variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("reconciliation_forms").insert({
        room_id: roomId!,
        title: formTitle,
        content_json: formFields as any,
        form_type: formType,
      });
      if (error) { toast({ title: "Erro", variant: "destructive" }); return; }
    }

    setEditingFormId(null);
    setFormTitle("");
    setFormFields([]);
    setFormType("reconciliation");
    refetchForms();
    toast({ title: "Salvo", description: "Formulário salvo com sucesso." });
  };

  const deleteForm = async (id: string) => {
    await supabase.from("reconciliation_forms").delete().eq("id", id);
    refetchForms();
  };

  const editForm = (form: any) => {
    setEditingFormId(form.id);
    setFormTitle(form.title);
    setFormType(form.form_type);
    setFormFields(Array.isArray(form.content_json) ? form.content_json : []);
  };

  // Add field to form
  const addField = () => {
    setFormFields([...formFields, {
      id: crypto.randomUUID(),
      label: "",
      type: "textarea",
      max_score: 1,
      required: true,
    }]);
  };

  const updateField = (idx: number, updates: Partial<FormField>) => {
    setFormFields(formFields.map((f, i) => i === idx ? { ...f, ...updates } : f));
  };

  const removeField = (idx: number) => {
    setFormFields(formFields.filter((_, i) => i !== idx));
  };

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

  const totalMaxScore = formFields.reduce((sum, f) => sum + (f.max_score || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/simulations/reconciliation")}>
          <ArrowLeft className="h-4 w-4 mr-1" />Voltar
        </Button>
        <div>
          <h1 className="text-xl font-bold">{room.title}</h1>
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
            <CardHeader>
              <CardTitle className="text-base">Importar Alunos do SOAP</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {soapRooms?.map(sr => (
                  <Button key={sr.id} variant="outline" size="sm" onClick={() => importFromSoap(sr.id)}>
                    <Copy className="h-3.5 w-3.5 mr-1" />{sr.title}
                  </Button>
                ))}
                {!soapRooms?.length && <p className="text-sm text-muted-foreground">Nenhuma sala SOAP encontrada</p>}
              </div>
            </CardContent>
          </Card>

          {Object.keys(pairs).length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(pairs).map(([idx, pair]) => (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Dupla {Number(idx) + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {pair.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <span>{p.student_name} <span className="text-muted-foreground">({p.student_email})</span></span>
                        <Button variant="ghost" size="sm" onClick={() => deleteParticipant(p.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum participante importado ainda.</p>
          )}

          {/* Unpaired students */}
          {students.filter(s => s.pair_index < 0).length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Sem dupla</CardTitle></CardHeader>
              <CardContent>
                {students.filter(s => s.pair_index < 0).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span>{p.student_name}</span>
                    <Button variant="ghost" size="sm" onClick={() => deleteParticipant(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
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

          {/* Existing forms */}
          {forms.map((form: any) => (
            <Card key={form.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{form.title}</CardTitle>
                    <Badge variant="outline" className="mt-1">
                      {form.form_type === "answer_key" ? "Espelho de Respostas" : "Ficha de Reconciliação"}
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
                  {Array.isArray(form.content_json) ? `${form.content_json.length} campos` : "0 campos"}
                </p>
              </CardContent>
            </Card>
          ))}

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
                  <Select value={formType} onValueChange={(v: any) => setFormType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reconciliation">Ficha de Reconciliação</SelectItem>
                      <SelectItem value="answer_key">Espelho de Respostas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formFields.map((field, idx) => (
                <Card key={field.id} className="p-3">
                  <div className="grid gap-2">
                    <div className="flex gap-2">
                      <Input
                        value={field.label}
                        onChange={e => updateField(idx, { label: e.target.value })}
                        placeholder="Pergunta / Item"
                        className="flex-1"
                      />
                      <Select value={field.type} onValueChange={(v: any) => updateField(idx, { type: v })}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Texto curto</SelectItem>
                          <SelectItem value="textarea">Texto longo</SelectItem>
                          <SelectItem value="radio">Múltipla escolha</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                          <SelectItem value="scale">Escala</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={field.max_score || 0}
                        onChange={e => updateField(idx, { max_score: Number(e.target.value) })}
                        className="w-20"
                        placeholder="Pts"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeField(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {(field.type === "radio" || field.type === "checkbox") && (
                      <Input
                        value={field.options?.join(", ") || ""}
                        onChange={e => updateField(idx, { options: e.target.value.split(",").map(o => o.trim()) })}
                        placeholder="Opções separadas por vírgula"
                      />
                    )}
                  </div>
                </Card>
              ))}

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={addField}><Plus className="h-4 w-4 mr-1" />Adicionar Campo</Button>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Total: {totalMaxScore} pts</span>
                  <Button onClick={saveForm} disabled={!formTitle.trim()}>Salvar Formulário</Button>
                </div>
              </div>
              {editingFormId && (
                <Button variant="ghost" onClick={() => { setEditingFormId(null); setFormTitle(""); setFormFields([]); }}>
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
