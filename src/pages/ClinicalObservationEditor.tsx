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
import { ArrowLeft, Plus, Trash2, Save, Copy, ClipboardCheck, BarChart3, Settings } from "lucide-react";
import { toast } from "sonner";
import ModuleHelpGuide from "@/components/ModuleHelpGuide";
import { CompetencySelector } from "@/components/CompetencySelector";

interface Domain {
  id: string;
  name: string;
  description: string;
}

interface Session {
  id: string;
  evaluator_name: string;
  evaluator_email: string;
  student_name: string;
  student_email: string;
  scores_json: Record<string, number>;
  feedback: string;
  global_score: number;
  complexity: string;
  setting: string;
  duration_minutes: number;
  created_at: string;
}

export default function ClinicalObservationEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("mini_cex");
  const [status, setStatus] = useState("draft");
  const [domains, setDomains] = useState<Domain[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("domains");

  useEffect(() => { if (id) fetchAll(); }, [id]);

  const fetchAll = async () => {
    const { data: obs } = await supabase.from("clinical_observations").select("*").eq("id", id!).single();
    if (obs) {
      setTitle(obs.title);
      setType(obs.type);
      setStatus(obs.status);
      setDomains((obs.competency_domains_json as unknown as Domain[]) || []);
    }
    const { data: sess } = await supabase.from("clinical_observation_sessions").select("*").eq("observation_id", id!).order("created_at", { ascending: false });
    setSessions((sess || []) as Session[]);
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("clinical_observations").update({ title, status, competency_domains_json: domains as unknown as any, updated_at: new Date().toISOString() }).eq("id", id!);
    toast.success("Salvo!");
    setSaving(false);
  };

  const addDomain = () => {
    setDomains([...domains, { id: crypto.randomUUID(), name: "", description: "" }]);
  };

  const updateDomain = (domainId: string, field: string, value: string) => {
    setDomains(domains.map(d => d.id === domainId ? { ...d, [field]: value } : d));
  };

  const removeDomain = (domainId: string) => {
    setDomains(domains.filter(d => d.id !== domainId));
  };

  const evalLink = `${window.location.origin}/clinical-observations/eval/${id}`;

  const avgScores = () => {
    if (sessions.length === 0) return {};
    const sums: Record<string, { total: number; count: number }> = {};
    sessions.forEach(s => {
      Object.entries(s.scores_json || {}).forEach(([key, val]) => {
        if (!sums[key]) sums[key] = { total: 0, count: 0 };
        sums[key].total += val as number;
        sums[key].count += 1;
      });
    });
    const result: Record<string, number> = {};
    Object.entries(sums).forEach(([key, { total, count }]) => { result[key] = total / count; });
    return result;
  };

  const averages = avgScores();

  return (
    <div className="space-y-6">
      <ModuleHelpGuide moduleKey="clinical_observation" />
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clinical-observations")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0" />
        </div>
        <Badge variant="outline">{type === "mini_cex" ? "Mini-CEX" : "DOPS"}</Badge>
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="domains"><Settings className="h-4 w-4 mr-1" /> Domínios ({domains.length})</TabsTrigger>
          <TabsTrigger value="sessions"><ClipboardCheck className="h-4 w-4 mr-1" /> Avaliações ({sessions.length})</TabsTrigger>
          <TabsTrigger value="results"><BarChart3 className="h-4 w-4 mr-1" /> Resultados</TabsTrigger>
        </TabsList>

        <TabsContent value="domains" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Link de avaliação (para avaliadores)</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={evalLink} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(evalLink); toast.success("Copiado!"); }}><Copy className="h-4 w-4" /></Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Avaliadores acessam por este link para preencher a ficha de observação.</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {domains.map((d, i) => (
              <Card key={d.id} className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0 mt-1">{i + 1}</Badge>
                    <div className="flex-1 space-y-2">
                      <Input value={d.name} onChange={(e) => updateDomain(d.id, "name", e.target.value)} placeholder="Nome do domínio" className="font-medium" />
                      <Input value={d.description} onChange={(e) => updateDomain(d.id, "description", e.target.value)} placeholder="Descrição" className="text-sm" />
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeDomain(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button variant="outline" onClick={addDomain}><Plus className="h-4 w-4 mr-2" /> Adicionar Domínio</Button>
          <p className="text-xs text-muted-foreground">Escala de avaliação: 1 (muito abaixo) a 9 (excepcional). Cada domínio será avaliado individualmente.</p>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          {sessions.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma avaliação realizada ainda.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {sessions.map(s => (
                <Card key={s.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{s.student_name}</p>
                        <p className="text-xs text-muted-foreground">Avaliador: {s.evaluator_name} • {s.complexity} • {s.duration_minutes}min</p>
                      </div>
                      <Badge variant={s.global_score >= 7 ? "default" : s.global_score >= 4 ? "secondary" : "destructive"}>
                        Global: {s.global_score}/9
                      </Badge>
                    </div>
                    {s.feedback && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{s.feedback}</p>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {domains.map(d => (
                        <span key={d.id} className="text-xs bg-muted rounded px-2 py-1">
                          {d.name}: {(s.scores_json || {})[d.id] || "-"}/9
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {sessions.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Sem dados suficientes.</CardContent></Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-sm">Médias por domínio ({sessions.length} avaliações)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {domains.map(d => {
                    const avg = averages[d.id] || 0;
                    const pct = (avg / 9) * 100;
                    return (
                      <div key={d.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{d.name}</span>
                          <span className="font-mono">{avg.toFixed(1)}/9</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
