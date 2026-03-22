import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, Trash2, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ProgressTests() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const { data: tests, refetch } = useQuery({
    queryKey: ["progress-tests"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data, error } = await supabase
        .from("progress_tests" as any)
        .select("*")
        .eq("user_id", session.user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase
        .from("progress_tests" as any)
        .insert({ user_id: session.user.id } as any)
        .select()
        .single();
      if (error) throw error;
      navigate(`/progress-test/${(data as any).id}/edit`);
    } catch {
      toast({ title: "Erro ao criar teste", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("progress_tests" as any).update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
    refetch();
    toast({ title: "Teste movido para a lixeira" });
  };

  const statusColor = (s: string) => s === "published" ? "default" : "secondary";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Progress Test</h1>
          <p className="text-muted-foreground">Avaliação longitudinal do progresso dos alunos</p>
        </div>
        <Button onClick={handleCreate} disabled={creating}>
          <Plus className="h-4 w-4 mr-2" /> Novo Progress Test
        </Button>
      </div>

      {(!tests || tests.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum Progress Test</h3>
            <p className="text-muted-foreground text-center mb-4">Crie um teste para acompanhar a evolução dos alunos ao longo dos anos.</p>
            <Button onClick={handleCreate} disabled={creating}>
              <Plus className="h-4 w-4 mr-2" /> Criar Primeiro Teste
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tests.map((test: any) => (
            <Card key={test.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/progress-test/${test.id}/edit`)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-1">{test.title}</CardTitle>
                  <Badge variant={statusColor(test.status)}>{test.status === "published" ? "Publicado" : "Rascunho"}</Badge>
                </div>
                {test.description && <CardDescription className="line-clamp-2">{test.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {test.application_date ? format(new Date(test.application_date), "dd/MM/yyyy", { locale: ptBR }) : "Sem data"}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleDelete(test.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
