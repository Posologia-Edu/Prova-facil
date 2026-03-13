import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, BarChart3, Users, AlertTriangle } from "lucide-react";
import { OsceRadarChart } from "@/components/osce/OsceRadarChart";

export default function OsceResults() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const { data: exam } = useQuery({
    queryKey: ["osce-exam-results", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("osce_exams").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: stations } = useQuery({
    queryKey: ["osce-stations-results", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_stations")
        .select("*")
        .eq("osce_exam_id", id!)
        .eq("is_rest_station", false)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: circuits } = useQuery({
    queryKey: ["osce-circuits-results", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_circuits")
        .select("id")
        .eq("osce_exam_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const circuitIds = circuits?.map((c: any) => c.id) || [];

  const { data: evaluations } = useQuery({
    queryKey: ["osce-evaluations-results", circuitIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_evaluations")
        .select("*, osce_evaluation_items(*, osce_checklist_items(*))")
        .in("circuit_id", circuitIds);
      if (error) throw error;
      return data;
    },
    enabled: circuitIds.length > 0,
  });

  // Group by student
  const studentMap = (evaluations || []).reduce((acc: Record<string, any[]>, ev: any) => {
    const key = ev.student_name || "Sem nome";
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  const students = Object.keys(studentMap);

  // Compute radar data for a student
  const getRadarData = (studentEvals: any[]) => {
    const categoryScores: Record<string, { score: number; max: number }> = {};

    studentEvals.forEach((ev: any) => {
      (ev.osce_evaluation_items || []).forEach((item: any) => {
        const cat = item.osce_checklist_items?.category || "Geral";
        if (!categoryScores[cat]) categoryScores[cat] = { score: 0, max: 0 };
        const maxVal = item.osce_checklist_items?.type === "binary" ? 1 :
          item.osce_checklist_items?.type === "likert" ? (item.osce_checklist_items?.likert_max || 5) :
          Number(item.osce_checklist_items?.max_points || 1);
        const weight = item.osce_checklist_items?.weight || 1;
        categoryScores[cat].score += (item.value || 0) * weight;
        categoryScores[cat].max += maxVal * weight;
      });
    });

    return Object.entries(categoryScores).map(([category, { score, max }]) => ({
      category,
      score,
      maxScore: max,
    }));
  };

  const selectedStudentEvals = selectedStudent ? studentMap[selectedStudent] || [] : [];
  const radarData = selectedStudent ? getRadarData(selectedStudentEvals) : [];

  // Station averages
  const stationStats = (stations || []).map((station: any) => {
    const stationEvals = (evaluations || []).filter((e: any) => e.station_id === station.id && e.finished_at);
    const avg = stationEvals.length > 0
      ? stationEvals.reduce((s: number, e: any) => s + (e.total_score || 0), 0) / stationEvals.length
      : 0;
    const avgMax = stationEvals.length > 0
      ? stationEvals.reduce((s: number, e: any) => s + (e.max_score || 0), 0) / stationEvals.length
      : 0;
    const failCount = stationEvals.filter((e: any) => !e.passed).length;
    return { ...station, avgScore: avg, avgMax: avgMax, count: stationEvals.length, failCount };
  });

  if (!exam) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/osce")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Resultados: {exam.title}</h1>
          <p className="text-sm text-muted-foreground">{students.length} alunos • {stations?.length || 0} estações</p>
        </div>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students" className="gap-1"><Users className="h-3 w-3" /> Alunos</TabsTrigger>
          <TabsTrigger value="stations" className="gap-1"><BarChart3 className="h-3 w-3" /> Estações</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Student list */}
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle className="text-base">Alunos</CardTitle></CardHeader>
              <CardContent className="space-y-1 p-2">
                {students.map((name) => {
                  const evals = studentMap[name];
                  const totalScore = evals.reduce((s: number, e: any) => s + (e.total_score || 0), 0);
                  const maxScore = evals.reduce((s: number, e: any) => s + (e.max_score || 0), 0);
                  const anyFailed = evals.some((e: any) => !e.passed);
                  return (
                    <button
                      key={name}
                      onClick={() => setSelectedStudent(name)}
                      className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                        selectedStudent === name ? "bg-primary/10 border border-primary" : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{name}</span>
                        <div className="flex items-center gap-2">
                          {anyFailed && <AlertTriangle className="h-3 w-3 text-destructive" />}
                          <Badge variant="outline">{maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0}%</Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {students.length === 0 && <p className="text-sm text-muted-foreground p-3">Nenhuma avaliação ainda</p>}
              </CardContent>
            </Card>

            {/* Student detail */}
            <div className="lg:col-span-2 space-y-4">
              {selectedStudent ? (
                <>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Desempenho por Competência — {selectedStudent}</CardTitle></CardHeader>
                    <CardContent>
                      {radarData.length > 0 ? (
                        <OsceRadarChart data={radarData} />
                      ) : (
                        <p className="text-sm text-muted-foreground">Sem dados detalhados</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-base">Estações</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Estação</TableHead>
                            <TableHead>Nota</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Observações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedStudentEvals.map((ev: any) => {
                            const station = stations?.find((s: any) => s.id === ev.station_id);
                            return (
                              <TableRow key={ev.id}>
                                <TableCell className="font-medium">{station?.title || "—"}</TableCell>
                                <TableCell>{ev.total_score?.toFixed(1) || 0} / {ev.max_score?.toFixed(1) || 0}</TableCell>
                                <TableCell>
                                  <Badge variant={ev.passed ? "default" : "destructive"}>
                                    {ev.passed ? "Aprovado" : "Reprovado"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{ev.observations || "—"}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">Selecione um aluno para ver os resultados</p>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stations" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Desempenho por Estação</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Estação</TableHead>
                    <TableHead>Média</TableHead>
                    <TableHead>Avaliações</TableHead>
                    <TableHead>Reprovações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stationStats.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell><Badge variant="secondary">{s.position}</Badge></TableCell>
                      <TableCell className="font-medium">{s.title}</TableCell>
                      <TableCell>
                        {s.count > 0 ? `${s.avgScore.toFixed(1)} / ${s.avgMax.toFixed(1)}` : "—"}
                        {s.count > 0 && s.avgMax > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({Math.round((s.avgScore / s.avgMax) * 100)}%)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{s.count}</TableCell>
                      <TableCell>
                        {s.failCount > 0 ? (
                          <Badge variant="destructive">{s.failCount}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
