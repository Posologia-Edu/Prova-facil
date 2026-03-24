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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Users, FileText, Play, Download, Pencil, Scissors, Copy, GraduationCap, Shuffle, RotateCcw, Star, BookmarkPlus } from "lucide-react";
import GenericSplitRoomDialog from "@/components/GenericSplitRoomDialog";
import FormBuilder from "@/components/forms/FormBuilder";
import type { FormField } from "@/components/forms/types";
import FormTemplateDialog, { SaveAsTemplateDialog } from "@/components/forms/FormTemplateDialog";

// FormField type imported from @/components/forms/types

export default function SoapEditor() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ["soap-room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("soap_rooms").select("*").eq("id", roomId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

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
  // Fetch professor name from linked anamnesis room
  const { data: professorName } = useQuery({
    queryKey: ["soap-professor", roomId, room?.anamnesis_room_id],
    queryFn: async () => {
      if (!room?.anamnesis_room_id) return null;
      const { data } = await supabase
        .from("simulation_participants")
        .select("student_name")
        .eq("room_id", room.anamnesis_room_id)
        .eq("participant_role", "teacher")
        .limit(1)
        .maybeSingle();
      return data?.student_name || null;
    },
    enabled: !!room?.anamnesis_room_id,
  });

  // Fallback: fetch logged-in user profile name
  const { data: profileName } = useQuery({
    queryKey: ["my-profile-name"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", session.user.id).maybeSingle();
      return data?.full_name || null;
    },
  });

  const displayProfessor = professorName || profileName || "Professor";

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

  // Other SOAP rooms for form import
  const { data: otherSoapRooms } = useQuery({
    queryKey: ["soap-rooms-for-form-import", roomId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data, error } = await supabase
        .from("soap_rooms")
        .select("id, title, access_code")
        .eq("user_id", session.user.id)
        .neq("id", roomId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedImportRoom, setSelectedImportRoom] = useState("");
  const [importFormDialogOpen, setImportFormDialogOpen] = useState(false);
  const [selectedFormImportRoom, setSelectedFormImportRoom] = useState("");
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [selectedForPairing, setSelectedForPairing] = useState<string[]>([]);

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
      .eq("room_id", selectedImportRoom);
    if (error || !simParticipants?.length) {
      toast({ title: "Erro", description: "Nenhum participante encontrado na sala de anamnese.", variant: "destructive" });
      return;
    }
    // Only import students, not teachers
    const students = simParticipants.filter(p => p.participant_role === "student");
    if (!students.length) {
      toast({ title: "Erro", description: "Nenhum aluno encontrado na sala de anamnese.", variant: "destructive" });
      return;
    }
    const inserts = students.map((p) => ({
      room_id: roomId!,
      student_name: p.student_name,
      student_email: p.student_email || "",
      anamnesis_participant_id: p.id,
      participant_role: "student",
    }));
    const { error: insertErr } = await supabase.from("soap_participants").insert(inserts as any);
    if (insertErr) { toast({ title: "Erro", description: insertErr.message, variant: "destructive" }); return; }
    toast({ title: "Importado", description: `${students.length} aluno(s) importado(s).` });
    setImportDialogOpen(false);
    refetchParticipants();
  };

  // Import forms from another SOAP room
  const importFormsFromRoom = async () => {
    if (!selectedFormImportRoom) return;
    const { data: sourceForms, error } = await supabase
      .from("soap_forms")
      .select("*")
      .eq("room_id", selectedFormImportRoom);
    if (error || !sourceForms?.length) {
      toast({ title: "Erro", description: "Nenhum formulário encontrado na sala selecionada.", variant: "destructive" });
      return;
    }
    const inserts = sourceForms.map((f: any) => ({
      room_id: roomId!,
      form_type: f.form_type,
      title: f.title,
      content_json: f.content_json,
    }));
    const { error: insertErr } = await supabase.from("soap_forms").insert(inserts);
    if (insertErr) { toast({ title: "Erro", description: insertErr.message, variant: "destructive" }); return; }
    toast({ title: "Importado", description: `${inserts.length} formulário(s) importado(s).` });
    setImportFormDialogOpen(false);
    refetchForms();
  };

  const removeParticipant = async (id: string) => {
    await supabase.from("soap_participants").delete().eq("id", id);
    refetchParticipants();
  };

  // Form management
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<string>("soap");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const lastSavedSnapshotRef = useRef("");
  const skipNextAutoSaveRef = useRef(false);

  // Field management delegated to FormBuilder

  const saveForm = async (silent = false) => {
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
    lastSavedSnapshotRef.current = JSON.stringify({ formType, title: formTitle, content: formFields });
    if (!editingFormId) {
      await refetchForms();
    } else if (!silent) {
      refetchForms();
    }
    if (!silent) {
      setFormTitle("");
      setFormType("soap");
      setFormFields([]);
      setEditingFormId(null);
      refetchForms();
      toast({ title: "Formulário salvo" });
    }
  };

  // Auto-save effect
  useEffect(() => {
    if (!roomId || !editingFormId) return;
    if (!formTitle.trim() && formFields.length === 0) return;

    const currentSnapshot = JSON.stringify({ formType, title: formTitle, content: formFields });

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
  }, [roomId, editingFormId, formType, formTitle, formFields]);

  const editForm = (form: any) => {
    skipNextAutoSaveRef.current = true;
    setEditingFormId(form.id);
    setFormTitle(form.title);
    setFormType(form.form_type);
    const fields = Array.isArray(form.content_json) ? form.content_json : [];
    setFormFields(fields);
    lastSavedSnapshotRef.current = JSON.stringify({ formType: form.form_type, title: form.title, content: fields });
  };

  const deleteForm = async (id: string) => {
    await supabase.from("soap_forms").delete().eq("id", id);
    refetchForms();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/simulations/soap")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-chart-2/10 text-chart-2 border-chart-2/30">SOAP</Badge>
            <h1 className="text-2xl font-bold">{room.title}</h1>
          </div>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            PIN: {room.access_code} • Status: {room.status}
            <span className="inline-flex items-center gap-1 ml-2"><GraduationCap className="h-3.5 w-3.5" />{displayProfessor}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {room.status === "draft" && (
            <>
              <Button variant="outline" onClick={() => setSplitDialogOpen(true)}>
                <Scissors className="h-4 w-4 mr-2" />Dividir Sala
              </Button>
              <Button onClick={activateRoom}><Play className="h-4 w-4 mr-2" />Ativar Sala</Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="participants">
        <TabsList>
          <TabsTrigger value="participants"><Users className="h-4 w-4 mr-1" />Participantes ({participants.length})</TabsTrigger>
          <TabsTrigger value="forms"><FileText className="h-4 w-4 mr-1" />Formulários ({forms.length})</TabsTrigger>
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
              <Button variant="outline"><Download className="h-4 w-4 mr-2" />Importar da Anamnese</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Importar Alunos da Anamnese</DialogTitle></DialogHeader>
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

          {/* Pair formation section */}
          {(() => {
            const unpaired = participants.filter(p => p.pair_index < 0);
            const paired = participants.filter(p => p.pair_index >= 0);
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
              await supabase.from("soap_participants").update({ pair_index: nextPairIdx, pair_position: "A" } as any).eq("id", a);
              await supabase.from("soap_participants").update({ pair_index: nextPairIdx, pair_position: "B" } as any).eq("id", b);
              setSelectedForPairing([]);
              refetchParticipants();
              toast({ title: "Dupla formada!" });
            };

            const undoPair = async (pairIdx: number) => {
              const members = pairGroups[pairIdx] || [];
              for (const m of members) {
                await supabase.from("soap_participants").update({ pair_index: -1, pair_position: "X" } as any).eq("id", m.id);
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
                              <Badge variant="outline">Dupla {idx}</Badge>
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

                {/* All paired, no unpaired */}
                {unpaired.length === 0 && paired.length > 0 && (
                  <p className="text-sm text-muted-foreground">Todos os alunos estão em duplas.</p>
                )}
              </>
            );
          })()}
        </TabsContent>

        {/* Forms Tab */}
        <TabsContent value="forms" className="space-y-4">
          <div className="flex gap-2">
            <Dialog open={importFormDialogOpen} onOpenChange={setImportFormDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Copy className="h-4 w-4 mr-2" />Importar Formulários de Outra Sala</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Importar Formulários de Outra Sala SOAP</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Select value={selectedFormImportRoom} onValueChange={setSelectedFormImportRoom}>
                    <SelectTrigger><SelectValue placeholder="Selecione a sala SOAP de origem" /></SelectTrigger>
                    <SelectContent>
                      {otherSoapRooms?.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.title} (PIN: {r.access_code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={importFormsFromRoom} disabled={!selectedFormImportRoom} className="w-full">Importar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

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

              <FormBuilder
                fields={formFields}
                onChange={setFormFields}
                showScores={formType === "peer_evaluation"}
                scoreLabel="Pts"
              />

              <Button onClick={() => saveForm()} disabled={!formTitle.trim()} className="w-full">
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
      </Tabs>

      <GenericSplitRoomDialog
        roomId={roomId!}
        open={splitDialogOpen}
        onOpenChange={setSplitDialogOpen}
        onComplete={() => {
          setSplitDialogOpen(false);
          navigate("/simulations/soap");
        }}
        tablePrefix="soap"
      />
    </div>
  );
}
