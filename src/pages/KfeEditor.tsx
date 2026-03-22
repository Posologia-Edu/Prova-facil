import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Plus, Trash2, Save, Copy, Target, BarChart3 } from "lucide-react";
import { toast } from "sonner";

interface KfCase {
  id: string;
  position: number;
  title: string;
  clinical_scenario: string;
}

interface KeyFeature {
  id: string;
  case_id: string;
  position: number;
  question_text: string;
  question_type: string;
  options_json: any[];
  correct_answer_json: any;
  max_score: number;
  explanation: string;
}

interface Session {
  id: string;
  student_name: string | null;
  student_email: string | null;
  status: string;
  total_score: number | null;
  max_score: number | null;
}

export default function KfeEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState("Novo KFE");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [cases, setCases] = useState<KfCase[]>([]);
  const [features, setFeatures] = useState<KeyFeature[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("cases");

  useEffect(() => { if (id) fetchAll(); }, [id]);

  const fetchAll = async () => {
    const { data: exam } = await supabase.from("kfe_exams").select("*").eq("id", id!).single();
    if (exam) { setTitle(exam.title); setDescription(exam.description || ""); setStatus(exam.status); }

    const { data: cs } = await supabase.from("kfe_cases").select("*").eq("kfe_exam_id", id!).order("position");
    setCases((cs || []) as KfCase[]);

    if (cs && cs.length > 0) {
      const { data: kf } = await supabase.from("kfe_key_features").select("*").in("case_id", cs.map(c => c.id)).order("position");
      setFeatures((kf || []) as KeyFeature[]);
    }

    const { data: sess } = await supabase.from("kfe_sessions").select("*").eq("kfe_exam_id", id!).order("created_at", { ascending: false });
    setSessions((sess || []) as Session[]);
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("kfe_exams").update({ title, description, status, updated_at: new Date().toISOString() }).eq("id", id!);
    toast.success("Salvo!");
    setSaving(false);
  };

  const addCase = async () => {
    const { data, error } = await supabase.from("kfe_cases").insert({ kfe_exam_id: id!, position: cases.length, title: `Caso ${cases.length + 1}` }).select().single();
    if (error) { toast.error("Erro"); return; }
    setCases([...cases, data as KfCase]);
  };

  const updateCase = async (caseId: string, field: string, value: string) => {
    setCases(cases.map(c => c.id === caseId ? { ...c, [field]: value } : c));
    await supabase.from("kfe_cases").update({ [field]: value }).eq("id", caseId);
  };

  const deleteCase = async (caseId: string) => {
    await supabase.from("kfe_cases").delete().eq("id", caseId);
    setCases(cases.filter(c => c.id !== caseId));
    setFeatures(features.filter(f => f.case_id !== caseId));
    toast.success("Caso removido");
  };

  const addFeature = async (caseId: string) => {
    const caseFeatures = features.filter(f => f.case_id === caseId);
    const { data, error } = await supabase.from("kfe_key_features").insert({
      case_id: caseId,
      position: caseFeatures.length,
      options_json: [
        { id: "a", text: "Opção A" },
        { id: "b", text: "Opção B" },
        { id: "c", text: "Opção C" },
        { id: "d", text: "Opção D" },
      ],
      correct_answer_json: { selected: "a" },
    }).select().single();
    if (error) { toast.error("Erro"); return; }
    setFeatures([...features, data as KeyFeature]);
  };

  const updateFeature = async (featureId: string, updates: Partial<KeyFeature>) => {
    setFeatures(features.map(f => f.id === featureId ? { ...f, ...updates } : f));
    await supabase.from("kfe_key_features").update(updates).eq("id", featureId);
  };

  const deleteFeature = async (featureId: string) => {
    await supabase.from("kfe_key_features").delete().eq("id", featureId);
    setFeatures(features.filter(f => f.id !== featureId));
  };

  const updateOption = (feature: KeyFeature, optIndex: number, text: string) => {
    const newOpts = [...feature.options_json];
    newOpts[optIndex] = { ...newOpts[optIndex], text };
    updateFeature(feature.id, { options_json: newOpts });
  };

  const addOption = (feature: KeyFeature) => {
    const newId = String.fromCharCode(97 + feature.options_json.length);
    updateFeature(feature.id, { options_json: [...feature.options_json, { id: newId, text: `Opção ${newId.toUpperCase()}` }] });
  };

  const removeOption = (feature: KeyFeature, optIndex: number) => {
    if (feature.options_json.length <= 2) return;
    const newOpts = feature.options_json.filter((_: any, i: number) => i !== optIndex);
    updateFeature(feature.id, { options_json: newOpts });
  };

  const studentLink = `${window.location.origin}/kfe/student/${id}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/kfe")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0" placeholder="Título do KFE" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="finished">Finalizado</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}</Button>
      </div>

      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição (opcional)" className="resize-none" rows={2} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="cases"><Target className="h-4 w-4 mr-1" /> Casos ({cases.length})</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="results"><BarChart3 className="h-4 w-4 mr-1" /> Resultados</TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="space-y-4">
          <Accordion type="multiple" className="space-y-3">
            {cases.map((c, ci) => (
              <AccordionItem key={c.id} value={c.id} className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3 text-left flex-1">
                    <Badge variant="outline" className="shrink-0">Caso {ci + 1}</Badge>
                    <span className="font-medium text-sm truncate">{c.title || "Sem título"}</span>
                    <Badge variant="secondary" className="ml-auto mr-2">{features.filter(f => f.case_id === c.id).length} pontos-chave</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-4">
                  <div>
                    <Label className="text-xs">Título do caso</Label>
                    <Input value={c.title} onChange={(e) => updateCase(c.id, "title", e.target.value)} placeholder="Ex: Dor torácica aguda" />
                  </div>
                  <div>
                    <Label className="text-xs">Cenário clínico</Label>
                    <Textarea value={c.clinical_scenario} onChange={(e) => updateCase(c.id, "clinical_scenario", e.target.value)} placeholder="Descreva o caso clínico completo..." rows={5} />
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Pontos-chave de decisão</h4>
                      <Button variant="outline" size="sm" onClick={() => addFeature(c.id)}><Plus className="h-3 w-3 mr-1" /> Ponto-chave</Button>
                    </div>
                    {features.filter(f => f.case_id === c.id).map((kf, ki) => (
                      <Card key={kf.id} className="bg-muted/30">
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs shrink-0">KF {ki + 1}</Badge>
                                <Select value={kf.question_type} onValueChange={(v) => updateFeature(kf.id, { question_type: v })}>
                                  <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                                    <SelectItem value="short_answer">Resposta Curta</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input type="number" value={kf.max_score} onChange={(e) => updateFeature(kf.id, { max_score: Number(e.target.value) })} className="h-7 w-20 text-xs" min={0} />
                                <span className="text-xs text-muted-foreground">pts</span>
                              </div>
                              <Textarea value={kf.question_text} onChange={(e) => updateFeature(kf.id, { question_text: e.target.value })} placeholder="Qual é a decisão mais importante neste momento?" rows={2} className="text-sm" />
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteFeature(kf.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>

                          {kf.question_type === "multiple_choice" && (
                            <div className="space-y-2">
                              {(kf.options_json || []).map((opt: any, oi: number) => (
                                <div key={oi} className="flex items-center gap-2">
                                  <button
                                    onClick={() => updateFeature(kf.id, { correct_answer_json: { selected: opt.id } })}
                                    className={`h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center ${kf.correct_answer_json?.selected === opt.id ? "border-primary bg-primary" : "border-border"}`}
                                  >
                                    {kf.correct_answer_json?.selected === opt.id && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                                  </button>
                                  <Input value={opt.text} onChange={(e) => updateOption(kf, oi, e.target.value)} className="h-8 text-sm" />
                                  {kf.options_json.length > 2 && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeOption(kf, oi)}><Trash2 className="h-3 w-3" /></Button>
                                  )}
                                </div>
                              ))}
                              <Button variant="ghost" size="sm" className="text-xs" onClick={() => addOption(kf)}><Plus className="h-3 w-3 mr-1" /> Alternativa</Button>
                            </div>
                          )}

                          {kf.question_type === "short_answer" && (
                            <div>
                              <Label className="text-xs">Resposta esperada</Label>
                              <Input value={kf.correct_answer_json?.text || ""} onChange={(e) => updateFeature(kf.id, { correct_answer_json: { text: e.target.value } })} placeholder="Resposta correta" className="text-sm" />
                            </div>
                          )}

                          <div>
                            <Label className="text-xs">Explicação (exibida após resposta)</Label>
                            <Textarea value={kf.explanation || ""} onChange={(e) => updateFeature(kf.id, { explanation: e.target.value })} placeholder="Por que esta é a decisão correta?" rows={2} className="text-sm" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteCase(c.id)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Remover caso</Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <Button variant="outline" onClick={addCase}><Plus className="h-4 w-4 mr-2" /> Adicionar Caso</Button>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Link para os alunos</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={studentLink} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(studentLink); toast.success("Link copiado!"); }}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {sessions.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum aluno respondeu ainda.</CardContent></Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-sm">Sessões ({sessions.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sessions.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                      <div>
                        <span className="font-medium">{s.student_name || "Sem nome"}</span>
                        <span className="text-muted-foreground ml-2">{s.student_email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {s.total_score !== null && s.max_score !== null && (
                          <span className="font-mono text-xs">{s.total_score}/{s.max_score}</span>
                        )}
                        <Badge variant={s.status === "submitted" ? "default" : "secondary"}>
                          {s.status === "submitted" ? "Enviado" : "Em andamento"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
