import { supabase } from "@/integrations/supabase/client";

// Resumos de desempenho por tipo de atividade, usados pelas abas de Análises.
// Só leitura. classId = "all" não filtra; com uma turma, valem só as atividades ligadas a ela.

const pct = (total: number | null, max: number | null) => (max && max > 0 ? ((total || 0) / max) * 100 : null);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

async function userId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ---------- Provas online ----------
export interface ExamsSummary { sessions: number; avgPct: number | null }

export async function fetchExamsSummary(classId: string): Promise<ExamsSummary> {
  const uid = await userId();
  if (!uid) return { sessions: 0, avgPct: null };
  const { data: exams } = await supabase.from("exams").select("id, class_id").eq("user_id", uid);
  const examIds = ((exams || []) as any[]).filter((e) => classId === "all" || e.class_id === classId).map((e) => e.id as string);
  if (!examIds.length) return { sessions: 0, avgPct: null };
  const { data: pubs } = await supabase.from("exam_publications").select("id").eq("user_id", uid).in("exam_id", examIds);
  const pubIds = ((pubs || []) as any[]).map((p) => p.id as string);
  if (!pubIds.length) return { sessions: 0, avgPct: null };
  const { data: sess } = await supabase.from("exam_sessions").select("total_score, max_score").in("publication_id", pubIds).in("status", ["finished", "submitted", "graded"]);
  const values = ((sess || []) as any[]).map((s) => pct(s.total_score, s.max_score)).filter((v): v is number => v !== null);
  return { sessions: values.length, avgPct: mean(values) };
}

// ---------- OSCE ----------
export interface OsceExamRow { examId: string; title: string; circuits: number; evaluations: number; avgPct: number | null; failed: number }
export interface OsceAnalytics { evaluations: number; avgPct: number | null; passRate: number | null; rows: OsceExamRow[] }

export async function fetchOsceAnalytics(classId: string): Promise<OsceAnalytics> {
  const empty: OsceAnalytics = { evaluations: 0, avgPct: null, passRate: null, rows: [] };
  const uid = await userId();
  if (!uid) return empty;
  let q = supabase.from("osce_circuits").select("id, osce_exam_id, class_id, osce_exams(title)").eq("user_id", uid);
  if (classId !== "all") q = q.eq("class_id", classId);
  const { data: circuits } = await q;
  const list = (circuits || []) as any[];
  if (!list.length) return empty;
  const { data: evals } = await supabase.from("osce_evaluations")
    .select("circuit_id, total_score, max_score, passed, finished_at")
    .in("circuit_id", list.map((c) => c.id))
    .not("finished_at", "is", null);
  const byCircuit = new Map<string, any[]>();
  ((evals || []) as any[]).forEach((e) => byCircuit.set(e.circuit_id, [...(byCircuit.get(e.circuit_id) || []), e]));

  const rows = new Map<string, OsceExamRow & { values: number[] }>();
  for (const c of list) {
    const row = rows.get(c.osce_exam_id) || { examId: c.osce_exam_id, title: c.osce_exams?.title || "OSCE", circuits: 0, evaluations: 0, avgPct: null, failed: 0, values: [] as number[] };
    row.circuits++;
    for (const e of byCircuit.get(c.id) || []) {
      row.evaluations++;
      if (e.passed === false) row.failed++;
      const v = pct(e.total_score, e.max_score);
      if (v !== null) row.values.push(v);
    }
    rows.set(c.osce_exam_id, row);
  }
  const all = [...rows.values()];
  const allValues = all.flatMap((r) => r.values);
  const evaluations = all.reduce((s, r) => s + r.evaluations, 0);
  const failed = all.reduce((s, r) => s + r.failed, 0);
  return {
    evaluations,
    avgPct: mean(allValues),
    passRate: evaluations ? ((evaluations - failed) / evaluations) * 100 : null,
    rows: all.map(({ values, ...r }) => ({ ...r, avgPct: mean(values) })).sort((a, b) => b.evaluations - a.evaluations),
  };
}

// ---------- Formulários ----------
export interface FormRowData { id: string; kind: string; label: string; title: string; sessions: number; avgPct: number | null }
export interface FormsAnalytics { sessions: number; avgPct: number | null; rows: FormRowData[] }

const FORM_KINDS = [
  { kind: "sct", label: "SCT", table: "sct_exams", sessions: "sct_student_sessions", fk: "sct_exam_id", link: "sct" },
  { kind: "kfe", label: "KFE", table: "kfe_exams", sessions: "kfe_sessions", fk: "kfe_exam_id", link: "kfe" },
  { kind: "sjt", label: "SJT", table: "sjt_exams", sessions: "sjt_sessions", fk: "sjt_exam_id", link: "sjt" },
  { kind: "progress", label: "Progress Test", table: "progress_tests", sessions: "progress_test_sessions", fk: "test_id", link: "progress_test" },
];

export async function fetchFormsAnalytics(classId: string): Promise<FormsAnalytics> {
  const uid = await userId();
  if (!uid) return { sessions: 0, avgPct: null, rows: [] };

  let allowed: Set<string> | null = null;
  if (classId !== "all") {
    const { data: links } = await (supabase.from("class_activity_links" as any) as any).select("activity_type, activity_id").eq("class_id", classId).in("activity_type", FORM_KINDS.map((k) => k.link));
    allowed = new Set(((links || []) as any[]).map((l) => `${l.activity_type}:${l.activity_id}`));
  }

  const rows: FormRowData[] = [];
  const allValues: number[] = [];
  for (const k of FORM_KINDS) {
    const { data: forms } = await (supabase.from(k.table as any) as any).select("id, title").eq("user_id", uid).is("deleted_at", null);
    const visible = ((forms || []) as any[]).filter((f) => !allowed || allowed.has(`${k.link}:${f.id}`));
    if (!visible.length) continue;
    const { data: sess } = await (supabase.from(k.sessions as any) as any)
      .select(`${k.fk}, total_score, max_score, finished_at`)
      .in(k.fk, visible.map((f) => f.id))
      .not("finished_at", "is", null);
    const byForm = new Map<string, number[]>();
    ((sess || []) as any[]).forEach((s) => {
      const v = pct(s.total_score, s.max_score);
      if (v !== null) byForm.set(s[k.fk], [...(byForm.get(s[k.fk]) || []), v]);
    });
    for (const f of visible) {
      const values = byForm.get(f.id) || [];
      allValues.push(...values);
      rows.push({ id: f.id, kind: k.kind, label: k.label, title: f.title, sessions: values.length, avgPct: mean(values) });
    }
  }
  return { sessions: allValues.length, avgPct: mean(allValues), rows: rows.sort((a, b) => b.sessions - a.sessions) };
}
