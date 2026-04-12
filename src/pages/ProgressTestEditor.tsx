import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Save, Plus, Trash2, Share2, Copy, BookOpen, Sparkles, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ModuleHelpGuide from "@/components/ModuleHelpGuide";

export default function ProgressTestEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [applicationDate, setApplicationDate] = useState("");
  const [targetYears, setTargetYears] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [status, setStatus] = useState("draft");
  const [saving, setSaving] = useState(false);
  
  // AI Generator state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiCourse, setAiCourse] = useState("Medicina");
  const [aiSubjects, setAiSubjects] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("variada");
  const [aiQuestionsPerYear, setAiQuestionsPerYear] = useState<Record<string, number>>({ "1": 5, "2": 5, "3": 5, "4": 5, "5": 5, "6": 5 });
  const [aiGenerating, setAiGenerating] = useState(false);

  const { data: test } = useQuery({
    queryKey: ["progress-test", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("progress_tests" as any).select("*").eq("id", id).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const { data: testQuestions, refetch: refetchQuestions } = useQuery({
    queryKey: ["progress-test-questions", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("progress_test_questions" as any).select("*").eq("test_id", id).order("position");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  const { data: questionBank } = useQuery({
    queryKey: ["question-bank-for-pt"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data, error } = await supabase.from("question_bank").select("id, content_json, type, tags, difficulty").eq("user_id", session.user.id).is("deleted_at", null).order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ["progress-test-sessions", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("progress_test_sessions" as any).select("*").eq("test_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (test) {
      setTitle(test.title || "");
      setDescription(test.description || "");
      setApplicationDate(test.application_date || "");
      setTargetYears(test.target_years_json || [1, 2, 3, 4, 5, 6]);
      setStatus(test.status || "draft");
    }
  }, [test]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from("progress_tests" as any).update({ title, description, application_date: applicationDate || null, target_years_json: targetYears, status, updated_at: new Date().toISOString() } as any).eq("id", id);
      toast({ title: "Salvo!" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = async (questionId: string) => {
    const position = (testQuestions?.length || 0);
    const existingIds = (testQuestions || []).map((q: any) => q.question_id);
    if (existingIds.includes(questionId)) {
      toast({ title: "Questão já adicionada", variant: "destructive" });
      return;
    }
    await supabase.from("progress_test_questions" as any).insert({ test_id: id, question_id: questionId, position, expected_year: 1 } as any);
    refetchQuestions();
    toast({ title: "Questão adicionada" });
  };

  const updateExpectedYear = async (ptqId: string, year: number) => {
    await supabase.from("progress_test_questions" as any).update({ expected_year: year } as any).eq("id", ptqId);
    refetchQuestions();
  };

  const removeQuestion = async (ptqId: string) => {
    await supabase.from("progress_test_questions" as any).delete().eq("id", ptqId);
    refetchQuestions();
  };

  const getQuestionLabel = (qId: string) => {
    const q = questionBank?.find((q) => q.id === qId);
    if (!q) return "Questão não encontrada";
    const content = q.content_json as any;
    return content?.stem || content?.question_text || content?.statement || `Questão ${q.type}`;
  };

  const studentPortalUrl = `${window.location.origin}/progress-test/student/${id}`;

  const getIncompleteCount = () => {
    if (!testQuestions || !questionBank) return 0;
    return testQuestions.filter((tq: any) => {
      const q = questionBank.find((q) => q.id === tq.question_id);
      if (!q) return true;
      const c = q.content_json as any;
      const stem = c?.stem || c?.question_text || c?.statement;
      const opts = c?.options;
      return !stem || !opts;
    }).length;
  };

  const handlePublish = async () => {
    const incomplete = getIncompleteCount();
    if (incomplete > 0) {
      toast({ title: `${incomplete} questão(ões) sem enunciado ou alternativas. Revise antes de publicar.`, variant: "destructive" });
      return;
    }
    await supabase.from("progress_tests" as any).update({ status: "published", updated_at: new Date().toISOString() } as any).eq("id", id);
    setStatus("published");
    toast({ title: "Teste publicado!" });
  };

  const handleAiGenerate = async () => {
    if (!aiSubjects.trim()) {
      toast({ title: "Informe as áreas temáticas", variant: "destructive" });
      return;
    }
    setAiGenerating(true);
    try {
      const subjects = aiSubjects.split(",").map(s => s.trim()).filter(Boolean);
      const { data, error } = await supabase.functions.invoke("generate-progress-test", {
        body: {
          testId: id,
          course: aiCourse,
          subjects,
          questionsPerYear: aiQuestionsPerYear,
          difficulty: aiDifficulty,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: data.error, variant: "destructive" });
        return;
      }
      toast({ title: `${data.totalInserted} questões geradas e adicionadas ao teste!` });
      refetchQuestions();
      setAiDialogOpen(false);
    } catch (err: any) {
      toast({ title: err.message || "Erro ao gerar teste", variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHelpGuide moduleKey="progress_test" />
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/progress-test")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Editor de Progress Test</h1>
        </div>
        <Button variant="outline" onClick={() => setAiDialogOpen(true)} className="gap-1.5">
          <Sparkles className="h-4 w-4 text-secondary" />
          Gerar com IA
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> Salvar
        </Button>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="questions">Questões ({testQuestions?.length || 0})</TabsTrigger>
          <TabsTrigger value="share">Compartilhar</TabsTrigger>
          <TabsTrigger value="results">Resultados ({sessions?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Configurações Gerais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Data de Aplicação</Label>
                <Input type="date" value={applicationDate} onChange={(e) => setApplicationDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Anos-alvo (selecione os anos que participam)</Label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5, 6].map((y) => (
                    <Badge
                      key={y}
                      variant={targetYears.includes(y) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setTargetYears(prev => prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y].sort())}
                    >
                      {y}º ano
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Questões do Teste</CardTitle>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAiDialogOpen(true)}>
                <Sparkles className="h-4 w-4 text-secondary" />
                Gerar com IA
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {(!testQuestions || testQuestions.length === 0) ? (
                <p className="text-muted-foreground text-sm text-center py-6">Nenhuma questão adicionada. Importe do banco de questões abaixo.</p>
              ) : (
                testQuestions.map((tq: any, idx: number) => (
                  <div key={tq.id} className="flex items-center gap-3 p-3 border rounded-lg">
                     <span className="text-sm font-medium text-muted-foreground w-8">{idx + 1}.</span>
                     <div className="flex-1 min-w-0">
                       <span className="text-sm line-clamp-1">{getQuestionLabel(tq.question_id)}</span>
                       {(() => {
                         const q = questionBank?.find((q) => q.id === tq.question_id);
                         const area = (q?.content_json as any)?.subject_area;
                         return area ? <span className="text-xs text-muted-foreground">{area}</span> : null;
                       })()}
                     </div>
                    <Select value={String(tq.expected_year)} onValueChange={(v) => updateExpectedYear(tq.id, Number(v))}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map(y => (
                          <SelectItem key={y} value={String(y)}>{y}º ano</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => removeQuestion(tq.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Banco de Questões</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {questionBank?.map((q) => {
                  const content = q.content_json as any;
                  const label = content?.stem || content?.statement || `Questão ${q.type}`;
                  const alreadyAdded = (testQuestions || []).some((tq: any) => tq.question_id === q.id);
                  return (
                    <div key={q.id} className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/50">
                      <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm flex-1 line-clamp-1">{label}</span>
                      <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>
                      <Button size="sm" variant="outline" disabled={alreadyAdded} onClick={() => addQuestion(q.id)}>
                        {alreadyAdded ? "Adicionada" : <><Plus className="h-3 w-3 mr-1" /> Adicionar</>}
                      </Button>
                    </div>
                  );
                })}
                {(!questionBank || questionBank.length === 0) && (
                  <p className="text-muted-foreground text-sm text-center py-4">Nenhuma questão no banco. Crie questões primeiro.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="share" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Share2 className="h-5 w-5" /> Compartilhar</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {status !== "published" ? (
                <div className="text-center py-6 space-y-3">
                  <p className="text-muted-foreground">Publique o teste para gerar o link de acesso dos alunos.</p>
                  <Button onClick={handlePublish} disabled={!testQuestions || testQuestions.length === 0}>
                    Publicar Teste
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label>Link do Portal do Aluno</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={studentPortalUrl} />
                    <Button variant="outline" onClick={() => { navigator.clipboard.writeText(studentPortalUrl); toast({ title: "Link copiado!" }); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Resultados</CardTitle></CardHeader>
            <CardContent>
              {(!sessions || sessions.length === 0) ? (
                <p className="text-muted-foreground text-sm text-center py-6">Nenhum aluno respondeu ainda.</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{s.student_name || "Anônimo"}</p>
                        <p className="text-xs text-muted-foreground">{s.student_email} — {s.student_year}º ano</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={s.status === "finished" ? "default" : "secondary"}>
                          {s.status === "finished" ? "Finalizado" : "Em andamento"}
                        </Badge>
                        {s.total_score != null && (
                          <span className="text-sm font-semibold">{s.total_score}/{s.max_score}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Progress Test Generator Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-secondary" />
              Gerar Teste de Progresso com IA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Curso</Label>
              <Select value={aiCourse} onValueChange={setAiCourse}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Medicina">Medicina</SelectItem>
                  <SelectItem value="Enfermagem">Enfermagem</SelectItem>
                  <SelectItem value="Farmácia">Farmácia</SelectItem>
                  <SelectItem value="Odontologia">Odontologia</SelectItem>
                  <SelectItem value="Fisioterapia">Fisioterapia</SelectItem>
                  <SelectItem value="Nutrição">Nutrição</SelectItem>
                  <SelectItem value="Biomedicina">Biomedicina</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Áreas Temáticas (separadas por vírgula)</Label>
              <Input
                placeholder="Ex: Cardiologia, Pneumologia, Farmacologia, Anatomia"
                value={aiSubjects}
                onChange={(e) => setAiSubjects(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Dificuldade Predominante</Label>
              <Select value={aiDifficulty} onValueChange={setAiDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="variada">Variada (mista)</SelectItem>
                  <SelectItem value="easy">Fácil</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="hard">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Questões por Ano</Label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map(y => (
                  <div key={y} className="flex items-center gap-2">
                    <Label className="text-xs w-14 shrink-0">{y}º ano:</Label>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      className="h-8 text-xs"
                      value={aiQuestionsPerYear[String(y)] || 0}
                      onChange={(e) => setAiQuestionsPerYear(prev => ({ ...prev, [String(y)]: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Total: {Object.values(aiQuestionsPerYear).reduce((s, n) => s + n, 0)} questões
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialogOpen(false)} disabled={aiGenerating}>Cancelar</Button>
            <Button onClick={handleAiGenerate} disabled={aiGenerating || !aiSubjects.trim()} className="gap-1.5">
              {aiGenerating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Gerar Teste</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
