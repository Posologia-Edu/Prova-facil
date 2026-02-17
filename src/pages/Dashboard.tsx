import {
  Library,
  FileEdit,
  GraduationCap,
  BarChart3,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

const recentExams: { title: string; date: string; status: string; questions: number }[] = [];

const statusVariant: Record<string, "default" | "success" | "secondary"> = {
  rascunho: "secondary",
  publicada: "success",
  arquivada: "default",
};

export default function DashboardPage() {
  const { t } = useLanguage();

  const stats = [
    { label: t("dash_total_questions"), value: "0", icon: Library, change: "" },
    { label: t("dash_exams_created"), value: "0", icon: FileEdit, change: "" },
    { label: t("dash_active_classes"), value: "0", icon: GraduationCap, change: "" },
    { label: t("dash_avg_difficulty"), value: "—", icon: BarChart3, change: "" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dash_welcome")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("dash_subtitle")}</p>
      </div>

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
              {stat.change && <p className="text-xs text-success mt-1">{stat.change}</p>}
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
              <Link to="/composer">
                {t("dash_view_all")} <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentExams.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t("dash_no_exams")}
                </p>
              ) : (
                recentExams.map((exam) => (
                  <div
                    key={exam.title}
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
                          <span className="text-xs text-muted-foreground">{exam.date}</span>
                          <span className="text-xs text-muted-foreground">· {exam.questions} {t("composer_total_questions")}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={statusVariant[exam.status]}>
                      {exam.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
