import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  MoreVertical,
  Eye,
  FileDown,
  Copy,
  ArrowLeft,
  Save,
  CheckCircle2,
  HelpCircle,
  AlignLeft,
  ArrowLeftRight,
  Search,
  Filter,
  ListPlus,
  Layers,
  BarChart3,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Types
interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

interface BankQuestion {
  id: string;
  type: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  options?: QuestionOption[];
}

interface ExamQuestion {
  id: string;
  questionId: string;
  title: string;
  type: string;
  points: number;
  options?: QuestionOption[];
}

interface Participant {
  id: string;
  name: string;
  matricula: string;
  status: "completed" | "in_progress" | "not_started";
  score: number | null;
  questionScores: (number | null)[];
}

// Mock data
const bankQuestions: BankQuestion[] = [
  { id: "b1", type: "multiple_choice", title: "Maria, uma mulher de 32 anos de idade, procura o pronto-socorro com queixa de falta de ar e chiado no peito após praticar exercício físico.", difficulty: "medium", tags: ["Asma"] },
  { id: "b2", type: "multiple_choice", title: "Maria, 62 anos, sofre de lombalgia há alguns anos e apresentou recentemente piora do quadro com irradiação para o membro inferior esquerdo.", difficulty: "hard", tags: ["analgésicos"] },
  { id: "b3", type: "open_ended", title: "João, 45 anos, foi internado na emergência com dor aguda muito forte após sofrer um acidente de carro.", difficulty: "hard", tags: ["Opioides", "analgésicos"] },
  { id: "b4", type: "multiple_choice", title: "Paciente L.P, um homem de 50 anos, procura um médico com queixa de dor ao urinar e aumento da frequência de micção.", difficulty: "medium", tags: ["Urologia"] },
  { id: "b5", type: "multiple_choice", title: "Paciente J.S, uma mulher de 35 anos, procura um médico com queixa de dor abdominal e dor ao urinar.", difficulty: "easy", tags: ["Urologia"] },
  { id: "b6", type: "matching", title: "Uma paciente grávida de 28 semanas apresenta queixa de lombalgia intensa há 2 semanas, sem sinais de melhora com o tratamento conservador atual.", difficulty: "hard", tags: ["Obstetrícia"] },
];

const typeIcons: Record<string, React.ReactNode> = {
  multiple_choice: <CheckCircle2 className="h-3.5 w-3.5" />,
  true_false: <HelpCircle className="h-3.5 w-3.5" />,
  open_ended: <AlignLeft className="h-3.5 w-3.5" />,
  matching: <ArrowLeftRight className="h-3.5 w-3.5" />,
};

const typeLabels: Record<string, string> = {
  multiple_choice: "Múltipla Escolha",
  true_false: "Verdadeiro ou Falso",
  open_ended: "Discursiva",
  matching: "Associação de Colunas",
};

const questionTypes = [
  { value: "multiple_choice", label: "Múltipla Escolha" },
  { value: "true_false", label: "Verdadeiro ou Falso" },
  { value: "open_ended", label: "Discursiva" },
  { value: "matching", label: "Associação de Colunas" },
  { value: "block", label: "Bloco" },
  { value: "programming", label: "Programação" },
];

// Mock participants
const mockParticipants: Participant[] = [
  { id: "p1", name: "ALIANA VITORIA BARBOSA CARNEIRO", matricula: "20200010980", status: "completed", score: 6.10, questionScores: [0.6, 0.6, 0.6, 0, 0.6, 0.6, 0.6, 0.6, 1.1] },
  { id: "p2", name: "BRENA KADJA DANTAS DOS SANTOS", matricula: "20200018049", status: "completed", score: 5.40, questionScores: [0.6, 0.6, 0.6, 0.6, 0.6, 0, 0.6, 0.6, 0.5] },
  { id: "p3", name: "BRUNA KARINE MEDEIROS ARAÚJO", matricula: "20190018880", status: "completed", score: 5.50, questionScores: [0, 0.6, 0.6, 0, 0.6, 0.6, 0.6, 0.6, 0.8] },
  { id: "p4", name: "DANIELE DA SILVA", matricula: "20200018728", status: "completed", score: 5.20, questionScores: [0.6, 0.6, 0.6, 0, 0.6, 0.6, 0.6, 0.6, 0.5] },
  { id: "p5", name: "DANIELLY SIMONETI GURGEL DA ROCHA", matricula: "20200005461", status: "completed", score: 4.30, questionScores: [0.6, 0, 0.6, 0, 0.6, 0.6, 0, 0.6, 0.5] },
];

