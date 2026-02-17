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
  { label: "Total de Questões", value: "247", icon: Library, change: "+12 esta semana" },
  { label: "Provas Criadas", value: "18", icon: FileEdit, change: "+3 este mês" },
  { label: "Turmas Ativas", value: "5", icon: GraduationCap, change: "1º Sem. 2026" },
  { label: "Dific. Média", value: "2.4", icon: BarChart3, change: "Equilibrado" },
];

const recentExams = [
  { title: "Farmacologia 101 - Prova Parcial", date: "15 Mar 2026", status: "rascunho", questions: 25 },
  { title: "Bioquímica - Prova Final", date: "10 Mar 2026", status: "publicada", questions: 40 },
  { title: "Anatomia - Quiz #3", date: "28 Fev 2026", status: "arquivada", questions: 15 },
];

const statusVariant: Record<string, "default" | "success" | "secondary"> = {
  rascunho: "secondary",
  publicada: "success",
  arquivada: "default",
};

export default function DashboardPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bem-vindo(a) de volta, Professor(a)</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Aqui está uma visão geral do seu espaço de provas.
        </p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/composer">
                <Plus className="h-4 w-4 mr-2" />
                Criar Nova Prova
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/questions">
                <Library className="h-4 w-4 mr-2" />
                Adicionar Questões
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/classes">
                <GraduationCap className="h-4 w-4 mr-2" />
                Gerenciar Turmas
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Provas Recentes</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/composer">
                Ver todas <ArrowRight className="h-3.5 w-3.5 ml-1" />
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
                        <span className="text-xs text-muted-foreground">· {exam.questions} questões</span>
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
