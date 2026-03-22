import { useState, useEffect } from "react";
import SystemPromptViewer from "@/components/SystemPromptViewer";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Scale } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SjtExams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExams = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from("sjt_exams").select("*").eq("user_id", session.user.id).is("deleted_at", null).order("created_at", { ascending: false });

    const enriched = await Promise.all((data || []).map(async (exam: any) => {
      const { count } = await supabase.from("sjt_scenarios").select("*", { count: "exact", head: true }).eq("sjt_exam_id", exam.id);
      return { ...exam, _scenarioCount: count || 0 };
    }));

    setExams(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchExams(); }, []);

  const handleCreate = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data, error } = await supabase.from("sjt_exams").insert({ user_id: session.user.id }).select().single();
    if (error) { toast.error("Erro ao criar"); return; }
    navigate(`/sjt/${data.id}/edit`);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("sjt_exams").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    toast.success("Movido para lixeira");
    fetchExams();
  };

  const statusLabel: Record<string, string> = { draft: "Rascunho", active: "Ativo", finished: "Finalizado" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SJT — Situational Judgment Test</h1>
          <p className="text-muted-foreground text-sm mt-1">Avalie ética, profissionalismo e tomada de decisão</p>
        </div>
        <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-2" /> Novo SJT</Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm">Carregando...</div>
      ) : exams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Scale className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhum exame SJT criado ainda</p>
            <Button onClick={handleCreate} variant="outline" className="mt-4"><Plus className="h-4 w-4 mr-2" /> Criar primeiro SJT</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/sjt/${exam.id}/edit`)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base line-clamp-2">{exam.title}</CardTitle>
                  <Badge variant={exam.status === "active" ? "default" : "secondary"}>{statusLabel[exam.status] || exam.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {exam.description && <p className="text-sm text-muted-foreground line-clamp-2">{exam.description}</p>}
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Scale className="h-3 w-3" /> {exam._scenarioCount} cenários
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{format(new Date(exam.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); navigate(`/sjt/${exam.id}/edit`); }}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(exam.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
