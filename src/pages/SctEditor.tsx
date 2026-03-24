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
import { ArrowLeft, Plus, Trash2, Save, Copy, Link, Users, ClipboardList, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import ModuleHelpGuide from "@/components/ModuleHelpGuide";

interface Scenario {
  id: string;
  position: number;
  clinical_vignette: string;
  hypothesis: string;
  new_information: string;
}

interface ExpertResponse {
  id: string;
  scenario_id: string;
  expert_email: string;
  expert_name: string;
  likert_value: number;
}

interface StudentSession {
  id: string;
  student_name: string;
  student_email: string;
  status: string;
  total_score: number | null;
  max_score: number | null;
  started_at: string;
  finished_at: string | null;
}

export default function SctEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState("Novo SCT");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [expertPanelSize, setExpertPanelSize] = useState(10);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [expertResponses, setExpertResponses] = useState<ExpertResponse[]>([]);
  const [sessions, setSessions] = useState<StudentSession[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("scenarios");

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  const fetchAll = async () => {
    const { data: exam } = await supabase.from("sct_exams").select("*").eq("id", id!).single();
    if (exam) {
      setTitle(exam.title);
      setDescription(exam.description || "");
      setStatus(exam.status);
      setExpertPanelSize(exam.expert_panel_size);
    }

    const { data: sc } = await supabase.from("sct_scenarios").select("*").eq("sct_exam_id", id!).order("position");
    setScenarios((sc || []) as Scenario[]);

    if (sc && sc.length > 0) {
      const { data: er } = await supabase.from("sct_expert_responses").select("*").in("scenario_id", sc.map(s => s.id));
      setExpertResponses((er || []) as ExpertResponse[]);
    }

    const { data: sess } = await supabase.from("sct_student_sessions").select("*").eq("sct_exam_id", id!).order("created_at", { ascending: false });
    setSessions((sess || []) as StudentSession[]);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("sct_exams").update({ title, description, status, expert_panel_size: expertPanelSize, updated_at: new Date().toISOString() }).eq("id", id!);
    if (error) toast.error("Erro ao salvar");
    else toast.success("Salvo!");
    setSaving(false);
  };

  const addScenario = async () => {
    const { data, error } = await supabase.from("sct_scenarios").insert({ sct_exam_id: id!, position: scenarios.length }).select().single();
    if (error) { toast.error("Erro ao adicionar cenário"); return; }
    setScenarios([...scenarios, data as Scenario]);
  };

  const updateScenario = async (scenarioId: string, field: keyof Scenario, value: string) => {
    setScenarios(scenarios.map(s => s.id === scenarioId ? { ...s, [field]: value } : s));
    await supabase.from("sct_scenarios").update({ [field]: value }).eq("id", scenarioId);
  };

  const deleteScenario = async (scenarioId: string) => {
    await supabase.from("sct_scenarios").delete().eq("id", scenarioId);
    setScenarios(scenarios.filter(s => s.id !== scenarioId));
    toast.success("Cenário removido");
  };

  const expertLink = `${window.location.origin}/sct/expert/${id}`;
  const studentLink = `${window.location.origin}/sct/student/${id}`;

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const getExpertDistribution = (scenarioId: string) => {
    const responses = expertResponses.filter(r => r.scenario_id === scenarioId);
    const dist: Record<number, number> = { "-2": 0, "-1": 0, "0": 0, "1": 0, "2": 0 };
    responses.forEach(r => { dist[r.likert_value] = (dist[r.likert_value] || 0) + 1; });
    return { dist, total: responses.length };
  };

  const likertLabels: Record<number, string> = {
    "-2": "Praticamente descartada",
    "-1": "Menos provável",
    "0": "Nem mais, nem menos",
    "1": "Mais provável",
    "2": "Praticamente certa",
  };

  return (
    <div className="space-y-6">
      <ModuleHelpGuide moduleKey="sct" />
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/sct")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0" placeholder="Título do SCT" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="collecting">Coletando Especialistas</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="finished">Finalizado</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição do exame (opcional)" className="resize-none" rows={2} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="scenarios"><ClipboardList className="h-4 w-4 mr-1" /> Cenários ({scenarios.length})</TabsTrigger>
          <TabsTrigger value="experts"><Users className="h-4 w-4 mr-1" /> Painel de Especialistas</TabsTrigger>
          <TabsTrigger value="results"><BarChart3 className="h-4 w-4 mr-1" /> Resultados</TabsTrigger>
        </TabsList>

        {/* ---- Scenarios Tab ---- */}
        <TabsContent value="scenarios" className="space-y-4">
          {scenarios.map((s, i) => (
            <Card key={s.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Cenário {i + 1}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteScenario(s.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Vinheta Clínica</Label>
                  <Textarea value={s.clinical_vignette} onChange={(e) => updateScenario(s.id, "clinical_vignette", e.target.value)} placeholder="Descreva o cenário clínico..." rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Se você estava pensando em... (Hipótese)</Label>
                    <Textarea value={s.hypothesis} onChange={(e) => updateScenario(s.id, "hypothesis", e.target.value)} placeholder="Hipótese diagnóstica..." rows={2} />
                  </div>
                  <div>
                    <Label className="text-xs">E então você descobre que... (Nova informação)</Label>
                    <Textarea value={s.new_information} onChange={(e) => updateScenario(s.id, "new_information", e.target.value)} placeholder="Nova informação clínica..." rows={2} />
                  </div>
                </div>
                {/* Expert distribution preview */}
                {(() => {
                  const { dist, total } = getExpertDistribution(s.id);
                  if (total === 0) return null;
                  return (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium mb-2">Distribuição do painel ({total} respostas)</p>
                      <div className="flex gap-2">
                        {([-2, -1, 0, 1, 2] as number[]).map(v => (
                          <div key={v} className="flex-1 text-center">
                            <div className="text-lg font-bold text-foreground">{dist[v] || 0}</div>
                            <div className="text-[10px] text-muted-foreground leading-tight">{likertLabels[v]}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addScenario}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar Cenário
          </Button>
        </TabsContent>

        {/* ---- Experts Tab ---- */}
        <TabsContent value="experts" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Tamanho esperado do painel</Label>
                <Input type="number" value={expertPanelSize} onChange={(e) => setExpertPanelSize(Number(e.target.value))} min={3} max={50} className="w-32" />
              </div>
              <div>
                <Label>Link para o painel de especialistas</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={expertLink} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copyLink(expertLink)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Envie este link para os especialistas responderem sem necessidade de login.</p>
              </div>
              <div>
                <Label>Link para os alunos</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={studentLink} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copyLink(studentLink)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unique experts table */}
          {(() => {
            const uniqueExperts = Array.from(new Set(expertResponses.map(r => r.expert_email))).map(email => {
              const resp = expertResponses.find(r => r.expert_email === email)!;
              const count = expertResponses.filter(r => r.expert_email === email).length;
              return { email, name: resp.expert_name, count };
            });
            if (uniqueExperts.length === 0) return (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum especialista respondeu ainda. Compartilhe o link acima.
                </CardContent>
              </Card>
            );
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Especialistas que responderam ({uniqueExperts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {uniqueExperts.map(ex => (
                      <div key={ex.email} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                        <div>
                          <span className="font-medium">{ex.name}</span>
                          <span className="text-muted-foreground ml-2">{ex.email}</span>
                        </div>
                        <Badge variant="secondary">{ex.count} respostas</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>

        {/* ---- Results Tab ---- */}
        <TabsContent value="results" className="space-y-4">
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum aluno respondeu ainda.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sessões dos alunos ({sessions.length})</CardTitle>
              </CardHeader>
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
                          <span className="font-mono text-xs">{s.total_score.toFixed(1)}/{s.max_score.toFixed(1)}</span>
                        )}
                        <Badge variant={s.status === "submitted" ? "default" : "secondary"}>
                          {s.status === "submitted" ? "Enviado" : s.status === "in_progress" ? "Em andamento" : s.status}
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
