import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Star, Flame, Medal, Target, Zap, Crown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ICON_MAP: Record<string, React.ElementType> = {
  trophy: Trophy, star: Star, flame: Flame, medal: Medal, target: Target, zap: Zap, crown: Crown,
};

interface PointRow { id: string; points: number; source: string; created_at: string; }
interface AchievementRow { id: string; unlocked_at: string; achievement_definitions: { key: string; title: string; description: string; icon: string; category: string; points_reward: number; } | null; }
interface RankingEntry { student_email: string; total_points: number; }

export default function StudentGamification() {
  const navigate = useNavigate();
  const studentEmail = sessionStorage.getItem("student_email");
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<PointRow[]>([]);
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    if (!studentEmail) { navigate("/student/auth"); return; }
    loadData();
  }, [studentEmail]);

  const loadData = async () => {
    const [pointsRes, achievementsRes, rankingsRes] = await Promise.all([
      supabase.from("student_points").select("*").eq("student_email", studentEmail!).order("created_at", { ascending: false }),
      supabase.from("student_achievements").select("*, achievement_definitions(*)").eq("student_email", studentEmail!),
      supabase.from("student_points").select("student_email, points"),
    ]);

    const pts = (pointsRes.data || []) as PointRow[];
    setPoints(pts);
    setTotalPoints(pts.reduce((s, p) => s + p.points, 0));
    setAchievements((achievementsRes.data || []) as unknown as AchievementRow[]);

    // Build rankings
    const rankMap: Record<string, number> = {};
    (rankingsRes.data || []).forEach((r: any) => {
      rankMap[r.student_email] = (rankMap[r.student_email] || 0) + r.points;
    });
    const sorted = Object.entries(rankMap).map(([email, total]) => ({ student_email: email, total_points: total })).sort((a, b) => b.total_points - a.total_points);
    setRankings(sorted.slice(0, 10));
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const myRank = rankings.findIndex(r => r.student_email === studentEmail) + 1;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/student/auth")} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <h1 className="text-xl font-bold flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Gamificação</h1>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-6 text-center">
              <Star className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
              <p className="text-3xl font-bold">{totalPoints}</p>
              <p className="text-sm text-muted-foreground">Pontos Totais</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6 text-center">
              <Medal className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-3xl font-bold">{achievements.length}</p>
              <p className="text-sm text-muted-foreground">Conquistas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6 text-center">
              <Crown className="h-8 w-8 mx-auto text-amber-500 mb-2" />
              <p className="text-3xl font-bold">{myRank > 0 ? `#${myRank}` : "-"}</p>
              <p className="text-sm text-muted-foreground">Ranking</p>
            </CardContent>
          </Card>
        </div>

        {/* Achievements */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> Conquistas</CardTitle></CardHeader>
          <CardContent>
            {achievements.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma conquista desbloqueada ainda. Continue realizando avaliações!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {achievements.map(a => {
                  const def = a.achievement_definitions;
                  if (!def) return null;
                  const Icon = ICON_MAP[def.icon] || Trophy;
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{def.title}</p>
                        <p className="text-xs text-muted-foreground">{def.description}</p>
                      </div>
                      <Badge variant="secondary">+{def.points_reward}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5" /> Top 10 Ranking</CardTitle></CardHeader>
          <CardContent>
            {rankings.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum dado de ranking disponível.</p>
            ) : (
              <div className="space-y-2">
                {rankings.map((r, i) => (
                  <div key={r.student_email} className={`flex items-center justify-between p-3 rounded-lg ${r.student_email === studentEmail ? "bg-primary/10 border border-primary/30" : "bg-muted/30"}`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold w-8 ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>#{i + 1}</span>
                      <span className="text-sm">{r.student_email === studentEmail ? "Você" : r.student_email.replace(/@.*/, "")}</span>
                    </div>
                    <Badge variant="outline">{r.total_points} pts</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent points */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" /> Pontos Recentes</CardTitle></CardHeader>
          <CardContent>
            {points.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum ponto registrado.</p>
            ) : (
              <div className="space-y-2">
                {points.slice(0, 20).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <span className="text-muted-foreground">{p.source}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">+{p.points}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
