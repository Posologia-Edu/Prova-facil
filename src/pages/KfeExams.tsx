import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Target } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function KfeExams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExams = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("kfe_exams")
      .select("*")
      .eq("user_id", session.user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) { toast.error("Erro ao carregar exames KFE"); return; }

    const enriched = await Promise.all((data || []).map(async (exam: any) => {
      const { count } = await supabase.from("kfe_cases").select("*", { count: "exact", head: true }).eq("kfe_exam_id", exam.id);
      return { ...exam, _caseCount: count || 0 };
    }));

    setExams(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchExams(); }, []);

  const handleCreate = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data, error } = await supabase.from("kfe_exams").insert({ user_id: session.user.id }).select().single();
    if (error) { toast.error("Erro ao criar"); return; }
    navigate(`/kfe/${data.id}/edit`);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("kfe_exams").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    toast.success("Movido para lixeira");
    fetchExams();
  };

  const statusLabel: Record<string, string> = { draft: "Rascunho", active: "Ativo", finished: "Finalizado" };
  const statusVariant = (s: string) => s === "active" ? "default" as const : "secondary" as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">KFE — Key Feature Exam</h1>
          <p className="text-muted-foreground text-sm mt-1">Avalie decisões críticas em casos clínicos</p>
        </div>
        <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-2" /> Novo KFE</Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm">Carregando...</div>
      ) : exams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhum exame KFE criado ainda</p>
            <Button onClick={handleCreate} variant="outline" className="mt-4"><Plus className="h-4 w-4 mr-2" /> Criar primeiro KFE</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/kfe/${exam.id}/edit`)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base line-clamp-2">{exam.title}</CardTitle>
                  <Badge variant={statusVariant(exam.status)}>{statusLabel[exam.status] || exam.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {exam.description && <p className="text-sm text-muted-foreground line-clamp-2">{exam.description}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {exam._caseCount} casos</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{format(new Date(exam.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); navigate(`/kfe/${exam.id}/edit`); }}><Edit className="h-3.5 w-3.5" /></Button>
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
