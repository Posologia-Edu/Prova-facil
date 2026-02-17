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

const stats = [
  { label: "Total Questions", value: "247", icon: Library, change: "+12 this week" },
  { label: "Exams Created", value: "18", icon: FileEdit, change: "+3 this month" },
  { label: "Active Classes", value: "5", icon: GraduationCap, change: "Spring 2026" },
  { label: "Avg. Difficulty", value: "2.4", icon: BarChart3, change: "Balanced" },
];

const recentExams = [
  { title: "Pharmacology 101 - Midterm", date: "Mar 15, 2026", status: "draft", questions: 25 },
  { title: "Biochemistry Final", date: "Mar 10, 2026", status: "published", questions: 40 },
  { title: "Anatomy Quiz #3", date: "Feb 28, 2026", status: "archived", questions: 15 },
];

const statusVariant: Record<string, "default" | "success" | "secondary"> = {
  draft: "secondary",
  published: "success",
  archived: "default",
};

export default function DashboardPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back, Doctor</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here's an overview of your exam workspace.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
              <p className="text-2xl font-bold mt-3">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              <p className="text-xs text-success mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions + Recent Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/composer">
                <Plus className="h-4 w-4 mr-2" />
                Create New Exam
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/questions">
                <Library className="h-4 w-4 mr-2" />
                Add Questions
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/classes">
                <GraduationCap className="h-4 w-4 mr-2" />
                Manage Classes
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Exams */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Exams</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/composer">
                View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentExams.map((exam) => (
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
                        <span className="text-xs text-muted-foreground">· {exam.questions} questions</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={statusVariant[exam.status]}>
                    {exam.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
