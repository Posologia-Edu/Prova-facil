import { useState } from "react";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Library,
  FileEdit,
  GraduationCap,
  X,
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

interface TrashItem {
  id: string;
  name: string;
  type: "question" | "exam" | "class";
  deletedAt: string;
  details?: string;
}

// Mock data – will be replaced with real DB queries later
const mockTrashItems: TrashItem[] = [
  { id: "t1", name: "What is the primary mechanism of action of ACE inhibitors?", type: "question", deletedAt: "2026-02-20", details: "Múltipla Escolha · Farmacologia" },
  { id: "t2", name: "Farmacologia 101 - Prova Parcial", type: "exam", deletedAt: "2026-02-19", details: "5 questões · 12 pontos" },
  { id: "t3", name: "Bioquímica II", type: "class", deletedAt: "2026-02-18", details: "38 alunos · 2 provas" },
];

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
  const [items, setItems] = useState<TrashItem[]>(mockTrashItems);
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);
  const [emptyTrashOpen, setEmptyTrashOpen] = useState(false);

  const handleRestore = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Item restaurado com sucesso!");
  };

  const handlePermanentDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setPermanentDeleteId(null);
    toast.success("Item excluído permanentemente.");
  };

  const handleEmptyTrash = () => {
    setItems([]);
    setEmptyTrashOpen(false);
    toast.success("Lixeira esvaziada.");
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

      {/* Permanent delete confirmation */}
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

      {/* Empty trash confirmation */}
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
