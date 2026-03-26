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
  ListPlus,
  Sparkles,
  Loader2,
  Share2,
  Clock,
  Users,
  Bot,
  MessageSquare,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Shield,
} from "lucide-react";
import ModuleHelpGuide from "@/components/ModuleHelpGuide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import RichTextRenderer from "@/components/RichTextRenderer";
import { AIQuestionGenerator, type GeneratedQuestion } from "@/components/AIQuestionGenerator";
import AITutorChat from "@/components/AITutorChat";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Json } from "@/integrations/supabase/types";
import { computeExamStatus, examStatusConfig } from "@/lib/exam-status";

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

interface ClassStudent {
  id: string;
  student_name: string;
  student_email: string | null;
  student_registration: string | null;
}

interface SessionRow {
  id: string;
  student_email: string | null;
  student_name: string | null;
  status: string;
  total_score: number | null;
  max_score: number | null;
  started_at: string;
  finished_at: string | null;
  publication_id: string;
}

interface AnswerRow {
  id: string;
  question_id: string;
  answer_text: string | null;
  answer_json: Json;
  is_correct: boolean | null;
  points_earned: number | null;
  max_points: number | null;
  ai_score: number | null;
  ai_feedback: string | null;
  teacher_score: number | null;
  teacher_feedback: string | null;
  grading_status: string;
  question_bank: { type: string; content_json: Json } | null;
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

