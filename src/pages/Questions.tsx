import React, { useState, useEffect, useCallback } from "react";
import SystemPromptViewer from "@/components/SystemPromptViewer";
import {
  Library,
  Plus,
  Search,
  Filter,
  GripVertical,
  MoreHorizontal,
  CheckCircle2,
  HelpCircle,
  AlignLeft,
  ArrowLeftRight,
  Sparkles,
  Upload,
  Pencil,
  Copy,
  Trash2,
  X,
  Eye,
  Loader2,
  Stethoscope,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AIQuestionGenerator, type GeneratedQuestion } from "@/components/AIQuestionGenerator";
import { useLanguage } from "@/i18n/LanguageContext";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import RichTextRenderer from "@/components/RichTextRenderer";
import QuestionImageUploader from "@/components/QuestionImageUploader";
import { ImagePlus, Code, Sigma, Table as TableIcon } from "lucide-react";

interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  type: "multiple_choice" | "true_false" | "open_ended" | "matching" | "case_stem";
  title: string;
  tags: string[];
  difficulty: "easy" | "medium" | "hard";
  bloom_level: string;
  created_at: string;
  options?: QuestionOption[];
  explanation?: string;
  answerKey?: string;
  matchingPairs?: { left: string; right: string }[];
  expectedAnswer?: string;
  embedUrl?: string;
  images?: string[];
  parentId?: string | null;
  parentTitle?: string | null;
}

const typeIcons: Record<string, React.ReactNode> = {
  multiple_choice: <CheckCircle2 className="h-4 w-4" />,
  true_false: <HelpCircle className="h-4 w-4" />,
  open_ended: <AlignLeft className="h-4 w-4" />,
  matching: <ArrowLeftRight className="h-4 w-4" />,
  case_stem: <FileText className="h-4 w-4" />,
};

const typeLabels: Record<string, string> = {
  multiple_choice: "Múltipla Escolha",
  true_false: "Verdadeiro/Falso",
  open_ended: "Dissertativa",
  matching: "Associação",
  case_stem: "Caso Clínico",
};

const difficultyColors: Record<string, string> = {
  easy: "text-success",
  medium: "text-warning",
  hard: "text-destructive",
};

// No more mock data — questions are loaded from the database

