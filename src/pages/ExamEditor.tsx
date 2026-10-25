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
  MessageSquareQuote,
  ArrowLeft,
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
import { Tabs, TabsContent, TabsListLine, TabsTriggerLine } from "@/components/ui/tabs";
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
import ExamAnswerReviewDialog, { getAnswerStatement } from "@/components/ExamAnswerReviewDialog";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
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
  section?: string | null;
  content_json?: any;
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

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

const sessionStatus = (status: string): { label: string; tone: "ok" | "warn" | "bad" | "info" | "brand" | "neutral" } => {
  switch (status) {
    case "in_progress": return { label: "Fazendo", tone: "info" };
    case "submitted": return { label: "Enviada", tone: "brand" };
    case "finished": return { label: "Finalizada", tone: "ok" };
    case "blocked": return { label: "Bloqueada", tone: "bad" };
    default: return { label: "Corrigida", tone: "ok" };
  }
};

function SettingRow({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{title}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

export default function ExamEditorPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();

  // Exam state
  const [examTitle, setExamTitle] = useState("Nova Prova");
  const [examStatus, setExamStatus] = useState<string>("draft");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [activeTab, setActiveTab] = useState("questions");
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [shownKeys, setShownKeys] = useState<Set<string>>(new Set());
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
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([]);
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
  const [reviewTab, setReviewTab] = useState("tutor");

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
  const formatPoints = (n: number) => n.toFixed(2).replace(".", ",");
  const hasSections = questions.some((q) => q.section);

  // Agrupa por seção, na ordem em que aparecem; questões sem seção ficam num grupo sem nome
  const questionGroups = useMemo(() => {
    const map = new Map<string, ExamQuestion[]>();
    questions.forEach((q) => {
      const key = q.section || "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(q);
    });
    return Array.from(map, ([name, items]) => ({ name, items }));
  }, [questions]);

  const toggleShownKey = (id: string) =>
    setShownKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const getAnswerKey = (q: ExamQuestion) => {
    const cj: any = q.content_json || {};
    const parts: { label: string; value: string }[] = [];

    if (q.type === "multiple_choice" && cj.correct_answer) {
      const opts = cj.options;
      let text = "";
      if (opts && typeof opts === "object" && !Array.isArray(opts)) {
        text = (opts as Record<string, string>)[cj.correct_answer] || "";
      } else if (Array.isArray(opts)) {
        const idx = String(cj.correct_answer).length === 1
          ? String(cj.correct_answer).toLowerCase().charCodeAt(0) - 97
          : Number(cj.correct_answer);
        const o = opts[idx];
        text = typeof o === "string" ? o : o?.text || "";
      }
      parts.push({ label: "Alternativa correta", value: `${String(cj.correct_answer).toUpperCase()}) ${text}`.trim() });
    } else if (q.type === "true_false" && cj.correct_answer != null) {
      const v = String(cj.correct_answer).toLowerCase();
      parts.push({ label: "Resposta correta", value: v === "true" || v === "v" || v === "verdadeiro" ? "Verdadeiro" : "Falso" });
    } else if (q.type === "matching" && cj.correct_matches) {
      const value = typeof cj.correct_matches === "string"
        ? cj.correct_matches
        : Object.entries(cj.correct_matches as Record<string, string>).map(([a, b]) => `${a} → ${b}`).join("  |  ");
      parts.push({ label: "Associações corretas", value });
    }

    if (cj.expected_answer) parts.push({ label: "Resposta esperada", value: String(cj.expected_answer) });
    if (cj.answer_key) parts.push({ label: "Espelho de correção", value: String(cj.answer_key) });
    if (cj.explanation) parts.push({ label: "Comentário / justificativa", value: String(cj.explanation) });

    return parts;
  };

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
              section: eq.section_name || null,
              content_json: cj,
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

  const recalcSessionTotal = async (sessionId: string) => {
    const { data } = await supabase
      .from("student_answers")
      .select("teacher_score, ai_score, points_earned, max_points")
      .eq("session_id", sessionId);
    if (!data) return;
    const total = data.reduce(
      (s: number, a: any) => s + (Number(a.teacher_score ?? a.ai_score ?? a.points_earned) || 0),
      0
    );
    const max = data.reduce((s: number, a: any) => s + (Number(a.max_points) || 0), 0);
    await supabase
      .from("exam_sessions")
      .update({ total_score: Number(total.toFixed(2)), max_score: Number(max.toFixed(2)) })
      .eq("id", sessionId);
    setSessions((prev: any) =>
      prev.map((s: any) =>
        s.id === sessionId
          ? { ...s, total_score: Number(total.toFixed(2)), max_score: Number(max.toFixed(2)) }
          : s
      )
    );
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
    setReviewTab("tutor");
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
    if (selectedSession) {
      await loadStudentAnswers(selectedSession);
      await recalcSessionTotal(selectedSession);
    }
  };

  const handleAISuggestScore = async (score: number, feedback: string) => {
    const cleanFeedback = feedback.substring(0, 300);
    setTeacherScore(String(score));
    setTeacherFeedback(cleanFeedback);
    setReviewTab("review");
    if (!reviewAnswer) return;
    const { error } = await supabase
      .from("student_answers")
      .update({ teacher_score: score, teacher_feedback: cleanFeedback, grading_status: "reviewed" })
      .eq("id", reviewAnswer.id);
    if (error) {
      toast.error("Nota aplicada, mas não foi possível salvar: " + error.message);
      return;
    }
    setReviewAnswer({ ...reviewAnswer, teacher_score: score, teacher_feedback: cleanFeedback } as AnswerRow);
    if (selectedSession) {
      await loadStudentAnswers(selectedSession);
      await recalcSessionTotal(selectedSession);
    }
    toast.success(`Nota ${score}/${Number(reviewAnswer.max_points)} aplicada e salva.`);
  };



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
    { range: "0-20%", count: 0, color: "hsl(var(--destructive))" },
    { range: "21-40%", count: 0, color: "hsl(var(--warning-ink))" },
    { range: "41-60%", count: 0, color: "hsl(var(--warning))" },
    { range: "61-80%", count: 0, color: "hsl(var(--info))" },
    { range: "81-100%", count: 0, color: "hsl(var(--success))" },
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
      return { id: eq.id, questionId: eq.question_id, title: bq?.title || "Questão", type: bq?.type || "multiple_choice", points: Number(eq.points) || 0.6, content_json: bq?.content_json };
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
    setQuestions((prev) => [...prev, { id: eqData!.id, questionId: newQ.id, title: createTitle, type: createType, points: 0.6, content_json: contentJson }]);
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
        if (eqData) setQuestions((prev) => [...prev, { id: eqData.id, questionId: newQ.id, title: g.question_text, type: g.type, points: 0.6, content_json: contentJson }]);
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
      await supabase.from("exam_questions").insert(questions.map((q, i) => ({ exam_id: data.id, question_id: q.questionId, position: i, points: q.points, section_name: q.section || null })));
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

  const securityActive = proctoringFullscreen || proctoringBlockCopy || proctoringPhoto || proctoringPeriodicPhotos || proctoringWatermark || proctoringShuffleQ || proctoringShuffleAlt;
  const securityChips = (
    <>
      {proctoringFullscreen && <Badge variant="outline" className="text-[10px]">Tela cheia</Badge>}
      {proctoringBlockCopy && <Badge variant="outline" className="text-[10px]">Sem copiar/colar</Badge>}
      {proctoringShuffleQ && <Badge variant="outline" className="text-[10px]">Embaralhar questões</Badge>}
      {proctoringShuffleAlt && <Badge variant="outline" className="text-[10px]">Embaralhar alternativas</Badge>}
      {proctoringPhoto && <Badge variant="outline" className="text-[10px]">Foto de identificação</Badge>}
      {proctoringPeriodicPhotos && <Badge variant="outline" className="text-[10px]">Selfies a cada {proctoringPhotoInterval} min</Badge>}
      {proctoringWatermark && <Badge variant="outline" className="text-[10px]">Marca d'água</Badge>}
      <Badge variant="outline" className="text-[10px]">Máx. {proctoringMaxViolations} violações</Badge>
    </>
  );

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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <ModuleHelpGuide moduleKey="exams" />

      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-3" onClick={() => navigate("/exams")}>
          <ArrowLeft className="h-4 w-4" /> Provas
        </Button>
        <PageHeader
          eyebrow="Editar prova"
          title={
            <Input
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              aria-label="Título da prova"
              className="h-auto border-0 bg-transparent p-0 font-heading text-[2rem] font-medium leading-[1.1] shadow-none focus-visible:ring-0 md:text-[2rem]"
            />
          }
          actions={
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Alterar status da prova">
                    <StatusBadge tone={currentStatus.tone} dot={currentStatus.tone !== "neutral"} className="cursor-pointer">
                      {currentStatus.label} <ChevronDown className="h-3 w-3" />
                    </StatusBadge>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {Object.entries(examStatusConfig).map(([key, val]) => (
                    <DropdownMenuItem key={key} onClick={() => handleStatusChange(key)} className={effectiveStatus === key ? "font-semibold" : ""}>
                      <StatusBadge tone={val.tone} dot className="mr-2">{val.label}</StatusBadge>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={handleDuplicate}><Copy className="h-4 w-4" />Duplicar prova</Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/exams/${examId}`)}><Eye className="h-4 w-4" />Rascunho em PDF</Button>
              <Button size="sm" onClick={handleSave}><Save className="h-4 w-4" />Salvar</Button>
            </>
          }
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsListLine>
          <TabsTriggerLine value="questions">Questões <span className="font-mono text-xs text-muted-foreground">{questions.length}</span></TabsTriggerLine>
          <TabsTriggerLine value="config">Configurações</TabsTriggerLine>
          <TabsTriggerLine value="application">Aplicação</TabsTriggerLine>
          <TabsTriggerLine value="grading">Correção {sessions.length > 0 && <span className="font-mono text-xs text-muted-foreground">{sessions.length}</span>}</TabsTriggerLine>
          <TabsTriggerLine value="stats">Estatísticas</TabsTriggerLine>
        </TabsListLine>

        {/* ===== QUESTÕES TAB ===== */}
        <TabsContent value="questions" className="mt-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <span className="font-heading text-2xl font-medium tabular-nums">{formatPoints(totalPoints)} pontos</span>
              <span className="text-xs text-muted-foreground">
                {questions.length} {questions.length === 1 ? "questão" : "questões"}
                {hasSections && ` em ${questionGroups.length} ${questionGroups.length === 1 ? "seção" : "seções"}`}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant={feedbackMode ? "default" : "outline"} size="sm" onClick={() => setFeedbackMode((v) => !v)}>
                <MessageSquareQuote className="h-4 w-4" />
                {feedbackMode ? "Ocultar gabarito" : "Mostrar gabarito"}
              </Button>
              <DropdownMenu open={addMenuOpen} onOpenChange={setAddMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm"><ListPlus className="h-4 w-4" />Adicionar do banco<ChevronDown className="h-3.5 w-3.5" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setAddMenuOpen(false); setPickerMode("single"); setSelectedBankIds(new Set()); setPickerOpen(true); }}>Questão simples</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setAddMenuOpen(false); setPickerMode("combo"); setSelectedBankIds(new Set()); setPickerOpen(true); }}>Combinação de questões</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm"><Plus className="h-4 w-4" />Criar questão<ChevronDown className="h-3.5 w-3.5" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {createQuestionTypes.map((qt) => (
                    <DropdownMenuItem key={qt.value} onClick={() => { setCreateMenuOpen(false); setCreateType(qt.value); setCreateTitle(""); setCreateTags(""); setCreateDifficulty("medium"); setCreateBloom("understanding"); setCreateOpen(true); }}>{qt.label}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" onClick={() => setAiOpen(true)}><Sparkles className="h-4 w-4" />Gerar com IA</Button>
            </div>
          </div>

          {questions.length === 0 ? (
            <Card className="py-16 text-center">
              <p className="text-muted-foreground">Nenhuma questão foi associada a esta prova.</p>
              <p className="mt-1 text-xs text-muted-foreground">Use “Adicionar do banco”, “Criar questão” ou “Gerar com IA”.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {questionGroups.map((group) => (
                <Card key={group.name || "_"} className="overflow-hidden">
                  <div className="flex items-center justify-between gap-3 border-b bg-sunken px-5 py-3">
                    <h3 className="font-heading text-lg font-medium">{group.name || "Questões"}</h3>
                    <span className="text-xs text-muted-foreground">
                      {group.items.length} {group.items.length === 1 ? "questão" : "questões"} · {formatPoints(group.items.reduce((s, q) => s + q.points, 0))} pts
                    </span>
                  </div>
                  <div className="divide-y">
                    {group.items.map((q) => {
                      const number = questions.findIndex((x) => x.id === q.id) + 1;
                      const showKey = feedbackMode || shownKeys.has(q.id);
                      return (
                        <div key={q.id} className="px-5 py-4">
                          <div className="flex items-start gap-4">
                            <span className="mt-0.5 w-7 shrink-0 font-mono text-sm text-muted-foreground">{number}</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm leading-relaxed"><RichTextRenderer text={q.title} /></div>
                              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                {typeIcons[q.type]}
                                <span>{typeLabels[q.type] || q.type}</span>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <Input
                                type="number"
                                step="0.1"
                                value={q.points}
                                onChange={(e) => updatePoints(q.id, parseFloat(e.target.value) || 0)}
                                aria-label={`Pontos da questão ${number}`}
                                className="h-8 w-20 text-right font-mono text-xs"
                              />
                              <span className="text-xs text-muted-foreground">pts</span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais ações"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => toggleShownKey(q.id)}>
                                    <MessageSquareQuote className="h-3.5 w-3.5 mr-2" /> {shownKeys.has(q.id) ? "Ocultar resposta correta" : "Ver resposta correta"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => removeQuestion(q.id)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Remover da prova
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {showKey && (() => {
                            const parts = getAnswerKey(q);
                            return (
                              <div className="ml-11 mt-3 space-y-2 rounded-md border-l-4 border-success/70 bg-success/5 px-3 py-2">
                                <p className="label-mono flex items-center gap-1.5 text-success">
                                  <MessageSquareQuote className="h-3 w-3" />
                                  Resposta esperada
                                </p>
                                {parts.length > 0 ? (
                                  parts.map((p, i) => (
                                    <div key={i}>
                                      <p className="label-mono">{p.label}</p>
                                      <p className="mt-1 whitespace-pre-wrap text-xs">{p.value}</p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs italic text-muted-foreground">Nenhum espelho cadastrado para esta questão.</p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => navigate("/exams")}>Voltar</Button>
          </div>
        </TabsContent>

        {/* ===== CONFIGURAÇÕES TAB ===== */}
        <TabsContent value="config" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-4 p-6">
              <h3 className="font-heading text-lg font-medium">Identificação</h3>
              <div className="space-y-2">
                <Label>Título da prova</Label>
                <Input value={examTitle} onChange={(e) => setExamTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Instituição</Label>
                <Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Nome da instituição" />
              </div>
              <div className="space-y-2">
                <Label>Professor(a)</Label>
                <Input value={professor} onChange={(e) => setProfessor(e.target.value)} placeholder="Nome do professor" />
              </div>
              <div className="space-y-2">
                <Label>Vincular a uma turma</Label>
                <Select value={classId || "none"} onValueChange={(v) => setClassId(v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma turma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma turma</SelectItem>
                    {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </Card>

            <Card className="space-y-4 p-6">
              <h3 className="font-heading text-lg font-medium">Instruções ao aluno</h3>
              <div className="flex items-center justify-between gap-4">
                <Label>Exibir instruções preparatórias <span className="text-xs font-normal text-muted-foreground">(antes de iniciar)</span></Label>
                <Switch checked={showPreInstructions} onCheckedChange={setShowPreInstructions} />
              </div>
              {showPreInstructions && (
                <Textarea value={preInstructions} onChange={(e) => setPreInstructions(e.target.value)} placeholder="Instruções preparatórias..." rows={3} />
              )}
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <Label>Exibir instruções durante a prova</Label>
                <Switch checked={showDuringInstructions} onCheckedChange={setShowDuringInstructions} />
              </div>
              {showDuringInstructions && (
                <Textarea value={duringInstructions} onChange={(e) => setDuringInstructions(e.target.value)} placeholder="Instruções durante a prova..." rows={3} />
              )}
            </Card>
          </div>

          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-lg font-medium">Segurança e proctoring</h3>
                <p className="mt-1 text-xs text-muted-foreground">Para concursos e avaliações de alto impacto.</p>
              </div>
              {securityActive ? (
                <StatusBadge tone="ok"><Shield className="h-3 w-3" />Segurança ativa</StatusBadge>
              ) : (
                <StatusBadge tone="neutral">Desativado</StatusBadge>
              )}
            </div>
            <div className="mt-6 grid gap-x-10 gap-y-5 md:grid-cols-2">
              <SettingRow title="Modo tela cheia obrigatório" hint="Sair da tela cheia registra violação">
                <Switch checked={proctoringFullscreen} onCheckedChange={setProctoringFullscreen} />
              </SettingRow>
              <SettingRow title="Bloquear copiar e colar" hint="Desativa copiar, colar, atalhos e menu de contexto">
                <Switch checked={proctoringBlockCopy} onCheckedChange={setProctoringBlockCopy} />
              </SettingRow>
              <SettingRow title="Embaralhar questões" hint="Ordem aleatória por aluno (determinística)">
                <Switch checked={proctoringShuffleQ} onCheckedChange={setProctoringShuffleQ} />
              </SettingRow>
              <SettingRow title="Embaralhar alternativas" hint="Alternativas de múltipla escolha em ordem aleatória">
                <Switch checked={proctoringShuffleAlt} onCheckedChange={setProctoringShuffleAlt} />
              </SettingRow>
              <SettingRow title="Foto de identificação" hint="Captura a webcam ao iniciar a prova">
                <Switch checked={proctoringPhoto} onCheckedChange={setProctoringPhoto} />
              </SettingRow>
              <SettingRow title="Selfies periódicas" hint="Fotos automáticas durante a prova">
                <Switch checked={proctoringPeriodicPhotos} onCheckedChange={setProctoringPeriodicPhotos} />
              </SettingRow>
              {proctoringPeriodicPhotos && (
                <SettingRow title="Intervalo das selfies" hint="Em minutos (1 a 30)">
                  <Input type="number" min={1} max={30} value={proctoringPhotoInterval} onChange={(e) => setProctoringPhotoInterval(e.target.value)} className="h-8 w-20 text-right font-mono text-xs" />
                </SettingRow>
              )}
              <SettingRow title="Marca d'água" hint="Nome e e-mail sobrepostos na tela">
                <Switch checked={proctoringWatermark} onCheckedChange={setProctoringWatermark} />
              </SettingRow>
              <SettingRow title="Limite de violações" hint="A prova é bloqueada ao atingir o limite. 0 = sem limite">
                <Input type="number" min={0} max={50} value={proctoringMaxViolations} onChange={(e) => setProctoringMaxViolations(e.target.value)} className="h-8 w-20 text-right font-mono text-xs" />
              </SettingRow>
            </div>
          </Card>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => navigate("/exams")}>Voltar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </TabsContent>

        {/* ===== APLICAÇÃO TAB ===== */}
        <TabsContent value="application" className="mt-6 space-y-6">
          {publication ? (
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <Card className="border-success/40 bg-success/5 p-6">
                <div className="flex flex-wrap items-center gap-6">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                    <CheckCircle2 className="h-7 w-7" />
                  </span>
                  <div className="min-w-[200px] flex-1">
                    <div className="font-heading text-2xl font-medium">Prova publicada</div>
                    <p className="mt-1 text-sm text-muted-foreground">Compartilhe o código. Os alunos entram no Portal do Aluno com o e-mail cadastrado e este código.</p>
                  </div>
                  <div className="text-center">
                    <div className="label-mono">Código de acesso</div>
                    <div className="mt-2 font-mono text-3xl font-medium uppercase tracking-[0.14em]">{publication.access_code}</div>
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    <StatusBadge tone={publication.is_active ? "ok" : "neutral"} dot>{publication.is_active ? "Ativa" : "Inativa"}</StatusBadge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { navigator.clipboard.writeText(publication.access_code); toast.success("Código copiado."); }}
                    >
                      <Copy className="h-4 w-4" />Copiar
                    </Button>
                  </div>
                </div>
              </Card>
              <Card className="space-y-3 p-6">
                {securityActive ? (
                  <>
                    <h3 className="text-sm font-medium">Segurança ativa nesta prova</h3>
                    <div className="flex flex-wrap gap-1.5">{securityChips}</div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma medida de segurança ativa nesta prova.</p>
                )}
                <Button onClick={() => navigate(`/monitoring/${publication.id}`)}>
                  <Shield className="h-4 w-4" />Abrir monitoramento
                </Button>
              </Card>
            </div>
          ) : (
            <>
              {!classId && (
                <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning-ink">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Vincule esta prova a uma turma na aba <strong>Configurações</strong> para liberar o acesso aos alunos dela.</span>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="space-y-4 p-6">
                  <h3 className="font-heading text-lg font-medium">Janela de aplicação</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Início da aplicação</Label>
                      <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fim da aplicação</Label>
                      <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Duração da prova (minutos)</Label>
                    <Input type="number" min={5} max={300} value={duration} onChange={(e) => setDuration(e.target.value)} className="w-40" />
                  </div>
                </Card>

                <Card className="space-y-3 p-6">
                  <h3 className="font-heading text-lg font-medium">Quem pode fazer a prova</h3>
                  {classId && classStudents.length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">{classStudents.length} {classStudents.length === 1 ? "aluno" : "alunos"}</strong> da turma terão acesso: cada um entra com o código de acesso e o e-mail cadastrado na turma.
                    </p>
                  ) : classId ? (
                    <p className="text-sm text-muted-foreground">Nenhum aluno cadastrado nesta turma.</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Selecione uma turma nas configurações para ver os alunos.</p>
                  )}
                </Card>
              </div>

              {securityActive && (
                <Card className="space-y-3 p-6">
                  <h3 className="flex items-center gap-2 text-sm font-medium"><Shield className="h-4 w-4 text-primary" />Segurança ativa nesta prova</h3>
                  <div className="flex flex-wrap gap-1.5">{securityChips}</div>
                </Card>
              )}

              <div className="flex justify-end">
                <Button onClick={handlePublish} disabled={publishing || !classId || classStudents.length === 0}>
                  {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                  Publicar prova online
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* ===== CORREÇÃO TAB ===== */}
        <TabsContent value="grading" className="mt-6 space-y-6">
          {!publication ? (
            <Card className="py-16 text-center">
              <Bot className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">Publique a prova na aba <strong>Aplicação</strong> para começar a receber respostas.</p>
            </Card>
          ) : sessions.length === 0 ? (
            <Card className="py-16 text-center">
              <Clock className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhuma prova submetida ainda.</p>
              <p className="mt-1 text-xs text-muted-foreground">Código de acesso: <span className="font-mono font-semibold text-foreground">{publication.access_code}</span></p>
            </Card>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar aluno..." value={gradingSearch} onChange={(e) => setGradingSearch(e.target.value)} className="pl-9" />
                </div>
                <span className="text-xs text-muted-foreground">{sessions.length} {sessions.length === 1 ? "aluno" : "alunos"}</span>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="label-mono">Avaliações submetidas</h3>
                  <Card className="divide-y overflow-hidden">
                    {filteredSessions.length === 0 && (
                      <p className="p-6 text-center text-sm text-muted-foreground">Nenhum aluno encontrado.</p>
                    )}
                    {filteredSessions.map((s) => {
                      const pct = s.max_score ? Math.round((Number(s.total_score || 0) / Number(s.max_score)) * 100) : 0;
                      const st = sessionStatus(s.status);
                      const name = s.student_name || s.student_email || "Aluno";
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => loadStudentAnswers(s.id)}
                          className={`flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-sunken ${selectedSession === s.id ? "bg-sunken" : ""}`}
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-medium text-brand-text">{initials(name)}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-medium">{name}</p>
                              <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                            </div>
                            {s.student_email && s.student_name && <p className="truncate text-xs text-muted-foreground">{s.student_email}</p>}
                            {s.total_score != null && s.max_score != null && (
                              <div className="mt-2 space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="font-mono">Nota {Number(s.total_score).toFixed(1)}/{Number(s.max_score).toFixed(1)}</span>
                                  <span className="font-mono text-muted-foreground">{pct}%</span>
                                </div>
                                <Progress value={pct} className="h-1.5" />
                              </div>
                            )}
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              Início: {new Date(s.started_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              {s.finished_at && ` · Fim: ${new Date(s.finished_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </Card>
                </div>

                <div className="space-y-3">
                  <h3 className="label-mono">Respostas</h3>
                  {!selectedSession ? (
                    <Card className="p-8 text-center text-sm text-muted-foreground">Selecione um aluno para ver as respostas.</Card>
                  ) : loadingAnswers ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  ) : selectedAnswers.length === 0 ? (
                    <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma resposta ainda.</Card>
                  ) : (
                    <Card className="divide-y overflow-hidden">
                      {selectedAnswers.map((a, i) => {
                        const statement = getAnswerStatement(a);
                        const score = Number(a.teacher_score ?? a.ai_score ?? a.points_earned) || 0;
                        const reviewable = a.question_bank?.type === "open_ended" || a.question_bank?.type === "matching";
                        return (
                          <div key={a.id} className="space-y-2 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-medium"><span className="mr-2 font-mono text-xs text-muted-foreground">Q{i + 1}</span>{statement.substring(0, 80)}{statement.length > 80 && "…"}</p>
                              <div className="flex shrink-0 items-center gap-2">
                                <span className="font-mono text-xs font-medium">{score}/{Number(a.max_points)}</span>
                                {a.grading_status === "pending" && a.question_bank?.type === "open_ended" && (
                                  <StatusBadge tone="warn">Aguardando</StatusBadge>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              R: {a.answer_text || (a.answer_json as Record<string, string>)?.selected || "—"}
                            </p>
                            {reviewable && (
                              <Button size="sm" variant="outline" onClick={() => openReview(a)}>
                                <Eye className="h-3.5 w-3.5" />Revisar nota
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </Card>
                  )}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ===== ESTATÍSTICAS TAB ===== */}
        <TabsContent value="stats" className="mt-6 space-y-6">
          {finishedSessions.length === 0 ? (
            <Card className="py-16 text-center">
              <BarChart3 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhuma estatística disponível ainda.</p>
              <p className="mt-1 text-xs text-muted-foreground">As estatísticas aparecerão após os alunos submeterem suas provas.</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card className="p-5">
                  <div className="label-mono">Provas finalizadas</div>
                  <div className="mt-3 font-heading text-4xl font-medium tabular-nums">{finishedSessions.length}</div>
                </Card>
                <Card className="p-5">
                  <div className="label-mono">Nota média</div>
                  <div className="mt-3 font-heading text-4xl font-medium tabular-nums">{avgScore.toFixed(1)}%</div>
                </Card>
                <Card className="p-5">
                  <div className="label-mono">Taxa de aprovação (≥60%)</div>
                  <div className="mt-3 font-heading text-4xl font-medium tabular-nums">{passRate.toFixed(1)}%</div>
                </Card>
                <Card className="p-5">
                  <div className="label-mono">Maior taxa de erro</div>
                  <div className="mt-3 font-heading text-4xl font-medium tabular-nums text-destructive">{mostMissed.length > 0 ? `${mostMissed[0].errorRate.toFixed(0)}%` : "—"}</div>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="mb-4 font-heading text-lg font-medium">Distribuição de notas</h3>
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
              </Card>

              <Card className="p-6">
                <h3 className="mb-4 font-heading text-lg font-medium">Desempenho por questão</h3>
                <div className="divide-y">
                  {mostMissed.map((q, i) => (
                    <div key={q.id} className="flex items-center gap-3 py-3">
                      <span className="w-6 font-mono text-xs text-muted-foreground">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{q.text}</p>
                        <p className="text-xs text-muted-foreground">{q.wrong}/{q.total} erros · Nota média: {q.avgPts.toFixed(1)}/{q.maxPts}</p>
                      </div>
                      <Progress value={100 - q.errorRate} className="h-1.5 w-24" />
                      <StatusBadge tone={q.errorRate > 70 ? "bad" : q.errorRate > 40 ? "warn" : "ok"} className="w-20 justify-center">
                        {q.errorRate.toFixed(0)}% erro
                      </StatusBadge>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-heading text-lg font-medium">Índice de discriminação</h3>
                <p className="mb-4 mt-1 text-xs text-muted-foreground">Questões com alta taxa de erro entre alunos de alto desempenho podem indicar problemas no enunciado.</p>
                <div className="divide-y">
                  {mostMissed.map((q, i) => {
                    const disc = q.total > 0 ? (1 - q.errorRate / 100).toFixed(2) : "—";
                    return (
                      <div key={q.id} className="flex items-center justify-between gap-3 py-2.5">
                        <p className="flex-1 truncate text-sm"><span className="mr-2 font-mono text-xs text-muted-foreground">Q{i + 1}</span>{q.text}</p>
                        <StatusBadge tone={Number(disc) > 0.4 ? "ok" : Number(disc) > 0.2 ? "warn" : "bad"}>D = {disc}</StatusBadge>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ===== QUESTION PICKER DIALOG ===== */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-medium">{pickerMode === "single" ? "Selecionar questão" : "Selecionar questões (combinação)"}</DialogTitle>
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
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-success ml-auto" />}
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
            <Button variant="ghost" onClick={() => setPickerOpen(false)}>Voltar</Button>
            <Button disabled={selectedBankIds.size === 0} onClick={addSelectedQuestions}>
              Adicionar {selectedBankIds.size > 0 ? `${selectedBankIds.size} ${selectedBankIds.size === 1 ? "questão" : "questões"}` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== CREATE QUESTION DIALOG ===== */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-medium">Criar questão — {createQuestionTypes.find((t) => t.value === createType)?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Enunciado da questão</Label>
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
            <Button onClick={handleCreateQuestion}>Criar e adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== AI QUESTION GENERATOR ===== */}
      <AIQuestionGenerator open={aiOpen} onOpenChange={setAiOpen} onSaveQuestions={handleAISave} />

      {/* ===== REVIEW DIALOG ===== */}
      <ExamAnswerReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        answer={reviewAnswer}
        tab={reviewTab}
        onTabChange={setReviewTab}
        teacherScore={teacherScore}
        onTeacherScoreChange={setTeacherScore}
        teacherFeedback={teacherFeedback}
        onTeacherFeedbackChange={setTeacherFeedback}
        onSave={saveReview}
        onSuggestScore={handleAISuggestScore}
      />
    </div>
  );
}
