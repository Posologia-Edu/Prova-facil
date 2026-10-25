import { useState } from "react";
import SystemPromptViewer from "@/components/SystemPromptViewer";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Stethoscope, Clock, RotateCcw, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; tone: StatusTone }> = {
  draft: { label: "Rascunho", tone: "warn" },
  in_progress: { label: "Em andamento", tone: "info" },
  completed: { label: "Concluído", tone: "ok" },
};

export default function OsceExams() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Avaliar"
        title="Avaliações OSCE"
        description="Crie e gerencie exames de Avaliação Clínica Objetiva Estruturada."
        actions={
          <>
            <SystemPromptViewer toolKey="osce" />
            <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" />Novo exame OSCE</Button>
          </>
        }
      />

      {isLoading ? (
        <Card className="animate-pulse p-8"><div className="h-5 bg-muted rounded w-1/3" /></Card>
      ) : exams && exams.length > 0 ? (
        <Card className="divide-y overflow-hidden">
          {exams.map((exam: any) => {
            const st = STATUS_MAP[exam.status] || STATUS_MAP.draft;
            return (
              <div key={exam.id} className="flex flex-wrap items-center gap-4 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-text"><Stethoscope className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1 basis-64">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="font-medium text-left hover:underline" onClick={() => navigate(`/osce/${exam.id}/edit`)}>{exam.title}</button>
                    <StatusBadge tone={st.tone} dot={st.tone !== "ok"}>{st.label}</StatusBadge>
                  </div>
                  {exam.description && <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{exam.description}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{exam.station_duration_minutes} min por estação</span>
                    <span className="flex items-center gap-1"><RotateCcw className="h-3 w-3" />{exam.transition_seconds}s de transição</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => navigate(`/osce/${exam.id}/edit`)}><Pencil className="h-3.5 w-3.5" />Editar</Button>
                  <Button size="sm" variant="ghost" aria-label="Excluir exame" className="text-destructive" onClick={() => setDeleteId(exam.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      ) : (
        <Card className="flex flex-col items-center justify-center py-14 text-center">
          <Stethoscope className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <h3 className="font-heading text-lg font-medium">Nenhum exame OSCE</h3>
          <p className="mt-1 text-sm text-muted-foreground">Crie seu primeiro exame OSCE para começar.</p>
          <Button onClick={() => setShowCreate(true)} className="mt-4"><Plus className="h-4 w-4" />Criar exame OSCE</Button>
        </Card>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover este exame para a lixeira?</AlertDialogTitle>
            <AlertDialogDescription>O exame sai da lista e pode ser restaurado pela Lixeira.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }}>Mover para a lixeira</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-medium">Novo exame OSCE</DialogTitle>
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
