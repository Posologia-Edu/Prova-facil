import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  CheckCircle2, Lightbulb, Plus, Trash2, Rocket, Calendar, ArrowUpCircle, Clock, Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type SystemUpdate = {
  id: string;
  type: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  completed_at: string | null;
  created_at: string;
};

export default function UpdatePipeline() {
  const { isAdmin } = useAdmin();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<"completed" | "planned">("planned");
  const [newPriority, setNewPriority] = useState("medium");
  const [newCategory, setNewCategory] = useState("feature");

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ["system-updates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_updates" as any)
        .select("*")
        .order("completed_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data || []) as unknown as SystemUpdate[];
    },
  });

  const completed = updates.filter((u) => u.type === "completed").sort((a, b) => 
    new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime()
  );
  const planned = updates.filter((u) => u.type === "planned").sort((a, b) => {
    const pOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1);
  });

  const priorityBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    high: { label: "Alta", variant: "destructive" },
    medium: { label: "Média", variant: "secondary" },
    low: { label: "Baixa", variant: "outline" },
  };

  const addUpdate = async () => {
    if (!newTitle.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("system_updates" as any).insert({
      type: newType,
      title: newTitle.trim(),
      description: newDescription.trim(),
      category: newCategory,
      priority: newPriority,
      completed_at: newType === "completed" ? new Date().toISOString() : null,
      created_by: user?.id || null,
    });
    setNewTitle("");
    setNewDescription("");
    setNewType("planned");
    setNewPriority("medium");
    setAddDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["system-updates"] });
    toast({ title: "Atualização registrada!" });
  };

  const markAsCompleted = async (id: string) => {
    await supabase.from("system_updates" as any).update({
      type: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["system-updates"] });
    toast({ title: "Marcado como concluído!" });
  };

  const deleteUpdate = async (id: string) => {
    if (!window.confirm("Excluir esta atualização?")) return;
    await supabase.from("system_updates" as any).delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["system-updates"] });
    toast({ title: "Excluído" });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  if (isLoading) return <p className="p-6 text-muted-foreground">Carregando...</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            Pipeline de Atualizações
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Histórico de funcionalidades e planejamento futuro do sistema.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Entrada
          </Button>
        )}
      </div>

      <Tabs defaultValue="changelog">
        <TabsList>
          <TabsTrigger value="changelog" className="gap-1">
            <CheckCircle2 className="h-4 w-4" />
            Changelog ({completed.length})
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="gap-1">
            <Lightbulb className="h-4 w-4" />
            Roadmap ({planned.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="changelog" className="space-y-3 mt-4">
          {completed.map((u) => (
            <Card key={u.id} className="border-l-4 border-l-green-500/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <CardTitle className="text-base">{u.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(u.completed_at || u.created_at)}
                    </span>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteUpdate(u.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              {u.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">{u.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
          {completed.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atualização registrada.</p>
          )}
        </TabsContent>

        <TabsContent value="roadmap" className="space-y-3 mt-4">
          {planned.map((u) => (
            <Card key={u.id} className="border-l-4 border-l-blue-500/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    <CardTitle className="text-base">{u.title}</CardTitle>
                    <Badge variant={priorityBadge[u.priority]?.variant || "secondary"}>
                      {priorityBadge[u.priority]?.label || u.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => markAsCompleted(u.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Concluir
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteUpdate(u.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              {u.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">{u.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
          {planned.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma ideia planejada ainda.</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Add dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Entrada no Pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">✅ Concluída</SelectItem>
                  <SelectItem value="planned">💡 Planejada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Nome da funcionalidade" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Descreva a funcionalidade..." rows={3} />
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={newPriority} onValueChange={setNewPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 Alta</SelectItem>
                  <SelectItem value="medium">🟡 Média</SelectItem>
                  <SelectItem value="low">🟢 Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addUpdate} disabled={!newTitle.trim()} className="w-full">
              Registrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