const histogramData = [
  { range: "0 - 1,4", count: 0 },
  { range: "1,4 - 2,8", count: 1 },
  { range: "2,8 - 4,2", count: 3 },
  { range: "4,2 - 5,6", count: 23 },
  { range: "5,6 - 7", count: 15 },
];

const accuracyData = [
  { q: "Q1", pct: 88 },
  { q: "Q2", pct: 88 },
  { q: "Q3", pct: 91 },
  { q: "Q4", pct: 27 },
  { q: "Q5", pct: 79 },
  { q: "Q6", pct: 88 },
  { q: "Q7", pct: 74 },
  { q: "Q8", pct: 88 },
  { q: "Q9", pct: 63 },
  { q: "Q10", pct: 65 },
];

export default function ExamEditorPage() {
  const { examId } = useParams();
  const navigate = useNavigate();

  // Exam state
  const [examTitle, setExamTitle] = useState("Nova Prova");
  const [examStatus, setExamStatus] = useState<"draft" | "applied" | "in_progress" | "graded">("draft");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [pointsMode, setPointsMode] = useState("by_grade");
  const [activeTab, setActiveTab] = useState("questions");

  // Config state
  const [institution, setInstitution] = useState("");
  const [professor, setProfessor] = useState("");
  const [showPreInstructions, setShowPreInstructions] = useState(false);
  const [preInstructions, setPreInstructions] = useState("");
  const [showDuringInstructions, setShowDuringInstructions] = useState(false);
  const [duringInstructions, setDuringInstructions] = useState("");

  // Application state
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [duration, setDuration] = useState("100");
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantStatus, setParticipantStatus] = useState("all");

  // Grading state
  const [gradingSearch, setGradingSearch] = useState("");
  const [examView, setExamView] = useState(false);
  const [publishGrades, setPublishGrades] = useState(true);

  // Question picker dialog
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedBankIds, setSelectedBankIds] = useState<Set<string>>(new Set());
  const [pickerSearch, setPickerSearch] = useState("");

  // Create question dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState("multiple_choice");
  const [createTitle, setCreateTitle] = useState("");

  // Add/Create menus
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  const usedIds = useMemo(() => new Set(questions.map((q) => q.questionId)), [questions]);

  const totalPoints = questions.reduce((s, q) => s + q.points, 0);

  const filteredBank = bankQuestions.filter(
    (q) =>
      !usedIds.has(q.id) &&
      (q.title.toLowerCase().includes(pickerSearch.toLowerCase()) ||
        q.tags.some((t) => t.toLowerCase().includes(pickerSearch.toLowerCase())))
  );

  const toggleBankSelect = (id: string) => {
    setSelectedBankIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSelectedQuestions = () => {
    const toAdd = bankQuestions.filter((q) => selectedBankIds.has(q.id));
    const newQuestions: ExamQuestion[] = toAdd.map((q) => ({
      id: `eq-${Date.now()}-${q.id}`,
      questionId: q.id,
      title: q.title,
      type: q.type,
      points: 0.6,
      options: q.options,
    }));
    setQuestions((prev) => [...prev, ...newQuestions]);
    setSelectedBankIds(new Set());
    setPickerOpen(false);
    toast.success(`${toAdd.length} questão(ões) adicionada(s).`);
  };

  const handleCreateQuestion = () => {
    if (!createTitle.trim()) {
      toast.error("Digite o enunciado da questão.");
      return;
    }
    const newQ: ExamQuestion = {
      id: `eq-new-${Date.now()}`,
      questionId: `custom-${Date.now()}`,
      title: createTitle,
      type: createType,
      points: 0.6,
    };
    setQuestions((prev) => [...prev, newQ]);
    setCreateOpen(false);
    setCreateTitle("");
    toast.success("Questão criada e adicionada à prova.");
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const updatePoints = (id: string, pts: number) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, points: pts } : q)));
  };

  const handleSave = () => {
    toast.success("Prova salva com sucesso!");
  };

  const handleDuplicate = () => {
    toast.success("Prova duplicada com sucesso!");
  };

  const statusLabel: Record<string, { label: string; className: string }> = {
    draft: { label: "EM ELABORAÇÃO", className: "bg-muted text-muted-foreground" },
    applied: { label: "APLICADA", className: "bg-primary text-primary-foreground" },
    in_progress: { label: "EM APLICAÇÃO", className: "bg-warning text-warning-foreground" },
    graded: { label: "CONSOLIDADA", className: "bg-success text-success-foreground" },
  };

  const currentStatus = statusLabel[examStatus];
  const showExtraTabs = examStatus === "applied" || examStatus === "in_progress" || examStatus === "graded";

  const completedCount = mockParticipants.filter((p) => p.status === "completed").length;
  const inProgressCount = mockParticipants.filter((p) => p.status === "in_progress").length;
  const notStartedCount = mockParticipants.filter((p) => p.status === "not_started").length;

  const avgScore = mockParticipants.length > 0
    ? (mockParticipants.reduce((s, p) => s + (p.score || 0), 0) / mockParticipants.length).toFixed(2)
    : "0";

  const stdDev = (() => {
    if (mockParticipants.length === 0) return "0";
    const avg = mockParticipants.reduce((s, p) => s + (p.score || 0), 0) / mockParticipants.length;
    const variance = mockParticipants.reduce((s, p) => s + Math.pow((p.score || 0) - avg, 2), 0) / mockParticipants.length;
    return Math.sqrt(variance).toFixed(2);
  })();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Input
            value={examTitle}
            onChange={(e) => setExamTitle(e.target.value)}
            className="text-xl font-bold border-0 bg-transparent px-0 h-auto focus-visible:ring-0 shadow-none"
          />
          {questions.length > 0 && (
            <p className="text-sm text-muted-foreground">Valor da prova: <span className="font-bold">{totalPoints.toFixed(2).replace(".", ",")}</span></p>
          )}
        </div>
        <Badge className={`text-xs px-3 py-1 font-bold uppercase ${currentStatus.className}`}>
          {currentStatus.label}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent border-b rounded-none w-full justify-start p-0 h-auto">
          <TabsTrigger value="questions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 font-medium text-muted-foreground data-[state=active]:text-primary">
            Questões
          </TabsTrigger>
          <TabsTrigger value="config" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 font-medium text-muted-foreground data-[state=active]:text-primary">
            Configurações
          </TabsTrigger>
          {showExtraTabs && (
            <>
              <TabsTrigger value="application" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 font-medium text-muted-foreground data-[state=active]:text-primary">
                Aplicação
              </TabsTrigger>
              <TabsTrigger value="grading" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 font-medium text-muted-foreground data-[state=active]:text-primary">
                Correção
              </TabsTrigger>
              <TabsTrigger value="stats" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 font-medium text-muted-foreground data-[state=active]:text-primary">
                Estatísticas
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* ===== QUESTÕES TAB ===== */}
        <TabsContent value="questions" className="mt-6 space-y-6">
          {/* Points mode */}
          <div className="flex items-center justify-end gap-3">
            <span className="text-sm text-muted-foreground">Valor das questões</span>
            <Select value={pointsMode} onValueChange={setPointsMode}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="by_grade">Por nota</SelectItem>
                <SelectItem value="equal">Igual</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">Valor da prova:</span>
            <span className="text-lg font-bold">{totalPoints.toFixed(2).replace(".", ",")}</span>
          </div>

          {/* Questions list */}
          {questions.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-8">Nenhuma questão foi associada a esta prova</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <Card key={q.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-primary font-bold text-sm mt-0.5">QUESTÃO {idx + 1}</span>
                      <div className="flex items-center gap-2">
                        {typeIcons[q.type]}
                        <Badge variant="outline" className="text-[10px]">
                          {typeLabels[q.type] || q.type}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => removeQuestion(q.id)}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-sm mt-2 leading-relaxed">{q.title}</p>
                  {q.options && (
                    <div className="mt-3 space-y-1.5">
                      {q.options.map((opt, i) => (
                        <div key={i} className={`text-sm flex gap-2 ${opt.isCorrect ? "font-semibold" : ""}`}>
                          <span className="font-bold">{String.fromCharCode(65 + i)})</span>
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <span className="text-xs text-muted-foreground">Elaborada por mim</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Valor:</span>
                      <Input
                        type="number"
                        step="0.1"
                        value={q.points}
                        onChange={(e) => updatePoints(q.id, parseFloat(e.target.value) || 0)}
                        className="w-16 h-7 text-xs text-right"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Action buttons: ADICIONAR and CRIAR */}
          <div className="flex flex-col items-center gap-3">
            {/* ADICIONAR dropdown */}
            <DropdownMenu open={addMenuOpen} onOpenChange={setAddMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg" className="gap-2">
                  <ListPlus className="h-4 w-4" />
                  ADICIONAR
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => { setAddMenuOpen(false); setPickerOpen(true); }}>
                  Questão
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setAddMenuOpen(false); setPickerOpen(true); }}>
                  Combinação
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* CRIAR dropdown */}
            <DropdownMenu open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="lg" className="gap-2">
                  <Plus className="h-4 w-4" />
                  CRIAR
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {questionTypes.map((qt) => (
                  <DropdownMenuItem
                    key={qt.value}
                    onClick={() => {
                      setCreateMenuOpen(false);
                      setCreateType(qt.value);
                      setCreateTitle("");
                      setCreateOpen(true);
                    }}
                  >
                    {qt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Footer actions */}
          <Separator />
          <div className="flex items-center justify-end gap-3 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Eye className="h-4 w-4" /> RASCUNHO EM PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDuplicate}>
              <Copy className="h-4 w-4" /> DUPLICAR PROVA
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/exams")}>
              VOLTAR
            </Button>
            <Button size="sm" onClick={handleSave} className="gap-1.5">
              <Save className="h-4 w-4" /> SALVAR
            </Button>
          </div>
        </TabsContent>

        {/* ===== CONFIGURAÇÕES TAB ===== */}
        <TabsContent value="config" className="mt-6 space-y-6 max-w-2xl">
          <div className="space-y-2">
            <Label>Título da Prova:</Label>
            <Input value={examTitle} onChange={(e) => setExamTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Instituição:</Label>
            <Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Nome da instituição" />
          </div>
          <div className="space-y-2">
            <Label>Professor(a):</Label>
            <Input value={professor} onChange={(e) => setProfessor(e.target.value)} placeholder="Nome do professor" />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={showPreInstructions} onCheckedChange={setShowPreInstructions} />
            <Label>Exibir instruções preparatórias para a prova</Label>
          </div>
          {showPreInstructions && (
            <Textarea value={preInstructions} onChange={(e) => setPreInstructions(e.target.value)} placeholder="Instruções preparatórias..." rows={3} />
          )}

          <div className="flex items-center gap-3">
            <Switch checked={showDuringInstructions} onCheckedChange={setShowDuringInstructions} />
            <Label>Exibir instruções para a prova (durante a prova)</Label>
          </div>
          {showDuringInstructions && (
            <Textarea value={duringInstructions} onChange={(e) => setDuringInstructions(e.target.value)} placeholder="Instruções durante a prova..." rows={3} />
          )}

          <Separator />
          <h3 className="font-semibold text-sm">Configurações adicionais</h3>
          <div className="space-y-2">
            <Label>Ordem das questões:</Label>
            <Select defaultValue="fixed">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixa</SelectItem>
                <SelectItem value="random">Aleatória</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => navigate("/exams")}>VOLTAR</Button>
            <Button onClick={handleSave}>SALVAR</Button>
          </div>
        </TabsContent>

        {/* ===== APLICAÇÃO TAB ===== */}
        <TabsContent value="application" className="mt-6 space-y-6">
          <div>
            <h3 className="font-semibold text-base mb-3">Agendamento</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Hora atual: {new Date().toLocaleString("pt-BR")}</p>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-2">
                  <Label>Início janela:</Label>
                  <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Fim janela:</Label>
                  <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2 mt-3">
                <Label>Duração (minutos):</Label>
                <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-32" />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-base mb-3">Participantes</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou matrícula"
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={participantStatus} onValueChange={setParticipantStatus}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="in_progress">Em execução</SelectItem>
                  <SelectItem value="not_started">Não iniciada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <span className="text-success">Provas concluídas: {completedCount}</span>
              <span>Em execução: {inProgressCount}</span>
              <span>Não iniciadas: {notStartedCount}</span>
              <span className="text-primary font-semibold">Total: {mockParticipants.length}</span>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Nota</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockParticipants.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.matricula}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>
                      <Badge className={
                        p.status === "completed" ? "bg-success text-success-foreground" :
                        p.status === "in_progress" ? "bg-warning text-warning-foreground" :
                        "bg-muted text-muted-foreground"
                      }>
                        {p.status === "completed" ? "CONCLUÍDA" : p.status === "in_progress" ? "EM EXECUÇÃO" : "NÃO INICIADA"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {p.score !== null ? p.score.toFixed(2).replace(".", ",") : "—"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ===== CORREÇÃO TAB ===== */}
        <TabsContent value="grading" className="mt-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou matrícula"
                value={gradingSearch}
                onChange={(e) => setGradingSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Vista de prova:</Label>
                <Switch checked={examView} onCheckedChange={setExamView} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Notas publicadas:</Label>
                <Switch checked={publishGrades} onCheckedChange={setPublishGrades} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="text-success">Questões corrigidas: {mockParticipants.length * questions.length || 430}</span>
            <span>Não corrigidas: 0</span>
            <span>Não respondidas: 0</span>
            <span className="text-primary font-semibold">Total: {mockParticipants.length * questions.length || 430}</span>
          </div>

          <div className="flex items-center justify-between">
            <Select defaultValue="full">
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Visualização completa</SelectItem>
                <SelectItem value="summary">Resumo</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-4 w-4" /> EXPORTAR NOTAS
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="font-bold">Nota</TableHead>
                  {Array.from({ length: 9 }, (_, i) => (
                    <TableHead key={i} className="text-center text-xs">
                      Q{i + 1}<br /><span className="text-[10px] text-muted-foreground">(0,60)</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockParticipants.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.matricula}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{p.name}</TableCell>
                    <TableCell className="font-bold text-primary">{p.score?.toFixed(2).replace(".", ",")}</TableCell>
                    {p.questionScores.map((s, i) => (
                      <TableCell key={i} className="text-center text-sm">
                        {s !== null ? s.toFixed(1).replace(".", ",") : "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ===== ESTATÍSTICAS TAB ===== */}
        <TabsContent value="stats" className="mt-6 space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">{avgScore.replace(".", ",")}</p>
              <p className="text-sm text-muted-foreground mt-1">Média de nota da turma</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">{stdDev.replace(".", ",")}</p>
              <p className="text-sm text-muted-foreground mt-1">Desvio padrão de nota da turma</p>
            </div>
          </div>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Histograma de notas</h3>
              <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={histogramData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" tick={{ fontSize: 12 }} label={{ value: "Faixa das notas", position: "insideBottom", offset: -5 }} />
                <YAxis label={{ value: "Número de alunos", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(220 60% 50%)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Porcentagem de acerto por questão</h3>
              <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={accuracyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="q" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="pct" fill="hsl(220 50% 35%)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== QUESTION PICKER DIALOG ===== */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar Questões do Banco</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1.5" /> FILTROS
            </Button>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredBank.map((q) => {
                const isSelected = selectedBankIds.has(q.id);
                return (
                  <Card
                    key={q.id}
                    className={`p-3 cursor-pointer transition-all ${
                      isSelected ? "ring-2 ring-primary border-primary" : "hover:border-primary/30"
                    }`}
                    onClick={() => toggleBankSelect(q.id)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {typeIcons[q.type]}
                      <span className="text-xs text-muted-foreground">0%</span>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-success ml-auto" />}
                    </div>
                    <p className="text-xs leading-relaxed line-clamp-5">{q.title}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {q.tags.map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">Elaborada por mim</p>
                  </Card>
                );
              })}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setPickerOpen(false)}>VOLTAR</Button>
            <Button
              disabled={selectedBankIds.size === 0}
              onClick={addSelectedQuestions}
            >
              ADICIONAR {selectedBankIds.size > 0 ? `${selectedBankIds.size} QUESTÃO(ÕES)` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== CREATE QUESTION DIALOG ===== */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar Questão — {questionTypes.find((t) => t.value === createType)?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Enunciado da Questão</Label>
              <Textarea
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Digite o enunciado..."
                rows={4}
              />
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
                <Label>Tags</Label>
                <Input placeholder="Ex: Farmacologia" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateQuestion}>Criar e Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
