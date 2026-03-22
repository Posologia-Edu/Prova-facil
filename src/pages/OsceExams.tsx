import { useState } from "react";
import SystemPromptViewer from "@/components/SystemPromptViewer";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Stethoscope, Clock, RotateCcw, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  in_progress: { label: "Em andamento", variant: "default" },
  completed: { label: "Concluído", variant: "outline" },
};

export default function OsceExams() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDuration, setNewDuration] = useState(5);
  const [newTransition, setNewTransition] = useState(60);

  const { data: exams, isLoading } = useQuery({
    queryKey: ["osce-exams"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("osce_exams")
        .select("*")
        .is("deleted_at", null)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("osce_exams")
        .insert({
          user_id: session.user.id,
          title: newTitle || "Exame OSCE",
          description: newDesc,
          station_duration_minutes: newDuration,
          transition_seconds: newTransition,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["osce-exams"] });
      setShowCreate(false);
      setNewTitle("");
      setNewDesc("");
      toast.success("Exame OSCE criado!");
      navigate(`/osce/${data.id}/edit`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("osce_exams")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["osce-exams"] });
      toast.success("Exame movido para a lixeira");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Stethoscope className="h-6 w-6" />
            Avaliações OSCE
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Crie e gerencie exames de Avaliação Clínica Objetiva Estruturada
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SystemPromptViewer toolKey="osce" />
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Exame OSCE
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-5 bg-muted rounded w-3/4" /></CardHeader>
              <CardContent><div className="h-4 bg-muted rounded w-1/2" /></CardContent>
            </Card>
          ))}
        </div>
      ) : exams && exams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam: any) => {
            const st = STATUS_MAP[exam.status] || STATUS_MAP.draft;
            return (
              <Card key={exam.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{exam.title}</CardTitle>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                  {exam.description && (
                    <CardDescription className="line-clamp-2">{exam.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{exam.station_duration_minutes} min/estação</span>
                    <span className="flex items-center gap-1"><RotateCcw className="h-3 w-3" />{exam.transition_seconds}s transição</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => navigate(`/osce/${exam.id}/edit`)}>
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(exam.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum exame OSCE</h3>
          <p className="text-muted-foreground mb-4">Crie seu primeiro exame OSCE para começar</p>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Criar Exame OSCE
          </Button>
        </Card>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Exame OSCE</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Título</Label><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: OSCE Farmácia Clínica 2026.1" /></div>
            <div><Label>Descrição</Label><Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descrição do exame..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Duração por estação (min)</Label><Input type="number" value={newDuration} onChange={(e) => setNewDuration(Number(e.target.value))} min={1} /></div>
              <div><Label>Transição (segundos)</Label><Input type="number" value={newTransition} onChange={(e) => setNewTransition(Number(e.target.value))} min={0} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Exame"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
