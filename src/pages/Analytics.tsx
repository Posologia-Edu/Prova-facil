import { useEffect, useState } from "react";
import { BarChart3, PieChart, TrendingUp, Users, Award, AlertTriangle, ArrowDownUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface ExamOption { id: string; title: string; class_id: string | null; }
interface ClassOption { id: string; name: string; }
interface SessionRow { id: string; student_id: string; total_score: number | null; max_score: number | null; status: string; finished_at: string | null; }
interface AnswerRow { question_id: string; is_correct: boolean | null; points_earned: number | null; max_points: number | null; content_json: Record<string, any>; tags: string[] | null; }

const COLORS = [
  "hsl(142, 60%, 45%)", "hsl(45, 90%, 50%)", "hsl(0, 70%, 50%)",
  "hsl(210, 70%, 50%)", "hsl(280, 60%, 50%)", "hsl(30, 80%, 50%)",
];

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");

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
      .eq("status", "finished");

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
    { range: "0-20%", count: 0, color: "hsl(0, 70%, 50%)" },
    { range: "21-40%", count: 0, color: "hsl(30, 80%, 50%)" },
    { range: "41-60%", count: 0, color: "hsl(45, 90%, 50%)" },
    { range: "61-80%", count: 0, color: "hsl(142, 50%, 50%)" },
    { range: "81-100%", count: 0, color: "hsl(142, 60%, 35%)" },
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("analytics_title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("analytics_subtitle")}</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("analytics_all_classes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("analytics_all_classes")}</SelectItem>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-secondary/10 p-2.5">
                    <Users className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalStudents}</p>
                    <p className="text-xs text-muted-foreground">{t("analytics_total_students")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-secondary/10 p-2.5">
                    <Award className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{avgScore.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">{t("analytics_avg_score")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-secondary/10 p-2.5">
                    <TrendingUp className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{passRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">{t("analytics_pass_rate")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-secondary/10 p-2.5">
                    <ArrowDownUp className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{finishedSessions.length}</p>
                    <p className="text-xs text-muted-foreground">{t("analytics_total_submissions")}</p>
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
                <CardTitle className="text-base flex items-center gap-2">
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
                      <Bar dataKey="rate" name={t("analytics_correct_rate")} fill="hsl(142, 60%, 45%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Most Missed Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
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
                      <Badge variant={q.errorRate > 70 ? "destructive" : q.errorRate > 40 ? "secondary" : "default"}>
                        {q.errorRate.toFixed(0)}% {t("analytics_error_rate")}
                      </Badge>
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
