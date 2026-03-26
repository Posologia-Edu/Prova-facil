import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Trophy, Bot, TrendingUp, FileDown, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";

interface PortfolioEntry {
  id: string; entry_type: string; title: string; score: number | null; max_score: number | null;
  metadata_json: Record<string, any>; entry_date: string;
}

export default function StudentPortfolio() {
  const navigate = useNavigate();
  const { studentEmail: paramEmail } = useParams();
  const sessionEmail = sessionStorage.getItem("student_email");
  const email = paramEmail || sessionEmail;
  const isTeacherView = !!paramEmail;

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<PortfolioEntry[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);

  useEffect(() => {
    if (!email) { navigate("/student/auth"); return; }
    loadPortfolio();
  }, [email]);

  const loadPortfolio = async () => {
    // Get or create portfolio
    let { data: portfolio } = await supabase.from("student_portfolios").select("id").eq("student_email", email!).maybeSingle();
    if (!portfolio) {
      const { data: newP } = await supabase.from("student_portfolios").insert({ student_email: email!, student_name: email }).select("id").single();
      portfolio = newP;
    }

    if (portfolio) {
      const { data: ents } = await supabase.from("portfolio_entries").select("*").eq("portfolio_id", portfolio.id).order("entry_date", { ascending: false });
      setEntries((ents || []) as PortfolioEntry[]);
    }

    const [fbRes, achRes] = await Promise.all([
      supabase.from("student_ai_feedbacks").select("*").eq("student_email", email!).order("created_at", { ascending: false }).limit(5),
      supabase.from("student_achievements").select("*, achievement_definitions(*)").eq("student_email", email!),
    ]);
    setFeedbacks(fbRes.data || []);
    setAchievements(achRes.data || []);
    setLoading(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Portfólio Digital do Aluno", 20, 20);
    doc.setFontSize(12);
    doc.text(`Aluno: ${email}`, 20, 32);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 20, 40);

    let y = 55;
    doc.setFontSize(14);
    doc.text("Histórico de Avaliações", 20, y); y += 10;
    doc.setFontSize(10);
    entries.forEach(e => {
      if (y > 270) { doc.addPage(); y = 20; }
      const pct = e.max_score && e.max_score > 0 ? ((e.score || 0) / e.max_score * 100).toFixed(0) : "-";
      doc.text(`${new Date(e.entry_date).toLocaleDateString("pt-BR")} — ${e.title} — ${pct}%`, 20, y);
      y += 7;
    });

    doc.save(`portfolio_${email}.pdf`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // Evolution chart data
  const chartData = [...entries].reverse().map((e, i) => ({
    name: new Date(e.entry_date).toLocaleDateString("pt-BR", { month: "short", day: "2-digit" }),
    nota: e.max_score && e.max_score > 0 ? Math.round((e.score || 0) / e.max_score * 100) : 0,
  }));

  const typeMap: Record<string, string> = { exam: "Prova", osce: "OSCE", simulation: "Simulação", kfe: "KFE", sct: "SCT" };

  return (
    <div className={isTeacherView ? "space-y-6" : "min-h-screen bg-background"}>
      {!isTeacherView && (
        <header className="border-b bg-card px-6 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/student/auth")} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Meu Portfólio</h1>
            <Button size="sm" onClick={exportPDF}><FileDown className="h-4 w-4 mr-2" /> Exportar PDF</Button>
          </div>
        </header>
      )}

      <div className={isTeacherView ? "" : "max-w-4xl mx-auto p-6 space-y-6"}>
        {isTeacherView && (
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Portfólio: {email}</h2>
            <Button size="sm" onClick={exportPDF}><FileDown className="h-4 w-4 mr-2" /> Exportar PDF</Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-3xl font-bold">{entries.length}</p>
              <p className="text-sm text-muted-foreground">Avaliações</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-3xl font-bold">{achievements.length}</p>
              <p className="text-sm text-muted-foreground">Conquistas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-3xl font-bold">
                {entries.length > 0 ? Math.round(entries.reduce((s, e) => s + (e.max_score && e.max_score > 0 ? ((e.score || 0) / e.max_score * 100) : 0), 0) / entries.length) : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Média Geral</p>
            </CardContent>
          </Card>
        </div>

        {/* Evolution chart */}
        {chartData.length > 1 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Evolução</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="nota" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card>
          <CardHeader><CardTitle>Histórico de Avaliações</CardTitle></CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma avaliação registrada no portfólio.</p>
            ) : (
              <div className="space-y-3">
                {entries.map(e => {
                  const pct = e.max_score && e.max_score > 0 ? Math.round((e.score || 0) / e.max_score * 100) : null;
                  return (
                    <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <div>
                          <p className="font-medium text-sm">{e.title}</p>
                          <p className="text-xs text-muted-foreground">{new Date(e.entry_date).toLocaleDateString("pt-BR")} · {typeMap[e.entry_type] || e.entry_type}</p>
                        </div>
                      </div>
                      {pct !== null && <Badge variant={pct >= 70 ? "default" : pct >= 50 ? "secondary" : "destructive"}>{pct}%</Badge>}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Feedbacks */}
        {feedbacks.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> Feedbacks da IA</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {feedbacks.map((fb: any) => (
                <div key={fb.id} className="p-3 rounded-lg bg-primary/5 border text-sm">
                  <p className="text-xs text-muted-foreground mb-1">{new Date(fb.created_at).toLocaleDateString("pt-BR")}</p>
                  <p>{(fb.content_json as any)?.summary || JSON.stringify(fb.content_json)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Achievements */}
        {achievements.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> Conquistas</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {achievements.map((a: any) => (
                  <Badge key={a.id} variant="outline" className="py-1">
                    <Trophy className="h-3 w-3 mr-1" /> {a.achievement_definitions?.title || "Conquista"}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
