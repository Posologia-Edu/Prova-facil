import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Brain, Save } from "lucide-react";
import { toast } from "sonner";

interface CompDef {
  id: string;
  name: string;
  area: string;
  description: string | null;
}

export function CompetencyManagement() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");

  const { data: competencies = [], isLoading } = useQuery({
    queryKey: ["competency-definitions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("competency_definitions")
        .select("*")
        .eq("user_id", user.id)
        .order("area, name");
      return (data || []) as CompDef[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      if (!name.trim() || !area.trim()) throw new Error("Nome e área são obrigatórios");

      if (editingId) {
        const { error } = await supabase
          .from("competency_definitions")
          .update({ name, area, description: description || null })
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("competency_definitions")
          .insert({ name, area, description: description || null, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competency-definitions"] });
      toast.success(editingId ? "Competência atualizada" : "Competência criada");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("competency_definitions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competency-definitions"] });
      toast.success("Competência removida");
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setArea("");
    setDescription("");
    setDialogOpen(false);
  };

  const startEdit = (c: CompDef) => {
    setEditingId(c.id);
    setName(c.name);
    setArea(c.area);
    setDescription(c.description || "");
    setDialogOpen(true);
  };

  const areas = [...new Set(competencies.map(c => c.area))].sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Gerencie as competências que serão rastreadas em todos os módulos.
        </p>
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Competência</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Competência" : "Nova Competência"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Raciocínio Clínico" />
              </div>
              <div>
                <Label>Área *</Label>
                <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Ex: Cognitiva, Procedimental, Atitudinal" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição opcional..." rows={3} />
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
                <Save className="h-4 w-4 mr-1" /> {editingId ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {competencies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">Nenhuma competência cadastrada. Clique em "Nova Competência" para começar.</p>
          </CardContent>
        </Card>
      ) : (
        areas.map(area => (
          <Card key={area}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge variant="outline">{area}</Badge>
                <span className="text-muted-foreground font-normal">
                  {competencies.filter(c => c.area === area).length} competência(s)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competencies.filter(c => c.area === area).map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.description || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(c)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(c.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
