import { useState, useEffect } from "react";
import {
  BarChart3, Users, Award, AlertTriangle, Loader2, ArrowLeft,
  ChevronDown, Eye, MessageSquare, ShieldAlert, TrendingUp, BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, Pencil } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { OsceRadarChart } from "@/components/osce/OsceRadarChart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { simpleMarkdownToHtml } from "@/lib/simple-markdown";

const VP_CATALOG: Record<string, { name: string; module: string }> = {
  pain_helena: { name: "Dona Helena, 67 anos", module: "Dor" },
  pain_luciana: { name: "Luciana, 42 anos", module: "Dor" },
  pain_rogerio: { name: "Rogério, 58 anos", module: "Dor" },
  pain_pedro: { name: "Pedro, 65 anos", module: "Dor" },
  pain_ana: { name: "Ana, 36 anos", module: "Dor" },
  inflammation_maria: { name: "Dona Maria, 72 anos", module: "Inflamação" },
  inflammation_antonio: { name: "Seu Antônio, 66 anos", module: "Inflamação" },
  inflammation_renata: { name: "Renata, 39 anos", module: "Inflamação" },
  inflammation_wilson: { name: "Seu Wilson, 57 anos", module: "Inflamação" },
  inflammation_jose: { name: "José, 57 anos", module: "Inflamação" },
};

interface ClassOption { id: string; name: string; }
interface CVPOption { id: string; patient_id: string; class_id: string; }
interface GradeRow {
  id: string;
  session_id: string;
  class_virtual_patient_id: string;
  correction_status: "graded" | "pending";
  session_status: string;
  message_count: number;
  has_mai: boolean;
  subscores: any;
  bonus_penalidades: any;
  nota_final: number | null;
  nota_microlearning: number | null;
  feedback_resumido: string | null;
  orientacoes_melhoria: string | null;
  flags_seguranca: any;
  student_email?: string;
  student_name?: string;
}
interface TranscriptMsg { role: string; content: string; encounter: number; }

