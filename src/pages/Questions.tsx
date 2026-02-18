import { useState } from "react";
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
import { AIQuestionGenerator, type GeneratedQuestion } from "@/components/AIQuestionGenerator";
import { useLanguage } from "@/i18n/LanguageContext";
import { Separator } from "@/components/ui/separator";

interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  type: "multiple_choice" | "true_false" | "open_ended" | "matching";
  title: string;
  tags: string[];
  difficulty: "easy" | "medium" | "hard";
  bloom_level: string;
  created_at: string;
  options?: QuestionOption[];
  explanation?: string;
  matchingPairs?: { left: string; right: string }[];
  expectedAnswer?: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  multiple_choice: <CheckCircle2 className="h-4 w-4" />,
  true_false: <HelpCircle className="h-4 w-4" />,
  open_ended: <AlignLeft className="h-4 w-4" />,
  matching: <ArrowLeftRight className="h-4 w-4" />,
};

const typeLabels: Record<string, string> = {
  multiple_choice: "Múltipla Escolha",
  true_false: "Verdadeiro/Falso",
  open_ended: "Dissertativa",
  matching: "Associação",
};

const difficultyColors: Record<string, string> = {
  easy: "text-success",
  medium: "text-warning",
  hard: "text-destructive",
};

const initialQuestions: Question[] = [
  {
    id: "1", type: "multiple_choice",
    title: "What is the primary mechanism of action of ACE inhibitors?",
    tags: ["Pharmacology", "Cardiovascular"], difficulty: "medium", bloom_level: "Understanding", created_at: "2026-02-15",
    options: [
      { text: "Bloqueiam a conversão de angiotensina I em angiotensina II", isCorrect: true },
      { text: "Bloqueiam os receptores beta-adrenérgicos", isCorrect: false },
      { text: "Inibem a bomba de sódio-potássio", isCorrect: false },
      { text: "Ativam os canais de cálcio", isCorrect: false },
    ],
    explanation: "Os inibidores da ECA bloqueiam a enzima conversora de angiotensina, impedindo a conversão de angiotensina I em angiotensina II, resultando em vasodilatação e redução da pressão arterial.",
  },
  {
    id: "2", type: "true_false",
    title: "Aspirin irreversibly inhibits COX-1 and COX-2 enzymes.",
    tags: ["Pharmacology", "NSAIDs"], difficulty: "easy", bloom_level: "Remembering", created_at: "2026-02-14",
    options: [
      { text: "Verdadeiro", isCorrect: true },
      { text: "Falso", isCorrect: false },
    ],
    explanation: "A aspirina acetila irreversivelmente as enzimas COX-1 e COX-2, diferentemente de outros AINEs que são inibidores reversíveis.",
  },
  {
    id: "3", type: "open_ended",
    title: "Explain the pharmacokinetic differences between warfarin and heparin.",
    tags: ["Pharmacology", "Anticoagulants"], difficulty: "hard", bloom_level: "Analyzing", created_at: "2026-02-13",
    expectedAnswer: "A warfarina é administrada por via oral, tem início de ação lento (2-5 dias), longa duração e atua inibindo fatores dependentes de vitamina K. A heparina é administrada por via parenteral, tem início de ação rápido, curta duração e atua potencializando a antitrombina III.",
    explanation: "A comparação entre warfarina e heparina é fundamental para entender as estratégias de anticoagulação em diferentes contextos clínicos.",
  },
  {
    id: "4", type: "matching",
    title: "Match the following drug classes with their side effects.",
    tags: ["Pharmacology", "Side Effects"], difficulty: "medium", bloom_level: "Applying", created_at: "2026-02-12",
    matchingPairs: [
      { left: "Inibidores da ECA", right: "Tosse seca" },
      { left: "Beta-bloqueadores", right: "Bradicardia" },
      { left: "Diuréticos tiazídicos", right: "Hipocalemia" },
      { left: "Bloqueadores de Ca²⁺", right: "Edema periférico" },
    ],
    explanation: "Conhecer os efeitos colaterais característicos de cada classe é essencial para a prática clínica segura.",
  },
  {
    id: "5", type: "multiple_choice",
    title: "Which neurotransmitter is primarily affected by SSRIs?",
    tags: ["Pharmacology", "CNS"], difficulty: "easy", bloom_level: "Remembering", created_at: "2026-02-11",
    options: [
      { text: "Dopamina", isCorrect: false },
      { text: "Serotonina", isCorrect: true },
      { text: "Noradrenalina", isCorrect: false },
      { text: "GABA", isCorrect: false },
    ],
    explanation: "Os ISRS (Inibidores Seletivos da Recaptação de Serotonina) atuam especificamente bloqueando a recaptação de serotonina na fenda sináptica.",
  },
  {
    id: "6", type: "open_ended",
    title: "Discuss the role of the P450 enzyme system in drug metabolism.",
    tags: ["Pharmacology", "Metabolism"], difficulty: "hard", bloom_level: "Evaluating", created_at: "2026-02-10",
    expectedAnswer: "O sistema citocromo P450 é uma superfamília de enzimas hepáticas responsáveis pela fase I do metabolismo de fármacos. As principais isoformas (CYP3A4, CYP2D6, CYP2C9) catalisam reações de oxidação, redução e hidrólise.",
    explanation: "O entendimento do sistema P450 é crucial para prever interações medicamentosas e ajustar doses terapêuticas.",
  },
];

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

      {/* Question text */}
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Enunciado</Label>
        <p className="mt-1.5 text-sm leading-relaxed font-medium">{question.title}</p>
      </div>

      {/* Options for multiple choice / true-false */}
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
                <span className="flex-1">{opt.text}</span>
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
            {question.expectedAnswer}
          </div>
        </div>
      )}

      {/* Explanation */}
      {question.explanation && (
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Explicação / Justificativa</Label>
          <div className="mt-1.5 p-3 rounded-lg border border-primary/20 bg-primary/5 text-sm leading-relaxed">
            {question.explanation}
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
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  const handleDeleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setDeleteId(null);
  };

  const handleDuplicateQuestion = (q: Question) => {
    const duplicate: Question = {
      ...q,
      id: `dup-${Date.now()}`,
      title: `${q.title} (cópia)`,
      created_at: new Date().toISOString().split("T")[0],
    };
    setQuestions((prev) => [duplicate, ...prev]);
  };

  const handleAISave = (generated: GeneratedQuestion[]) => {
    const newQuestions: Question[] = generated.map((q, i) => ({
      id: `ai-${Date.now()}-${i}`,
      type: q.type as Question["type"],
      title: q.question_text,
      tags: q.tags || [],
      difficulty: q.difficulty as Question["difficulty"],
      bloom_level: q.bloom_level || "",
      created_at: new Date().toISOString().split("T")[0],
    }));
    setQuestions((prev) => [...newQuestions, ...prev]);
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
          <Button variant="outline" onClick={() => setAiOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2 text-secondary" />
            {t("questions_generate_ai")}
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t("questions_new")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("questions_create_title")}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="manual" className="mt-2">
                <TabsList className="w-full">
                  <TabsTrigger value="manual" className="flex-1">Criação Manual</TabsTrigger>
                  <TabsTrigger value="import" className="flex-1">Importar CSV/JSON</TabsTrigger>
                </TabsList>
                <TabsContent value="manual" className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Tipo de Questão</Label>
                    <Select defaultValue="multiple_choice">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                        <SelectItem value="true_false">Verdadeiro / Falso</SelectItem>
                        <SelectItem value="open_ended">Dissertativa</SelectItem>
                        <SelectItem value="matching">Associação de Colunas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Texto da Questão</Label>
                    <Textarea placeholder="Digite a questão..." rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Dificuldade</Label>
                      <Select defaultValue="medium">
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
                      <Select defaultValue="understanding">
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
                    <Input placeholder="Ex: Farmacologia, Cardiovascular" />
                  </div>
                  <div className="space-y-2">
                    <Label>URL de Embed (opcional)</Label>
                    <Input placeholder="https://... (visualizador molecular, simulação, etc.)" />
                    <p className="text-[11px] text-muted-foreground">
                      Incorpore ferramentas externas na versão digital da questão via iframe.
                    </p>
                  </div>
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
                <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("cancel")}</Button>
                <Button onClick={() => setCreateOpen(false)}>{t("questions_new")}</Button>
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
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant={q.difficulty} className="text-[11px]">
                    {q.difficulty}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{typeLabels[q.type]}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{q.bloom_level}</span>
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
                  <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
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
            <Library className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">{t("questions_none_found")}</p>
            <p className="text-sm mt-1">{t("questions_adjust_filters")}</p>
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
