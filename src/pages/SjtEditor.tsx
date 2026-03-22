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
import { ArrowLeft, Plus, Trash2, Save, Copy, Scale, BarChart3, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface SjtScenario {
  id: string;
  position: number;
  scenario_text: string;
  actions_json: { id: string; text: string }[];
  correct_ranking_json: string[];
}

interface Session {
  id: string;
  student_name: string | null;
  student_email: string | null;
  status: string;
  total_score: number | null;
  max_score: number | null;
}

export default function SjtEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState("Novo SJT");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [scenarios, setScenarios] = useState<SjtScenario[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("scenarios");

  useEffect(() => { if (id) fetchAll(); }, [id]);

  const fetchAll = async () => {
    const { data: exam } = await supabase.from("sjt_exams").select("*").eq("id", id!).single();
    if (exam) { setTitle(exam.title); setDescription(exam.description || ""); setStatus(exam.status); }

    const { data: sc } = await supabase.from("sjt_scenarios").select("*").eq("sjt_exam_id", id!).order("position");
    setScenarios((sc || []) as unknown as SjtScenario[]);

    const { data: sess } = await supabase.from("sjt_sessions").select("*").eq("sjt_exam_id", id!).order("created_at", { ascending: false });
    setSessions((sess || []) as Session[]);
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("sjt_exams").update({ title, description, status, updated_at: new Date().toISOString() }).eq("id", id!);
    toast.success("Salvo!");
    setSaving(false);
  };

  const addScenario = async () => {
    const defaultActions = [
      { id: "a", text: "Ação A" },
      { id: "b", text: "Ação B" },
      { id: "c", text: "Ação C" },
      { id: "d", text: "Ação D" },
    ];
    const { data, error } = await supabase.from("sjt_scenarios").insert({
      sjt_exam_id: id!,
      position: scenarios.length,
      actions_json: defaultActions,
      correct_ranking_json: ["a", "b", "c", "d"],
    }).select().single();
    if (error) { toast.error("Erro"); return; }
    setScenarios([...scenarios, data as SjtScenario]);
  };

  const updateScenario = async (sId: string, updates: Partial<SjtScenario>) => {
    setScenarios(scenarios.map(s => s.id === sId ? { ...s, ...updates } : s));
    await supabase.from("sjt_scenarios").update(updates).eq("id", sId);
  };

  const deleteScenario = async (sId: string) => {
    await supabase.from("sjt_scenarios").delete().eq("id", sId);
    setScenarios(scenarios.filter(s => s.id !== sId));
    toast.success("Cenário removido");
  };

  const updateAction = (scenario: SjtScenario, actionIndex: number, text: string) => {
    const newActions = [...scenario.actions_json];
    newActions[actionIndex] = { ...newActions[actionIndex], text };
    updateScenario(scenario.id, { actions_json: newActions });
  };

  const addAction = (scenario: SjtScenario) => {
    const newId = String.fromCharCode(97 + scenario.actions_json.length);
    const newActions = [...scenario.actions_json, { id: newId, text: `Ação ${newId.toUpperCase()}` }];
    const newRanking = [...scenario.correct_ranking_json, newId];
    updateScenario(scenario.id, { actions_json: newActions, correct_ranking_json: newRanking });
  };

  const removeAction = (scenario: SjtScenario, actionIndex: number) => {
    if (scenario.actions_json.length <= 2) return;
    const removed = scenario.actions_json[actionIndex];
    const newActions = scenario.actions_json.filter((_, i) => i !== actionIndex);
    const newRanking = scenario.correct_ranking_json.filter(id => id !== removed.id);
    updateScenario(scenario.id, { actions_json: newActions, correct_ranking_json: newRanking });
  };

  const moveRanking = (scenario: SjtScenario, fromIdx: number, toIdx: number) => {
    const newRanking = [...scenario.correct_ranking_json];
    const [item] = newRanking.splice(fromIdx, 1);
    newRanking.splice(toIdx, 0, item);
    updateScenario(scenario.id, { correct_ranking_json: newRanking });
  };

  const studentLink = `${window.location.origin}/sjt/student/${id}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/sjt")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="finished">Finalizado</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-2" /> Salvar</Button>
      </div>

      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição (opcional)" rows={2} className="resize-none" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="scenarios"><Scale className="h-4 w-4 mr-1" /> Cenários ({scenarios.length})</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="results"><BarChart3 className="h-4 w-4 mr-1" /> Resultados</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="space-y-4">
          {scenarios.map((s, si) => (
            <Card key={s.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Cenário {si + 1}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteScenario(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Situação / Dilema</Label>
                  <Textarea value={s.scenario_text} onChange={(e) => updateScenario(s.id, { scenario_text: e.target.value })} placeholder="Descreva a situação ética ou profissional..." rows={4} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Actions */}
                  <div className="space-y-2">
                    <Label className="text-xs">Ações possíveis</Label>
                    {s.actions_json.map((a, ai) => (
                      <div key={ai} className="flex items-center gap-2">
                        <Badge variant="outline" className="shrink-0 w-6 h-6 flex items-center justify-center p-0 text-xs">{a.id.toUpperCase()}</Badge>
                        <Input value={a.text} onChange={(e) => updateAction(s, ai, e.target.value)} className="h-8 text-sm" />
                        {s.actions_json.length > 2 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeAction(s, ai)}><Trash2 className="h-3 w-3" /></Button>
                        )}
                      </div>
                    ))}
                    {s.actions_json.length < 6 && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => addAction(s)}><Plus className="h-3 w-3 mr-1" /> Ação</Button>
                    )}
                  </div>

                  {/* Correct ranking */}
                  <div className="space-y-2">
                    <Label className="text-xs">Ranking correto (mais → menos apropriada)</Label>
                    {(s.correct_ranking_json || []).map((actionId, ri) => {
                      const action = s.actions_json.find(a => a.id === actionId);
                      return (
                        <div key={ri} className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1.5">
                          <span className="text-xs font-bold text-muted-foreground w-4">{ri + 1}.</span>
                          <GripVertical className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm flex-1 truncate">{action?.text || actionId}</span>
                          <div className="flex gap-1">
                            {ri > 0 && (
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveRanking(s, ri, ri - 1)}>↑</Button>
                            )}
                            {ri < s.correct_ranking_json.length - 1 && (
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveRanking(s, ri, ri + 1)}>↓</Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addScenario}><Plus className="h-4 w-4 mr-2" /> Adicionar Cenário</Button>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Link para os alunos</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={studentLink} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(studentLink); toast.success("Copiado!"); }}><Copy className="h-4 w-4" /></Button>
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
