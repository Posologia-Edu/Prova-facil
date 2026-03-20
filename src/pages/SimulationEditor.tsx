import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Users, FileText, Settings, Play, GripVertical, Download, AlertTriangle, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { generateRounds } from "@/lib/simulation-distribution";

type Participant = {
  id?: string;
  room_id: string;
  student_name: string;
  student_email: string;
  pair_index: number;
  pair_position: string;
  participant_role: string;
};

type FormField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "radio" | "checkbox" | "scale";
  options?: string[];
  max_score?: number;
  required?: boolean;
};

type SimForm = {
  id?: string;
  room_id: string;
  form_type: string;
  title: string;
  content_json: FormField[];
};

export default function SimulationEditor() {
  const { roomId } = useParams<{ roomId: string }>();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ["simulation-room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("simulation_rooms").select("*").eq("id", roomId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  const { data: participants = [], refetch: refetchParticipants } = useQuery({
    queryKey: ["simulation-participants", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulation_participants")
        .select("*")
        .eq("room_id", roomId!)
        .order("pair_index", { ascending: true })
        .order("pair_position", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  const { data: forms = [], refetch: refetchForms } = useQuery({
    queryKey: ["simulation-forms", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulation_forms")
        .select("*")
        .eq("room_id", roomId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!roomId,
  });

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [profName, setProfName] = useState("");
  const [profEmail, setProfEmail] = useState("");

  const professor = participants.find((p: any) => p.participant_role === "professor");
  const students = participants.filter((p: any) => p.participant_role === "student");

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const addParticipant = async (role: string) => {
    const name = role === "professor" ? profName : newName;
    const email = role === "professor" ? profEmail : newEmail;
    if (!name.trim()) return;
    if (email && !isValidEmail(email)) {
      toast({ title: t("sim_invalid_email"), variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("simulation_participants").insert({
      room_id: roomId!,
      student_name: name,
      student_email: email,
      pair_index: -1,
      pair_position: "X",
      participant_role: role,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      if (role === "professor") {
        setProfName("");
        setProfEmail("");
      } else {
        setNewName("");
        setNewEmail("");
      }
      refetchParticipants();
    }
  };

  const removeParticipant = async (id: string) => {
    await supabase.from("simulation_participants").delete().eq("id", id);
    refetchParticipants();
  };

  const formTypes = [
    { value: "anamnesis", label: t("sim_form_anamnesis") },
    { value: "patient_script", label: t("sim_form_patient_script") },
    { value: "observer_eval", label: t("sim_form_observer_eval") },
    { value: "professor_eval", label: t("sim_form_professor_eval") },
  ];

  const [activeFormType, setActiveFormType] = useState("anamnesis");
  const activeForm = forms.find((f: any) => f.form_type === activeFormType);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [formTitle, setFormTitle] = useState("");
  const [patientScript, setPatientScript] = useState("");

  useEffect(() => {
    if (activeForm) {
      setFormTitle(activeForm.title || "");
      if (activeFormType === "patient_script") {
        const content = activeForm.content_json as any;
        setPatientScript(typeof content === "string" ? content : (content?.[0]?.label || ""));
      } else {
        setFormFields(Array.isArray(activeForm.content_json) ? activeForm.content_json as FormField[] : []);
      }
    } else {
      setFormTitle("");
      setFormFields([]);
      setPatientScript("");
    }
  }, [activeForm, activeFormType]);

  // Calculate total scores for professor and observer forms
  const scoreValidation = useMemo(() => {
    const profForm = forms.find((f: any) => f.form_type === "professor_eval");
    const obsForm = forms.find((f: any) => f.form_type === "observer_eval");

    let profTotal = 0;
    let obsTotal = 0;

    if (profForm && Array.isArray(profForm.content_json)) {
      (profForm.content_json as FormField[]).forEach(f => { profTotal += (f.max_score || 0); });
    }
    if (obsForm && Array.isArray(obsForm.content_json)) {
      (obsForm.content_json as FormField[]).forEach(f => { obsTotal += (f.max_score || 0); });
    }

    // If currently editing one of these forms, use the local formFields
    if (activeFormType === "professor_eval") {
      profTotal = formFields.reduce((sum, f) => sum + (f.max_score || 0), 0);
    } else if (activeFormType === "observer_eval") {
      obsTotal = formFields.reduce((sum, f) => sum + (f.max_score || 0), 0);
    }

    const total = profTotal + obsTotal;
    return { profTotal, obsTotal, total };
  }, [forms, formFields, activeFormType]);

  const saveForm = async () => {
    const contentJson = activeFormType === "patient_script"
      ? [{ id: "script", label: patientScript, type: "textarea" as const }]
      : formFields;

    // Validate score if saving professor or observer eval
    if (activeFormType === "professor_eval" || activeFormType === "observer_eval") {
      if (scoreValidation.total !== 10 && scoreValidation.total > 0) {
        toast({
          title: t("sim_score_total"),
          description: scoreValidation.total < 10 ? t("sim_score_warning_low") : t("sim_score_warning_high"),
          variant: "destructive",
        });
        // Still allow saving but warn
      }
    }

    if (activeForm) {
      await supabase.from("simulation_forms").update({
        title: formTitle,
        content_json: contentJson as any,
      }).eq("id", activeForm.id);
    } else {
      await supabase.from("simulation_forms").insert({
        room_id: roomId!,
        form_type: activeFormType,
        title: formTitle,
        content_json: contentJson as any,
      });
    }
    refetchForms();
    toast({ title: t("save"), description: t("sim_form_saved") });
  };

  const addField = () => {
    setFormFields([...formFields, {
      id: crypto.randomUUID(),
      label: "",
      type: "text",
      max_score: 0,
      required: false,
    }]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updated = [...formFields];
    updated[index] = { ...updated[index], ...updates };
    setFormFields(updated);
  };

  const removeField = (index: number) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  const [roomTitle, setRoomTitle] = useState("");
  const [roomDesc, setRoomDesc] = useState("");
  const [roomDuration, setRoomDuration] = useState(10);

  useEffect(() => {
    if (room) {
      setRoomTitle(room.title);
      setRoomDesc(room.description || "");
      setRoomDuration(room.duration_minutes);
    }
  }, [room]);

  const saveSettings = async () => {
    await supabase.from("simulation_rooms").update({
      title: roomTitle,
      description: roomDesc,
      duration_minutes: roomDuration,
    }).eq("id", roomId!);
    queryClient.invalidateQueries({ queryKey: ["simulation-room", roomId] });
    toast({ title: t("save") });
  };

  // Import functionality
  const [importOpen, setImportOpen] = useState(false);
  const [importRoomId, setImportRoomId] = useState("");
  const [importParticipants, setImportParticipants] = useState(false);
  const [importForms, setImportForms] = useState(false);
  const [importing, setImporting] = useState(false);

  const { data: otherRooms = [] } = useQuery({
    queryKey: ["simulation-rooms-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulation_rooms")
        .select("id, title, access_code")
        .neq("id", roomId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: importOpen,
  });

  const handleImport = async () => {
    if (!importRoomId) return;
    if (!importParticipants && !importForms) {
      toast({ title: t("sim_import_nothing"), variant: "destructive" });
      return;
    }
    setImporting(true);

    try {
      if (importParticipants) {
        const { data: srcParticipants } = await supabase
          .from("simulation_participants")
          .select("*")
          .eq("room_id", importRoomId);
        if (srcParticipants?.length) {
          const newParticipants = srcParticipants.map(({ id, room_id, created_at, ...rest }) => ({
            ...rest,
            room_id: roomId!,
          }));
          await supabase.from("simulation_participants").insert(newParticipants);
          refetchParticipants();
        }
      }

      if (importForms) {
        const { data: srcForms } = await supabase
          .from("simulation_forms")
          .select("*")
          .eq("room_id", importRoomId);
        if (srcForms?.length) {
          for (const form of srcForms) {
            const existing = forms.find((f: any) => f.form_type === form.form_type);
            if (existing) {
              await supabase.from("simulation_forms").update({
                title: form.title,
                content_json: form.content_json,
              }).eq("id", existing.id);
            } else {
              await supabase.from("simulation_forms").insert({
                room_id: roomId!,
                form_type: form.form_type,
                title: form.title,
                content_json: form.content_json,
              });
            }
          }
          refetchForms();
        }
      }

      toast({ title: t("sim_import_success") });
      setImportOpen(false);
      setImportRoomId("");
      setImportParticipants(false);
      setImportForms(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const startSimulation = async () => {
    if (!professor) {
      toast({ title: "Erro", description: t("sim_need_professor"), variant: "destructive" });
      return;
    }
    if (students.length < 2) {
      toast({ title: "Erro", description: t("sim_need_students"), variant: "destructive" });
      return;
    }

    // Validate scores before starting
    if (scoreValidation.total !== 10 && scoreValidation.total > 0) {
      toast({
        title: t("sim_score_total"),
        description: scoreValidation.total < 10 ? t("sim_score_warning_low") : t("sim_score_warning_high"),
        variant: "destructive",
      });
      return;
    }

    // Just activate the room - professor will form pairs and generate rounds in the room
    await supabase.from("simulation_rooms").update({ status: "active" }).eq("id", roomId!);
    queryClient.invalidateQueries({ queryKey: ["simulation-room", roomId] });
    toast({ title: t("sim_started") });
    navigate(`/simulations/${roomId}/control`);
  };

  if (roomLoading) return <p className="p-6 text-muted-foreground">{t("loading")}</p>;
  if (!room) return <p className="p-6 text-destructive">Sala não encontrada</p>;

  const isEvalForm = activeFormType === "observer_eval" || activeFormType === "professor_eval";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/simulations")}>
            <ArrowLeft className="h-4 w-4 mr-1" />{t("pricing_back")}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{room.title}</h1>
            <p className="text-sm text-muted-foreground">PIN: <span className="font-mono">{room.access_code}</span></p>
          </div>
        </div>
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />{t("sim_import")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("sim_import_from")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {otherRooms.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("sim_no_other_rooms")}</p>
              ) : (
                <>
                  <div>
                    <Label>{t("sim_import_select_room")}</Label>
                    <Select value={importRoomId} onValueChange={setImportRoomId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("sim_import_select_room")} />
                      </SelectTrigger>
                      <SelectContent>
                        {otherRooms.map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>{r.title} ({r.access_code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="import-participants" checked={importParticipants} onCheckedChange={(c) => setImportParticipants(!!c)} />
                      <Label htmlFor="import-participants" className="flex items-center gap-1">
                        <Users className="h-4 w-4" />{t("sim_import_participants")}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="import-forms" checked={importForms} onCheckedChange={(c) => setImportForms(!!c)} />
                      <Label htmlFor="import-forms" className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />{t("sim_import_forms")}
                      </Label>
                    </div>
                  </div>
                  <Button onClick={handleImport} disabled={!importRoomId || importing} className="w-full">
                    {importing ? t("loading") : t("sim_import")}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="participants">
        <TabsList>
          <TabsTrigger value="participants"><Users className="h-4 w-4 mr-1" />{t("sim_tab_participants")}</TabsTrigger>
          <TabsTrigger value="forms"><FileText className="h-4 w-4 mr-1" />{t("sim_tab_forms")}</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1" />{t("nav_settings")}</TabsTrigger>
        </TabsList>

        {/* Participants Tab */}
        <TabsContent value="participants" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("sim_professor")}</CardTitle>
            </CardHeader>
            <CardContent>
              {professor ? (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{(professor as any).student_name}</p>
                    <p className="text-sm text-muted-foreground">{(professor as any).student_email}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeParticipant((professor as any).id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input placeholder={t("sim_name_placeholder")} value={profName} onChange={(e) => setProfName(e.target.value)} />
                  <Input placeholder="Email" value={profEmail} onChange={(e) => setProfEmail(e.target.value)} type="email" />
                  <Button onClick={() => addParticipant("professor")} disabled={!profName.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("sim_students_list")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {students.length > 0 ? (
                <div className="space-y-2">
                  {students.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div>
                        <span className="font-medium">{p.student_name}</span>
                        {p.student_email && <span className="text-sm text-muted-foreground ml-2">{p.student_email}</span>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeParticipant(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("sim_add_student")}</p>
              )}

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">{t("sim_add_student")}</p>
                <div className="flex gap-2">
                  <Input placeholder={t("sim_name_placeholder")} value={newName} onChange={(e) => setNewName(e.target.value)} />
                  <Input placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" />
                  <Button onClick={() => addParticipant("student")} disabled={!newName.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forms Tab */}
        <TabsContent value="forms" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {formTypes.map((ft) => (
              <Button
                key={ft.value}
                variant={activeFormType === ft.value ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFormType(ft.value)}
              >
                {ft.label}
              </Button>
            ))}
          </div>

          {/* Score validation banner */}
          {isEvalForm && (
            <Card className={`border-2 ${scoreValidation.total === 10 ? "border-green-500/50" : scoreValidation.total === 0 ? "border-muted" : "border-destructive/50"}`}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {scoreValidation.total === 10 ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : scoreValidation.total > 0 ? (
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    ) : null}
                    <span className="text-sm font-medium">{t("sim_score_total")}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">{t("sim_form_professor_eval")}: <strong>{scoreValidation.profTotal}</strong></span>
                    <span className="text-muted-foreground">+</span>
                    <span className="text-muted-foreground">{t("sim_form_observer_eval")}: <strong>{scoreValidation.obsTotal}</strong></span>
                    <span className="text-muted-foreground">=</span>
                    <span className={`font-bold ${scoreValidation.total === 10 ? "text-green-600" : scoreValidation.total > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {scoreValidation.total}/10
                    </span>
                  </div>
                </div>
                {scoreValidation.total > 0 && scoreValidation.total !== 10 && (
                  <p className="text-xs text-destructive mt-1">
                    {scoreValidation.total < 10 ? t("sim_score_warning_low") : t("sim_score_warning_high")}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {formTypes.find(f => f.value === activeFormType)?.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t("sim_form_title")}</Label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
              </div>

              {activeFormType === "patient_script" ? (
                <div>
                  <Label>{t("sim_patient_script_label")}</Label>
                  <Textarea
                    value={patientScript}
                    onChange={(e) => setPatientScript(e.target.value)}
                    rows={12}
                    placeholder={t("sim_patient_script_placeholder")}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {formFields.map((field, i) => (
                    <div key={field.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t("sim_field_label")}
                          value={field.label}
                          onChange={(e) => updateField(i, { label: e.target.value })}
                          className="flex-1"
                        />
                        <Select value={field.type} onValueChange={(v) => updateField(i, { type: v as any })}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Texto</SelectItem>
                            <SelectItem value="textarea">Texto longo</SelectItem>
                            <SelectItem value="radio">Múltipla escolha</SelectItem>
                            <SelectItem value="checkbox">Checkbox</SelectItem>
                            <SelectItem value="scale">Escala</SelectItem>
                          </SelectContent>
                        </Select>
                        {isEvalForm && (
                          <div className="flex items-center gap-1">
                            <Label className="text-xs whitespace-nowrap">{t("sim_max_score")}</Label>
                            <Input
                              type="number"
                              value={field.max_score || 0}
                              onChange={(e) => updateField(i, { max_score: Number(e.target.value) })}
                              className="w-16"
                              min={0}
                              step={0.5}
                            />
                          </div>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => removeField(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {(field.type === "radio" || field.type === "checkbox") && (
                        <div>
                          <Label className="text-xs">{t("sim_field_options")}</Label>
                          <Input
                            placeholder="Opção 1, Opção 2, Opção 3"
                            value={field.options?.join(", ") || ""}
                            onChange={(e) => updateField(i, { options: e.target.value.split(",").map(o => o.trim()) })}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addField}>
                    <Plus className="h-4 w-4 mr-1" />{t("sim_add_field")}
                  </Button>
                </div>
              )}

              <Button onClick={saveForm} className="w-full">{t("save")}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("sim_settings")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t("sim_name")}</Label>
                <Input value={roomTitle} onChange={(e) => setRoomTitle(e.target.value)} />
              </div>
              <div>
                <Label>{t("sim_description")}</Label>
                <Textarea value={roomDesc} onChange={(e) => setRoomDesc(e.target.value)} />
              </div>
              <div>
                <Label>{t("sim_duration")} ({t("sim_minutes")})</Label>
                <Input type="number" value={roomDuration} onChange={(e) => setRoomDuration(Number(e.target.value))} min={1} />
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">PIN: <span className="font-mono text-lg">{room.access_code}</span></p>
              </div>
              <Button onClick={saveSettings}>{t("save")}</Button>
            </CardContent>
          </Card>

          {room.status === "draft" && (
            <Card>
              <CardContent className="pt-6">
                <Button onClick={startSimulation} className="w-full" size="lg">
                  <Play className="h-4 w-4 mr-2" />{t("sim_start")}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">{t("sim_start_hint")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
