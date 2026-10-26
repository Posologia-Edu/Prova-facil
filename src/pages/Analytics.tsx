import { useEffect, useState } from "react";
import { BarChart3, PieChart, TrendingUp, Users, Award, AlertTriangle, ArrowDownUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsListLine, TabsTriggerLine } from "@/components/ui/tabs";
import VPAnalytics from "@/pages/VPAnalytics";
import { OverviewTab, OsceTab, FormsTab, type AnalyticsTab } from "@/components/analytics/AnalyticsExtraTabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { AdvancedPDFReport } from "@/components/AdvancedPDFReport";

interface ExamOption { id: string; title: string; class_id: string | null; }
interface ClassOption { id: string; name: string; }
interface SessionRow { id: string; student_id: string; total_score: number | null; max_score: number | null; status: string; finished_at: string | null; }
interface AnswerRow { question_id: string; is_correct: boolean | null; points_earned: number | null; max_points: number | null; content_json: Record<string, any>; tags: string[] | null; }

const COLORS = [
  "hsl(var(--success))", "hsl(var(--highlight))", "hsl(var(--destructive))",
  "hsl(210, 70%, 50%)", "hsl(280, 60%, 50%)", "hsl(var(--warning))",
];

function ExamsAnalyticsTab({ selectedClass }: { selectedClass: string }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("all");

  // Computed data
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadPerformanceData();
  }, [selectedExam, selectedClass]);

  const loadFilters = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [examsRes, classesRes] = await Promise.all([
      supabase.from("exams").select("id, title, class_id").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("classes").select("id, name").eq("user_id", user.id).order("name"),
    ]);
    setExams(examsRes.data || []);
    setClasses(classesRes.data || []);
  };

  const loadPerformanceData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Get publications for this teacher
    let pubQuery = supabase.from("exam_publications").select("id, exam_id").eq("user_id", user.id);
    const { data: publications } = await pubQuery;
    if (!publications || publications.length === 0) {
      setSessions([]);
      setAnswers([]);
      setLoading(false);
      return;
    }

    // Filter by exam/class
    let filteredPubIds = publications.map(p => p.id);
    let filteredExamIds = publications.map(p => p.exam_id);

    if (selectedExam !== "all") {
      const filtered = publications.filter(p => p.exam_id === selectedExam);
      filteredPubIds = filtered.map(p => p.id);
      filteredExamIds = filtered.map(p => p.exam_id);
    }

    if (selectedClass !== "all") {
      const classExamIds = exams.filter(e => e.class_id === selectedClass).map(e => e.id);
      const filtered = publications.filter(p => classExamIds.includes(p.exam_id));
      filteredPubIds = filtered.map(p => p.id);
      filteredExamIds = filtered.map(p => p.exam_id);
    }

    if (filteredPubIds.length === 0) {
      setSessions([]);
      setAnswers([]);
      setLoading(false);
      return;
    }

    // Get sessions
    const { data: sessData } = await supabase
      .from("exam_sessions")
      .select("id, student_id, total_score, max_score, status, finished_at")
      .in("publication_id", filteredPubIds)
      .in("status", ["finished", "submitted", "graded"]);

    setSessions(sessData || []);

    if (!sessData || sessData.length === 0) {
      setAnswers([]);
      setLoading(false);
      return;
    }

    // Get answers with question info
    const sessionIds = sessData.map(s => s.id);
    // Batch in groups of 50 to avoid query limits
    const allAnswers: AnswerRow[] = [];
    for (let i = 0; i < sessionIds.length; i += 50) {
      const batch = sessionIds.slice(i, i + 50);
      const { data: ansData } = await supabase
        .from("student_answers")
        .select("question_id, is_correct, points_earned, max_points, question_bank!inner(content_json, tags)")
        .in("session_id", batch);

      if (ansData) {
        allAnswers.push(...ansData.map((a: any) => ({
          question_id: a.question_id,
          is_correct: a.is_correct,
          points_earned: a.points_earned,
          max_points: a.max_points,
          content_json: a.question_bank?.content_json || {},
          tags: a.question_bank?.tags || [],
        })));
      }
    }
    setAnswers(allAnswers);
    setLoading(false);
  };

  // --- Computed metrics ---
  const finishedSessions = sessions.filter(s => s.total_score !== null && s.max_score !== null && s.max_score > 0);
  const totalStudents = new Set(finishedSessions.map(s => s.student_id)).size;
  const avgScore = finishedSessions.length > 0
    ? finishedSessions.reduce((sum, s) => sum + ((s.total_score || 0) / (s.max_score || 1)) * 100, 0) / finishedSessions.length
    : 0;
  const passRate = finishedSessions.length > 0
    ? (finishedSessions.filter(s => ((s.total_score || 0) / (s.max_score || 1)) >= 0.6).length / finishedSessions.length) * 100
    : 0;

  // Score distribution (ranges: 0-20, 21-40, 41-60, 61-80, 81-100)
  const scoreRanges = [
    { range: "0-20%", count: 0, color: "hsl(var(--destructive))" },
    { range: "21-40%", count: 0, color: "hsl(var(--warning))" },
    { range: "41-60%", count: 0, color: "hsl(var(--highlight))" },
    { range: "61-80%", count: 0, color: "hsl(var(--success))" },
    { range: "81-100%", count: 0, color: "hsl(var(--success))" },
  ];
  finishedSessions.forEach(s => {
    const pct = ((s.total_score || 0) / (s.max_score || 1)) * 100;
    if (pct <= 20) scoreRanges[0].count++;
    else if (pct <= 40) scoreRanges[1].count++;
    else if (pct <= 60) scoreRanges[2].count++;
    else if (pct <= 80) scoreRanges[3].count++;
    else scoreRanges[4].count++;
  });

  // Most missed questions
  const questionStats: Record<string, { total: number; wrong: number; text: string }> = {};
  answers.forEach(a => {
    if (!questionStats[a.question_id]) {
      const text = a.content_json?.question_text || a.content_json?.text || a.question_id.slice(0, 8);
      questionStats[a.question_id] = { total: 0, wrong: 0, text: text.slice(0, 80) };
    }
    questionStats[a.question_id].total++;
    if (a.is_correct === false) questionStats[a.question_id].wrong++;
  });
  const mostMissed = Object.entries(questionStats)
    .map(([id, s]) => ({ id, text: s.text, errorRate: s.total > 0 ? (s.wrong / s.total) * 100 : 0, total: s.total, wrong: s.wrong }))
    .filter(q => q.total >= 1)
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 10);

  // Performance by tag/topic
  const tagPerformance: Record<string, { correct: number; total: number }> = {};
  answers.forEach(a => {
    const tags = a.tags && a.tags.length > 0 ? a.tags : [t("analytics_untagged")];
    tags.forEach(tag => {
      if (!tagPerformance[tag]) tagPerformance[tag] = { correct: 0, total: 0 };
      tagPerformance[tag].total++;
      if (a.is_correct) tagPerformance[tag].correct++;
    });
  });
  const topicData = Object.entries(tagPerformance)
    .map(([topic, s]) => ({ topic, correct: s.correct, total: s.total, rate: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0 }))
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 12);

  // Class comparison
  const classComparison = classes.map(cls => {
    const classExamIds = exams.filter(e => e.class_id === cls.id).map(e => e.id);
    const classSessions = finishedSessions.filter(s => {
      // We need to check via publications — simplify by checking all
      return true; // filtered at query level
    });
    // For proper comparison, we'd need pub→exam→class mapping in memory
    return { name: cls.name, avg: 0 };
  }).filter(c => c.avg > 0);

  const hasData = finishedSessions.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
          <AdvancedPDFReport
            variant="sm"
            data={{
              title: "Relatório Geral de Desempenho",
              subtitle: selectedExam !== "all" ? exams.find(e => e.id === selectedExam)?.title : "Todas as provas",
              stats: [
                { label: "Aprovação", value: `${passRate.toFixed(0)}%` },
              ],
              students: finishedSessions.map(s => ({
                name: s.student_id || "—",
                score: s.total_score || 0,
                maxScore: s.max_score || 0,
              })),
              chartElementId: "analytics-chart-area",
            }}
          />
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("analytics_all_exams")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("analytics_all_exams")}</SelectItem>
              {exams.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !hasData ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">{t("analytics_no_data")}</p>
            <p className="text-muted-foreground text-sm mt-1">{t("analytics_no_data_hint")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5">
              <div className="label-mono">{t("analytics_total_students")}</div>
              <div className="font-heading text-4xl font-medium mt-1">{totalStudents}</div>
            </Card>
            <Card className="p-5">
              <div className="label-mono">{t("analytics_avg_score")}</div>
              <div className="font-heading text-4xl font-medium mt-1">{`${avgScore.toFixed(1)}%`}</div>
            </Card>
            <Card className="p-5">
              <div className="label-mono">{t("analytics_pass_rate")}</div>
              <div className="font-heading text-4xl font-medium mt-1">{`${passRate.toFixed(1)}%`}</div>
            </Card>
            <Card className="p-5">
              <div className="label-mono">{t("analytics_total_submissions")}</div>
              <div className="font-heading text-4xl font-medium mt-1">{finishedSessions.length}</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  {t("analytics_score_distribution")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={scoreRanges}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name={t("analytics_students")} radius={[4, 4, 0, 0]}>
                      {scoreRanges.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Performance by Topic */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg font-medium flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  {t("analytics_by_topic")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topicData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">{t("analytics_no_data")}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={topicData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                      <YAxis dataKey="topic" type="category" tick={{ fontSize: 10 }} width={100} />
                      <Tooltip formatter={(value: number) => `${value}%`} />
                      <Bar dataKey="rate" name={t("analytics_correct_rate")} fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Most Missed Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {t("analytics_most_missed")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mostMissed.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("analytics_no_data")}</p>
              ) : (
                <div className="space-y-2">
                  {mostMissed.map((q, i) => (
                    <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{q.text}</p>
                        <p className="text-xs text-muted-foreground">
                          {q.wrong}/{q.total} {t("analytics_errors")}
                        </p>
                      </div>
                      <StatusBadge tone={q.errorRate > 70 ? "bad" : q.errorRate > 40 ? "warn" : "ok"}>
                        {q.errorRate.toFixed(0)}% {t("analytics_error_rate")}
                      </StatusBadge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function AnalyticsPage({ initialTab = "overview" }: { initialTab?: AnalyticsTab } = {}) {
  const [tab, setTab] = useState<AnalyticsTab>(initialTab);
  const [classId, setClassId] = useState("all");
  const [classes, setClasses] = useState<ClassOption[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("classes").select("id, name").eq("user_id", user.id).is("deleted_at", null).order("name");
      setClasses(data || []);
    })();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Gestão"
        title="Análises"
        description="Um só lugar para ler o desempenho: provas online, pacientes virtuais, OSCE e formulários. A análise detalhada de cada atividade continua dentro dela e dentro da Turma."
        actions={
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Turma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as AnalyticsTab)}>
        <TabsListLine className="overflow-x-auto">
          <TabsTriggerLine value="overview">Visão geral</TabsTriggerLine>
          <TabsTriggerLine value="exams">Provas online</TabsTriggerLine>
          <TabsTriggerLine value="vp">Pacientes virtuais</TabsTriggerLine>
          <TabsTriggerLine value="osce">OSCE</TabsTriggerLine>
          <TabsTriggerLine value="forms">Formulários</TabsTriggerLine>
        </TabsListLine>
        <TabsContent value="overview" className="mt-6"><OverviewTab classId={classId} onGo={setTab} /></TabsContent>
        <TabsContent value="exams" className="mt-6"><ExamsAnalyticsTab selectedClass={classId} /></TabsContent>
        <TabsContent value="vp" className="mt-6"><VPAnalytics embedded classId={classId === "all" ? undefined : classId} /></TabsContent>
        <TabsContent value="osce" className="mt-6"><OsceTab classId={classId} /></TabsContent>
        <TabsContent value="forms" className="mt-6"><FormsTab classId={classId} /></TabsContent>
      </Tabs>
    </div>
  );
}