function QuestionDetailContent({ question }: { question: Question }) {
  const letterLabels = ["A", "B", "C", "D", "E", "F", "G", "H"];

  return (
    <div className="space-y-5">
      {/* Header metadata */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={question.difficulty} className="text-xs">
          {question.difficulty === "easy" ? "Fácil" : question.difficulty === "medium" ? "Média" : "Difícil"}
        </Badge>
        <Badge variant="outline" className="text-xs gap-1">
          {typeIcons[question.type]}
          {typeLabels[question.type]}
        </Badge>
        <Badge variant="secondary" className="text-xs">{question.bloom_level}</Badge>
        {question.tags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
        ))}
      </div>

      <Separator />

      {/* Linked case stem */}
      {question.parentId && question.parentTitle && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <Label className="text-xs text-primary uppercase tracking-wider flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" /> Caso Clínico Vinculado
          </Label>
          <div className="mt-1.5 text-sm leading-relaxed">
            <RichTextRenderer text={question.parentTitle} />
          </div>
        </div>
      )}

      {/* Question text */}
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          {question.type === "case_stem" ? "Enunciado do Caso" : "Enunciado"}
        </Label>
        <div className="mt-1.5 text-sm leading-relaxed font-medium">
          <RichTextRenderer text={question.title} />
        </div>
      </div>

      {/* Embed URL */}
      {question.embedUrl && (() => {
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(question.embedUrl!);
        return (
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Conteúdo Incorporado</Label>
            <div className="mt-1.5 rounded-lg border overflow-hidden">
              {isImage ? (
                <img
                  src={question.embedUrl}
                  alt="Imagem da questão"
                  className="w-full h-auto object-contain max-h-60"
                />
              ) : (
                <iframe
                  src={question.embedUrl}
                  className="w-full border-0"
                  style={{ height: '200px' }}
                  title="Conteúdo incorporado"
                  sandbox="allow-scripts allow-same-origin"
                  loading="lazy"
                />
              )}
            </div>
          </div>
        );
      })()}

      {/* Attached images */}
      {question.images && question.images.length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Imagens Anexadas</Label>
          <div className="mt-2 flex gap-3 flex-wrap">
            {question.images.map((url, i) => (
              <img key={i} src={url} alt={`Imagem ${i + 1}`} className="h-32 w-auto rounded-lg border object-contain max-w-[280px]" />
            ))}
          </div>
        </div>
      )}

      {question.options && question.options.length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Alternativas</Label>
          <div className="mt-2 space-y-2">
            {question.options.map((opt, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                  opt.isCorrect
                    ? "border-success/50 bg-success/5"
                    : "border-border bg-muted/30"
                }`}
              >
                <span className={`font-semibold shrink-0 ${opt.isCorrect ? "text-success" : "text-muted-foreground"}`}>
                  {letterLabels[i]})
                </span>
                <span className="flex-1"><RichTextRenderer text={opt.text} /></span>
                {opt.isCorrect && (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matching pairs */}
      {question.matchingPairs && question.matchingPairs.length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Pares de Associação</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase px-3 py-1">Coluna A</div>
            <div className="text-xs font-semibold text-muted-foreground uppercase px-3 py-1">Coluna B</div>
            {question.matchingPairs.map((pair, i) => (
              <>
                <div key={`l-${i}`} className="p-3 rounded-lg border bg-muted/30 text-sm">
                  {i + 1}. {pair.left}
                </div>
                <div key={`r-${i}`} className="p-3 rounded-lg border border-success/30 bg-success/5 text-sm flex items-center gap-2">
                  <ArrowLeftRight className="h-3.5 w-3.5 text-success shrink-0" />
                  {pair.right}
                </div>
              </>
            ))}
          </div>
        </div>
      )}

      {/* Expected answer for open-ended */}
      {question.expectedAnswer && (
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Resposta Esperada</Label>
          <div className="mt-1.5 p-3 rounded-lg border bg-muted/30 text-sm leading-relaxed">
            <RichTextRenderer text={question.expectedAnswer} />
          </div>
        </div>
      )}

      {/* Explanation */}
      {question.explanation && (
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Explicação / Justificativa</Label>
          <div className="mt-1.5 p-3 rounded-lg border border-primary/20 bg-primary/5 text-sm leading-relaxed">
            <RichTextRenderer text={question.explanation} />
          </div>
        </div>
      )}

      {/* Answer Key (Espelho de Resposta) */}
      {question.answerKey && (
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Espelho de Resposta (Feedback ao Aluno)</Label>
          <div className="mt-1.5 p-3 rounded-lg border border-amber-300/40 bg-amber-50/40 dark:bg-amber-900/10 text-sm leading-relaxed">
            <RichTextRenderer text={question.answerKey} />
          </div>
        </div>
      )}

      {/* Footer info */}
      <Separator />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Criada em: {question.created_at}</span>
        <span>ID: {question.id}</span>
      </div>
    </div>
  );
}

export default function QuestionsPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Manual creation form state
  const [newType, setNewType] = useState("multiple_choice");
  const [newText, setNewText] = useState("");
  const [newDifficulty, setNewDifficulty] = useState("medium");
  const [newBloom, setNewBloom] = useState("understanding");
  const [newTags, setNewTags] = useState("");
  const [newEmbed, setNewEmbed] = useState("");
  const [newParentId, setNewParentId] = useState<string>("none");
  const [newAnswerKey, setNewAnswerKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [medImageType, setMedImageType] = useState("radiography");
  const [medImageDetails, setMedImageDetails] = useState("");
  const [medImageGenerating, setMedImageGenerating] = useState(false);
  const [medImagePreview, setMedImagePreview] = useState<string | null>(null);
  const [medImagePopoverOpen, setMedImagePopoverOpen] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = (template: string) => {
    const ta = textareaRef.current;
    if (!ta) { setNewText(prev => prev + template); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = newText.slice(0, start);
    const after = newText.slice(end);
    setNewText(before + template + after);
    setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + template.length / 2; }, 50);
  };

  const resetForm = () => {
    setNewType("multiple_choice");
    setNewText("");
    setNewDifficulty("medium");
    setNewBloom("understanding");
    setNewTags("");
    setNewEmbed("");
    setNewParentId("none");
    setNewAnswerKey("");
    setNewImages([]);
    setMedImagePreview(null);
    setMedImageDetails("");
  };

  const handleGenerateMedImage = async () => {
    if (!newText.trim()) {
      toast.error("Digite o enunciado da questão antes de gerar a imagem.");
      return;
    }
    setMedImageGenerating(true);
    setMedImagePreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-medical-image", {
        body: { questionText: newText, imageType: medImageType, details: medImageDetails || undefined },
      });

      if (error) {
        const errorBody = data as { error?: string } | null;
        throw new Error(errorBody?.error || error.message || "Erro ao gerar imagem médica");
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }
      if (data?.url) {
        setMedImagePreview(data.url);
        toast.success("Imagem gerada! Confirme para adicioná-la à questão.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar imagem médica");
    } finally {
      setMedImageGenerating(false);
    }
  };

  const handleConfirmMedImage = () => {
    if (medImagePreview) {
      setNewImages(prev => [...prev, medImagePreview]);
      setMedImagePreview(null);
      setMedImageDetails("");
      setMedImagePopoverOpen(false);
      toast.success("Imagem adicionada à questão!");
    }
  };

  const openEditQuestion = async (q: Question) => {
    const { data, error } = await supabase
      .from("question_bank")
      .select("type, difficulty, bloom_level, tags, embed_url, content_json, parent_id")
      .eq("id", q.id)
      .single();
    if (error || !data) {
      toast.error("Não foi possível carregar a questão para edição.");
      return;
    }
    const cj: any = data.content_json || {};
    setEditingId(q.id);
    setNewType(data.type || "multiple_choice");
    setNewText(cj.question_text || cj.title || "");
    setNewDifficulty(data.difficulty || "medium");
    setNewBloom(data.bloom_level || "understanding");
    setNewTags((data.tags || []).join(", "));
    setNewEmbed(data.embed_url || "");
    setNewParentId(data.parent_id || "none");
    setNewAnswerKey(cj.answer_key || "");
    setNewImages(Array.isArray(cj.images) ? cj.images : []);
    setMedImagePreview(null);
    setMedImageDetails("");
    setCreateOpen(true);
  };

  const handleCreateQuestion = async () => {
    if (!newText.trim()) {
      toast.error("Digite o texto da questão.");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setSaving(false); return; }

    const tags = newTags.split(",").map(t => t.trim()).filter(Boolean);

    if (editingId) {
      // Preserve existing options/correct_answer/explanation etc; only patch question_text + images
      const { data: existing } = await supabase
        .from("question_bank")
        .select("content_json")
        .eq("id", editingId)
        .single();
      const baseCj: any = (existing?.content_json as any) || {};
      const contentJson: any = {
        ...baseCj,
        question_text: newText.trim(),
        images: newImages.length > 0 ? newImages : undefined,
        answer_key: newAnswerKey.trim() || undefined,
      };

      const { error } = await supabase.from("question_bank").update({
        type: newType,
        difficulty: newDifficulty,
        bloom_level: newBloom,
        tags,
        embed_url: newEmbed || null,
        content_json: contentJson,
        parent_id: newType === "case_stem" ? null : (newParentId && newParentId !== "none" ? newParentId : null),
      } as any).eq("id", editingId);

      setSaving(false);
      if (error) {
        toast.error("Erro ao salvar alterações.");
        return;
      }
      toast.success("Questão atualizada.");
      setEditingId(null);
      resetForm();
      setCreateOpen(false);
      await loadQuestions();
      return;
    }

    const contentJson: any = { question_text: newText.trim(), images: newImages.length > 0 ? newImages : undefined, answer_key: newAnswerKey.trim() || undefined };
    if (newType === "multiple_choice") {
      contentJson.options = { a: "", b: "", c: "", d: "" };
      contentJson.correct_answer = "a";
    } else if (newType === "true_false") {
      contentJson.options = { a: "Verdadeiro", b: "Falso" };
      contentJson.correct_answer = "a";
    }

    const { error } = await supabase.from("question_bank").insert({
      user_id: userData.user.id,
      type: newType,
      difficulty: newDifficulty,
      bloom_level: newBloom,
      tags,
      embed_url: newEmbed || null,
      content_json: contentJson,
      parent_id: newType === "case_stem" ? null : (newParentId && newParentId !== "none" ? newParentId : null),
    } as any);

    setSaving(false);
    if (error) {
      toast.error("Erro ao criar questão.");
      return;
    }
    toast.success("Questão criada com sucesso!");
    resetForm();
    setCreateOpen(false);
    await loadQuestions();
  };

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setLoading(false); return; }

    const { data } = await supabase
      .from("question_bank")
      .select("id, type, content_json, difficulty, tags, bloom_level, created_at, embed_url, parent_id")
      .eq("user_id", userData.user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    const rows = data || [];
    const titleById = new Map<string, string>();
    for (const q of rows) {
      const cj = q.content_json as any;
      titleById.set(q.id, cj?.question_text || cj?.title || "Questão");
    }

    setQuestions(
      rows.map((q: any) => {
        const cj = q.content_json as any;
        const options = cj?.options
          ? Object.entries(cj.options).map(([key, val]) => ({
              text: val as string,
              isCorrect: cj.correct_answer === key,
            }))
          : undefined;
        const matchingPairs = cj?.column_a && cj?.column_b
          ? cj.column_a.map((left: string, i: number) => ({ left, right: cj.column_b[i] || "" }))
          : undefined;
        return {
          id: q.id,
          type: q.type as Question["type"],
          title: cj?.question_text || cj?.title || "Questão",
          tags: q.tags || [],
          difficulty: q.difficulty as Question["difficulty"],
          bloom_level: q.bloom_level || "",
          created_at: q.created_at?.split("T")[0] || "",
          options,
          explanation: cj?.explanation,
          answerKey: cj?.answer_key,
          matchingPairs,
          expectedAnswer: cj?.expected_answer,
          embedUrl: q.embed_url || undefined,
          images: cj?.images || undefined,
          parentId: q.parent_id || null,
          parentTitle: q.parent_id ? titleById.get(q.parent_id) || null : null,
        };
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const handleDeleteQuestion = async (id: string) => {
    await supabase.from("question_bank").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setDeleteId(null);
    toast.success("Questão movida para a lixeira.");
  };

  const handleDuplicateQuestion = async (q: Question) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    // Fetch original content_json
    const { data: orig } = await supabase.from("question_bank").select("content_json, type, difficulty, tags, bloom_level").eq("id", q.id).single();
    if (!orig) return;
    const { error } = await supabase.from("question_bank").insert({
      user_id: userData.user.id,
      type: orig.type,
      difficulty: orig.difficulty,
      tags: orig.tags,
      bloom_level: orig.bloom_level,
      content_json: orig.content_json,
    });
    if (!error) {
      toast.success("Questão duplicada.");
      loadQuestions();
    }
  };

  const handleAISave = async () => {
    // AI questions are already saved to DB by the AIQuestionGenerator component
    await loadQuestions();
  };

  const filtered = questions.filter((q) => {
    const matchSearch =
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchType = typeFilter === "all" || q.type === typeFilter;
    const matchDiff = difficultyFilter === "all" || q.difficulty === difficultyFilter;
    return matchSearch && matchType && matchDiff;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("questions_title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {questions.length} {t("questions_subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SystemPromptViewer toolKey="questions" />
          <Button variant="outline" onClick={() => setAiOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2 text-secondary" />
            {t("questions_generate_ai")}
          </Button>
          <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) { setEditingId(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t("questions_new")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Questão" : t("questions_create_title")}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="manual" className="mt-2">
                <TabsList className="w-full">
                  <TabsTrigger value="manual" className="flex-1">Criação Manual</TabsTrigger>
                  <TabsTrigger value="import" className="flex-1">Importar CSV/JSON</TabsTrigger>
                </TabsList>
                <TabsContent value="manual" className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Tipo de Questão</Label>
                    <Select value={newType} onValueChange={setNewType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                        <SelectItem value="true_false">Verdadeiro / Falso</SelectItem>
                        <SelectItem value="open_ended">Dissertativa</SelectItem>
                        <SelectItem value="matching">Associação de Colunas</SelectItem>
                        <SelectItem value="case_stem">Caso Clínico (enunciado base)</SelectItem>
                      </SelectContent>
                    </Select>
                    {newType === "case_stem" && (
                      <p className="text-[11px] text-muted-foreground">
                        Um Caso Clínico é apenas um texto-base (sem alternativas). Depois, vincule outras questões a ele para que compartilhem este enunciado.
                      </p>
                    )}
                  </div>

                  {/* Linkar a um caso clínico existente (quando não é case_stem) */}
                  {newType !== "case_stem" && questions.some(q => q.type === "case_stem") && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" /> Vincular a um Caso Clínico (opcional)
                      </Label>
                      <Select value={newParentId} onValueChange={setNewParentId}>
                        <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {questions.filter(q => q.type === "case_stem").map(q => (
                            <SelectItem key={q.id} value={q.id}>
                              {q.title.length > 80 ? q.title.slice(0, 80) + "…" : q.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Texto da Questão</Label>
                    <div className="flex items-center gap-1 mb-1">
                      <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => insertAtCursor("$$  $$")} title="Inserir expressão matemática">
                        <Sigma className="h-3.5 w-3.5" /> LaTeX
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => insertAtCursor("```\n\n```")} title="Inserir bloco de código">
                        <Code className="h-3.5 w-3.5" /> Código
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => insertAtCursor("\n| Coluna 1 | Coluna 2 | Coluna 3 |\n| --- | --- | --- |\n| valor | valor | valor |\n| valor | valor | valor |\n")} title="Inserir tabela formatada">
                        <TableIcon className="h-3.5 w-3.5" /> Tabela
                      </Button>
                    </div>
                    <Textarea ref={textareaRef} placeholder="Digite a questão... Use $...$ para LaTeX, ```lang...``` para código, e | col | col | para tabelas (formato Markdown GFM)" rows={6} value={newText} onChange={(e) => setNewText(e.target.value)} />
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <QuestionImageUploader images={newImages} onChange={setNewImages} />
                      </div>
                      <Popover open={medImagePopoverOpen} onOpenChange={setMedImagePopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0">
                            <Stethoscope className="h-4 w-4" />
                            <Sparkles className="h-3 w-3 text-secondary" />
                            Gerar Imagem Médica
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="end">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Stethoscope className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-sm">Gerador de Imagem Médica por IA</span>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Tipo de Imagem</Label>
                              <Select value={medImageType} onValueChange={setMedImageType}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="radiography">Radiografia (Raio-X)</SelectItem>
                                  <SelectItem value="ct">Tomografia (TC)</SelectItem>
                                  <SelectItem value="mri">Ressonância Magnética (RM)</SelectItem>
                                  <SelectItem value="histology">Lâmina Histopatológica</SelectItem>
                                  <SelectItem value="ecg">Eletrocardiograma (ECG)</SelectItem>
                                  <SelectItem value="ultrasound">Ultrassonografia</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Detalhes adicionais (opcional)</Label>
                              <Input
                                className="h-8 text-xs"
                                placeholder="Ex: pneumotórax à direita, fratura de fêmur..."
                                value={medImageDetails}
                                onChange={(e) => setMedImageDetails(e.target.value)}
                              />
                            </div>
                            {medImagePreview && (
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Pré-visualização:</Label>
                                <img src={medImagePreview} alt="Imagem médica gerada" className="w-full rounded-lg border object-contain max-h-48" />
                                <Button type="button" size="sm" className="w-full gap-1" onClick={handleConfirmMedImage}>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Adicionar à Questão
                                </Button>
                              </div>
                            )}
                            {!medImagePreview && (
                              <Button
                                type="button"
                                size="sm"
                                className="w-full gap-1.5"
                                onClick={handleGenerateMedImage}
                                disabled={medImageGenerating || !newText.trim()}
                              >
                                {medImageGenerating ? (
                                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando...</>
                                ) : (
                                  <><Sparkles className="h-3.5 w-3.5" /> Gerar Imagem</>
                                )}
                              </Button>
                            )}
                            {!newText.trim() && !medImageGenerating && (
                              <p className="text-[10px] text-muted-foreground">Digite o enunciado da questão primeiro.</p>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Dificuldade</Label>
                      <Select value={newDifficulty} onValueChange={setNewDifficulty}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Fácil</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="hard">Difícil</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Taxonomia de Bloom</Label>
                      <Select value={newBloom} onValueChange={setNewBloom}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="remembering">Lembrar</SelectItem>
                          <SelectItem value="understanding">Compreender</SelectItem>
                          <SelectItem value="applying">Aplicar</SelectItem>
                          <SelectItem value="analyzing">Analisar</SelectItem>
                          <SelectItem value="evaluating">Avaliar</SelectItem>
                          <SelectItem value="creating">Criar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tags (separadas por vírgula)</Label>
                    <Input placeholder="Ex: Farmacologia, Cardiovascular" value={newTags} onChange={(e) => setNewTags(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>URL de Embed (opcional)</Label>
                    <Input placeholder="https://... (visualizador molecular, simulação, etc.)" value={newEmbed} onChange={(e) => setNewEmbed(e.target.value)} />
                    <p className="text-[11px] text-muted-foreground">
                      Incorpore ferramentas externas na versão digital da questão via iframe.
                    </p>
                  </div>
                  {newType !== "case_stem" && (
                    <div className="space-y-2">
                      <Label>Espelho de Resposta (opcional)</Label>
                      <Textarea
                        placeholder="Descreva a resposta ideal / pontos esperados. Será exibido ao aluno como feedback após responder."
                        value={newAnswerKey}
                        onChange={(e) => setNewAnswerKey(e.target.value)}
                        rows={4}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Este texto será mostrado ao aluno como feedback após a entrega da prova.
                      </p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="import" className="space-y-4 pt-2">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm font-medium">Arraste um arquivo CSV ou JSON</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ou clique para selecionar do computador
                    </p>
                    <Button variant="outline" size="sm" className="mt-4">
                      Selecionar Arquivo
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Formato esperado: cada linha/objeto deve ter os campos <code>question_text</code>, <code>type</code>, <code>difficulty</code>, <code>tags</code>.
                  </p>
                </TabsContent>
              </Tabs>
              <DialogFooter>
                <Button variant="outline" onClick={() => { resetForm(); setEditingId(null); setCreateOpen(false); }}>{t("cancel")}</Button>
                <Button onClick={handleCreateQuestion} disabled={saving}>{saving ? "Salvando..." : (editingId ? "Salvar Alterações" : t("questions_new"))}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("questions_search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("questions_all_types")}</SelectItem>
            <SelectItem value="multiple_choice">{t("questions_multiple_choice")}</SelectItem>
            <SelectItem value="true_false">{t("questions_true_false")}</SelectItem>
            <SelectItem value="open_ended">{t("questions_open_ended")}</SelectItem>
            <SelectItem value="matching">{t("questions_matching")}</SelectItem>
            <SelectItem value="case_stem">Caso Clínico</SelectItem>
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Dificuldade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("questions_all_difficulties")}</SelectItem>
            <SelectItem value="easy">{t("questions_easy")}</SelectItem>
            <SelectItem value="medium">{t("questions_medium")}</SelectItem>
            <SelectItem value="hard">{t("questions_hard")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Question List */}
      <div className="space-y-3">
        {filtered.map((q) => (
          <Card
            key={q.id}
            className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => setSelectedQuestion(q)}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-muted-foreground group-hover:text-primary transition-colors">
                <GripVertical className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
              </div>
              <div className="h-8 w-8 rounded-md bg-accent flex items-center justify-center shrink-0 text-muted-foreground">
                {typeIcons[q.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm leading-snug">{q.title}</p>
                {q.parentId && q.parentTitle && (
                  <p className="text-[11px] text-primary mt-1 flex items-center gap-1 truncate">
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate">Caso: {q.parentTitle}</span>
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {q.type !== "case_stem" && (
                    <Badge variant={q.difficulty} className="text-[11px]">
                      {q.difficulty}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{typeLabels[q.type]}</span>
                  {q.type !== "case_stem" && (
                    <>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{q.bloom_level}</span>
                    </>
                  )}
                  {q.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[11px]">{tag}</Badge>
                  ))}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedQuestion(q); }}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditQuestion(q); }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    {t("questions_edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicateQuestion(q); }}>
                    <Copy className="h-4 w-4 mr-2" />
                    {t("questions_duplicate")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(q.id); }}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("questions_delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Library className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="font-semibold text-foreground text-lg">{t("questions_none_found")}</p>
            <p className="text-sm mt-1 mb-5">{questions.length === 0 ? t("empty_questions_hint") : t("questions_adjust_filters")}</p>
            {questions.length === 0 && (
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" onClick={() => setAiOpen(true)}>
                  <Sparkles className="h-4 w-4 mr-2 text-secondary" />
                  {t("questions_generate_ai")}
                </Button>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("questions_new")}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Question Detail Dialog */}
      <Dialog open={!!selectedQuestion} onOpenChange={(open) => !open && setSelectedQuestion(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Detalhes da Questão
            </DialogTitle>
          </DialogHeader>
          {selectedQuestion && <QuestionDetailContent question={selectedQuestion} />}
        </DialogContent>
      </Dialog>

      {/* AI Generator Dialog */}
      <AIQuestionGenerator open={aiOpen} onOpenChange={setAiOpen} onSaveQuestions={handleAISave} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("questions_delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("questions_delete_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId && handleDeleteQuestion(deleteId)}>
              {t("questions_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
