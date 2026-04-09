import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Brain, TrendingUp, TrendingDown, Minus, BarChart3, LineChart as LineChartIcon, Users, Settings } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { CompetencyManagement } from "@/components/CompetencyManagement";

interface CompDef { id: string; name: string; area: string; }
interface ClassOption { id: string; name: string; }
interface CompScore {
  id: string;
  student_email: string;
  competency_id: string;
  score: number;
  max_score: number;
  source_type: string;
  source_label: string;
  evaluated_at: string;
}

const SOURCE_COLORS: Record<string, string> = {
  exam: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  osce: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  simulation: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  virtual_patient: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  mini_cex: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  progress_test: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
};

const SOURCE_LABELS: Record<string, string> = {
  exam: "Prova",
  osce: "OSCE",
  simulation: "Simulação",
  virtual_patient: "Paciente Virtual",
  mini_cex: "Mini-CEX/DOPS",
  progress_test: "Progress Test",
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(350, 80%, 55%)",
  "hsl(190, 80%, 42%)",
];

export default function CompetencyAnalysis() {
  const [loading, setLoading] = useState(true);
  const [competencies, setCompetencies] = useState<CompDef[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [scores, setScores] = useState<CompScore[]>([]);
  const [activeTab, setActiveTab] = useState("management");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [compRes, classRes, scoresRes] = await Promise.all([
      supabase.from("competency_definitions").select("*").eq("user_id", user.id),
      supabase.from("classes").select("id, name").eq("user_id", user.id).is("deleted_at", null),
      supabase.from("competency_scores").select("*").eq("user_id", user.id).order("evaluated_at"),
    ]);

    setCompetencies((compRes.data || []) as CompDef[]);
    setClasses((classRes.data || []) as ClassOption[]);
    setScores((scoresRes.data || []) as CompScore[]);
    setLoading(false);
  };

  const filteredScores = useMemo(() => {
    let f = scores;
    if (selectedSource !== "all") f = f.filter(s => s.source_type === selectedSource);
    return f;
  }, [scores, selectedSource]);

  // Build student → competency → aggregated score
  const studentScores = useMemo(() => {
    const map: Record<string, Record<string, { total: number; count: number; sources: Set<string> }>> = {};
    filteredScores.forEach(s => {
      if (!map[s.student_email]) map[s.student_email] = {};
      if (!map[s.student_email][s.competency_id]) map[s.student_email][s.competency_id] = { total: 0, count: 0, sources: new Set() };
      const pct = s.max_score > 0 ? (s.score / s.max_score) * 100 : 0;
      map[s.student_email][s.competency_id].total += pct;
      map[s.student_email][s.competency_id].count += 1;
      map[s.student_email][s.competency_id].sources.add(s.source_type);
    });
    return map;
  }, [filteredScores]);

  const students = Object.keys(studentScores).sort();

  // Class averages
  const classAvg = useMemo(() => {
    const avg: Record<string, number> = {};
    competencies.forEach(c => {
      let sum = 0, count = 0;
      students.forEach(s => {
        const sc = studentScores[s]?.[c.id];
        if (sc && sc.count > 0) { sum += sc.total / sc.count; count++; }
      });
      avg[c.id] = count > 0 ? sum / count : 0;
    });
    return avg;
  }, [studentScores, competencies, students]);

  const radarData = competencies.map(c => ({
    category: c.name,
    turma: Math.round(classAvg[c.id] || 0),
    fullMark: 100,
  }));

  // Timeline data for evolution chart
  const timelineData = useMemo(() => {
    if (filteredScores.length === 0) return [];
    const byMonth: Record<string, Record<string, { total: number; count: number }>> = {};
    filteredScores.forEach(s => {
      const month = s.evaluated_at.substring(0, 7); // YYYY-MM
      if (!byMonth[month]) byMonth[month] = {};
      if (!byMonth[month][s.competency_id]) byMonth[month][s.competency_id] = { total: 0, count: 0 };
      const pct = s.max_score > 0 ? (s.score / s.max_score) * 100 : 0;
      byMonth[month][s.competency_id].total += pct;
      byMonth[month][s.competency_id].count += 1;
    });
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, comps]) => {
      const point: Record<string, any> = { month };
      competencies.forEach(c => {
        const sc = comps[c.id];
        point[c.name] = sc ? Math.round(sc.total / sc.count) : null;
      });
      return point;
    });
  }, [filteredScores, competencies]);

  // Unique source types present
  const availableSources = useMemo(() => {
    const set = new Set(scores.map(s => s.source_type));
    return Array.from(set).sort();
  }, [scores]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="h-6 w-6 text-primary" /> Análise de Competências</h1>
          <p className="text-muted-foreground">Dashboard longitudinal de desempenho por competência</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Fonte" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as fontes</SelectItem>
              {availableSources.map(s => <SelectItem key={s} value={s}>{SOURCE_LABELS[s] || s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Turma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="management"><Settings className="h-4 w-4 mr-1" /> Gestão</TabsTrigger>
          {competencies.length > 0 && (
            <>
              <TabsTrigger value="overview"><BarChart3 className="h-4 w-4 mr-1" /> Visão Geral</TabsTrigger>
              <TabsTrigger value="timeline"><LineChartIcon className="h-4 w-4 mr-1" /> Evolução</TabsTrigger>
              <TabsTrigger value="students"><Users className="h-4 w-4 mr-1" /> Por Aluno</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="management">
          <CompetencyManagement />
        </TabsContent>

      {competencies.length === 0 ? null : (
        <>



          <TabsContent value="overview" className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold">{competencies.length}</p>
                <p className="text-xs text-muted-foreground">Competências</p>
              </CardContent></Card>
              <Card><CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold">{students.length}</p>
                <p className="text-xs text-muted-foreground">Alunos avaliados</p>
              </CardContent></Card>
              <Card><CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold">{filteredScores.length}</p>
                <p className="text-xs text-muted-foreground">Registros</p>
              </CardContent></Card>
              <Card><CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold">{availableSources.length}</p>
                <p className="text-xs text-muted-foreground">Fontes de dados</p>
              </CardContent></Card>
            </div>

            {/* Radar Chart */}
            <Card>
              <CardHeader><CardTitle>Média Geral por Competência</CardTitle></CardHeader>
              <CardContent>
                {radarData.length > 0 && radarData.some(d => d.turma > 0) ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid strokeDasharray="3 3" />
                      <PolarAngleAxis dataKey="category" className="text-xs" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                      <Radar name="Turma" dataKey="turma" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Sem dados de avaliação ainda.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Evolução Temporal das Competências</CardTitle></CardHeader>
              <CardContent>
                {timelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      {competencies.map((c, i) => (
                        <Line
                          key={c.id}
                          type="monotone"
                          dataKey={c.name}
                          stroke={CHART_COLORS[i % CHART_COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Sem dados temporais ainda.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Detalhamento por Aluno</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Aluno</TableHead>
                        {competencies.map(c => <TableHead key={c.id} className="text-center text-xs">{c.name}</TableHead>)}
                        <TableHead className="text-center">Média</TableHead>
                        <TableHead className="text-center">Fontes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.length === 0 ? (
                        <TableRow><TableCell colSpan={competencies.length + 3} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>
                      ) : (
                        students.slice(0, 100).map(email => {
                          const compScores = competencies.map(c => {
                            const sc = studentScores[email]?.[c.id];
                            return sc && sc.count > 0 ? sc.total / sc.count : null;
                          });
                          const validScores = compScores.filter(s => s !== null) as number[];
                          const avg = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
                          const globalAvg = Object.values(classAvg).reduce((a, b) => a + b, 0) / Math.max(competencies.length, 1);
                          const diff = avg - globalAvg;
                          
                          // Collect all sources for this student
                          const allSources = new Set<string>();
                          Object.values(studentScores[email] || {}).forEach(sc => sc.sources.forEach(s => allSources.add(s)));

                          return (
                            <TableRow key={email}>
                              <TableCell className="font-medium text-sm">{email.replace(/@.*/, "") || email}</TableCell>
                              {compScores.map((s, i) => (
                                <TableCell key={i} className="text-center">
                                  {s !== null ? (
                                    <Badge variant={s >= 70 ? "default" : s >= 50 ? "secondary" : "destructive"} className="text-xs">
                                      {Math.round(s)}%
                                    </Badge>
                                  ) : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                              ))}
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="font-medium">{Math.round(avg)}%</span>
                                  {diff > 5 ? <TrendingUp className="h-3 w-3 text-green-600" /> : diff < -5 ? <TrendingDown className="h-3 w-3 text-destructive" /> : <Minus className="h-3 w-3 text-muted-foreground" />}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-wrap gap-1 justify-center">
                                  {Array.from(allSources).map(src => (
                                    <Badge key={src} variant="outline" className={`text-[10px] ${SOURCE_COLORS[src] || ""}`}>
                                      {SOURCE_LABELS[src] || src}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </>
      )}
      </Tabs>
    </div>
  );
}
