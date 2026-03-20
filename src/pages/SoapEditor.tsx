import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { ArrowLeft, Plus, Trash2, Users, FileText, Settings, Play, Download, Pencil, Check, X } from "lucide-react";

type FormField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "radio" | "checkbox" | "scale";
  options?: string[];
  max_score?: number;
  required?: boolean;
};

export default function SoapEditor() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Room data
  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ["soap-room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("soap_rooms").select("*").eq("id", roomId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  // Participants
  const { data: participants = [], refetch: refetchParticipants } = useQuery({
    queryKey: ["soap-participants", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("soap_participants")
        .select("*")
        .eq("room_id", roomId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  // Forms
  const { data: forms = [], refetch: refetchForms } = useQuery({
    queryKey: ["soap-forms", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("soap_forms")
        .select("*")
        .eq("room_id", roomId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!roomId,
  });

  // Anamnesis rooms for import
  const { data: anamnesisRooms } = useQuery({
    queryKey: ["anamnesis-rooms-for-import"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data, error } = await supabase
        .from("simulation_rooms")
        .select("id, title, access_code")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedImportRoom, setSelectedImportRoom] = useState("");

  // Add participant
  const addParticipant = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("soap_participants").insert({
      room_id: roomId!,
      student_name: newName.trim(),
      student_email: newEmail.trim(),
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setNewName("");
    setNewEmail("");
    refetchParticipants();
  };

  // Import from anamnesis
  const importFromAnamnesis = async () => {
    if (!selectedImportRoom) return;
    const { data: simParticipants, error } = await supabase
      .from("simulation_participants")
      .select("*")
      .eq("room_id", selectedImportRoom)
      .eq("participant_role", "student");
    if (error || !simParticipants?.length) {
      toast({ title: "Erro", description: "Nenhum aluno encontrado na sala de anamnese.", variant: "destructive" });
      return;
    }
    const inserts = simParticipants.map((p) => ({
      room_id: roomId!,
      student_name: p.student_name,
      student_email: p.student_email || "",
      anamnesis_participant_id: p.id,
    }));
    const { error: insertErr } = await supabase.from("soap_participants").insert(inserts);
    if (insertErr) { toast({ title: "Erro", description: insertErr.message, variant: "destructive" }); return; }
    toast({ title: "Importado", description: `${inserts.length} alunos importados.` });
    setImportDialogOpen(false);
    refetchParticipants();
  };

  // Remove participant
  const removeParticipant = async (id: string) => {
    await supabase.from("soap_participants").delete().eq("id", id);
    refetchParticipants();
  };

  // Form management
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<string>("soap");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);

  const addField = () => {
    setFormFields([...formFields, { id: crypto.randomUUID(), label: "", type: "text", required: false }]);
  };

  const updateField = (idx: number, updates: Partial<FormField>) => {
    setFormFields(formFields.map((f, i) => i === idx ? { ...f, ...updates } : f));
  };

  const removeField = (idx: number) => {
    setFormFields(formFields.filter((_, i) => i !== idx));
  };

  const saveForm = async () => {
    if (!formTitle.trim()) return;
    if (editingFormId) {
      await supabase.from("soap_forms").update({
        title: formTitle,
        form_type: formType,
        content_json: formFields as any,
      }).eq("id", editingFormId);
    } else {
      await supabase.from("soap_forms").insert({
        room_id: roomId!,
        title: formTitle,
        form_type: formType,
        content_json: formFields as any,
      });
    }
    setFormTitle("");
    setFormType("soap");
    setFormFields([]);
    setEditingFormId(null);
    refetchForms();
    toast({ title: "Formulário salvo" });
  };

  const editForm = (form: any) => {
    setEditingFormId(form.id);
    setFormTitle(form.title);
    setFormType(form.form_type);
    setFormFields(Array.isArray(form.content_json) ? form.content_json : []);
  };

  const deleteForm = async (id: string) => {
    await supabase.from("soap_forms").delete().eq("id", id);
    refetchForms();
  };

  // Pair management
  const formPairs = async () => {
    const unpaired = participants.filter((p) => p.pair_index < 0);
    if (unpaired.length < 2) {
      toast({ title: "Insuficiente", description: "Precisa de pelo menos 2 alunos sem dupla.", variant: "destructive" });
      return;
    }
    const maxPairIdx = Math.max(0, ...participants.filter(p => p.pair_index >= 0).map(p => p.pair_index));
    let pairIdx = maxPairIdx + 1;
    for (let i = 0; i < unpaired.length - 1; i += 2) {
      await supabase.from("soap_participants").update({ pair_index: pairIdx, pair_position: "A" }).eq("id", unpaired[i].id);
      await supabase.from("soap_participants").update({ pair_index: pairIdx, pair_position: "B" }).eq("id", unpaired[i + 1].id);
      pairIdx++;
    }
    refetchParticipants();
    toast({ title: "Duplas formadas" });
  };

  // Activate room
  const activateRoom = async () => {
    const hasSoapForm = forms.some((f: any) => f.form_type === "soap");
    const hasPeerForm = forms.some((f: any) => f.form_type === "peer_evaluation");
    if (!hasSoapForm || !hasPeerForm) {
      toast({ title: "Formulários necessários", description: "Cadastre um formulário SOAP e um de Avaliação entre Pares.", variant: "destructive" });
      return;
    }
    if (participants.length < 2) {
      toast({ title: "Alunos insuficientes", description: "Adicione pelo menos 2 alunos.", variant: "destructive" });
      return;
    }
    await supabase.from("soap_rooms").update({ status: "active" }).eq("id", roomId!);
    queryClient.invalidateQueries({ queryKey: ["soap-room", roomId] });
    toast({ title: "Sala ativada!" });
  };

  if (roomLoading) return <p className="p-6 text-muted-foreground">Carregando...</p>;
  if (!room) return <p className="p-6 text-destructive">Sala não encontrada</p>;

  const students = participants;
  const paired = students.filter((p) => p.pair_index >= 0);
  const unpaired = students.filter((p) => p.pair_index < 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/simulations/soap")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{room.title}</h1>
          <p className="text-muted-foreground text-sm">PIN: {room.access_code} • Status: {room.status}</p>
        </div>
        {room.status === "draft" && (
          <Button onClick={activateRoom}><Play className="h-4 w-4 mr-2" />Ativar Sala</Button>
        )}
      </div>

      <Tabs defaultValue="participants">
        <TabsList>
          <TabsTrigger value="participants"><Users className="h-4 w-4 mr-1" />Participantes ({students.length})</TabsTrigger>
          <TabsTrigger value="forms"><FileText className="h-4 w-4 mr-1" />Formulários ({forms.length})</TabsTrigger>
          <TabsTrigger value="pairs"><Settings className="h-4 w-4 mr-1" />Duplas</TabsTrigger>
        </TabsList>

        {/* Participants Tab */}
        <TabsContent value="participants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar Aluno</CardTitle>
            </CardHeader>
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
              <Button variant="outline"><Download className="h-4 w-4 mr-2" />Importar da Anamnese</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar Alunos da Anamnese</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={selectedImportRoom} onValueChange={setSelectedImportRoom}>
                  <SelectTrigger><SelectValue placeholder="Selecione a sala de anamnese" /></SelectTrigger>
                  <SelectContent>
                    {anamnesisRooms?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.title} (PIN: {r.access_code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={importFromAnamnesis} disabled={!selectedImportRoom} className="w-full">Importar</Button>
              </div>
            </DialogContent>
          </Dialog>

          {students.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {students.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                      <div>
                        <span className="font-medium">{p.student_name}</span>
                        {p.student_email && <span className="text-sm text-muted-foreground ml-2">{p.student_email}</span>}
                        {p.pair_index >= 0 && (
                          <Badge variant="outline" className="ml-2">Dupla {p.pair_index} ({p.pair_position})</Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeParticipant(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Forms Tab */}
        <TabsContent value="forms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{editingFormId ? "Editar Formulário" : "Novo Formulário"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Título</Label>
                  <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Ex: Formulário SOAP" />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="soap">SOAP</SelectItem>
                      <SelectItem value="peer_evaluation">Avaliação entre Pares</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Campos</Label>
                  <Button variant="outline" size="sm" onClick={addField}><Plus className="h-3 w-3 mr-1" />Campo</Button>
                </div>
                {formFields.map((field, idx) => (
                  <div key={field.id} className="flex gap-2 items-start p-3 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <Input placeholder="Rótulo do campo" value={field.label} onChange={(e) => updateField(idx, { label: e.target.value })} />
                      <div className="flex gap-2">
                        <Select value={field.type} onValueChange={(v) => updateField(idx, { type: v as any })}>
                          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Texto curto</SelectItem>
                            <SelectItem value="textarea">Texto longo</SelectItem>
                            <SelectItem value="radio">Múltipla escolha</SelectItem>
                            <SelectItem value="checkbox">Checkbox</SelectItem>
                            <SelectItem value="scale">Escala</SelectItem>
                          </SelectContent>
                        </Select>
                        {field.type === "scale" && (
                          <Input type="number" placeholder="Nota máx" value={field.max_score || ""} onChange={(e) => updateField(idx, { max_score: Number(e.target.value) })} className="w-24" />
                        )}
                      </div>
                      {(field.type === "radio" || field.type === "checkbox") && (
                        <Input placeholder="Opções (separadas por vírgula)" value={field.options?.join(", ") || ""} onChange={(e) => updateField(idx, { options: e.target.value.split(",").map(s => s.trim()) })} />
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeField(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button onClick={saveForm} disabled={!formTitle.trim()} className="w-full">
                {editingFormId ? "Atualizar Formulário" : "Salvar Formulário"}
              </Button>
              {editingFormId && (
                <Button variant="outline" className="w-full" onClick={() => { setEditingFormId(null); setFormTitle(""); setFormFields([]); }}>
                  Cancelar Edição
                </Button>
              )}
            </CardContent>
          </Card>

          {forms.map((form: any) => (
            <Card key={form.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{form.title}</CardTitle>
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline">{form.form_type === "soap" ? "SOAP" : "Avaliação entre Pares"}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => editForm(form)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteForm(form.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{(form.content_json as any[])?.length || 0} campos</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Pairs Tab */}
        <TabsContent value="pairs" className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={formPairs} disabled={unpaired.length < 2}>
              <Users className="h-4 w-4 mr-2" />Formar Duplas Automaticamente
            </Button>
          </div>
          {unpaired.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Sem Dupla ({unpaired.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {unpaired.map((p) => (
                    <Badge key={p.id} variant="secondary">{p.student_name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {paired.length > 0 && (() => {
            const groups: Record<number, typeof paired> = {};
            paired.forEach((p) => { (groups[p.pair_index] ||= []).push(p); });
            return Object.entries(groups).map(([idx, members]) => (
              <Card key={idx}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Dupla {idx}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    {members.sort((a, b) => a.pair_position.localeCompare(b.pair_position)).map((m) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <Badge variant={m.pair_position === "A" ? "default" : "secondary"}>{m.pair_position}</Badge>
                        <span>{m.student_name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ));
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
