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

interface Question {
  id: string;
  type: "multiple_choice" | "true_false" | "open_ended" | "matching";
  title: string;
  tags: string[];
  difficulty: "easy" | "medium" | "hard";
  bloom_level: string;
  created_at: string;
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

const initialQuestions: Question[] = [
  { id: "1", type: "multiple_choice", title: "What is the primary mechanism of action of ACE inhibitors?", tags: ["Pharmacology", "Cardiovascular"], difficulty: "medium", bloom_level: "Understanding", created_at: "2026-02-15" },
  { id: "2", type: "true_false", title: "Aspirin irreversibly inhibits COX-1 and COX-2 enzymes.", tags: ["Pharmacology", "NSAIDs"], difficulty: "easy", bloom_level: "Remembering", created_at: "2026-02-14" },
  { id: "3", type: "open_ended", title: "Explain the pharmacokinetic differences between warfarin and heparin.", tags: ["Pharmacology", "Anticoagulants"], difficulty: "hard", bloom_level: "Analyzing", created_at: "2026-02-13" },
  { id: "4", type: "matching", title: "Match the following drug classes with their side effects.", tags: ["Pharmacology", "Side Effects"], difficulty: "medium", bloom_level: "Applying", created_at: "2026-02-12" },
  { id: "5", type: "multiple_choice", title: "Which neurotransmitter is primarily affected by SSRIs?", tags: ["Pharmacology", "CNS"], difficulty: "easy", bloom_level: "Remembering", created_at: "2026-02-11" },
  { id: "6", type: "open_ended", title: "Discuss the role of the P450 enzyme system in drug metabolism.", tags: ["Pharmacology", "Metabolism"], difficulty: "hard", bloom_level: "Evaluating", created_at: "2026-02-10" },
];

export default function QuestionsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
          <h1 className="text-2xl font-bold tracking-tight">Banco de Questões</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {questions.length} questões no seu repositório
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setAiOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2 text-secondary" />
            Gerar com IA
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Questão
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar Nova Questão</DialogTitle>
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
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button onClick={() => setCreateOpen(false)}>Criar Questão</Button>
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
            placeholder="Buscar questões ou tags..."
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
            <SelectItem value="all">Todos os Tipos</SelectItem>
            <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
            <SelectItem value="true_false">Verdadeiro/Falso</SelectItem>
            <SelectItem value="open_ended">Dissertativa</SelectItem>
            <SelectItem value="matching">Associação</SelectItem>
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Dificuldade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="easy">Fácil</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="hard">Difícil</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Question List */}
      <div className="space-y-3">
        {filtered.map((q) => (
          <Card key={q.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
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
                  <Button variant="ghost" size="icon" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicateQuestion(q)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(q.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Library className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhuma questão encontrada</p>
            <p className="text-sm mt-1">Ajuste os filtros ou crie uma nova questão.</p>
          </div>
        )}
      </div>

      {/* AI Generator Dialog */}
      <AIQuestionGenerator open={aiOpen} onOpenChange={setAiOpen} onSaveQuestions={handleAISave} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir questão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A questão será removida permanentemente do seu banco.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId && handleDeleteQuestion(deleteId)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
