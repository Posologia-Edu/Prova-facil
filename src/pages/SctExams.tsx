import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Users, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SctExam {
  id: string;
  title: string;
  description: string;
  status: string;
  expert_panel_size: number;
  created_at: string;
  deleted_at: string | null;
  _scenarioCount?: number;
  _expertCount?: number;
}

export default function SctExams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<SctExam[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExams = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("sct_exams")
      .select("*")
      .eq("user_id", session.user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar exames SCT");
      return;
    }

    // Fetch scenario and expert counts
    const enriched = await Promise.all((data || []).map(async (exam: any) => {
      const { count: scenarioCount } = await supabase
        .from("sct_scenarios")
        .select("*", { count: "exact", head: true })
        .eq("sct_exam_id", exam.id);

      const { data: scenarios } = await supabase
        .from("sct_scenarios")
        .select("id")
        .eq("sct_exam_id", exam.id);

      let expertCount = 0;
      if (scenarios && scenarios.length > 0) {
        const { data: experts } = await supabase
          .from("sct_expert_responses")
          .select("expert_email")
          .in("scenario_id", scenarios.map((s: any) => s.id));
        const uniqueExperts = new Set((experts || []).map((e: any) => e.expert_email));
        expertCount = uniqueExperts.size;
      }

      return { ...exam, _scenarioCount: scenarioCount || 0, _expertCount: expertCount };
    }));

    setExams(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchExams(); }, []);

  const handleCreate = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("sct_exams")
      .insert({ user_id: session.user.id })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar exame SCT");
      return;
    }

    navigate(`/sct/${data.id}/edit`);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("sct_exams")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    toast.success("Exame movido para lixeira");
    fetchExams();
  };

  const statusLabel: Record<string, string> = {
    draft: "Rascunho",
    collecting: "Coletando Especialistas",
    active: "Ativo",
    finished: "Finalizado",
  };

  const statusVariant = (s: string) => {
    if (s === "active") return "default" as const;
    if (s === "finished") return "secondary" as const;
    if (s === "collecting") return "outline" as const;
    return "secondary" as const;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SCT — Script Concordance Test</h1>
          <p className="text-muted-foreground text-sm mt-1">Avalie o raciocínio clínico sob incerteza</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" /> Novo SCT
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm">Carregando...</div>
      ) : exams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhum exame SCT criado ainda</p>
            <Button onClick={handleCreate} variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-2" /> Criar primeiro SCT
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/sct/${exam.id}/edit`)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base line-clamp-2">{exam.title}</CardTitle>
                  <Badge variant={statusVariant(exam.status)}>{statusLabel[exam.status] || exam.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {exam.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{exam.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ClipboardList className="h-3 w-3" /> {exam._scenarioCount} cenários
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {exam._expertCount}/{exam.expert_panel_size} especialistas
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(exam.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); navigate(`/sct/${exam.id}/edit`); }}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(exam.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
