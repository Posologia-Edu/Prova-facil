import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  MoreVertical,
  Eye,
  Copy,
  Save,
  CheckCircle2,
  HelpCircle,
  AlignLeft,
  ArrowLeftRight,
  Search,
  Filter,
  ListPlus,
  Sparkles,
  Download,
  Loader2,
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
import { supabase } from "@/integrations/supabase/client";
import { AIQuestionGenerator, type GeneratedQuestion } from "@/components/AIQuestionGenerator";
import { useLanguage } from "@/i18n/LanguageContext";

// Types
interface BankQuestion {
  id: string;
  type: string;
  title: string;
  difficulty: string;
  tags: string[];
  content_json: any;
}

interface ExamQuestion {
  id: string;
  questionId: string;
  title: string;
  type: string;
  points: number;
}

interface Participant {
  id: string;
  name: string;
  matricula: string;
  status: string;
  score: number | null;
  questionScores: (number | null)[];
}

const typeIcons: Record<string, React.ReactNode> = {
  multiple_choice: <CheckCircle2 className="h-3.5 w-3.5" />,
  true_false: <HelpCircle className="h-3.5 w-3.5" />,
  open_ended: <AlignLeft className="h-3.5 w-3.5" />,
  matching: <ArrowLeftRight className="h-3.5 w-3.5" />,
};

const typeLabels: Record<string, string> = {
  multiple_choice: "Múltipla Escolha",
  true_false: "Verdadeiro ou Falso",
  open_ended: "Dissertativa",
  matching: "Associação de Colunas",
};

const createQuestionTypes = [
  { value: "multiple_choice", label: "Múltipla Escolha" },
  { value: "true_false", label: "Verdadeiro ou Falso" },
  { value: "open_ended", label: "Dissertativa" },
  { value: "matching", label: "Associação de Colunas" },
];

