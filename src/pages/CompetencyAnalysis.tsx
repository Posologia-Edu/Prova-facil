import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Brain, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface CompDef { id: string; name: string; area: string; }
interface ClassOption { id: string; name: string; }

export default function CompetencyAnalysis() {
  const [loading, setLoading] = useState(true);
  const [competencies, setCompetencies] = useState<CompDef[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [studentScores, setStudentScores] = useState<Record<string, Record<string, { total: number; count: number }>>>({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [compRes, classRes, qcRes, answersRes] = await Promise.all([
      supabase.from("competency_definitions").select("*").eq("user_id", user.id),
      supabase.from("classes").select("id, name").eq("user_id", user.id).is("deleted_at", null),
      supabase.from("question_competencies").select("question_id, competency_id"),
      supabase.rpc("get_all_exam_answers_for_user", { p_user_id: user.id }).catch(() => ({ data: [] })),
    ]);

    setCompetencies((compRes.data || []) as CompDef[]);
    setClasses((classRes.data || []) as ClassOption[]);

    // Map question → competencies
    const qcMap: Record<string, string[]> = {};
    (qcRes.data || []).forEach((r: any) => {
      if (!qcMap[r.question_id]) qcMap[r.question_id] = [];
      qcMap[r.question_id].push(r.competency_id);
    });

    // Build student competency scores from exam answers
    const scores: Record<string, Record<string, { total: number; count: number }>> = {};
    // We'll use exam_sessions + session_answers approach via direct query
    const sessionsRes = await supabase.from("exam_sessions").select("id, student_email, publication_id");
    const sessions = sessionsRes.data || [];
    
    for (const sess of sessions.slice(0, 200)) {
      if (!sess.student_email) continue;
      const saRes = await supabase.from("session_answers").select("question_id, points_earned, max_points").eq("session_id", sess.id);
      const answers = saRes.data || [];
      
      for (const ans of answers) {
        const compIds = qcMap[ans.question_id] || [];
        for (const cid of compIds) {
          if (!scores[sess.student_email]) scores[sess.student_email] = {};
          if (!scores[sess.student_email][cid]) scores[sess.student_email][cid] = { total: 0, count: 0 };
          scores[sess.student_email][cid].total += Number(ans.points_earned) || 0;
          scores[sess.student_email][cid].count += Number(ans.max_points) || 1;
        }
      }
    }

    setStudentScores(scores);
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const students = Object.keys(studentScores);
  
  // Compute class averages per competency
  const classAvg: Record<string, number> = {};
  competencies.forEach(c => {
    let sum = 0, count = 0;
    students.forEach(s => {
      const sc = studentScores[s]?.[c.id];
      if (sc && sc.count > 0) { sum += (sc.total / sc.count) * 100; count++; }
    });
    classAvg[c.id] = count > 0 ? sum / count : 0;
  });

  const radarData = competencies.map(c => ({
    category: c.name,
    turma: Math.round(classAvg[c.id] || 0),
    fullMark: 100,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="h-6 w-6 text-primary" /> Análise de Competências</h1>
          <p className="text-muted-foreground">Dashboard de desempenho cruzando múltiplas avaliações</p>
        </div>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Turma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as turmas</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {competencies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nenhuma competência definida</h3>
            <p className="text-muted-foreground text-sm">Crie competências e vincule-as às suas questões para ver a análise aqui.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Radar Chart */}
          <Card>
            <CardHeader><CardTitle>Visão Geral - Média da Turma</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="category" className="text-xs" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                  <Radar name="Turma" dataKey="turma" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader><CardTitle>Detalhamento por Aluno</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    {competencies.map(c => <TableHead key={c.id} className="text-center">{c.name}</TableHead>)}
                    <TableHead className="text-center">Média</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow><TableCell colSpan={competencies.length + 2} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>
                  ) : (
                    students.slice(0, 50).map(email => {
                      const scores = competencies.map(c => {
                        const sc = studentScores[email]?.[c.id];
                        return sc && sc.count > 0 ? (sc.total / sc.count) * 100 : null;
                      });
                      const validScores = scores.filter(s => s !== null) as number[];
                      const avg = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
                      const compAvgDiff = avg - (Object.values(classAvg).reduce((a, b) => a + b, 0) / Math.max(competencies.length, 1));

                      return (
                        <TableRow key={email}>
                          <TableCell className="font-medium text-sm">{email.replace(/@.*/, "")}</TableCell>
                          {scores.map((s, i) => (
                            <TableCell key={i} className="text-center">
                              {s !== null ? (
                                <Badge variant={s >= 70 ? "default" : s >= 50 ? "secondary" : "destructive"} className="text-xs">
                                  {Math.round(s)}%
                                </Badge>
                              ) : <span className="text-muted-foreground">-</span>}
                            </TableCell>
                          ))}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="font-medium">{Math.round(avg)}%</span>
                              {compAvgDiff > 5 ? <TrendingUp className="h-3 w-3 text-green-600" /> : compAvgDiff < -5 ? <TrendingDown className="h-3 w-3 text-destructive" /> : <Minus className="h-3 w-3 text-muted-foreground" />}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
