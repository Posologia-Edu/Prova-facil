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

const topicData: { topic: string; count: number }[] = [];

const difficultyData: { name: string; value: number; color: string }[] = [];

const examHistory: { title: string; date: string; questions: number; status: string }[] = [];

const statusVariant = (status: string) => {
  if (status === "publicada") return "success" as const;
  if (status === "rascunho") return "secondary" as const;
  return "default" as const;
};

export default function AnalyticsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Análises</h1>
        <p className="text-muted-foreground text-sm mt-1">Insights sobre seu banco de questões e histórico de provas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Questões por Tópico
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topicData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhum dado disponível ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topicData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="topic" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(220, 60%, 20%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Distribuição por Dificuldade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {difficultyData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhum dado disponível ainda.</p>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Histórico de Provas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {examHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma prova no histórico ainda.</p>
            ) : (
              examHistory.map((exam) => (
                <div key={exam.title} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{exam.title}</p>
                    <p className="text-xs text-muted-foreground">{exam.date} · {exam.questions} questões</p>
                  </div>
                  <Badge variant={statusVariant(exam.status)}>
                    {exam.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
