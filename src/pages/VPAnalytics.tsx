import { useState, useEffect } from "react";
import {
  BarChart3, Users, Award, AlertTriangle, Loader2, ArrowLeft,
  ChevronDown, Eye, MessageSquare, ShieldAlert, TrendingUp, BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { OsceRadarChart } from "@/components/osce/OsceRadarChart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { simpleMarkdownToHtml } from "@/lib/simple-markdown";

const VP_CATALOG: Record<string, { name: string; module: string }> = {
  pain_helena: { name: "Dona Helena, 67 anos", module: "Dor" },
  pain_luciana: { name: "Luciana, 42 anos", module: "Dor" },
  pain_rogerio: { name: "Rogério, 58 anos", module: "Dor" },
  pain_pedro: { name: "Pedro, 65 anos", module: "Dor" },
  pain_ana: { name: "Ana, 36 anos", module: "Dor" },
  inflammation_maria: { name: "Dona Maria, 72 anos", module: "Inflamação" },
  inflammation_antonio: { name: "Seu Antônio, 66 anos", module: "Inflamação" },
  inflammation_renata: { name: "Renata, 39 anos", module: "Inflamação" },
  inflammation_wilson: { name: "Seu Wilson, 57 anos", module: "Inflamação" },
  inflammation_jose: { name: "José, 57 anos", module: "Inflamação" },
};

interface ClassOption { id: string; name: string; }
interface CVPOption { id: string; patient_id: string; class_id: string; }
interface GradeRow {
  id: string;
  session_id: string;
  subscores: any;
  bonus_penalidades: any;
  nota_final: number | null;
  nota_microlearning: number | null;
  feedback_resumido: string | null;
  orientacoes_melhoria: string | null;
  flags_seguranca: any;
  student_email?: string;
  student_name?: string;
}
interface TranscriptMsg { role: string; content: string; encounter: number; }

export default function VPAnalytics() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [cvps, setCvps] = useState<CVPOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedCvp, setSelectedCvp] = useState("all");
  const [grades, setGrades] = useState<GradeRow[]>([]);

  // Detail dialog
  const [detailGrade, setDetailGrade] = useState<GradeRow | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMsg[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  // Batch grading
  const [grading, setGrading] = useState(false);

  useEffect(() => { loadFilters(); }, []);
  useEffect(() => { loadGrades(); }, [selectedClass, selectedCvp]);

  const loadFilters = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [classesRes, cvpsRes] = await Promise.all([
      supabase.from("classes").select("id, name").eq("user_id", user.id).is("deleted_at", null).order("name"),
      supabase.from("class_virtual_patients").select("id, patient_id, class_id"),
    ]);
    setClasses(classesRes.data || []);
    setCvps((cvpsRes.data as CVPOption[]) || []);
  };

  const loadGrades = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Get CVPs owned by this teacher
    let cvpQuery = supabase
      .from("class_virtual_patients")
      .select("id, patient_id, class_id, classes!inner(user_id)")
      .eq("classes.user_id", user.id);

    const { data: myCvps } = await cvpQuery;
    if (!myCvps || myCvps.length === 0) { setGrades([]); setLoading(false); return; }

    let filteredCvpIds = myCvps.map((c: any) => c.id);
    if (selectedClass !== "all") {
      filteredCvpIds = myCvps.filter((c: any) => c.class_id === selectedClass).map((c: any) => c.id);
    }
    if (selectedCvp !== "all") {
      filteredCvpIds = filteredCvpIds.filter(id => id === selectedCvp);
    }

    if (filteredCvpIds.length === 0) { setGrades([]); setLoading(false); return; }

    const { data: gradesData } = await supabase
      .from("virtual_patient_grades")
      .select("id, session_id, subscores, bonus_penalidades, nota_final, nota_microlearning, feedback_resumido, orientacoes_melhoria, flags_seguranca, class_virtual_patient_id")
      .in("class_virtual_patient_id", filteredCvpIds);

    if (!gradesData || gradesData.length === 0) {
      // Also load sessions without grades to show ungraded count
      setGrades([]);
      setLoading(false);
      return;
    }

    // Get session info for student names
    const sessionIds = gradesData.map(g => g.session_id);
    const { data: sessionsData } = await supabase
      .from("virtual_patient_sessions")
      .select("id, student_email, student_name")
      .in("id", sessionIds);

    const sessionMap: Record<string, { email: string; name: string }> = {};
    (sessionsData || []).forEach((s: any) => {
      sessionMap[s.id] = { email: s.student_email || "", name: s.student_name || "" };
    });

    const enriched: GradeRow[] = gradesData.map(g => ({
      ...g,
      student_email: sessionMap[g.session_id]?.email,
      student_name: sessionMap[g.session_id]?.name,
    }));

    setGrades(enriched);
    setLoading(false);
  };

  const openDetail = async (grade: GradeRow) => {
    setDetailGrade(grade);
    setTranscriptLoading(true);
    const { data } = await supabase
      .from("virtual_patient_messages")
      .select("role, content, encounter")
      .eq("session_id", grade.session_id)
      .order("created_at", { ascending: true });
    setTranscript((data as TranscriptMsg[]) || []);
    setTranscriptLoading(false);
  };

  const handleBatchGrade = async () => {
    setGrading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setGrading(false); return; }

    // Get all completed sessions without grades for selected filters
    let cvpQuery = supabase
      .from("class_virtual_patients")
      .select("id, patient_id, class_id, classes!inner(user_id)")
      .eq("classes.user_id", user.id);

    const { data: myCvps } = await cvpQuery;
    if (!myCvps) { setGrading(false); return; }

    let filteredCvpIds = myCvps.map((c: any) => c.id);
    if (selectedClass !== "all") filteredCvpIds = myCvps.filter((c: any) => c.class_id === selectedClass).map((c: any) => c.id);
    if (selectedCvp !== "all") filteredCvpIds = filteredCvpIds.filter(id => id === selectedCvp);

    if (filteredCvpIds.length === 0) { toast.info("Nenhum paciente virtual encontrado."); setGrading(false); return; }

    // Get completed sessions
    const { data: sessions } = await supabase
      .from("virtual_patient_sessions")
      .select("id, class_virtual_patient_id")
      .in("class_virtual_patient_id", filteredCvpIds)
      .eq("status", "completed");

    if (!sessions || sessions.length === 0) {
      toast.info("Nenhuma sessão concluída para corrigir.");
      setGrading(false);
      return;
    }

    // Get already graded sessions
    const { data: existingGrades } = await supabase
      .from("virtual_patient_grades")
      .select("session_id")
      .in("session_id", sessions.map(s => s.id));

    const gradedIds = new Set((existingGrades || []).map(g => g.session_id));
    const toGrade = sessions.filter(s => !gradedIds.has(s.id));

    if (toGrade.length === 0) {
      toast.info("Todas as sessões já foram corrigidas.");
      setGrading(false);
      return;
    }

    toast.info(`Corrigindo ${toGrade.length} sessão(ões)...`);

    let success = 0;
    for (const session of toGrade) {
      try {
        await supabase.functions.invoke("grade-virtual-patient", {
          body: { session_id: session.id, class_virtual_patient_id: session.class_virtual_patient_id },
        });
        success++;
      } catch (err) {
        console.error("Grade error for session", session.id, err);
      }
    }

    toast.success(`${success}/${toGrade.length} sessão(ões) corrigida(s) com sucesso.`);
    setGrading(false);
    loadGrades();
  };

  // --- Computed metrics ---
  const gradedCount = grades.length;
  const avgNota = gradedCount > 0 ? grades.reduce((s, g) => s + (g.nota_final || 0), 0) / gradedCount : 0;
  const avgMicro = gradedCount > 0 ? grades.reduce((s, g) => s + (g.nota_microlearning || 0), 0) / gradedCount : 0;

  const allFlags = grades.flatMap(g => {
    const f = g.flags_seguranca;
    return Array.isArray(f) ? f : [];
  });
  const flagCount = allFlags.length;

  // Score distribution
  const scoreRanges = [
    { range: "0-2", count: 0, color: "hsl(0, 70%, 50%)" },
    { range: "2-4", count: 0, color: "hsl(30, 80%, 50%)" },
    { range: "4-6", count: 0, color: "hsl(45, 90%, 50%)" },
    { range: "6-8", count: 0, color: "hsl(142, 50%, 50%)" },
    { range: "8-10", count: 0, color: "hsl(142, 60%, 35%)" },
  ];
  grades.forEach(g => {
    const n = g.nota_final || 0;
    if (n < 2) scoreRanges[0].count++;
    else if (n < 4) scoreRanges[1].count++;
    else if (n < 6) scoreRanges[2].count++;
    else if (n < 8) scoreRanges[3].count++;
    else scoreRanges[4].count++;
  });

  // Radar data (avg subscores)
  const subscoreKeys = ["anamnese", "plano_inicial", "exames", "reavaliacao_ajustes", "mai"];
  const subscoreLabels: Record<string, string> = {
    anamnese: "Anamnese",
    plano_inicial: "Plano Inicial",
    exames: "Exames",
    reavaliacao_ajustes: "Reavaliação",
    mai: "MAI",
  };
  const radarData = subscoreKeys.map(key => {
    const avg = gradedCount > 0
      ? grades.reduce((s, g) => s + (g.subscores?.[key] || 0), 0) / gradedCount
      : 0;
    return { category: subscoreLabels[key], score: avg, maxScore: 2 };
  });

  // Flag frequency
  const flagFreq: Record<string, number> = {};
  allFlags.forEach((f: string) => { flagFreq[f] = (flagFreq[f] || 0) + 1; });
  const topFlags = Object.entries(flagFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Filtered CVP options for select
  const filteredCvpOptions = selectedClass === "all" ? cvps : cvps.filter(c => c.class_id === selectedClass);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Análises – Pacientes Virtuais</h1>
          <p className="text-muted-foreground text-sm mt-1">Resultados e métricas das interações com pacientes virtuais.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedCvp("all"); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas as turmas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedCvp} onValueChange={setSelectedCvp}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os pacientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os pacientes</SelectItem>
              {filteredCvpOptions.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {VP_CATALOG[c.patient_id]?.name || c.patient_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleBatchGrade} disabled={grading} variant="outline">
            {grading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <BookOpen className="h-4 w-4 mr-1.5" />}
            Corrigir Turma
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : gradedCount === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Nenhuma avaliação encontrada.</p>
            <p className="text-muted-foreground text-sm mt-1">Aguarde os alunos completarem os atendimentos ou use "Corrigir Turma".</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5"><Users className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-2xl font-bold">{gradedCount}</p>
                    <p className="text-xs text-muted-foreground">Alunos avaliados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5"><Award className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-2xl font-bold">{avgNota.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Nota média (0-10)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5"><TrendingUp className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-2xl font-bold">{avgMicro.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Microlearning (0-5)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-destructive/10 p-2.5"><ShieldAlert className="h-5 w-5 text-destructive" /></div>
                  <div>
                    <p className="text-2xl font-bold">{flagCount}</p>
                    <p className="text-xs text-muted-foreground">Flags de segurança</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Distribuição de Notas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={scoreRanges}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Alunos" radius={[4, 4, 0, 0]}>
                      {scoreRanges.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4" /> Desempenho por Critério
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OsceRadarChart data={radarData} />
              </CardContent>
            </Card>
          </div>

          {/* Flags de Segurança */}
          {topFlags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Flags de Segurança Mais Comuns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topFlags.map(([flag, count], i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}.</span>
                      <div className="flex-1"><p className="text-sm">{flag}</p></div>
                      <Badge variant="destructive">{count}x</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Student Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resultados Individuais</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead className="text-center">Nota (0-10)</TableHead>
                    <TableHead className="text-center">Microlearning</TableHead>
                    <TableHead className="text-center">Flags</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.map(g => {
                    const flags = Array.isArray(g.flags_seguranca) ? g.flags_seguranca : [];
                    return (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{g.student_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{g.student_email || "—"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={(g.nota_final || 0) >= 6 ? "default" : "destructive"}>
                            {(g.nota_final || 0).toFixed(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{(g.nota_microlearning || 0).toFixed(1)}</TableCell>
                        <TableCell className="text-center">
                          {flags.length > 0 ? (
                            <Badge variant="destructive" className="text-xs">{flags.length}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openDetail(g)}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailGrade} onOpenChange={(open) => !open && setDetailGrade(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Detalhes — {detailGrade?.student_name || detailGrade?.student_email || "Aluno"}
            </DialogTitle>
          </DialogHeader>
          {detailGrade && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                {/* Subscores */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Subscores</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {subscoreKeys.map(key => (
                      <div key={key} className="p-3 rounded-lg border text-center">
                        <p className="text-xs text-muted-foreground">{subscoreLabels[key]}</p>
                        <p className="text-lg font-bold mt-1">{(detailGrade.subscores?.[key] || 0).toFixed(1)}/2</p>
                      </div>
                    ))}
                    <div className="p-3 rounded-lg border text-center bg-primary/5">
                      <p className="text-xs text-muted-foreground">Nota Final</p>
                      <p className="text-lg font-bold mt-1">{(detailGrade.nota_final || 0).toFixed(1)}/10</p>
                    </div>
                  </div>
                </div>

                {/* Bonus/Penalties */}
                {detailGrade.bonus_penalidades && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Bônus / Penalidades</h4>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      {Object.entries(detailGrade.bonus_penalidades as Record<string, number>).map(([key, val]) => (
                        <div key={key} className="p-2 rounded border text-center">
                          <p className="text-xs text-muted-foreground">{key.replace(/_/g, " ")}</p>
                          <p className={`font-bold ${val > 0 ? "text-green-600" : val < 0 ? "text-destructive" : ""}`}>
                            {val > 0 ? "+" : ""}{val}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {detailGrade.feedback_resumido && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Feedback Resumido</h4>
                    <div className="prose prose-sm max-w-none dark:prose-invert bg-muted p-4 rounded-lg" dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(detailGrade.feedback_resumido) }} />
                  </div>
                )}

                {detailGrade.orientacoes_melhoria && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Orientações de Melhoria</h4>
                    <div className="prose prose-sm max-w-none dark:prose-invert bg-muted p-4 rounded-lg" dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(detailGrade.orientacoes_melhoria) }} />
                  </div>
                )}

                {/* Flags */}
                {Array.isArray(detailGrade.flags_seguranca) && detailGrade.flags_seguranca.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-destructive flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4" /> Flags de Segurança
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
                      {detailGrade.flags_seguranca.map((f: string, i: number) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}

                <Separator />

                {/* Transcript */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" /> Transcript Completo
                  </h4>
                  {transcriptLoading ? (
                    <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  ) : transcript.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Nenhuma mensagem encontrada.</p>
                  ) : (
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                      {transcript.map((msg, i) => (
                        <div key={i} className={`p-3 rounded-lg text-sm ${msg.role === "user" ? "bg-primary/10 ml-8" : "bg-muted mr-8"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px]">
                              {msg.role === "user" ? "Estudante" : "Paciente"}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">Encontro {msg.encounter}</span>
                          </div>
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
