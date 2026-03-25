import { useState, useEffect } from "react";
import {
  Library,
  FileEdit,
  GraduationCap,
  BarChart3,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { RoadmapProactiveDialog } from "@/components/RoadmapProactiveDialog";

interface RecentExam {
  id: string;
  title: string;
  created_at: string;
  status: string;
  questionCount: number;
}

const statusVariant: Record<string, "default" | "secondary"> = {
  draft: "secondary",
  applied: "default",
  in_progress: "default",
  graded: "default",
};

const statusLabel: Record<string, string> = {
  draft: "Rascunho",
  applied: "Aplicada",
  in_progress: "Em aplicação",
  graded: "Consolidada",
};

export default function DashboardPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [examsCount, setExamsCount] = useState(0);
  const [classesCount, setClassesCount] = useState(0);
  const [avgDifficulty, setAvgDifficulty] = useState("—");
  const [recentExams, setRecentExams] = useState<RecentExam[]>([]);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Fetch profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile?.full_name) setUserName(profile.full_name.split(" ")[0]);

      const [questionsRes, examsRes, classesRes, difficultyRes, recentRes] = await Promise.all([
        supabase.from("question_bank").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).is("deleted_at", null),
        supabase.from("exams").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).is("deleted_at", null),
        supabase.from("classes").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).is("deleted_at", null),
        supabase.from("question_bank").select("difficulty")
          .eq("user_id", user.id).is("deleted_at", null),
        supabase.from("exams").select("id, title, status, created_at")
          .eq("user_id", user.id).is("deleted_at", null)
          .order("created_at", { ascending: false }).limit(5),
      ]);

      setQuestionsCount(questionsRes.count || 0);
      setExamsCount(examsRes.count || 0);
      setClassesCount(classesRes.count || 0);

      // Calculate average difficulty
      if (difficultyRes.data && difficultyRes.data.length > 0) {
        const diffMap: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
        const total = difficultyRes.data.reduce((sum, q) => sum + (diffMap[q.difficulty] || 2), 0);
        const avg = total / difficultyRes.data.length;
        if (avg <= 1.5) setAvgDifficulty(t("questions_easy"));
        else if (avg <= 2.5) setAvgDifficulty(t("questions_medium"));
        else setAvgDifficulty(t("questions_hard"));
      }

      // Fetch question counts for recent exams
      if (recentRes.data && recentRes.data.length > 0) {
        const examIds = recentRes.data.map(e => e.id);
        const { data: qCounts } = await supabase
          .from("exam_questions")
          .select("exam_id")
          .in("exam_id", examIds);

        const countMap: Record<string, number> = {};
        (qCounts || []).forEach(q => {
          countMap[q.exam_id] = (countMap[q.exam_id] || 0) + 1;
        });

        setRecentExams(recentRes.data.map(e => ({
          id: e.id,
          title: e.title,
          created_at: e.created_at.split("T")[0],
          status: e.status,
          questionCount: countMap[e.id] || 0,
        })));
      }

      setLoading(false);
    };
    loadDashboard();
  }, [t]);

  const isNewUser = !loading && questionsCount === 0 && examsCount === 0 && classesCount === 0;

  const stats = [
    { label: t("dash_total_questions"), value: loading ? "..." : String(questionsCount), icon: Library },
    { label: t("dash_exams_created"), value: loading ? "..." : String(examsCount), icon: FileEdit },
    { label: t("dash_active_classes"), value: loading ? "..." : String(classesCount), icon: GraduationCap },
    { label: t("dash_avg_difficulty"), value: loading ? "..." : avgDifficulty, icon: BarChart3 },
  ];

  const welcomeText = userName
    ? `${t("dash_welcome").replace("Professor(a)", userName).replace("Professor", userName).replace("Profesor(a)", userName)}`
    : t("dash_welcome");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{welcomeText}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("dash_subtitle")}</p>
      </div>

      {isNewUser && <OnboardingWizard />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold mt-3">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">{t("dash_quick_actions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/composer">
                <Plus className="h-4 w-4 mr-2" />
                {t("dash_create_exam")}
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/questions">
                <Library className="h-4 w-4 mr-2" />
                {t("dash_add_questions")}
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/classes">
                <GraduationCap className="h-4 w-4 mr-2" />
                {t("dash_manage_classes")}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t("dash_recent_exams")}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/exams">
                {t("dash_view_all")} <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {recentExams.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {t("dash_no_exams")}
                  </p>
                ) : (
                  recentExams.map((exam) => (
                    <Link
                      key={exam.id}
                      to={`/exams/${exam.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-md bg-accent flex items-center justify-center">
                          <FileEdit className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{exam.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{exam.created_at}</span>
                            <span className="text-xs text-muted-foreground">· {exam.questionCount} {t("composer_total_questions")}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={statusVariant[exam.status] || "secondary"}>
                        {statusLabel[exam.status] || exam.status}
                      </Badge>
                    </Link>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
