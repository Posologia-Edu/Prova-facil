import { useState, useEffect } from "react";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Library,
  FileEdit,
  GraduationCap,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TrashItem {
  id: string;
  name: string;
  type: "question" | "exam" | "class";
  deletedAt: string;
  details?: string;
}

const typeIcons = {
  question: Library,
  exam: FileEdit,
  class: GraduationCap,
};

const typeLabels = {
  question: "Questão",
  exam: "Prova",
  class: "Turma",
};

export default function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);
  const [emptyTrashOpen, setEmptyTrashOpen] = useState(false);

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [questionsRes, examsRes, classesRes] = await Promise.all([
        supabase
          .from("question_bank")
          .select("id, content_json, type, tags, deleted_at")
          .eq("user_id", user.id)
          .not("deleted_at", "is", null),
        supabase
          .from("exams")
          .select("id, title, description, deleted_at")
          .eq("user_id", user.id)
          .not("deleted_at", "is", null),
        supabase
          .from("classes")
          .select("id, name, student_count, deleted_at")
          .eq("user_id", user.id)
          .not("deleted_at", "is", null),
      ]);

      const trashItems: TrashItem[] = [];

      (questionsRes.data || []).forEach((q: any) => {
        const content = q.content_json || {};
        const statement = content.statement || content.enunciado || content.text || "Questão sem título";
        const truncated = statement.length > 80 ? statement.substring(0, 80) + "..." : statement;
        const typeName = q.type === "multiple_choice" ? "Múltipla Escolha" : q.type === "true_false" ? "V/F" : q.type === "essay" ? "Dissertativa" : q.type;
        const tagsStr = (q.tags || []).length > 0 ? ` · ${(q.tags as string[]).slice(0, 2).join(", ")}` : "";
        trashItems.push({
          id: q.id,
          name: truncated,
          type: "question",
          deletedAt: q.deleted_at!,
          details: `${typeName}${tagsStr}`,
        });
      });

      (examsRes.data || []).forEach((e: any) => {
        trashItems.push({
          id: e.id,
          name: e.title || "Prova sem título",
          type: "exam",
          deletedAt: e.deleted_at!,
          details: e.description || undefined,
        });
      });

      (classesRes.data || []).forEach((c: any) => {
        trashItems.push({
          id: c.id,
          name: c.name || "Turma sem nome",
          type: "class",
          deletedAt: c.deleted_at!,
          details: c.student_count ? `${c.student_count} alunos` : undefined,
        });
      });

      trashItems.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
      setItems(trashItems);
    } catch (err) {
      console.error("Error fetching trash:", err);
      toast.error("Erro ao carregar a lixeira.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const table = item.type === "question" ? "question_bank" : item.type === "exam" ? "exams" : "classes";
    const { error } = await supabase.from(table).update({ deleted_at: null } as any).eq("id", id);
    if (error) {
      toast.error("Erro ao restaurar item.");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Item restaurado com sucesso!");
  };

  const handlePermanentDelete = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const table = item.type === "question" ? "question_bank" : item.type === "exam" ? "exams" : "classes";
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir item permanentemente.");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    setPermanentDeleteId(null);
    toast.success("Item excluído permanentemente.");
  };

  const handleEmptyTrash = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await Promise.all([
        supabase.from("question_bank").delete().eq("user_id", user.id).not("deleted_at", "is", null),
        supabase.from("exams").delete().eq("user_id", user.id).not("deleted_at", "is", null),
        supabase.from("classes").delete().eq("user_id", user.id).not("deleted_at", "is", null),
      ]);
      setItems([]);
      setEmptyTrashOpen(false);
      toast.success("Lixeira esvaziada.");
    } catch {
      toast.error("Erro ao esvaziar lixeira.");
    }
  };

  const filterByType = (type: string) =>
    type === "all" ? items : items.filter((i) => i.type === type);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return date.toLocaleDateString("pt-BR");
  };

  const renderItems = (filteredItems: TrashItem[]) => {
    if (loading) {
      return (
        <div className="text-center py-16">
          <Loader2 className="h-8 w-8 mx-auto text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground mt-3">Carregando...</p>
        </div>
      );
    }

    if (filteredItems.length === 0) {
      return (
        <div className="text-center py-16">
          <Trash2 className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground mt-3">A lixeira está vazia</p>
          <p className="text-xs text-muted-foreground mt-1">
            Itens excluídos aparecerão aqui por 30 dias
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filteredItems.map((item) => {
          const Icon = typeIcons[item.type];
          return (
            <Card key={item.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px]">
                      {typeLabels[item.type]}
                    </Badge>
                    {item.details && (
                      <span className="text-[11px] text-muted-foreground">{item.details}</span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      · Excluído {formatDate(item.deletedAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestore(item.id)}
                    className="text-primary hover:text-primary"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Restaurar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPermanentDeleteId(item.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Trash2 className="h-6 w-6" />
            Lixeira
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {items.length} {items.length === 1 ? "item" : "itens"} na lixeira · Itens são excluídos permanentemente após 30 dias
          </p>
        </div>
        {items.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setEmptyTrashOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Esvaziar Lixeira
          </Button>
        )}
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            Todos ({items.length})
          </TabsTrigger>
          <TabsTrigger value="question">
            Questões ({items.filter((i) => i.type === "question").length})
          </TabsTrigger>
          <TabsTrigger value="exam">
            Provas ({items.filter((i) => i.type === "exam").length})
          </TabsTrigger>
          <TabsTrigger value="class">
            Turmas ({items.filter((i) => i.type === "class").length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">{renderItems(filterByType("all"))}</TabsContent>
        <TabsContent value="question" className="mt-4">{renderItems(filterByType("question"))}</TabsContent>
        <TabsContent value="exam" className="mt-4">{renderItems(filterByType("exam"))}</TabsContent>
        <TabsContent value="class" className="mt-4">{renderItems(filterByType("class"))}</TabsContent>
      </Tabs>

      <AlertDialog open={!!permanentDeleteId} onOpenChange={(open) => !open && setPermanentDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O item será removido permanentemente e não poderá ser recuperado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => permanentDeleteId && handlePermanentDelete(permanentDeleteId)}
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={emptyTrashOpen} onOpenChange={setEmptyTrashOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Esvaziar lixeira?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Todos os {items.length} itens serão excluídos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleEmptyTrash}
            >
              Esvaziar Lixeira
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
