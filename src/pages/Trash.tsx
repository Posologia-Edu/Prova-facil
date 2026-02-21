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
  Eye,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TrashItem {
  id: string;
  name: string;
  type: "question" | "exam" | "class";
  deletedAt: string;
  details?: string;
  rawData?: any;
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

const difficultyLabels: Record<string, string> = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil",
};

function extractQuestionName(content: any): string {
  if (!content) return "Questão sem título";
  const text =
    content.statement ||
    content.enunciado ||
    content.text ||
    content.question_text ||
    content.question ||
    content.title ||
    "";
  if (!text) return "Questão sem título";
  return text.length > 100 ? text.substring(0, 100) + "..." : text;
}

function getQuestionTypeName(type: string): string {
  switch (type) {
    case "multiple_choice": return "Múltipla Escolha";
    case "true_false": return "Verdadeiro/Falso";
    case "essay": return "Dissertativa";
    case "open_ended": return "Resposta Aberta";
    case "fill_blank": return "Preencher Lacuna";
    default: return type;
  }
}

export default function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);
  const [emptyTrashOpen, setEmptyTrashOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<TrashItem | null>(null);

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [questionsRes, examsRes, classesRes] = await Promise.all([
        supabase
          .from("question_bank")
          .select("id, content_json, type, tags, difficulty, bloom_level, deleted_at")
          .eq("user_id", user.id)
          .not("deleted_at", "is", null),
        supabase
          .from("exams")
          .select("id, title, description, status, deleted_at, created_at")
          .eq("user_id", user.id)
          .not("deleted_at", "is", null),
        supabase
          .from("classes")
          .select("id, name, description, semester, student_count, deleted_at")
          .eq("user_id", user.id)
          .not("deleted_at", "is", null),
      ]);

      const trashItems: TrashItem[] = [];

      (questionsRes.data || []).forEach((q: any) => {
        const content = q.content_json || {};
        const name = extractQuestionName(content);
        const typeName = getQuestionTypeName(q.type);
        const tagsStr = (q.tags || []).length > 0 ? (q.tags as string[]).slice(0, 2).join(", ") : "";
        const detailParts = [typeName];
        if (q.difficulty) detailParts.push(difficultyLabels[q.difficulty] || q.difficulty);
        if (tagsStr) detailParts.push(tagsStr);

        trashItems.push({
          id: q.id,
          name,
          type: "question",
          deletedAt: q.deleted_at!,
          details: detailParts.join(" · "),
          rawData: q,
        });
      });

      (examsRes.data || []).forEach((e: any) => {
        const detailParts: string[] = [];
        if (e.status) detailParts.push(e.status === "draft" ? "Rascunho" : e.status === "published" ? "Publicada" : e.status);
        if (e.description) detailParts.push(e.description.length > 60 ? e.description.substring(0, 60) + "..." : e.description);

        trashItems.push({
          id: e.id,
          name: e.title || "Prova sem título",
          type: "exam",
          deletedAt: e.deleted_at!,
          details: detailParts.join(" · ") || undefined,
          rawData: e,
        });
      });

      (classesRes.data || []).forEach((c: any) => {
        const detailParts: string[] = [];
        if (c.student_count) detailParts.push(`${c.student_count} alunos`);
        if (c.semester) detailParts.push(c.semester);
        if (c.description) detailParts.push(c.description.length > 40 ? c.description.substring(0, 40) + "..." : c.description);

        trashItems.push({
          id: c.id,
          name: c.name || "Turma sem nome",
          type: "class",
          deletedAt: c.deleted_at!,
          details: detailParts.join(" · ") || undefined,
          rawData: c,
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
    if (error) { toast.error("Erro ao restaurar item."); return; }
    setItems((prev) => prev.filter((i) => i.id !== id));
    setPreviewItem(null);
    toast.success("Item restaurado com sucesso!");
  };

  const handlePermanentDelete = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const table = item.type === "question" ? "question_bank" : item.type === "exam" ? "exams" : "classes";
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir item permanentemente."); return; }
    setItems((prev) => prev.filter((i) => i.id !== id));
    setPermanentDeleteId(null);
    setPreviewItem(null);
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

  const formatFullDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });

  const renderQuestionPreview = (raw: any) => {
    const content = raw.content_json || {};
    const statement = content.statement || content.enunciado || content.text || content.question_text || content.question || "";
    const options = content.options || content.alternatives || content.choices;
    const expectedAnswer = content.expected_answer || content.expectedAnswer || content.correct_answer_text;

    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Enunciado</p>
          <p className="text-sm whitespace-pre-wrap">{statement || "—"}</p>
        </div>
        {options && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Alternativas</p>
            {Array.isArray(options) ? (
              <ul className="space-y-1">
                {options.map((opt: any, i: number) => (
                  <li key={i} className={`text-sm flex gap-2 ${opt.isCorrect ? "font-semibold text-primary" : ""}`}>
                    <span className="font-mono">{String.fromCharCode(65 + i)})</span>
                    <span>{typeof opt === "string" ? opt : opt.text || opt.label || JSON.stringify(opt)}</span>
                    {opt.isCorrect && <Badge variant="outline" className="text-[9px] ml-1">Correta</Badge>}
                  </li>
                ))}
              </ul>
            ) : typeof options === "object" ? (
              <ul className="space-y-1">
                {Object.entries(options).map(([key, val]: any) => (
                  <li key={key} className="text-sm flex gap-2">
                    <span className="font-mono">{key.toUpperCase()})</span>
                    <span>{val}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
        {expectedAnswer && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Resposta esperada</p>
            <p className="text-sm whitespace-pre-wrap">{expectedAnswer}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Badge variant="secondary">{getQuestionTypeName(raw.type)}</Badge>
          {raw.difficulty && <Badge variant="outline">{difficultyLabels[raw.difficulty] || raw.difficulty}</Badge>}
          {raw.bloom_level && <Badge variant="outline">Bloom: {raw.bloom_level}</Badge>}
          {(raw.tags || []).map((t: string) => <Badge key={t} variant="outline">{t}</Badge>)}
        </div>
      </div>
    );
  };

  const renderExamPreview = (raw: any) => (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Título</p>
        <p className="text-sm font-medium">{raw.title || "—"}</p>
      </div>
      {raw.description && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Descrição</p>
          <p className="text-sm">{raw.description}</p>
        </div>
      )}
      <div className="flex gap-2">
        <Badge variant="secondary">{raw.status === "draft" ? "Rascunho" : raw.status === "published" ? "Publicada" : raw.status}</Badge>
        {raw.created_at && <Badge variant="outline">Criada em {new Date(raw.created_at).toLocaleDateString("pt-BR")}</Badge>}
      </div>
    </div>
  );

  const renderClassPreview = (raw: any) => (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Nome</p>
        <p className="text-sm font-medium">{raw.name || "—"}</p>
      </div>
      {raw.description && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Descrição</p>
          <p className="text-sm">{raw.description}</p>
        </div>
      )}
      <div className="flex gap-2">
        {raw.student_count != null && <Badge variant="secondary">{raw.student_count} alunos</Badge>}
        {raw.semester && <Badge variant="outline">{raw.semester}</Badge>}
      </div>
    </div>
  );

  const renderDetailPreview = (item: TrashItem) => {
    if (!item.rawData) return <p className="text-sm text-muted-foreground">Sem detalhes disponíveis.</p>;
    if (item.type === "question") return renderQuestionPreview(item.rawData);
    if (item.type === "exam") return renderExamPreview(item.rawData);
    return renderClassPreview(item.rawData);
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
            <Card
              key={item.id}
              className="group hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setPreviewItem(item)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
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
                    onClick={(e) => { e.stopPropagation(); setPreviewItem(item); }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleRestore(item.id); }}
                    className="text-primary hover:text-primary"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Restaurar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setPermanentDeleteId(item.id); }}
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
          <Button variant="destructive" size="sm" onClick={() => setEmptyTrashOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Esvaziar Lixeira
          </Button>
        )}
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todos ({items.length})</TabsTrigger>
          <TabsTrigger value="question">Questões ({items.filter((i) => i.type === "question").length})</TabsTrigger>
          <TabsTrigger value="exam">Provas ({items.filter((i) => i.type === "exam").length})</TabsTrigger>
          <TabsTrigger value="class">Turmas ({items.filter((i) => i.type === "class").length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">{renderItems(filterByType("all"))}</TabsContent>
        <TabsContent value="question" className="mt-4">{renderItems(filterByType("question"))}</TabsContent>
        <TabsContent value="exam" className="mt-4">{renderItems(filterByType("exam"))}</TabsContent>
        <TabsContent value="class" className="mt-4">{renderItems(filterByType("class"))}</TabsContent>
      </Tabs>

      {/* Detail preview dialog */}
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {previewItem && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{typeLabels[previewItem.type]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Excluído em {formatFullDate(previewItem.deletedAt)}
                  </span>
                </div>
                <DialogTitle className="text-base">{previewItem.name}</DialogTitle>
                <DialogDescription className="sr-only">
                  Detalhes do item excluído
                </DialogDescription>
              </DialogHeader>

              <div className="py-2">
                {renderDetailPreview(previewItem)}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => { setPreviewItem(null); setPermanentDeleteId(previewItem.id); }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Excluir Permanentemente
                </Button>
                <Button onClick={() => handleRestore(previewItem.id)}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restaurar Item
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

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
