import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ExamPDFExporter from "@/components/ExamPDFExporter";
import PublishExamDialog from "@/components/PublishExamDialog";
import ExamTemplatesDialog, { type ExamTemplate } from "@/components/ExamTemplatesDialog";
import { AIQuestionGenerator, type GeneratedQuestion } from "@/components/AIQuestionGenerator";
import {
  Plus,
  GripVertical,
  Settings2,
  FileDown,
  Shuffle,
  LayoutTemplate,
  Share2,
  Trash2,
  CheckCircle2,
  HelpCircle,
  AlignLeft,
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BankQuestion {
  id: string;
  type: string;
  title: string;
  difficulty: string;
  tags: string[];
  contentJson?: Record<string, any>;
}

interface ExamQuestion {
  id: string;
  questionId: string;
  title: string;
  type: string;
  points: number;
  contentJson?: Record<string, any>;
}

interface Section {
  id: string;
  name: string;
  questions: ExamQuestion[];
  collapsed: boolean;
}

const difficultyLabels: Record<string, string> = {
  easy: "fácil",
  medium: "média",
  hard: "difícil",
};

const difficultyOrder: Record<string, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

const typeIcons: Record<string, React.ReactNode> = {
  multiple_choice: <CheckCircle2 className="h-3.5 w-3.5" />,
  true_false: <HelpCircle className="h-3.5 w-3.5" />,
  open_ended: <AlignLeft className="h-3.5 w-3.5" />,
  matching: <ArrowLeftRight className="h-3.5 w-3.5" />,
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function ComposerPage() {
  const navigate = useNavigate();
  const [examTitle, setExamTitle] = useState("Nova Prova");
  const [examId, setExamId] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [headerOpen, setHeaderOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [shuffleActive, setShuffleActive] = useState(false);
  const [sectionNameEdit, setSectionNameEdit] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Bank questions from DB
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [bankLoading, setBankLoading] = useState(true);

  // Filters for question bank
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");

  // Header config
  const [institutionName, setInstitutionName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [examDate, setExamDate] = useState(new Date().toISOString().split("T")[0]);
  const [instructions, setInstructions] = useState("Responda todas as questões.");

  // Load bank questions from DB
  const loadBank = async () => {
    setBankLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setBankLoading(false); return; }

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
          contentJson: cj,
        };
      })
    );
    setBankLoading(false);
  };

  useEffect(() => { loadBank(); }, []);

  const applyTemplate = (template: ExamTemplate) => {
    setExamTitle(template.name);
    setSections(
      template.sections.map((sec, i) => ({
        id: `s-tpl-${i}-${Date.now()}`,
        name: sec.name,
        collapsed: false,
        questions: sec.questions.map((q, j) => ({
          id: `eq-tpl-${i}-${j}-${Date.now()}`,
          questionId: `tpl-${i}-${j}`,
          title: q.title,
          type: q.type,
          points: q.points,
        })),
      }))
    );
    setInstructions(`Tempo permitido: ${template.duration}. Responda todas as questões.`);
  };

  // IDs of questions already in exam
  const usedQuestionIds = useMemo(() => {
    const ids = new Set<string>();
    sections.forEach((s) => s.questions.forEach((q) => ids.add(q.questionId)));
    return ids;
  }, [sections]);

  // Get unique tags for filter
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    bankQuestions.forEach((q) => q.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [bankQuestions]);

  // Filtered and sorted bank questions
  const filteredBankQuestions = useMemo(() => {
    let filtered = bankQuestions.filter((q) => !usedQuestionIds.has(q.id));
    if (filterTag !== "all") {
      filtered = filtered.filter((q) => q.tags.includes(filterTag));
    }
    if (filterDifficulty !== "all") {
      filtered = filtered.filter((q) => q.difficulty === filterDifficulty);
    }
    return filtered.sort((a, b) => {
      const tagA = a.tags[0] || "";
      const tagB = b.tags[0] || "";
      if (tagA !== tagB) return tagA.localeCompare(tagB);
      return (difficultyOrder[a.difficulty] || 1) - (difficultyOrder[b.difficulty] || 1);
    });
  }, [bankQuestions, usedQuestionIds, filterTag, filterDifficulty]);

  const addQuestionToSection = (sectionId: string, question: BankQuestion) => {
    if (usedQuestionIds.has(question.id)) {
      toast.info("Esta questão já está na prova.");
      return;
    }
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: [
                ...s.questions,
                {
                  id: `eq-${Date.now()}`,
                  questionId: question.id,
                  title: question.title,
                  type: question.type,
                  points: 1,
                  contentJson: question.contentJson,
                },
              ],
            }
          : s
      )
    );
    toast.success("Questão adicionada!");
  };

  const removeQuestion = (sectionId: string, questionId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, questions: s.questions.filter((q) => q.id !== questionId) }
          : s
      )
    );
  };

  const addSection = () => {
    const newSection: Section = {
      id: `s-${Date.now()}`,
      name: `Parte ${sections.length + 1}`,
      collapsed: false,
      questions: [],
    };
    setSections((prev) => [...prev, newSection]);
    toast.success("Nova seção adicionada!");
  };

  const toggleSection = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s))
    );
  };

  const handleShuffle = () => {
    const newState = !shuffleActive;
    setShuffleActive(newState);
    if (newState) {
      setSections((prev) =>
        prev.map((s) => ({ ...s, questions: shuffleArray(s.questions) }))
      );
      toast.success("Embaralhamento ativado! Questões foram embaralhadas.");
    } else {
      toast.info("Embaralhamento desativado.");
    }
  };

  const updateSectionName = (sectionId: string, newName: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, name: newName } : s))
    );
    setSectionNameEdit(null);
  };

  const deleteSection = (sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    toast.success("Seção removida.");
  };

  const handleAISave = async (generated: GeneratedQuestion[]) => {
    // Refetch bank to show newly saved AI questions in the sidebar
    await loadBank();
  };

  // Save exam to DB
  const handleSaveExam = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { toast.error("Faça login primeiro."); return; }

    setSaving(true);

    try {
      // Create exam
      const { data: exam, error: examErr } = await supabase
        .from("exams")
        .insert({
          user_id: user.user.id,
          title: examTitle,
          status: "draft",
          header_config_json: { institution: institutionName, professor: teacherName, examDate, instructions },
        })
        .select("id")
        .single();

      if (examErr || !exam) throw examErr;

      // Insert exam questions (only real bank questions, skip template/ai-generated ones)
      let position = 0;
      for (const section of sections) {
        for (const q of section.questions) {
          const isRealId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q.questionId);
          if (isRealId) {
            await supabase.from("exam_questions").insert({
              exam_id: exam.id,
              question_id: q.questionId,
              position,
              points: q.points,
              section_name: section.name,
            });
          }
          position++;
        }
      }

      setExamId(exam.id);
      toast.success("Prova criada com sucesso!");
      navigate(`/exams/${exam.id}`);
    } catch (e) {
      toast.error("Erro ao salvar prova.");
    } finally {
      setSaving(false);
    }
  };

  const totalPoints = sections.reduce(
    (sum, s) => sum + s.questions.reduce((qsum, q) => qsum + q.points, 0),
    0
  );
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar: Banco de Questões */}
      <div className="w-80 border-r bg-card flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm">Banco de Questões</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Clique para adicionar à prova</p>
          {/* Filters */}
          <div className="flex gap-2 mt-3">
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Assunto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos assuntos</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger className="h-7 text-xs flex-1">
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
          {/* AI generate button */}
          <Button variant="outline" size="sm" className="w-full mt-3 gap-1.5" onClick={() => setAiOpen(true)}>
            <Sparkles className="h-3.5 w-3.5 text-secondary" />
            Gerar com IA
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {bankLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBankQuestions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6 italic">
              {usedQuestionIds.size > 0 ? "Todas as questões já estão na prova ou filtradas." : "Nenhuma questão encontrada no banco."}
            </p>
          ) : (
            filteredBankQuestions.map((q) => (
              <Card
                key={q.id}
                className="p-3 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                onClick={() => {
                  if (sections.length > 0) addQuestionToSection(sections[0].id, q);
                  else toast.info("Adicione uma seção primeiro.");
                }}
              >
                <div className="flex items-start gap-2">
                  <div className="text-muted-foreground mt-0.5">{typeIcons[q.type]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-snug line-clamp-2">{q.title}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Badge variant={q.difficulty as any} className="text-[10px] px-1.5 py-0">
                        {difficultyLabels[q.difficulty] || q.difficulty}
                      </Badge>
                      {q.tags.map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Canvas da Prova */}
      <div className="flex-1 flex flex-col bg-muted/50 overflow-auto">
        {/* Barra de Ferramentas */}
        <div className="px-6 py-3 border-b bg-card flex items-center gap-3 shrink-0">
          <div className="flex-1">
            <Input
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="text-lg font-bold border-0 bg-transparent px-0 h-auto focus-visible:ring-0 shadow-none"
            />
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalQuestions} questões · {totalPoints} pontos no total
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setTemplatesOpen(true)}>
            <LayoutTemplate className="h-3.5 w-3.5 mr-1.5" />
            Templates
          </Button>
          <Button variant="outline" size="sm" onClick={addSection}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Seção
          </Button>
          <Button
            variant={shuffleActive ? "default" : "outline"}
            size="sm"
            onClick={handleShuffle}
            className={`transition-all ${shuffleActive ? "shadow-inner ring-2 ring-primary/30 scale-95" : ""}`}
          >
            <Shuffle className="h-3.5 w-3.5 mr-1.5" />
            Embaralhar
          </Button>
          <Sheet open={headerOpen} onOpenChange={setHeaderOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                Cabeçalho
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Configuração do Cabeçalho</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label>Nome da Instituição</Label>
                  <Input value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nome do Professor(a)</Label>
                  <Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Data da Prova</Label>
                  <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Instruções</Label>
                  <Input value={instructions} onChange={(e) => setInstructions(e.target.value)} />
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Button size="sm" onClick={() => setExportOpen(true)}>
            <FileDown className="h-3.5 w-3.5 mr-1.5" />
            Exportar
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setPublishOpen(true)}>
            <Share2 className="h-3.5 w-3.5 mr-1.5" />
            Publicar Online
          </Button>
          <Button size="sm" onClick={handleSaveExam} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Criar Prova
          </Button>
        </div>

        <ExamPDFExporter
          open={exportOpen}
          onOpenChange={setExportOpen}
          examTitle={examTitle}
          sections={sections}
          institutionName={institutionName}
          teacherName={teacherName}
          examDate={examDate}
          instructions={instructions}
        />

        <ExamTemplatesDialog
          open={templatesOpen}
          onOpenChange={setTemplatesOpen}
          onSelectTemplate={applyTemplate}
        />

        <PublishExamDialog
          open={publishOpen}
          onOpenChange={setPublishOpen}
          examId={examId}
          examTitle={examTitle}
        />

        <AIQuestionGenerator
          open={aiOpen}
          onOpenChange={setAiOpen}
          onSaveQuestions={handleAISave}
        />

        {/* Prévia A4 */}
        <div className="flex-1 overflow-auto p-8 flex justify-center">
          <div className="w-[210mm] min-h-[297mm] exam-paper-bg shadow-xl rounded-sm border p-12 font-exam text-sm leading-relaxed">
            {/* Cabeçalho */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-secondary" />
                  <span className="text-sm font-bold text-foreground">ProvaFácil</span>
                </div>
                <div className="w-16 h-16 border border-dashed border-muted-foreground/30 rounded flex items-center justify-center">
                  <span className="text-[8px] text-muted-foreground">QR Code</span>
                </div>
              </div>
              {institutionName && <h2 className="text-base font-bold uppercase tracking-wide">{institutionName}</h2>}
              <Separator className="my-3 bg-foreground/20" />
              <h3 className="text-lg font-bold mt-2">{examTitle}</h3>
              <div className="flex justify-between text-xs mt-3 text-muted-foreground">
                {teacherName && <span>Professor(a): {teacherName}</span>}
                <span>Data: {new Date(examDate).toLocaleDateString("pt-BR")}</span>
              </div>
              <div className="mt-3 border-b border-dashed pb-2">
                <p className="text-xs">Nome do Aluno: ________________________________________ RA: _______________</p>
              </div>
              {instructions && (
                <p className="text-xs italic mt-3 text-muted-foreground text-left">
                  <strong>Instruções:</strong> {instructions}
                </p>
              )}
            </div>

            {/* Seções */}
            {sections.map((section) => (
              <div key={section.id} className="mb-6">
                <div
                  className="flex items-center gap-2 cursor-pointer select-none mb-3 group/section"
                  onClick={() => toggleSection(section.id)}
                >
                  {section.collapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {sectionNameEdit === section.id ? (
                    <Input
                      autoFocus
                      className="h-6 text-sm font-bold uppercase tracking-wider w-60"
                      defaultValue={section.name}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => updateSectionName(section.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") updateSectionName(section.id, e.currentTarget.value);
                      }}
                    />
                  ) : (
                    <h4
                      className="font-bold text-sm uppercase tracking-wider"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setSectionNameEdit(section.id);
                      }}
                    >
                      {section.name}
                    </h4>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {section.questions.reduce((s, q) => s + q.points, 0)} pts
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover/section:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSection(section.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
                {!section.collapsed && (
                  <div className="space-y-4 pl-2">
                    {section.questions.map((q, qi) => (
                      <div key={q.id} className="flex items-start gap-2 group">
                        <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 opacity-0 group-hover:opacity-100 cursor-grab transition-opacity" />
                        <span className="font-semibold text-xs min-w-[24px]">{qi + 1}.</span>
                        <div className="flex-1">
                          <p className="text-sm">{q.title}</p>
                          {q.type === "multiple_choice" && (() => {
                            const opts = q.contentJson?.options;
                            // options can be an object {a:"...",b:"..."} or array [{text:"..."}]
                            if (opts && typeof opts === "object" && !Array.isArray(opts)) {
                              const entries = Object.entries(opts as Record<string, string>).sort(([a], [b]) => a.localeCompare(b));
                              return (
                                <div className="mt-2 space-y-1 pl-4 text-xs text-muted-foreground">
                                  {entries.map(([letter, text]) => (
                                    <p key={letter}>{letter}) {text}</p>
                                  ))}
                                </div>
                              );
                            }
                            if (Array.isArray(opts) && opts.length > 0) {
                              return (
                                <div className="mt-2 space-y-1 pl-4 text-xs text-muted-foreground">
                                  {opts.map((opt: any, i: number) => (
                                    <p key={i}>{String.fromCharCode(97 + i)}) {typeof opt === "string" ? opt : opt.text}</p>
                                  ))}
                                </div>
                              );
                            }
                            return (
                              <div className="mt-2 space-y-1 pl-4 text-xs text-muted-foreground">
                                <p>a) ________________________</p>
                                <p>b) ________________________</p>
                                <p>c) ________________________</p>
                                <p>d) ________________________</p>
                              </div>
                            );
                          })()}
                          {q.type === "true_false" && (
                            <p className="mt-2 pl-4 text-xs text-muted-foreground">( ) Verdadeiro &nbsp;&nbsp; ( ) Falso</p>
                          )}
                          {q.type === "open_ended" && (
                            <div className="mt-2 border-b border-dashed" style={{ height: "60px" }} />
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">[{q.points} pts]</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => removeQuestion(section.id, q.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {section.questions.length === 0 && (
                      <p className="text-xs text-muted-foreground italic py-4 text-center">
                        Clique nas questões do banco para adicioná-las aqui
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {sections.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <p className="font-medium">Nenhuma seção ainda</p>
                <p className="text-xs mt-1">Adicione uma seção para começar a montar sua prova.</p>
              </div>
            )}

            {/* Footer branding */}
            <div className="mt-8 pt-3 border-t border-muted-foreground/20 text-center">
              <p className="text-[9px] text-muted-foreground/50">Gerado por <strong>ProvaFácil</strong> — provafacil.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