export default function VPAnalytics() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [cvps, setCvps] = useState<CVPOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedCvp, setSelectedCvp] = useState("all");
  const [grades, setGrades] = useState<GradeRow[]>([]);

  // Detail dialog
  const [detailGrade, setDetailGrade] = useState<GradeRow | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMsg[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<{
    subscores: Record<string, number>;
    nota_final: number;
    nota_microlearning: number;
    feedback_resumido: string;
    orientacoes_melhoria: string;
    flags_seguranca: string;
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Batch grading
  const [grading, setGrading] = useState(false);

  useEffect(() => { loadFilters(); }, []);
  useEffect(() => { loadGrades(); }, [selectedClass, selectedCvp]);

  const loadFilters = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [classesRes, cvpsRes] = await Promise.all([
      supabase.from("classes").select("id, name").eq("user_id", user.id).is("deleted_at", null).order("name"),
      supabase
        .from("class_virtual_patients")
        .select("id, patient_id, class_id, classes!inner(user_id)")
        .eq("classes.user_id", user.id),
    ]);
    setClasses(classesRes.data || []);
    setCvps((cvpsRes.data as CVPOption[]) || []);
  };

  const getFunctionErrorMessage = async (error: any) => {
    let message = error?.message || "Não foi possível gerar a correção.";
    const context = error?.context;

    if (context instanceof Response) {
      try {
        const payload = await context.clone().json();
        message = payload?.error || payload?.detail || message;
      } catch {
        try {
          const text = await context.text();
          if (text) message = text;
        } catch {
          // ignore context parsing failures
        }
      }
    }

    return message;
  };

  const loadGrades = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Get CVPs owned by this teacher
    let cvpQuery = supabase
      .from("class_virtual_patients")
      .select("id, patient_id, class_id, classes!inner(user_id)")
      .eq("classes.user_id", user.id);

    const { data: myCvps } = await cvpQuery;
    if (!myCvps || myCvps.length === 0) { setGrades([]); setLoading(false); return; }

    let filteredCvpIds = myCvps.map((c: any) => c.id);
    if (selectedClass !== "all") {
      filteredCvpIds = myCvps.filter((c: any) => c.class_id === selectedClass).map((c: any) => c.id);
    }
    if (selectedCvp !== "all") {
      filteredCvpIds = filteredCvpIds.filter(id => id === selectedCvp);
    }

    if (filteredCvpIds.length === 0) { setGrades([]); setLoading(false); return; }

    const { data: sessionsData } = await supabase
      .from("virtual_patient_sessions")
      .select("id, class_virtual_patient_id, status, student_email, student_name")
      .in("class_virtual_patient_id", filteredCvpIds);

    if (!sessionsData || sessionsData.length === 0) {
      setGrades([]);
      setLoading(false);
      return;
    }

    const sessionIds = sessionsData.map((session) => session.id);
    const [{ data: msgCounts }, { data: maiList }, { data: gradesData }] = await Promise.all([
      supabase
        .from("virtual_patient_messages")
        .select("session_id")
        .in("session_id", sessionIds)
        .eq("role", "user"),
      supabase
        .from("virtual_patient_mai_scores")
        .select("session_id")
        .in("session_id", sessionIds),
      supabase
        .from("virtual_patient_grades")
        .select("id, session_id, subscores, bonus_penalidades, nota_final, nota_microlearning, feedback_resumido, orientacoes_melhoria, flags_seguranca, class_virtual_patient_id")
        .in("class_virtual_patient_id", filteredCvpIds),
    ]);

    const msgCountMap: Record<string, number> = {};
    (msgCounts || []).forEach((msg: any) => {
      msgCountMap[msg.session_id] = (msgCountMap[msg.session_id] || 0) + 1;
    });

    const hasMai = new Set((maiList || []).map((item: any) => item.session_id));
    const gradeMap = new Map((gradesData || []).map((grade: any) => [grade.session_id, grade]));

    const eligibleSessions = sessionsData.filter((session) => (
      session.status === "completed" ||
      hasMai.has(session.id) ||
      (msgCountMap[session.id] || 0) >= 2
    ));

    const enriched: GradeRow[] = eligibleSessions
      .map((session: any) => {
        const grade = gradeMap.get(session.id);
        return {
          id: grade?.id || session.id,
          session_id: session.id,
          class_virtual_patient_id: session.class_virtual_patient_id,
          correction_status: (grade ? "graded" : "pending") as GradeRow["correction_status"],
          session_status: session.status || "in_progress",
          message_count: msgCountMap[session.id] || 0,
          has_mai: hasMai.has(session.id),
          subscores: grade?.subscores || {},
          bonus_penalidades: grade?.bonus_penalidades || {},
          nota_final: grade?.nota_final ?? null,
          nota_microlearning: grade?.nota_microlearning ?? null,
          feedback_resumido: grade?.feedback_resumido ?? null,
          orientacoes_melhoria: grade?.orientacoes_melhoria ?? null,
          flags_seguranca: grade?.flags_seguranca || [],
          student_email: session.student_email || "",
          student_name: session.student_name || "",
        };
      })
      .sort((a, b) => {
        if (a.correction_status !== b.correction_status) return a.correction_status === "graded" ? -1 : 1;
        return (a.student_name || a.student_email || "").localeCompare(b.student_name || b.student_email || "");
      });

    setGrades(enriched);
    setLoading(false);
  };

  // Normalize text fields that the AI may return as a JSON array string
  // e.g. '["bullet 1","bullet 2"]' -> "- bullet 1\n- bullet 2"
  const normalizeRichText = (raw: string | null | undefined): string => {
    if (!raw) return "";
    const trimmed = String(raw).trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr)) {
          return arr.map((item) => `- ${String(item).trim()}`).join("\n");
        }
      } catch { /* fall through */ }
    }
    // Also handle Postgres array literal '{"a","b"}' just in case
    if (trimmed.startsWith("{") && trimmed.endsWith("}") && trimmed.includes('","')) {
      const inner = trimmed.slice(1, -1);
      const parts = inner.split('","').map((s) => s.replace(/^"|"$/g, "").trim());
      return parts.map((p) => `- ${p}`).join("\n");
    }
    return trimmed;
  };

  const openDetail = async (grade: GradeRow) => {
    setDetailGrade(grade);
    setEditMode(false);
    const subs = (grade.subscores && typeof grade.subscores === "object") ? grade.subscores : {};
    const flagsArr = Array.isArray(grade.flags_seguranca) ? grade.flags_seguranca : [];
    setEditForm({
      subscores: subscoreKeys.reduce((acc, k) => ({ ...acc, [k]: Number(subs[k]) || 0 }), {} as Record<string, number>),
      nota_final: grade.nota_final ?? 0,
      nota_microlearning: grade.nota_microlearning ?? 0,
      feedback_resumido: normalizeRichText(grade.feedback_resumido),
      orientacoes_melhoria: normalizeRichText(grade.orientacoes_melhoria),
      flags_seguranca: flagsArr.join("\n"),
    });
    setTranscriptLoading(true);
    const { data } = await supabase
      .from("virtual_patient_messages")
      .select("role, content, encounter")
      .eq("session_id", grade.session_id)
      .order("created_at", { ascending: true });
    setTranscript((data as TranscriptMsg[]) || []);
    setTranscriptLoading(false);
  };

  const recomputeFinal = (subs: Record<string, number>) => {
    const total = subscoreKeys.reduce((s, k) => s + (Number(subs[k]) || 0), 0);
    return Math.max(0, Math.min(10, total));
  };

  const handleSaveEdit = async () => {
    if (!detailGrade || !editForm) return;
    setSavingEdit(true);
    const flagsArr = editForm.flags_seguranca
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      subscores: editForm.subscores,
      nota_final: Number(editForm.nota_final) || 0,
      nota_microlearning: Number(editForm.nota_microlearning) || 0,
      feedback_resumido: editForm.feedback_resumido,
      orientacoes_melhoria: editForm.orientacoes_melhoria,
      flags_seguranca: flagsArr,
    };
    // Upsert: if a grade row already exists update; otherwise insert (allows manual grading of pending sessions)
    const { data: existing } = await supabase
      .from("virtual_patient_grades")
      .select("id")
      .eq("session_id", detailGrade.session_id)
      .maybeSingle();

    let error;
    if (existing?.id) {
      ({ error } = await supabase.from("virtual_patient_grades").update(payload).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("virtual_patient_grades").insert({
        ...payload,
        session_id: detailGrade.session_id,
        class_virtual_patient_id: detailGrade.class_virtual_patient_id,
        bonus_penalidades: {},
      }));
    }

    setSavingEdit(false);
    if (error) {
      toast.error("Não foi possível salvar os ajustes: " + error.message);
      return;
    }
    toast.success("Avaliação ajustada com sucesso.");
    setEditMode(false);
    setDetailGrade(null);
    await loadGrades();
  };

  const handleBatchGrade = async () => {
    setGrading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setGrading(false); return; }

    // Get all completed sessions without grades for selected filters
    let cvpQuery = supabase
      .from("class_virtual_patients")
      .select("id, patient_id, class_id, classes!inner(user_id)")
      .eq("classes.user_id", user.id);

    const { data: myCvps } = await cvpQuery;
    if (!myCvps) { setGrading(false); return; }

    let filteredCvpIds = myCvps.map((c: any) => c.id);
    if (selectedClass !== "all") filteredCvpIds = myCvps.filter((c: any) => c.class_id === selectedClass).map((c: any) => c.id);
    if (selectedCvp !== "all") filteredCvpIds = filteredCvpIds.filter(id => id === selectedCvp);

    if (filteredCvpIds.length === 0) { toast.info("Nenhum paciente virtual encontrado."); setGrading(false); return; }

    // Get ALL sessions (any status) for selected filters — sessions with any meaningful interaction can be graded
    const { data: sessions } = await supabase
      .from("virtual_patient_sessions")
      .select("id, class_virtual_patient_id, status")
      .in("class_virtual_patient_id", filteredCvpIds);

    if (!sessions || sessions.length === 0) {
      toast.info("Nenhuma sessão encontrada nesta turma.");
      setGrading(false);
      return;
    }

    // Filter sessions that have at least 2 student messages OR a completed MAI
    const sessionIds = sessions.map(s => s.id);
    const [{ data: msgCounts }, { data: maiList }] = await Promise.all([
      supabase
        .from("virtual_patient_messages")
        .select("session_id")
        .in("session_id", sessionIds)
        .eq("role", "user"),
      supabase
        .from("virtual_patient_mai_scores")
        .select("session_id")
        .in("session_id", sessionIds),
    ]);

    const msgCountMap: Record<string, number> = {};
    (msgCounts || []).forEach((m: any) => {
      msgCountMap[m.session_id] = (msgCountMap[m.session_id] || 0) + 1;
    });
    const hasMai = new Set((maiList || []).map((m: any) => m.session_id));

    const eligible = sessions.filter(s =>
      s.status === "completed" || hasMai.has(s.id) || (msgCountMap[s.id] || 0) >= 2
    );

    if (eligible.length === 0) {
      toast.info("Nenhuma sessão com interação suficiente para corrigir ainda.");
      setGrading(false);
      return;
    }

    // Always re-grade everything when teacher clicks "Corrigir Turma" so updated rubric applies
    const toGrade = eligible;

    toast.info(`Corrigindo ${toGrade.length} sessão(ões)...`);

    let success = 0;
    const failures: string[] = [];
    for (const session of toGrade) {
      const { error } = await supabase.functions.invoke("grade-virtual-patient", {
        body: { session_id: session.id, class_virtual_patient_id: session.class_virtual_patient_id },
      });

      if (error) {
        failures.push(await getFunctionErrorMessage(error));
      } else {
        success++;
      }
    }

    if (success > 0) {
      toast.success(`${success}/${toGrade.length} sessão(ões) corrigida(s) com sucesso.`);
    }
    if (failures.length > 0) {
      toast.error(failures[0]);
    }
    setGrading(false);
    await loadGrades();
  };

  // --- Computed metrics ---
  const gradedRows = grades.filter((grade) => grade.correction_status === "graded");
  const gradedCount = gradedRows.length;
  const eligibleCount = grades.length;
  const pendingCount = eligibleCount - gradedCount;
  const avgNota = gradedCount > 0 ? gradedRows.reduce((s, g) => s + (g.nota_final || 0), 0) / gradedCount : 0;
  const avgMicro = gradedCount > 0 ? gradedRows.reduce((s, g) => s + (g.nota_microlearning || 0), 0) / gradedCount : 0;

  const allFlags = gradedRows.flatMap(g => {
    const f = g.flags_seguranca;
    return Array.isArray(f) ? f : [];
  });
  const flagCount = allFlags.length;

  // Score distribution
  const scoreRanges = [
    { range: "0-2", count: 0, color: "hsl(0, 70%, 50%)" },
    { range: "2-4", count: 0, color: "hsl(30, 80%, 50%)" },
    { range: "4-6", count: 0, color: "hsl(45, 90%, 50%)" },
    { range: "6-8", count: 0, color: "hsl(142, 50%, 50%)" },
    { range: "8-10", count: 0, color: "hsl(142, 60%, 35%)" },
  ];
  gradedRows.forEach(g => {
    const n = g.nota_final || 0;
    if (n < 2) scoreRanges[0].count++;
    else if (n < 4) scoreRanges[1].count++;
    else if (n < 6) scoreRanges[2].count++;
    else if (n < 8) scoreRanges[3].count++;
    else scoreRanges[4].count++;
  });

  // Radar data (avg subscores) — new professional rubric (Anamnese 6 + MAI 4)
  const subscoreKeys = [
    "identificacao_acolhimento",
    "queixa_principal_hda",
    "historia_medicamentosa",
    "antecedentes_comorbidades",
    "habitos_estilo_vida",
    "escuta_raciocinio_clinico",
    "mai_completude",
    "mai_coerencia_clinica",
    "mai_justificativa_critica",
    "mai_seguranca_paciente",
  ];
  const subscoreLabels: Record<string, string> = {
    identificacao_acolhimento: "Acolhimento",
    queixa_principal_hda: "Queixa / HDA",
    historia_medicamentosa: "Hist. Medicam.",
    antecedentes_comorbidades: "Antecedentes",
    habitos_estilo_vida: "Hábitos",
    escuta_raciocinio_clinico: "Raciocínio",
    mai_completude: "MAI Completude",
    mai_coerencia_clinica: "MAI Coerência",
    mai_justificativa_critica: "MAI Crítica",
    mai_seguranca_paciente: "MAI Segurança",
  };
  const radarData = subscoreKeys.map(key => {
    const avg = gradedCount > 0
      ? grades.reduce((s, g) => s + (g.subscores?.[key] || 0), 0) / gradedCount
      : 0;
    return { category: subscoreLabels[key], score: avg, maxScore: 1 };
  });

  // Flag frequency
  const flagFreq: Record<string, number> = {};
  allFlags.forEach((f: string) => { flagFreq[f] = (flagFreq[f] || 0) + 1; });
  const topFlags = Object.entries(flagFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Filtered CVP options for select
  const filteredCvpOptions = selectedClass === "all" ? cvps : cvps.filter(c => c.class_id === selectedClass);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Análises – Pacientes Virtuais</h1>
          <p className="text-muted-foreground text-sm mt-1">Resultados e métricas das interações com pacientes virtuais.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedCvp("all"); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas as turmas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedCvp} onValueChange={setSelectedCvp}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os pacientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os pacientes</SelectItem>
              {filteredCvpOptions.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {VP_CATALOG[c.patient_id]?.name || c.patient_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleBatchGrade} disabled={grading} variant="outline">
            {grading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <BookOpen className="h-4 w-4 mr-1.5" />}
            Corrigir Turma
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
          ) : eligibleCount === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Nenhuma sessão elegível encontrada ainda.</p>
            <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
              Clique em <strong>"Corrigir Turma"</strong> para que o agente avalie automaticamente todas as sessões com interação suficiente
              (anamnese + MAI), gerando notas multidimensionais por critério profissional.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5"><Users className="h-5 w-5 text-primary" /></div>
                  <div>
                     <p className="text-2xl font-bold">{eligibleCount}</p>
                     <p className="text-xs text-muted-foreground">Sessões elegíveis</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5"><Award className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-2xl font-bold">{gradedCount}</p>
                    <p className="text-xs text-muted-foreground">Correções concluídas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5"><TrendingUp className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-2xl font-bold">{pendingCount}</p>
                    <p className="text-xs text-muted-foreground">Pendentes de correção</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-destructive/10 p-2.5"><ShieldAlert className="h-5 w-5 text-destructive" /></div>
                  <div>
                    <p className="text-2xl font-bold">{flagCount}</p>
                    <p className="text-xs text-muted-foreground">Flags de segurança</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {gradedCount > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Distribuição de Notas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={scoreRanges}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Alunos" radius={[4, 4, 0, 0]}>
                      {scoreRanges.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4" /> Desempenho por Critério
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OsceRadarChart data={radarData} />
              </CardContent>
            </Card>
          </div>
          )}

          {/* Flags de Segurança */}
          {gradedCount > 0 && topFlags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Flags de Segurança Mais Comuns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topFlags.map(([flag, count], i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}.</span>
                      <div className="flex-1"><p className="text-sm">{flag}</p></div>
                      <Badge variant="destructive">{count}x</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Student Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resultados Individuais</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Nota (0-10)</TableHead>
                    <TableHead className="text-center">Microlearning</TableHead>
                    <TableHead className="text-center">Flags</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.map(g => {
                    const flags = Array.isArray(g.flags_seguranca) ? g.flags_seguranca : [];
                    return (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{g.student_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{g.student_email || "—"}</TableCell>
                        <TableCell className="text-center">
                          {g.correction_status === "graded" ? (
                            <Badge variant="default">Corrigido</Badge>
                          ) : (
                            <Badge variant="secondary">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {g.correction_status === "graded" ? (
                            <Badge variant={(g.nota_final || 0) >= 6 ? "default" : "destructive"}>
                              {(g.nota_final || 0).toFixed(1)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">Aguardando</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {g.correction_status === "graded" ? (g.nota_microlearning || 0).toFixed(1) : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {flags.length > 0 ? (
                            <Badge variant="destructive" className="text-xs">{flags.length}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openDetail(g)}>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            {g.correction_status === "graded" ? "Detalhes" : "Ver / Avaliar"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailGrade} onOpenChange={(open) => { if (!open) { setDetailGrade(null); setEditMode(false); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span>Detalhes — {detailGrade?.student_name || detailGrade?.student_email || "Aluno"}</span>
              {detailGrade && !editMode && (
                <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Ajustar avaliação
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailGrade && editForm && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                {/* Subscores — Anamnese */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Anamnese (0–6)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {subscoreKeys.slice(0, 6).map(key => (
                      <div key={key} className="p-3 rounded-lg border text-center">
                        <p className="text-xs text-muted-foreground">{subscoreLabels[key]}</p>
                        {editMode ? (
                          <Input
                            type="number" step="0.05" min="0" max="1"
                            className="mt-1 text-center font-bold"
                            value={editForm.subscores[key] ?? 0}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              const newSubs = { ...editForm.subscores, [key]: v };
                              setEditForm({ ...editForm, subscores: newSubs, nota_final: recomputeFinal(newSubs), nota_microlearning: recomputeFinal(newSubs) / 2 });
                            }}
                          />
                        ) : (
                          <p className="text-lg font-bold mt-1">{(detailGrade.subscores?.[key] || 0).toFixed(2)}/1</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subscores — MAI */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">MAI – Medication Appropriateness Index (0–4)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {subscoreKeys.slice(6).map(key => (
                      <div key={key} className="p-3 rounded-lg border text-center">
                        <p className="text-xs text-muted-foreground">{subscoreLabels[key]}</p>
                        {editMode ? (
                          <Input
                            type="number" step="0.05" min="0" max="1"
                            className="mt-1 text-center font-bold"
                            value={editForm.subscores[key] ?? 0}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              const newSubs = { ...editForm.subscores, [key]: v };
                              setEditForm({ ...editForm, subscores: newSubs, nota_final: recomputeFinal(newSubs), nota_microlearning: recomputeFinal(newSubs) / 2 });
                            }}
                          />
                        ) : (
                          <p className="text-lg font-bold mt-1">{(detailGrade.subscores?.[key] || 0).toFixed(2)}/1</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border text-center bg-primary/5">
                      <p className="text-xs text-muted-foreground">Nota Final (0–10)</p>
                      {editMode ? (
                        <Input
                          type="number" step="0.1" min="0" max="10"
                          className="mt-1 text-center font-bold text-lg"
                          value={editForm.nota_final}
                          onChange={(e) => setEditForm({ ...editForm, nota_final: parseFloat(e.target.value) || 0 })}
                        />
                      ) : (
                        <p className="text-2xl font-bold mt-1">{(detailGrade.nota_final || 0).toFixed(1)}/10</p>
                      )}
                    </div>
                    <div className="p-3 rounded-lg border text-center">
                      <p className="text-xs text-muted-foreground">Microlearning (0–5)</p>
                      {editMode ? (
                        <Input
                          type="number" step="0.1" min="0" max="5"
                          className="mt-1 text-center font-bold text-lg"
                          value={editForm.nota_microlearning}
                          onChange={(e) => setEditForm({ ...editForm, nota_microlearning: parseFloat(e.target.value) || 0 })}
                        />
                      ) : (
                        <p className="text-2xl font-bold mt-1">{(detailGrade.nota_microlearning || 0).toFixed(1)}/5</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bonus/Penalties (read-only) */}
                {!editMode && detailGrade.bonus_penalidades && Object.keys(detailGrade.bonus_penalidades).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Bônus / Penalidades</h4>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      {Object.entries(detailGrade.bonus_penalidades as Record<string, number>).map(([key, val]) => (
                        <div key={key} className="p-2 rounded border text-center">
                          <p className="text-xs text-muted-foreground">{key.replace(/_/g, " ")}</p>
                          <p className={`font-bold ${val > 0 ? "text-green-600" : val < 0 ? "text-destructive" : ""}`}>
                            {val > 0 ? "+" : ""}{val}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Feedback Resumido</h4>
                  {editMode ? (
                    <Textarea
                      rows={5}
                      value={editForm.feedback_resumido}
                      onChange={(e) => setEditForm({ ...editForm, feedback_resumido: e.target.value })}
                      placeholder="Pontos fortes e fracos do estudante..."
                    />
                  ) : detailGrade.feedback_resumido ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert bg-muted p-4 rounded-lg" dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(normalizeRichText(detailGrade.feedback_resumido)) }} />
                  ) : <p className="text-sm text-muted-foreground italic">Sem feedback.</p>}
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Orientações de Melhoria</h4>
                  {editMode ? (
                    <Textarea
                      rows={6}
                      value={editForm.orientacoes_melhoria}
                      onChange={(e) => setEditForm({ ...editForm, orientacoes_melhoria: e.target.value })}
                      placeholder="Ações práticas para o aluno melhorar..."
                    />
                  ) : detailGrade.orientacoes_melhoria ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert bg-muted p-4 rounded-lg" dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(detailGrade.orientacoes_melhoria) }} />
                  ) : <p className="text-sm text-muted-foreground italic">Sem orientações.</p>}
                </div>

                {/* Flags */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-destructive flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4" /> Flags de Segurança
                  </h4>
                  {editMode ? (
                    <>
                      <Label className="text-xs text-muted-foreground">Uma flag por linha</Label>
                      <Textarea
                        rows={3}
                        value={editForm.flags_seguranca}
                        onChange={(e) => setEditForm({ ...editForm, flags_seguranca: e.target.value })}
                        placeholder="Ex.: Ignorou alergia a dipirona"
                      />
                    </>
                  ) : Array.isArray(detailGrade.flags_seguranca) && detailGrade.flags_seguranca.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
                      {detailGrade.flags_seguranca.map((f: string, i: number) => <li key={i}>{f}</li>)}
                    </ul>
                  ) : <p className="text-sm text-muted-foreground italic">Nenhuma flag.</p>}
                </div>

                <Separator />

                {/* Transcript */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" /> Conversa do Aluno com o Paciente
                  </h4>
                  {transcriptLoading ? (
                    <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  ) : transcript.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Nenhuma mensagem encontrada.</p>
                  ) : (
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto border rounded-lg p-3">
                      {transcript.map((msg, i) => (
                        <div key={i} className={`p-3 rounded-lg text-sm ${msg.role === "user" ? "bg-primary/10 ml-8" : "bg-muted mr-8"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px]">
                              {msg.role === "user" ? "Estudante" : "Paciente"}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">Encontro {msg.encounter}</span>
                          </div>
                          <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(msg.content) }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
          {editMode && (
            <DialogFooter className="border-t pt-4">
              <Button variant="ghost" onClick={() => setEditMode(false)} disabled={savingEdit}>Cancelar</Button>
              <Button onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                Salvar ajustes
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
