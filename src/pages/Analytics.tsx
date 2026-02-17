import { BarChart3, PieChart, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from "recharts";

const topicData = [
  { topic: "Pharmacology", count: 68 },
  { topic: "Biochemistry", count: 45 },
  { topic: "Anatomy", count: 52 },
  { topic: "Pathology", count: 38 },
  { topic: "Physiology", count: 44 },
];

const difficultyData = [
  { name: "Easy", value: 95, color: "hsl(152, 60%, 40%)" },
  { name: "Medium", value: 102, color: "hsl(38, 92%, 50%)" },
  { name: "Hard", value: 50, color: "hsl(0, 72%, 51%)" },
];

const examHistory = [
  { title: "Pharmacology 101 - Midterm", date: "Mar 15, 2026", questions: 25, status: "draft" },
  { title: "Biochemistry Final", date: "Mar 10, 2026", questions: 40, status: "published" },
  { title: "Anatomy Quiz #3", date: "Feb 28, 2026", questions: 15, status: "archived" },
  { title: "Pathophysiology Exam 2", date: "Feb 20, 2026", questions: 30, status: "published" },
  { title: "Pharmacology Quiz #5", date: "Feb 10, 2026", questions: 10, status: "archived" },
];

export default function AnalyticsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Insights into your question bank and exam history.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Questions by Topic */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Questions by Topic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topicData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="topic" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(220, 60%, 20%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Difficulty Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Difficulty Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <ResponsiveContainer width={180} height={180}>
                <RechartsPie>
                  <Pie
                    data={difficultyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    strokeWidth={2}
                  >
                    {difficultyData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="space-y-3">
                {difficultyData.map((d) => (
                  <div key={d.name} className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-sm">{d.name}</span>
                    <span className="text-sm font-semibold ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exam History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Exam History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {examHistory.map((exam) => (
              <div key={exam.title} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-sm font-medium">{exam.title}</p>
                  <p className="text-xs text-muted-foreground">{exam.date} · {exam.questions} questions</p>
                </div>
                <Badge variant={exam.status === "published" ? "success" : exam.status === "draft" ? "secondary" : "default"}>
                  {exam.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
