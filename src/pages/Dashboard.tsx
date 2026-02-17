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
  { label: "Total de Questões", value: "0", icon: Library, change: "" },
  { label: "Provas Criadas", value: "0", icon: FileEdit, change: "" },
  { label: "Turmas Ativas", value: "0", icon: GraduationCap, change: "" },
  { label: "Dific. Média", value: "—", icon: BarChart3, change: "" },
];

const recentExams: { title: string; date: string; status: string; questions: number }[] = [];

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
              {recentExams.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma prova criada ainda.
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
                          <span className="text-xs text-muted-foreground">· {exam.questions} questões</span>
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