  // Proctoring config
  const [proctoringFullscreen, setProctoringFullscreen] = useState(false);
  const [proctoringBlockCopy, setProctoringBlockCopy] = useState(false);
  const [proctoringShuffleQ, setProctoringShuffleQ] = useState(false);
  const [proctoringShuffleAlt, setProctoringShuffleAlt] = useState(false);
  const [proctoringPhoto, setProctoringPhoto] = useState(false);
  const [proctoringPeriodicPhotos, setProctoringPeriodicPhotos] = useState(false);
  const [proctoringPhotoInterval, setProctoringPhotoInterval] = useState("5");
  const [proctoringWatermark, setProctoringWatermark] = useState(false);
  const [proctoringMaxViolations, setProctoringMaxViolations] = useState("3");
  const [classId, setClassId] = useState<string | null>(null);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);

  // Application state
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [participantSearch, setParticipantSearch] = useState("");
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [publication, setPublication] = useState<{ id: string; access_code: string; is_active: boolean } | null>(null);

  // Grading state
  const [gradingSearch, setGradingSearch] = useState("");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<AnswerRow[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewAnswer, setReviewAnswer] = useState<AnswerRow | null>(null);
  const [teacherScore, setTeacherScore] = useState("");
  const [teacherFeedback, setTeacherFeedback] = useState("");

  // Stats
  const [statsAnswers, setStatsAnswers] = useState<AnswerRow[]>([]);

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
        // Load proctoring config
        const pc = (exam as any).proctoring_config as any;
        if (pc && typeof pc === "object") {
          setProctoringFullscreen(!!pc.fullscreen);
          setProctoringBlockCopy(!!pc.blockCopyPaste);
          setProctoringShuffleQ(!!pc.shuffleQuestions);
          setProctoringShuffleAlt(!!pc.shuffleAlternatives);
          setProctoringPhoto(!!pc.requirePhoto);
          setProctoringPeriodicPhotos(!!pc.periodicPhotos);
          setProctoringPhotoInterval(String(pc.photoIntervalMinutes || 5));
          setProctoringWatermark(!!pc.watermark);
          setProctoringMaxViolations(String(pc.maxViolations || 3));
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

  // Load class students when classId changes
  useEffect(() => {
    const loadClassStudents = async () => {
      if (!classId) { setClassStudents([]); return; }
      const { data } = await supabase
        .from("class_students")
        .select("id, student_name, student_email, student_registration")
        .eq("class_id", classId)
        .order("student_name");
      setClassStudents(data || []);
      // Select all by default
      if (data) setSelectedStudentIds(new Set(data.map(s => s.id)));
    };
    loadClassStudents();
  }, [classId]);

  // Load existing publication
  useEffect(() => {
    const loadPublication = async () => {
      if (!examId) return;
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data } = await supabase
        .from("exam_publications")
        .select("id, access_code, is_active")
        .eq("exam_id", examId)
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setPublication(data);
        loadSessionsForExam(data.id);
      }
    };
    loadPublication();
  }, [examId]);

  const loadSessionsForExam = async (pubId: string) => {
    const { data } = await supabase
      .from("exam_sessions")
      .select("*")
      .eq("publication_id", pubId)
      .order("created_at", { ascending: false });
    setSessions((data as SessionRow[]) || []);

    if (data && data.length > 0) {
      const sessionIds = data.map((s: any) => s.id);
      const allAnswers: AnswerRow[] = [];
      for (let i = 0; i < sessionIds.length; i += 50) {
        const batch = sessionIds.slice(i, i + 50);
        const { data: ansData } = await supabase
          .from("student_answers")
          .select("*, question_bank(type, content_json)")
          .in("session_id", batch)
          .order("created_at");
        if (ansData) allAnswers.push(...(ansData as unknown as AnswerRow[]));
      }
      setStatsAnswers(allAnswers);
    }
  };

  const loadStudentAnswers = async (sessionId: string) => {
    setSelectedSession(sessionId);
    setLoadingAnswers(true);
    const { data } = await supabase
      .from("student_answers")
      .select("*, question_bank(type, content_json)")
      .eq("session_id", sessionId)
      .order("created_at");
    setSelectedAnswers((data as unknown as AnswerRow[]) || []);
    setLoadingAnswers(false);
  };

  const handlePublish = async () => {
    if (!examId) return;
    setPublishing(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Faça login primeiro."); setPublishing(false); return; }

    const { data, error } = await supabase
      .from("exam_publications")
      .insert({
        exam_id: examId,
        user_id: session.user.id,
        time_limit_minutes: parseInt(duration) || 60,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        end_at: endAt ? new Date(endAt).toISOString() : null,
        is_active: true,
      })
      .select("id, access_code, is_active")
      .single();

    setPublishing(false);
    if (error) { toast.error("Erro ao publicar prova."); return; }
    setPublication(data);
    toast.success("Prova publicada com sucesso!");
  };

  const openReview = (answer: AnswerRow) => {
    setReviewAnswer(answer);
    setTeacherScore(String(answer.teacher_score ?? answer.ai_score ?? ""));
    setTeacherFeedback(answer.teacher_feedback || "");
    setReviewOpen(true);
  };

  const saveReview = async () => {
    if (!reviewAnswer) return;
    await supabase
      .from("student_answers")
      .update({
        teacher_score: parseFloat(teacherScore) || 0,
        teacher_feedback: teacherFeedback,
        grading_status: "reviewed",
      })
      .eq("id", reviewAnswer.id);
    toast.success("Avaliação salva.");
    setReviewOpen(false);
    if (selectedSession) loadStudentAnswers(selectedSession);
  };

  const handleAISuggestScore = (score: number, feedback: string) => {
    setTeacherScore(String(score));
    setTeacherFeedback(feedback.substring(0, 300));
    toast.info(`Nota sugerida: ${score}/${Number(reviewAnswer?.max_points)} aplicada.`);
  };

  const filteredStudents = classStudents.filter(s => {
    if (!participantSearch.trim()) return true;
    const search = participantSearch.toLowerCase();
    return s.student_name.toLowerCase().includes(search) ||
      (s.student_email?.toLowerCase().includes(search)) ||
      (s.student_registration?.toLowerCase().includes(search));
  });

  const finishedSessions = sessions.filter(s => s.status === "submitted" || s.status === "graded" || s.status === "finished");
  const avgScore = finishedSessions.length > 0
    ? finishedSessions.reduce((sum, s) => sum + ((Number(s.total_score) || 0) / (Number(s.max_score) || 1)) * 100, 0) / finishedSessions.length
    : 0;
  const passRate = finishedSessions.length > 0
    ? (finishedSessions.filter(s => ((Number(s.total_score) || 0) / (Number(s.max_score) || 1)) >= 0.6).length / finishedSessions.length) * 100
    : 0;

  const qStats = useMemo(() => {
    const stats: Record<string, { total: number; correct: number; wrong: number; sumPoints: number; maxPts: number; text: string }> = {};
    statsAnswers.forEach(a => {
      const cj = (a.question_bank?.content_json || {}) as Record<string, any>;
      if (!stats[a.question_id]) {
        stats[a.question_id] = { total: 0, correct: 0, wrong: 0, sumPoints: 0, maxPts: Number(a.max_points) || 1, text: cj?.question_text || cj?.statement || "Questão" };
      }
      stats[a.question_id].total++;
      if (a.is_correct === true) stats[a.question_id].correct++;
      if (a.is_correct === false) stats[a.question_id].wrong++;
      stats[a.question_id].sumPoints += Number(a.points_earned) || 0;
    });
    return stats;
  }, [statsAnswers]);

  const mostMissed = Object.entries(qStats)
    .map(([id, s]) => ({ id, text: s.text.slice(0, 80), errorRate: s.total > 0 ? (s.wrong / s.total) * 100 : 0, total: s.total, wrong: s.wrong, avgPts: s.total > 0 ? s.sumPoints / s.total : 0, maxPts: s.maxPts }))
    .filter(q => q.total >= 1)
    .sort((a, b) => b.errorRate - a.errorRate);

  const scoreRanges = [
    { range: "0-20%", count: 0, color: "hsl(0, 70%, 50%)" },
    { range: "21-40%", count: 0, color: "hsl(30, 80%, 50%)" },
    { range: "41-60%", count: 0, color: "hsl(45, 90%, 50%)" },
    { range: "61-80%", count: 0, color: "hsl(142, 50%, 50%)" },
    { range: "81-100%", count: 0, color: "hsl(142, 60%, 35%)" },
  ];
  finishedSessions.forEach(s => {
    const pct = ((Number(s.total_score) || 0) / (Number(s.max_score) || 1)) * 100;
    if (pct <= 20) scoreRanges[0].count++;
    else if (pct <= 40) scoreRanges[1].count++;
    else if (pct <= 60) scoreRanges[2].count++;
    else if (pct <= 80) scoreRanges[3].count++;
    else scoreRanges[4].count++;
  });

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
      setSelectedBankIds((prev) => {
        if (prev.has(id)) return new Set();
        return new Set([id]);
      });
    } else {
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
    const inserts = toAdd.map((q, i) => ({ exam_id: examId, question_id: q.id, position: startPos + i, points: 0.6 }));
    const { data, error } = await supabase.from("exam_questions").insert(inserts).select("id, question_id, position, points");
    if (error) { toast.error("Erro ao adicionar questões."); return; }
    const newQuestions: ExamQuestion[] = (data || []).map((eq) => {
      const bq = bankQuestions.find((b) => b.id === eq.question_id);
      return { id: eq.id, questionId: eq.question_id, title: bq?.title || "Questão", type: bq?.type || "multiple_choice", points: Number(eq.points) || 0.6 };
    });
    setQuestions((prev) => [...prev, ...newQuestions]);
    setSelectedBankIds(new Set());
    setPickerOpen(false);
    toast.success(`${toAdd.length} questão(ões) adicionada(s).`);
  };

  const handleCreateQuestion = async () => {
    if (!createTitle.trim()) { toast.error("Digite o enunciado da questão."); return; }
    const { data: user } = await supabase.auth.getUser();
    if (!user.user || !examId) return;
    const contentJson: any = { question_text: createTitle };
    const tags = createTags.split(",").map((t) => t.trim()).filter(Boolean);
    const { data: newQ, error: qErr } = await supabase.from("question_bank").insert({ user_id: user.user.id, type: createType, difficulty: createDifficulty, bloom_level: createBloom, tags, content_json: contentJson }).select("id").single();
    if (qErr || !newQ) { toast.error("Erro ao criar questão."); return; }
    const pos = questions.length;
    const { data: eqData, error: eqErr } = await supabase.from("exam_questions").insert({ exam_id: examId, question_id: newQ.id, position: pos, points: 0.6 }).select("id").single();
    if (eqErr) { toast.error("Erro ao adicionar à prova."); return; }
    setQuestions((prev) => [...prev, { id: eqData!.id, questionId: newQ.id, title: createTitle, type: createType, points: 0.6 }]);
    setBankQuestions((prev) => [{ id: newQ.id, type: createType, title: createTitle, difficulty: createDifficulty, tags, content_json: contentJson }, ...prev]);
    setCreateOpen(false);
    setCreateTitle("");
    setCreateTags("");
    toast.success("Questão criada e adicionada à prova.");
  };

  const handleAISave = async (generated: GeneratedQuestion[]) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user || !examId) return;
    for (const g of generated) {
      const contentJson: any = { question_text: g.question_text, options: g.options, correct_answer: g.correct_answer, explanation: g.explanation, expected_answer: g.expected_answer, column_a: g.column_a, column_b: g.column_b, correct_matches: g.correct_matches };
      const { data: newQ } = await supabase.from("question_bank").insert({ user_id: user.user.id, type: g.type, difficulty: g.difficulty, bloom_level: g.bloom_level, tags: g.tags || [], content_json: contentJson }).select("id").single();
      if (newQ) {
        const pos = questions.length;
        const { data: eqData } = await supabase.from("exam_questions").insert({ exam_id: examId, question_id: newQ.id, position: pos, points: 0.6 }).select("id").single();
        if (eqData) setQuestions((prev) => [...prev, { id: eqData.id, questionId: newQ.id, title: g.question_text, type: g.type, points: 0.6 }]);
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
      proctoring_config: {
        fullscreen: proctoringFullscreen,
        blockCopyPaste: proctoringBlockCopy,
        shuffleQuestions: proctoringShuffleQ,
        shuffleAlternatives: proctoringShuffleAlt,
        requirePhoto: proctoringPhoto,
        periodicPhotos: proctoringPeriodicPhotos,
        photoIntervalMinutes: parseInt(proctoringPhotoInterval) || 5,
        watermark: proctoringWatermark,
        maxViolations: parseInt(proctoringMaxViolations) || 3,
      },
    }).eq("id", examId);
    toast.success("Prova salva com sucesso!");
  };

  const handleDuplicate = async () => {
    if (!examId) return;
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { data } = await supabase.from("exams").insert({ user_id: user.user.id, title: `${examTitle} (cópia)`, status: "draft" }).select("id").single();
    if (!data) { toast.error("Erro ao duplicar."); return; }
    if (questions.length > 0) {
      await supabase.from("exam_questions").insert(questions.map((q, i) => ({ exam_id: data.id, question_id: q.questionId, position: i, points: q.points })));
    }
    toast.success("Prova duplicada com sucesso!");
  };

  // Auto-compute effective status using shared utility
  const effectiveStatus = computeExamStatus(
    examStatus,
    publication ? { is_active: publication.is_active } : null,
  );
  const currentStatus = examStatusConfig[effectiveStatus] || examStatusConfig.draft;

  const handleStatusChange = async (newStatus: string) => {
    if (!examId) return;
    await supabase.from("exams").update({ status: newStatus }).eq("id", examId);
    setExamStatus(newStatus);
    toast.success(`Status alterado para "${examStatusConfig[newStatus as keyof typeof examStatusConfig]?.label || newStatus}".`);
  };

  // Grading: filter sessions
  const filteredSessions = sessions.filter(s => {
    if (!gradingSearch.trim()) return true;
    const search = gradingSearch.toLowerCase();
    return (s.student_name?.toLowerCase().includes(search)) || (s.student_email?.toLowerCase().includes(search));
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <ModuleHelpGuide moduleKey="exams" />
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Badge className={`text-xs px-3 py-1 font-bold uppercase cursor-pointer hover:opacity-80 ${currentStatus.className}`}>
              {currentStatus.label} ▾
            </Badge>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {Object.entries(examStatusConfig).map(([key, val]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => handleStatusChange(key)}
                className={effectiveStatus === key ? "font-bold" : ""}
              >
                <span className={`inline-block h-2 w-2 rounded-full mr-2 ${val.className}`} />
                {val.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
          <TabsTrigger value="application" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 font-medium text-muted-foreground data-[state=active]:text-primary">
            Aplicação
          </TabsTrigger>
          <TabsTrigger value="grading" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 font-medium text-muted-foreground data-[state=active]:text-primary">
            Correção
          </TabsTrigger>
          <TabsTrigger value="stats" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 font-medium text-muted-foreground data-[state=active]:text-primary">
            Estatísticas
          </TabsTrigger>
        </TabsList>

        {/* ===== QUESTÕES TAB ===== */}
        <TabsContent value="questions" className="mt-6 space-y-6">
          <div className="flex items-center justify-end gap-3">
            <span className="text-sm text-muted-foreground">Valor das questões</span>
            <Select value={pointsMode} onValueChange={setPointsMode}>
              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="by_grade">Por nota</SelectItem>
                <SelectItem value="equal">Igual</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">Valor da prova:</span>
            <span className="text-lg font-bold">{totalPoints.toFixed(2).replace(".", ",")}</span>
          </div>

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
                        <Badge variant="outline" className="text-[10px]">{typeLabels[q.type] || q.type}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => removeQuestion(q.id)}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="text-sm mt-2 leading-relaxed"><RichTextRenderer text={q.title} /></div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <span className="text-xs text-muted-foreground">Elaborada por mim</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Valor:</span>
                      <Input type="number" step="0.1" value={q.points} onChange={(e) => updatePoints(q.id, parseFloat(e.target.value) || 0)} className="w-16 h-7 text-xs text-right" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="flex flex-col items-center gap-3">
            <DropdownMenu open={addMenuOpen} onOpenChange={setAddMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg" className="gap-2"><ListPlus className="h-4 w-4" />ADICIONAR<ChevronDown className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => { setAddMenuOpen(false); setPickerMode("single"); setSelectedBankIds(new Set()); setPickerOpen(true); }}>Questão Simples</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setAddMenuOpen(false); setPickerMode("combo"); setSelectedBankIds(new Set()); setPickerOpen(true); }}>Combinação de Questões</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="lg" className="gap-2"><Plus className="h-4 w-4" />CRIAR<ChevronDown className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {createQuestionTypes.map((qt) => (
                  <DropdownMenuItem key={qt.value} onClick={() => { setCreateMenuOpen(false); setCreateType(qt.value); setCreateTitle(""); setCreateTags(""); setCreateDifficulty("medium"); setCreateBloom("understanding"); setCreateOpen(true); }}>{qt.label}</DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => { setCreateMenuOpen(false); setAiOpen(true); }}>
                  <Sparkles className="h-3.5 w-3.5 mr-2 text-secondary" />Gerar com IA
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Separator />
          <div className="flex items-center justify-end gap-3 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1.5"><Eye className="h-4 w-4" /> RASCUNHO EM PDF</Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDuplicate}><Copy className="h-4 w-4" /> DUPLICAR PROVA</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/exams")}>VOLTAR</Button>
            <Button size="sm" onClick={handleSave} className="gap-1.5"><Save className="h-4 w-4" /> SALVAR</Button>
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
                {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
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

          <Separator />

          {/* Proctoring / Security section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Segurança & Proctoring
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure medidas de segurança para aplicação em concursos e avaliações de alto impacto.
                </p>
              </div>
              {(proctoringFullscreen || proctoringBlockCopy || proctoringPhoto || proctoringWatermark || proctoringShuffleQ || proctoringShuffleAlt || proctoringPeriodicPhotos) ? (
                <Badge className="bg-success text-success-foreground text-[10px] font-bold px-2 py-1">
                  SEGURANÇA ATIVA
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-bold px-2 py-1 text-muted-foreground">
                  DESATIVADO
                </Badge>
              )}
            </div>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Modo Tela Cheia Obrigatório</Label>
                    <p className="text-xs text-muted-foreground">Sair da tela cheia registra violação</p>
                  </div>
                  <Switch checked={proctoringFullscreen} onCheckedChange={setProctoringFullscreen} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Bloquear Copiar/Colar</Label>
                    <p className="text-xs text-muted-foreground">Desativa copy, paste, atalhos e menu de contexto</p>
                  </div>
                  <Switch checked={proctoringBlockCopy} onCheckedChange={setProctoringBlockCopy} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Embaralhar Questões</Label>
                    <p className="text-xs text-muted-foreground">Ordem aleatória por aluno (determinística)</p>
                  </div>
                  <Switch checked={proctoringShuffleQ} onCheckedChange={setProctoringShuffleQ} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Embaralhar Alternativas</Label>
                    <p className="text-xs text-muted-foreground">Alternativas de múltipla escolha em ordem aleatória</p>
                  </div>
                  <Switch checked={proctoringShuffleAlt} onCheckedChange={setProctoringShuffleAlt} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Foto de Identificação</Label>
                    <p className="text-xs text-muted-foreground">Captura webcam ao iniciar a prova</p>
                  </div>
                  <Switch checked={proctoringPhoto} onCheckedChange={setProctoringPhoto} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Selfies Periódicas</Label>
                    <p className="text-xs text-muted-foreground">Fotos automáticas durante a prova</p>
                  </div>
                  <Switch checked={proctoringPeriodicPhotos} onCheckedChange={setProctoringPeriodicPhotos} />
                </div>
                {proctoringPeriodicPhotos && (
                  <div className="pl-6 space-y-1">
                    <Label className="text-xs">Intervalo (minutos):</Label>
                    <Input type="number" min={1} max={30} value={proctoringPhotoInterval} onChange={(e) => setProctoringPhotoInterval(e.target.value)} className="w-24 h-8 text-xs" />
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Marca d'Água</Label>
                    <p className="text-xs text-muted-foreground">Nome e email sobrepostos na tela</p>
                  </div>
                  <Switch checked={proctoringWatermark} onCheckedChange={setProctoringWatermark} />
                </div>
                <Separator />
                <div className="space-y-1">
                  <Label className="font-medium">Limite de Violações</Label>
                  <p className="text-xs text-muted-foreground">Prova bloqueada ao atingir o limite (0 = sem limite)</p>
                  <Input type="number" min={0} max={50} value={proctoringMaxViolations} onChange={(e) => setProctoringMaxViolations(e.target.value)} className="w-24 h-8 text-xs" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => navigate("/exams")}>VOLTAR</Button>
            <Button onClick={handleSave}>SALVAR</Button>
          </div>
        </TabsContent>

        {/* ===== APLICAÇÃO TAB ===== */}
        <TabsContent value="application" className="mt-6 space-y-6">
          {publication ? (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="py-6 text-center space-y-3">
                <CheckCircle2 className="h-10 w-10 mx-auto text-green-600" />
                <p className="font-semibold text-lg">Prova publicada!</p>
                <p className="text-sm text-muted-foreground">Código de acesso:</p>
                <p className="font-mono text-3xl font-bold tracking-widest uppercase">{publication.access_code}</p>
                <p className="text-xs text-muted-foreground">Compartilhe este código com os alunos selecionados. Eles devem acessar o Portal do Aluno com seu email cadastrado e este código.</p>
                <Badge variant={publication.is_active ? "default" : "secondary"}>
                  {publication.is_active ? "Ativa" : "Inativa"}
                </Badge>
              </CardContent>
            </Card>
          ) : (
            <>
              {!classId && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardContent className="py-4">
                    <p className="text-sm text-amber-800">
                      <AlertTriangle className="h-4 w-4 inline mr-1" />
                      Vincule esta prova a uma turma na aba <strong>Configurações</strong> para selecionar os participantes.
                    </p>
                  </CardContent>
                </Card>
              )}

              <div>
                <h3 className="font-semibold text-base mb-3">Janela de Aplicação</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início da aplicação:</Label>
                    <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim da aplicação:</Label>
                    <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Duração da prova (minutos):</Label>
                <Input type="number" min={5} max={300} value={duration} onChange={(e) => setDuration(e.target.value)} className="w-40" />
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold text-base mb-3">Participantes</h3>
                {classId && classStudents.length > 0 ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar por nome, email ou matrícula" value={participantSearch} onChange={(e) => setParticipantSearch(e.target.value)} className="pl-9" />
                      </div>
                      <Button variant="outline" size="sm" onClick={() => {
                        if (selectedStudentIds.size === classStudents.length) setSelectedStudentIds(new Set());
                        else setSelectedStudentIds(new Set(classStudents.map(s => s.id)));
                      }}>
                        {selectedStudentIds.size === classStudents.length ? "Desmarcar todos" : "Selecionar todos"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {selectedStudentIds.size} de {classStudents.length} alunos selecionados
                    </p>
                    <div className="space-y-2 max-h-[400px] overflow-auto">
                      {filteredStudents.map(s => (
                        <div key={s.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                          <Checkbox
                            checked={selectedStudentIds.has(s.id)}
                            onCheckedChange={(checked) => {
                              setSelectedStudentIds(prev => {
                                const next = new Set(prev);
                                if (checked) next.add(s.id);
                                else next.delete(s.id);
                                return next;
                              });
                            }}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{s.student_name}</p>
                            <p className="text-xs text-muted-foreground">{s.student_email || "Sem email"} {s.student_registration ? `· ${s.student_registration}` : ""}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : classId ? (
                  <p className="text-sm text-muted-foreground">Nenhum aluno cadastrado nesta turma.</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Selecione uma turma nas configurações para ver os alunos.</p>
                )}
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handlePublish} disabled={publishing || !classId || selectedStudentIds.size === 0} className="gap-2">
                  {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                  Publicar Prova Online
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* ===== CORREÇÃO TAB ===== */}
        <TabsContent value="grading" className="mt-6 space-y-6">
          {!publication ? (
            <div className="text-center py-16">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Publique a prova na aba <strong>Aplicação</strong> para começar a receber respostas.</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Nenhuma prova submetida ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Código de acesso: <span className="font-mono font-bold">{publication.access_code}</span></p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar aluno..." value={gradingSearch} onChange={(e) => setGradingSearch(e.target.value)} className="pl-9" />
                </div>
                <Badge variant="outline">{sessions.length} aluno(s)</Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Student cards */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Avaliações submetidas</h3>
                  {filteredSessions.map(s => {
                    const pct = s.max_score ? Math.round((Number(s.total_score || 0) / Number(s.max_score)) * 100) : 0;
                    return (
                      <Card
                        key={s.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${selectedSession === s.id ? "ring-2 ring-primary" : ""}`}
                        onClick={() => loadStudentAnswers(s.id)}
                      >
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm font-medium">{s.student_name || s.student_email || "Aluno"}</p>
                              {s.student_email && <p className="text-xs text-muted-foreground">{s.student_email}</p>}
                            </div>
                            <Badge variant={s.status === "in_progress" ? "default" : s.status === "graded" ? "secondary" : "outline"} className="text-xs">
                              {s.status === "in_progress" ? "Fazendo" : s.status === "submitted" ? "Enviada" : s.status === "finished" ? "Finalizada" : "Corrigida"}
                            </Badge>
                          </div>
                          {s.total_score != null && s.max_score != null && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span>Nota: {Number(s.total_score).toFixed(1)}/{Number(s.max_score).toFixed(1)}</span>
                                <span>{pct}%</span>
                              </div>
                              <Progress value={pct} className="h-2" />
                            </div>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-2">
                            Início: {new Date(s.started_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            {s.finished_at && ` · Fim: ${new Date(s.finished_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Selected student answers */}
                <div>
                  <h3 className="font-semibold text-sm mb-3">Respostas</h3>
                  {!selectedSession ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Selecione um aluno para ver as respostas.</p>
                  ) : loadingAnswers ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  ) : selectedAnswers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma resposta ainda.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedAnswers.map((a, i) => {
                        const content = (a.question_bank?.content_json || {}) as Record<string, unknown>;
                        const statement = (content.question_text as string) || (content.statement as string) || (content.title as string) || "Questão";
                        const score = Number(a.teacher_score ?? a.ai_score ?? a.points_earned) || 0;
                        return (
                          <div key={a.id} className="p-3 border rounded-lg space-y-2">
                            <div className="flex justify-between items-start">
                              <p className="text-xs font-medium">Q{i + 1}: {statement.substring(0, 80)}...</p>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-semibold">{score}/{Number(a.max_points)}</span>
                                {a.grading_status === "pending" && a.question_bank?.type === "open_ended" && (
                                  <Badge variant="outline" className="text-xs"><Bot className="h-3 w-3 mr-1" />Aguardando</Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              R: {a.answer_text || (a.answer_json as Record<string, string>)?.selected || "—"}
                            </p>
                            {(a.question_bank?.type === "open_ended" || a.question_bank?.type === "matching") && (
                              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => openReview(a)}>
                                <Eye className="h-3 w-3 mr-1" />Revisar nota
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ===== ESTATÍSTICAS TAB ===== */}
        <TabsContent value="stats" className="mt-6 space-y-8">
          {finishedSessions.length === 0 ? (
            <div className="text-center py-16">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Nenhuma estatística disponível ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">As estatísticas aparecerão após os alunos submeterem suas provas.</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card><CardContent className="pt-6 text-center">
                  <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-2xl font-bold">{finishedSessions.length}</p>
                  <p className="text-xs text-muted-foreground">Provas finalizadas</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold">{avgScore.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Nota média</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6 text-center">
                  <CheckCircle2 className="h-5 w-5 mx-auto text-green-600 mb-1" />
                  <p className="text-2xl font-bold">{passRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Taxa de aprovação (≥60%)</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6 text-center">
                  <AlertTriangle className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                  <p className="text-2xl font-bold">{mostMissed.length > 0 ? `${mostMissed[0].errorRate.toFixed(0)}%` : "—"}</p>
                  <p className="text-xs text-muted-foreground">Maior taxa de erro</p>
                </CardContent></Card>
              </div>

              {/* Score Distribution */}
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" />Distribuição de Notas</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={scoreRanges}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" name="Alunos" radius={[4, 4, 0, 0]}>
                        {scoreRanges.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Per-question stats */}
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Desempenho por Questão</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {mostMissed.map((q, i) => (
                      <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{q.text}</p>
                          <p className="text-xs text-muted-foreground">
                            {q.wrong}/{q.total} erros · Nota média: {q.avgPts.toFixed(1)}/{q.maxPts}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={100 - q.errorRate} className="w-20 h-2" />
                          <Badge variant={q.errorRate > 70 ? "destructive" : q.errorRate > 40 ? "secondary" : "default"}>
                            {q.errorRate.toFixed(0)}% erro
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Discrimination index */}
              <Card>
                <CardHeader><CardTitle className="text-base">Índice de Discriminação</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">Questões com alta taxa de erro entre alunos de alto desempenho podem indicar problemas no enunciado.</p>
                  <div className="space-y-2">
                    {mostMissed.map((q, i) => {
                      const disc = q.total > 0 ? (1 - q.errorRate / 100).toFixed(2) : "—";
                      return (
                        <div key={q.id} className="flex items-center justify-between p-2 rounded border">
                          <p className="text-xs truncate flex-1">Q{i + 1}: {q.text}</p>
                          <Badge variant={Number(disc) > 0.4 ? "default" : Number(disc) > 0.2 ? "secondary" : "destructive"} className="text-xs ml-2">
                            D = {disc}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ===== QUESTION PICKER DIALOG ===== */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{pickerMode === "single" ? "Selecionar Questão" : "Selecionar Questões (Combinação)"}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por texto ou tag..." value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={pickerTypeFilter} onValueChange={setPickerTypeFilter}>
              <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                <SelectItem value="true_false">V ou F</SelectItem>
                <SelectItem value="open_ended">Dissertativa</SelectItem>
                <SelectItem value="matching">Associação</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pickerDiffFilter} onValueChange={setPickerDiffFilter}>
              <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Dificuldade" /></SelectTrigger>
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
                    <Card key={q.id} className={`p-3 cursor-pointer transition-all ${isSelected ? "ring-2 ring-primary border-primary" : "hover:border-primary/30"}`} onClick={() => toggleBankSelect(q.id)}>
                      <div className="flex items-center gap-2 mb-2">
                        {typeIcons[q.type]}
                        <Badge variant="outline" className="text-[10px]">{typeLabels[q.type] || q.type}</Badge>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />}
                      </div>
                      <p className="text-xs leading-relaxed line-clamp-5">{q.title}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {q.tags.slice(0, 3).map((t) => (<Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0 truncate max-w-[80px]" title={t}>{t}</Badge>))}
                        {q.tags.length > 3 && <Badge variant="outline" className="text-[10px] px-1.5 py-0" title={q.tags.slice(3).join(", ")}>+{q.tags.length - 3}</Badge>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setPickerOpen(false)}>VOLTAR</Button>
            <Button disabled={selectedBankIds.size === 0} onClick={addSelectedQuestions}>
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
              <Textarea value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="Digite o enunciado..." rows={4} />
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
      <AIQuestionGenerator open={aiOpen} onOpenChange={setAiOpen} onSaveQuestions={handleAISave} />

      {/* ===== REVIEW DIALOG ===== */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Correção com Tutor de IA
            </DialogTitle>
          </DialogHeader>
          {reviewAnswer && (
            <Tabs defaultValue="tutor" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tutor" className="gap-1"><MessageSquare className="h-3.5 w-3.5" />Tutor de IA</TabsTrigger>
                <TabsTrigger value="review" className="gap-1"><Eye className="h-3.5 w-3.5" />Nota Manual</TabsTrigger>
              </TabsList>
              <TabsContent value="tutor" className="mt-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Enunciado</Label>
                    <p className="text-sm bg-muted/50 rounded p-2 mt-1">
                      {((reviewAnswer.question_bank?.content_json as Record<string, unknown>)?.question_text as string) ||
                        ((reviewAnswer.question_bank?.content_json as Record<string, unknown>)?.statement as string) || "Questão"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Resposta do aluno</Label>
                    <p className="text-sm bg-muted/50 rounded p-2 mt-1">{reviewAnswer.answer_text || "Sem resposta"}</p>
                  </div>
                  <Separator />
                  <AITutorChat
                    answerId={reviewAnswer.id}
                    studentAnswer={reviewAnswer.answer_text || ""}
                    questionStatement={((reviewAnswer.question_bank?.content_json as Record<string, unknown>)?.question_text as string) || ((reviewAnswer.question_bank?.content_json as Record<string, unknown>)?.statement as string) || ""}
                    aiScore={reviewAnswer.ai_score}
                    aiFeedback={reviewAnswer.ai_feedback}
                    teacherScore={reviewAnswer.teacher_score}
                    maxPoints={Number(reviewAnswer.max_points) || 1}
                    onSuggestScore={handleAISuggestScore}
                  />
                </div>
              </TabsContent>
              <TabsContent value="review" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Resposta do aluno</Label>
                    <p className="text-sm bg-muted/50 rounded p-3 mt-1">{reviewAnswer.answer_text || "Sem resposta"}</p>
                  </div>
                  {reviewAnswer.ai_feedback && (
                    <div>
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Bot className="h-3 w-3" /> Avaliação da IA ({reviewAnswer.ai_score}/{Number(reviewAnswer.max_points)})
                      </Label>
                      <p className="text-sm bg-primary/5 rounded p-3 mt-1">{reviewAnswer.ai_feedback}</p>
                    </div>
                  )}
                  <Separator />
                  <div className="space-y-2">
                    <Label>Nota do Professor (máx: {Number(reviewAnswer.max_points)})</Label>
                    <Input type="number" min={0} max={Number(reviewAnswer.max_points)} step={0.5} value={teacherScore} onChange={(e) => setTeacherScore(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Feedback (opcional)</Label>
                    <Textarea value={teacherFeedback} onChange={(e) => setTeacherFeedback(e.target.value)} rows={3} placeholder="Comentário para o aluno..." />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancelar</Button>
            <Button onClick={saveReview}>Salvar Nota</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