export default function ExamEditorPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();

  // Exam state
  const [examTitle, setExamTitle] = useState("Nova Prova");
  const [examStatus, setExamStatus] = useState<string>("draft");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [pointsMode, setPointsMode] = useState("by_grade");
  const [activeTab, setActiveTab] = useState("questions");
  const [loading, setLoading] = useState(true);

  // Config state
  const [institution, setInstitution] = useState("");
  const [professor, setProfessor] = useState("");
  const [showPreInstructions, setShowPreInstructions] = useState(false);
  const [preInstructions, setPreInstructions] = useState("");
  const [showDuringInstructions, setShowDuringInstructions] = useState(false);
  const [duringInstructions, setDuringInstructions] = useState("");
  const [classId, setClassId] = useState<string | null>(null);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);

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

  // Bank questions from DB
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);

  // Question picker dialog
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"single" | "combo">("single");
  const [selectedBankIds, setSelectedBankIds] = useState<Set<string>>(new Set());
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerTypeFilter, setPickerTypeFilter] = useState("all");
  const [pickerDiffFilter, setPickerDiffFilter] = useState("all");

  // Create question dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState("multiple_choice");
  const [createTitle, setCreateTitle] = useState("");
  const [createDifficulty, setCreateDifficulty] = useState("medium");
  const [createTags, setCreateTags] = useState("");
  const [createBloom, setCreateBloom] = useState("understanding");

  // AI generator
  const [aiOpen, setAiOpen] = useState(false);

  // Menus
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  // Participants (from DB)
  const [participants, setParticipants] = useState<Participant[]>([]);

  const usedIds = useMemo(() => new Set(questions.map((q) => q.questionId)), [questions]);
  const totalPoints = questions.reduce((s, q) => s + q.points, 0);

  // Load exam data
  useEffect(() => {
    const loadExam = async () => {
      if (!examId) return;
      setLoading(true);

      const { data: exam } = await supabase
        .from("exams")
        .select("*")
        .eq("id", examId)
        .single();

      if (exam) {
        setExamTitle(exam.title);
        setExamStatus(exam.status);
        setClassId(exam.class_id || null);
        const hc = exam.header_config_json as any;
        if (hc) {
          setInstitution(hc.institution || "");
          setProfessor(hc.professor || "");
          setShowPreInstructions(!!hc.preInstructions);
          setPreInstructions(hc.preInstructions || "");
          setShowDuringInstructions(!!hc.duringInstructions);
          setDuringInstructions(hc.duringInstructions || "");
        }
      }

      // Load exam questions
      const { data: eqs } = await supabase
        .from("exam_questions")
        .select("id, question_id, position, points, section_name")
        .eq("exam_id", examId)
        .order("position", { ascending: true });

      if (eqs && eqs.length > 0) {
        const qIds = eqs.map((eq) => eq.question_id);
        const { data: qBank } = await supabase
          .from("question_bank")
          .select("id, type, content_json")
          .in("id", qIds);

        const qMap: Record<string, any> = {};
        (qBank || []).forEach((q) => { qMap[q.id] = q; });

        setQuestions(
          eqs.map((eq) => {
            const bq = qMap[eq.question_id];
            const cj = bq?.content_json as any;
            return {
              id: eq.id,
              questionId: eq.question_id,
              title: cj?.question_text || cj?.title || "Questão",
              type: bq?.type || "multiple_choice",
              points: Number(eq.points) || 0.6,
            };
          })
        );
      }

      setLoading(false);
    };

    loadExam();
  }, [examId]);

  // Load classes
  useEffect(() => {
    const loadClasses = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data } = await supabase
        .from("classes")
        .select("id, name")
        .eq("user_id", user.user.id)
        .is("deleted_at", null)
        .order("name");
      setClasses((data || []).map(c => ({ id: c.id, name: c.name })));
    };
    loadClasses();
  }, []);

  // Load bank questions
  useEffect(() => {
    const loadBank = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data } = await supabase
        .from("question_bank")
        .select("id, type, content_json, difficulty, tags")
        .eq("user_id", user.user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      setBankQuestions(
        (data || []).map((q) => {
          const cj = q.content_json as any;
          return {
            id: q.id,
            type: q.type,
            title: cj?.question_text || cj?.title || "Questão",
            difficulty: q.difficulty,
            tags: q.tags || [],
            content_json: q.content_json,
          };
        })
      );
    };
    loadBank();
  }, []);

  const filteredBank = bankQuestions.filter((q) => {
    if (usedIds.has(q.id)) return false;
    if (pickerTypeFilter !== "all" && q.type !== pickerTypeFilter) return false;
    if (pickerDiffFilter !== "all" && q.difficulty !== pickerDiffFilter) return false;
    if (!pickerSearch.trim()) return true;
    const search = pickerSearch.toLowerCase();
    return (
      q.title.toLowerCase().includes(search) ||
      q.tags.some((t) => t.toLowerCase().includes(search)) ||
      (q.content_json as any)?.question_text?.toLowerCase()?.includes(search)
    );
  });

  const toggleBankSelect = (id: string) => {
    if (pickerMode === "single") {
      // Single mode: only one at a time
      setSelectedBankIds((prev) => {
        if (prev.has(id)) return new Set();
        return new Set([id]);
      });
    } else {
      // Combo mode: multiple
      setSelectedBankIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  };

  const addSelectedQuestions = async () => {
    if (!examId) return;
    const toAdd = bankQuestions.filter((q) => selectedBankIds.has(q.id));
    const startPos = questions.length;

    const inserts = toAdd.map((q, i) => ({
      exam_id: examId,
      question_id: q.id,
      position: startPos + i,
      points: 0.6,
    }));

    const { data, error } = await supabase
      .from("exam_questions")
      .insert(inserts)
      .select("id, question_id, position, points");

    if (error) { toast.error("Erro ao adicionar questões."); return; }

    const newQuestions: ExamQuestion[] = (data || []).map((eq) => {
      const bq = bankQuestions.find((b) => b.id === eq.question_id);
      return {
        id: eq.id,
        questionId: eq.question_id,
        title: bq?.title || "Questão",
        type: bq?.type || "multiple_choice",
        points: Number(eq.points) || 0.6,
      };
    });

    setQuestions((prev) => [...prev, ...newQuestions]);
    setSelectedBankIds(new Set());
    setPickerOpen(false);
    toast.success(`${toAdd.length} questão(ões) adicionada(s).`);
  };

  const handleCreateQuestion = async () => {
    if (!createTitle.trim()) {
      toast.error("Digite o enunciado da questão.");
      return;
    }
    const { data: user } = await supabase.auth.getUser();
    if (!user.user || !examId) return;

    // Create in question_bank
    const contentJson: any = { question_text: createTitle };
    const tags = createTags.split(",").map((t) => t.trim()).filter(Boolean);

    const { data: newQ, error: qErr } = await supabase
      .from("question_bank")
      .insert({
        user_id: user.user.id,
        type: createType,
        difficulty: createDifficulty,
        bloom_level: createBloom,
        tags,
        content_json: contentJson,
      })
      .select("id")
      .single();

    if (qErr || !newQ) { toast.error("Erro ao criar questão."); return; }

    // Add to exam
    const pos = questions.length;
    const { data: eqData, error: eqErr } = await supabase
      .from("exam_questions")
      .insert({ exam_id: examId, question_id: newQ.id, position: pos, points: 0.6 })
      .select("id")
      .single();

    if (eqErr) { toast.error("Erro ao adicionar à prova."); return; }

    setQuestions((prev) => [
      ...prev,
      {
        id: eqData!.id,
        questionId: newQ.id,
        title: createTitle,
        type: createType,
        points: 0.6,
      },
    ]);

    // Also add to bank list
    setBankQuestions((prev) => [
      { id: newQ.id, type: createType, title: createTitle, difficulty: createDifficulty, tags, content_json: contentJson },
      ...prev,
    ]);

    setCreateOpen(false);
    setCreateTitle("");
    setCreateTags("");
    toast.success("Questão criada e adicionada à prova.");
  };

  const handleAISave = async (generated: GeneratedQuestion[]) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user || !examId) return;

    for (const g of generated) {
      const contentJson: any = {
        question_text: g.question_text,
        options: g.options,
        correct_answer: g.correct_answer,
        explanation: g.explanation,
        expected_answer: g.expected_answer,
        column_a: g.column_a,
        column_b: g.column_b,
        correct_matches: g.correct_matches,
      };

      const { data: newQ } = await supabase
        .from("question_bank")
        .insert({
          user_id: user.user.id,
          type: g.type,
          difficulty: g.difficulty,
          bloom_level: g.bloom_level,
          tags: g.tags || [],
          content_json: contentJson,
        })
        .select("id")
        .single();

      if (newQ) {
        const pos = questions.length;
        const { data: eqData } = await supabase
          .from("exam_questions")
          .insert({ exam_id: examId, question_id: newQ.id, position: pos, points: 0.6 })
          .select("id")
          .single();

        if (eqData) {
          setQuestions((prev) => [
            ...prev,
            { id: eqData.id, questionId: newQ.id, title: g.question_text, type: g.type, points: 0.6 },
          ]);
        }
      }
    }
    toast.success(`${generated.length} questão(ões) gerada(s) e adicionada(s).`);
  };

  const removeQuestion = async (id: string) => {
    await supabase.from("exam_questions").delete().eq("id", id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const updatePoints = async (id: string, pts: number) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, points: pts } : q)));
    await supabase.from("exam_questions").update({ points: pts }).eq("id", id);
  };

  const handleSave = async () => {
    if (!examId) return;
    await supabase.from("exams").update({
      title: examTitle,
      class_id: classId,
      header_config_json: {
        institution,
        professor,
        preInstructions: showPreInstructions ? preInstructions : "",
        duringInstructions: showDuringInstructions ? duringInstructions : "",
      },
    }).eq("id", examId);
    toast.success("Prova salva com sucesso!");
  };

  const handleDuplicate = async () => {
    if (!examId) return;
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data } = await supabase
      .from("exams")
      .insert({ user_id: user.user.id, title: `${examTitle} (cópia)`, status: "draft" })
      .select("id")
      .single();

    if (!data) { toast.error("Erro ao duplicar."); return; }

    if (questions.length > 0) {
      await supabase.from("exam_questions").insert(
        questions.map((q, i) => ({ exam_id: data.id, question_id: q.questionId, position: i, points: q.points }))
      );
    }
    toast.success("Prova duplicada com sucesso!");
  };

  const statusLabel: Record<string, { label: string; className: string }> = {
    draft: { label: "EM ELABORAÇÃO", className: "bg-muted text-muted-foreground" },
    applied: { label: "APLICADA", className: "bg-primary text-primary-foreground" },
    in_progress: { label: "EM APLICAÇÃO", className: "bg-warning text-warning-foreground" },
    graded: { label: "CONSOLIDADA", className: "bg-success text-success-foreground" },
  };

  const currentStatus = statusLabel[examStatus] || statusLabel.draft;
  const showExtraTabs = examStatus === "applied" || examStatus === "in_progress" || examStatus === "graded";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                <DropdownMenuItem onClick={() => { setAddMenuOpen(false); setPickerMode("single"); setSelectedBankIds(new Set()); setPickerOpen(true); }}>
                  Questão Simples
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setAddMenuOpen(false); setPickerMode("combo"); setSelectedBankIds(new Set()); setPickerOpen(true); }}>
                  Combinação de Questões
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
                {createQuestionTypes.map((qt) => (
                  <DropdownMenuItem
                    key={qt.value}
                    onClick={() => {
                      setCreateMenuOpen(false);
                      setCreateType(qt.value);
                      setCreateTitle("");
                      setCreateTags("");
                      setCreateDifficulty("medium");
                      setCreateBloom("understanding");
                      setCreateOpen(true);
                    }}
                  >
                    {qt.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onClick={() => {
                    setCreateMenuOpen(false);
                    setAiOpen(true);
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-2 text-secondary" />
                  Gerar com IA
                </DropdownMenuItem>
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

          <div className="space-y-2">
            <Label>Vincular a uma turma:</Label>
            <Select value={classId || "none"} onValueChange={(v) => setClassId(v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione uma turma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma turma</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            </div>
            <p className="text-sm text-muted-foreground">Nenhum participante registrado ainda.</p>
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
          <p className="text-sm text-muted-foreground">Nenhuma correção disponível.</p>
        </TabsContent>

        {/* ===== ESTATÍSTICAS TAB ===== */}
        <TabsContent value="stats" className="mt-6 space-y-8">
          <p className="text-sm text-muted-foreground">Nenhuma estatística disponível ainda.</p>
        </TabsContent>
      </Tabs>

      {/* ===== QUESTION PICKER DIALOG ===== */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {pickerMode === "single" ? "Selecionar Questão" : "Selecionar Questões (Combinação)"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por texto ou tag..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={pickerTypeFilter} onValueChange={setPickerTypeFilter}>
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                <SelectItem value="true_false">V ou F</SelectItem>
                <SelectItem value="open_ended">Dissertativa</SelectItem>
                <SelectItem value="matching">Associação</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pickerDiffFilter} onValueChange={setPickerDiffFilter}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
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

          <div className="flex-1 overflow-auto">
            {filteredBank.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma questão encontrada no banco.</p>
            ) : (
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
                        <Badge variant="outline" className="text-[10px]">
                          {typeLabels[q.type] || q.type}
                        </Badge>
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
            )}
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
            <DialogTitle>Criar Questão — {createQuestionTypes.find((t) => t.value === createType)?.label}</DialogTitle>
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
                <Select value={createDifficulty} onValueChange={setCreateDifficulty}>
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
                <Select value={createBloom} onValueChange={setCreateBloom}>
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
              <Input value={createTags} onChange={(e) => setCreateTags(e.target.value)} placeholder="Ex: Farmacologia, Cardiovascular" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateQuestion}>Criar e Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== AI QUESTION GENERATOR ===== */}
      <AIQuestionGenerator
        open={aiOpen}
        onOpenChange={setAiOpen}
        onSaveQuestions={handleAISave}
      />
    </div>
  );
}
