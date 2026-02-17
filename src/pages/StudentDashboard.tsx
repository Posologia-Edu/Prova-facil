import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, LogOut, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

interface Publication {
  id: string;
  exam_id: string;
  time_limit_minutes: number;
  start_at: string | null;
  end_at: string | null;
  access_code: string;
  is_active: boolean;
  exams: { title: string } | null;
}

interface Session {
  id: string;
  publication_id: string;
  status: string;
  total_score: number | null;
  max_score: number | null;
  started_at: string;
  finished_at: string | null;
}

export default function StudentDashboard() {
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/student/auth"); return; }

      setUserName(session.user.user_metadata?.full_name || session.user.email || "Aluno");

      const { data } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("student_id", session.user.id)
        .order("created_at", { ascending: false });

      setSessions(data || []);
      setLoadingSessions(false);
    };
    loadData();
  }, [navigate]);

  const handleJoinExam = async () => {
    if (!accessCode.trim()) return;
    setLoading(true);

    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession) { navigate("/student/auth"); return; }

    // Find publication by access code
    const { data: pub, error: pubError } = await supabase
      .from("exam_publications")
      .select("*")
      .eq("access_code", accessCode.trim().toLowerCase())
      .eq("is_active", true)
      .maybeSingle();

    if (pubError || !pub) {
      toast.error("Código de acesso inválido ou prova não disponível.");
      setLoading(false);
      return;
    }

    // Check time window
    const now = new Date();
    if (pub.start_at && new Date(pub.start_at) > now) {
      toast.error("Esta prova ainda não está disponível.");
      setLoading(false);
      return;
    }
    if (pub.end_at && new Date(pub.end_at) < now) {
      toast.error("O prazo para esta prova já expirou.");
      setLoading(false);
      return;
    }

    // Check if already has a session
    const { data: existingSession } = await supabase
      .from("exam_sessions")
      .select("id, status")
      .eq("publication_id", pub.id)
      .eq("student_id", authSession.user.id)
      .maybeSingle();

    if (existingSession) {
      if (existingSession.status === "submitted" || existingSession.status === "graded") {
        toast.info("Você já finalizou esta prova.");
        navigate(`/student/results/${existingSession.id}`);
      } else {
        navigate(`/student/exam/${existingSession.id}`);
      }
      setLoading(false);
      return;
    }

    // Create new session
    const { data: newSession, error: sessionError } = await supabase
      .from("exam_sessions")
      .insert({
        publication_id: pub.id,
        student_id: authSession.user.id,
        status: "in_progress",
      })
      .select("id")
      .single();

    if (sessionError || !newSession) {
      toast.error("Erro ao iniciar a prova.");
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate(`/student/exam/${newSession.id}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/student/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Portal do Aluno</h1>
          <p className="text-sm text-muted-foreground">Bem-vindo, {userName}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-8">
        {/* Join Exam */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acessar Prova</CardTitle>
            <CardDescription>Digite o código de acesso fornecido pelo professor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="Ex: abc123"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoinExam()}
                className="max-w-xs font-mono uppercase"
              />
              <Button onClick={handleJoinExam} disabled={loading || !accessCode.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Entrar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Previous sessions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Minhas Provas</h2>
          {loadingSessions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Nenhuma prova realizada ainda.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    if (s.status === "in_progress") navigate(`/student/exam/${s.id}`);
                    else navigate(`/student/results/${s.id}`);
                  }}
                >
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">Prova iniciada em {new Date(s.started_at).toLocaleDateString("pt-BR")}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(s.started_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {s.total_score != null && s.max_score != null && (
                        <span className="text-sm font-semibold">{Number(s.total_score).toFixed(1)}/{Number(s.max_score).toFixed(1)}</span>
                      )}
                      <Badge variant={s.status === "in_progress" ? "default" : s.status === "graded" ? "secondary" : "outline"}>
                        {s.status === "in_progress" ? "Em andamento" : s.status === "submitted" ? "Enviada" : "Corrigida"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
