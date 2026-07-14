import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Loader2, FlaskConical, FileDown, Save, RefreshCw, Trash2, Plus, ShieldAlert, Sparkles, Bot, FileSpreadsheet, ShieldCheck, ShieldX,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { generateVPResearchReport, type VPResearchRow } from "@/lib/vp-research-report";


interface ClassOption { id: string; name: string; }
interface SessionRow {
  id: string;
  patient_id: string;
  student_email: string | null;
  student_name: string | null;
  group_id: string | null;
  class_virtual_patient_id: string | null;
  total_tokens: number | null;
  total_latency_ms: number | null;
  total_interactions: number | null;
  operational_failures: number | null;
  status: string | null;
  created_at: string;
  research_consent: boolean | null;
}


interface UnsafeConduct { description: string; severity: 1 | 2 | 3; }
interface MetricRow {
  id?: string;
  session_id: string;
  idcg_empathy: number | null;
  idcg_active_listening: number | null;
  idcg_reasoning: number | null;
  idcg_conduct: number | null;
  idcg_safety: number | null;
  idcg_score: number | null;
  unsafe_conducts: UnsafeConduct[];
  isc_total: number | null;
  isc_count: number | null;
  isc_score: number | null;
  isc_risk_class: string | null;
  realism_score: number | null;
  empathy_verbal_score: number | null;
  clinical_adequacy_score: number | null;
  naturalness_score: number | null;
  qr_pairs: number | null;
  comparable_pairs: number | null;
  semantic_similarity_mean: number | null;
  semantic_similarity_std: number | null;
  same_stage_similarity: number | null;
  between_stages_similarity: number | null;
  rag_accuracy: number | null;
  behavioral_stability_pct: number | null;
  qualitative_notes: string | null;
}

const empty = (sid: string): MetricRow => ({
  session_id: sid,
  idcg_empathy: null, idcg_active_listening: null, idcg_reasoning: null,
  idcg_conduct: null, idcg_safety: null, idcg_score: null,
  unsafe_conducts: [], isc_total: null, isc_count: null, isc_score: null, isc_risk_class: null,
  realism_score: null, empathy_verbal_score: null, clinical_adequacy_score: null, naturalness_score: null,
  qr_pairs: null, comparable_pairs: null, semantic_similarity_mean: null, semantic_similarity_std: null,
  same_stage_similarity: null, between_stages_similarity: null,
  rag_accuracy: null, behavioral_stability_pct: null, qualitative_notes: null,
});

function classifyIsc(score: number | null): string {
  if (score == null) return "—";
  if (score < 2.0) return "Leve-Moderado";
  if (score < 2.5) return "Moderado-Alto";
  return "Alto";
}
function computeIdcg(m: MetricRow): number | null {
  const vs = [m.idcg_empathy, m.idcg_active_listening, m.idcg_reasoning, m.idcg_conduct, m.idcg_safety]
    .filter((v): v is number => v != null);
  if (!vs.length) return null;
  return vs.reduce((s, n) => s + n, 0) / vs.length;
}
function computeIsc(list: UnsafeConduct[]) {
  if (!list.length) return { total: 0, count: 0, score: 0, risk: classifyIsc(0) };
  const total = list.reduce((s, u) => s + Number(u.severity || 0), 0);
  const score = total / list.length;
  return { total, count: list.length, score, risk: classifyIsc(score) };
}

export default function VPResearch() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const initialClass = sp.get("class") || "all";

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>(initialClass);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [metrics, setMetrics] = useState<Record<string, MetricRow>>({});
  const [patientLookup, setPatientLookup] = useState<Record<string, { name: string; module: string }>>({});
  const [cvpLookup, setCvpLookup] = useState<Record<string, { group_label: string | null; class_id: string }>>({});
  const [loading, setLoading] = useState(true);
  const [computingSim, setComputingSim] = useState(false);
  const [aiGrading, setAiGrading] = useState<string | null>(null); // sessionId being graded, or "bulk"
  const [editing, setEditing] = useState<{ session: SessionRow; metric: MetricRow } | null>(null);
  const [saving, setSaving] = useState(false);
  const [onlyConsented, setOnlyConsented] = useState(true);


  useEffect(() => { loadClasses(); }, []);
  useEffect(() => { loadSessions(); }, [selectedClass]);

  const loadClasses = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { data } = await supabase
      .from("classes").select("id, name").eq("user_id", user.user.id).order("name");
    setClasses(data || []);
  };

  const loadSessions = async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setLoading(false); return; }

    // Get CVPs for the selected class(es)
    let cvpQ = supabase.from("class_virtual_patients").select("id, class_id, patient_id, group_label");
    if (selectedClass !== "all") cvpQ = cvpQ.eq("class_id", selectedClass);
    const { data: cvps } = await cvpQ;
    const cvpMap: Record<string, { group_label: string | null; class_id: string }> = {};
    (cvps || []).forEach((c: any) => { cvpMap[c.id] = { group_label: c.group_label, class_id: c.class_id }; });
    setCvpLookup(cvpMap);

    const cvpIds = (cvps || []).map((c: any) => c.id);
    if (!cvpIds.length) { setSessions([]); setMetrics({}); setLoading(false); return; }

    const { data: sess } = await supabase
      .from("virtual_patient_sessions")
      .select("id, patient_id, student_email, student_name, group_id, class_virtual_patient_id, total_tokens, total_latency_ms, total_interactions, operational_failures, status, created_at, research_consent")
      .in("class_virtual_patient_id", cvpIds)
      .order("created_at", { ascending: false });

    setSessions((sess as SessionRow[]) || []);

    // Custom patients (name/description)
    const patientIds = [...new Set((sess || []).map((s: any) => s.patient_id))];
    if (patientIds.length) {
      const { data: cps } = await supabase
        .from("custom_virtual_patients")
        .select("id, name, category")
        .in("id", patientIds);
      const map: Record<string, { name: string; module: string }> = {};
      (cps || []).forEach((p: any) => { map[p.id] = { name: p.name, module: p.category }; });
      setPatientLookup(map);
    }

    // Existing metrics for this evaluator
    const sessIds = (sess || []).map((s: any) => s.id);
    if (sessIds.length) {
      const { data: ms } = await supabase
        .from("vp_research_metrics")
        .select("*")
        .in("session_id", sessIds)
        .eq("evaluator_id", user.user.id);
      const mMap: Record<string, MetricRow> = {};
      (ms || []).forEach((m: any) => {
        mMap[m.session_id] = {
          ...empty(m.session_id),
          ...m,
          unsafe_conducts: Array.isArray(m.unsafe_conducts) ? m.unsafe_conducts : [],
        };
      });
      setMetrics(mMap);
    } else {
      setMetrics({});
    }
    setLoading(false);
  };

  const runCoherence = async () => {
    if (!sessions.length) { toast.error("Nenhuma sessão para analisar"); return; }
    setComputingSim(true);
    try {
      const ids = sessions.map((s) => s.id);
      const { data, error } = await supabase.functions.invoke("vp-compute-coherence", {
        body: { sessionIds: ids },
      });
      if (error) throw new Error(error.message);
      toast.success("Coerência semântica calculada");
      await loadSessions();
      void data;
    } catch (e: any) {
      toast.error(e.message || "Falha ao calcular coerência");
    } finally {
      setComputingSim(false);
    }
  };

  const runAiIdcg = async (sessionIds: string[], scope: string) => {
    if (!sessionIds.length) { toast.error("Nenhuma sessão"); return; }
    setAiGrading(scope);
    try {
      const { data, error } = await supabase.functions.invoke("vp-ai-idcg", {
        body: { sessionIds },
      });
      if (error) throw new Error(error.message);
      const okCount = data?.results ? Object.keys(data.results).length : 0;
      const errCount = data?.errors ? Object.keys(data.errors).length : 0;
      if (okCount) toast.success(`IDCG calculado automaticamente para ${okCount} sessão(ões)`);
      if (errCount) toast.warning(`${errCount} sessão(ões) não puderam ser avaliadas pela IA`);
      await loadSessions();
    } catch (e: any) {
      toast.error(e.message || "Falha na avaliação por IA");
    } finally {
      setAiGrading(null);
    }
  };



  const openEdit = (s: SessionRow) => {
    const cur = metrics[s.id] || empty(s.id);
    setEditing({ session: s, metric: { ...cur, unsafe_conducts: [...(cur.unsafe_conducts || [])] } });
  };

  const saveMetric = async () => {
    if (!editing) return;
    setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setSaving(false); return; }
    const m = editing.metric;
    const s = editing.session;
    const idcg = computeIdcg(m);
    const isc = computeIsc(m.unsafe_conducts || []);
    const cvp = cvpLookup[s.class_virtual_patient_id || ""] || { group_label: null, class_id: "" };
    const payload = {
      session_id: s.id,
      evaluator_id: user.user.id,
      class_virtual_patient_id: s.class_virtual_patient_id,
      group_id: s.group_id,
      student_email: s.student_email,
      student_name: s.student_name,
      patient_id: s.patient_id,
      clinical_context: patientLookup[s.patient_id]?.module || null,
      idcg_empathy: m.idcg_empathy,
      idcg_active_listening: m.idcg_active_listening,
      idcg_reasoning: m.idcg_reasoning,
      idcg_conduct: m.idcg_conduct,
      idcg_safety: m.idcg_safety,
      idcg_score: idcg,
      unsafe_conducts: m.unsafe_conducts,
      isc_total: isc.total,
      isc_count: isc.count,
      isc_score: isc.score,
      isc_risk_class: isc.risk,
      realism_score: m.realism_score,
      empathy_verbal_score: m.empathy_verbal_score,
      clinical_adequacy_score: m.clinical_adequacy_score,
      naturalness_score: m.naturalness_score,
      rag_accuracy: m.rag_accuracy,
      behavioral_stability_pct: m.behavioral_stability_pct,
      qualitative_notes: m.qualitative_notes,
      evaluated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("vp_research_metrics")
      .upsert([payload as any], { onConflict: "session_id,evaluator_id" });
    setSaving(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success("Avaliação registrada");
    setEditing(null);
    await loadSessions();
  };

  const filteredSessions = useMemo(
    () => onlyConsented ? sessions.filter((s) => s.research_consent === true) : sessions,
    [sessions, onlyConsented]
  );

  const rowsForReport: VPResearchRow[] = useMemo(() => {
    return filteredSessions.map((s) => {
      const m = metrics[s.id];
      const cvp = cvpLookup[s.class_virtual_patient_id || ""];
      const pat = patientLookup[s.patient_id];
      return {
        group_label: cvp?.group_label || s.student_name || s.student_email || "—",
        clinical_context: pat?.module || "",
        patient_name: pat?.name || s.patient_id,
        student_name: s.student_name,
        student_email: s.student_email,
        idcg_empathy: m?.idcg_empathy ?? null,
        idcg_active_listening: m?.idcg_active_listening ?? null,
        idcg_reasoning: m?.idcg_reasoning ?? null,
        idcg_conduct: m?.idcg_conduct ?? null,
        idcg_safety: m?.idcg_safety ?? null,
        idcg_score: m?.idcg_score ?? null,
        unsafe_conducts: m?.unsafe_conducts ?? [],
        isc_total: m?.isc_total ?? null,
        isc_count: m?.isc_count ?? null,
        isc_score: m?.isc_score ?? null,
        isc_risk_class: m?.isc_risk_class ?? null,
        qr_pairs: m?.qr_pairs ?? null,
        comparable_pairs: m?.comparable_pairs ?? null,
        semantic_similarity_mean: m?.semantic_similarity_mean ?? null,
        semantic_similarity_std: m?.semantic_similarity_std ?? null,
        same_stage_similarity: m?.same_stage_similarity ?? null,
        between_stages_similarity: m?.between_stages_similarity ?? null,
        total_tokens: s.total_tokens,
        total_latency_ms: s.total_latency_ms,
        total_interactions: s.total_interactions,
        operational_failures: s.operational_failures,
        realism_score: m?.realism_score ?? null,
        empathy_verbal_score: m?.empathy_verbal_score ?? null,
        clinical_adequacy_score: m?.clinical_adequacy_score ?? null,
        naturalness_score: m?.naturalness_score ?? null,
        rag_accuracy: m?.rag_accuracy ?? null,
        behavioral_stability_pct: m?.behavioral_stability_pct ?? null,
        qualitative_notes: m?.qualitative_notes ?? null,
      };
    });
  }, [filteredSessions, metrics, cvpLookup, patientLookup]);

  // Flat data set for statistical software (SPSS/R). Uses dot as decimal
  // separator, ASCII field names, no accents. One row per session.
  const statsRows = useMemo(() => {
    return rowsForReport.map((r, i) => ({
      row_id: i + 1,
      group: r.group_label,
      clinical_context: r.clinical_context,
      patient: r.patient_name,
      student_name: r.student_name || "",
      student_email: r.student_email || "",
      idcg_empathy: r.idcg_empathy,
      idcg_active_listening: r.idcg_active_listening,
      idcg_reasoning: r.idcg_reasoning,
      idcg_conduct: r.idcg_conduct,
      idcg_safety: r.idcg_safety,
      idcg_score: r.idcg_score,
      isc_total: r.isc_total,
      isc_count: r.isc_count,
      isc_score: r.isc_score,
      isc_risk: r.isc_risk_class || "",
      unsafe_conducts_desc: (r.unsafe_conducts || []).map((u: any) => `${u.description}(${u.severity})`).join(" | "),
      qr_pairs: r.qr_pairs,
      comparable_pairs: r.comparable_pairs,
      semantic_sim_mean: r.semantic_similarity_mean,
      semantic_sim_std: r.semantic_similarity_std,
      same_stage_sim: r.same_stage_similarity,
      between_stages_sim: r.between_stages_similarity,
      total_tokens: r.total_tokens,
      total_latency_ms: r.total_latency_ms,
      avg_latency_ms: r.total_latency_ms && r.total_interactions ? Math.round(r.total_latency_ms / r.total_interactions) : null,
      total_interactions: r.total_interactions,
      operational_failures: r.operational_failures,
      realism_score: r.realism_score,
      empathy_verbal_score: r.empathy_verbal_score,
      clinical_adequacy_score: r.clinical_adequacy_score,
      naturalness_score: r.naturalness_score,
      rag_accuracy: r.rag_accuracy,
      behavioral_stability_pct: r.behavioral_stability_pct,
      qualitative_notes: (r.qualitative_notes || "").replace(/[\r\n]+/g, " "),
    }));
  }, [rowsForReport]);

  const exportCsv = () => {
    if (!statsRows.length) { toast.error("Sem dados para exportar"); return; }
    const cls = classes.find((c) => c.id === selectedClass);
    const ws = XLSX.utils.json_to_sheet(statsRows);
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: "," });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pesquisa-vp-${cls?.name || "geral"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportXlsx = () => {
    if (!statsRows.length) { toast.error("Sem dados para exportar"); return; }
    const cls = classes.find((c) => c.id === selectedClass);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statsRows), "sessoes");
    XLSX.writeFile(wb, `pesquisa-vp-${cls?.name || "geral"}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };


  const exportPdf = async () => {
    const { data: user } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles").select("full_name").eq("user_id", user.user!.id).maybeSingle();
    const cls = classes.find((c) => c.id === selectedClass);
    const doc = generateVPResearchReport({
      className: cls?.name || "Todas as turmas",
      period: `${new Date().toLocaleDateString("pt-BR")}`,
      evaluatorName: profile?.full_name || user.user?.email || "Docente",
      rows: rowsForReport,
    });
    doc.save(`pesquisa-vp-${cls?.name || "geral"}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/virtual-patients/analytics")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-primary" />
              Pesquisa Científica — Pacientes Virtuais
            </h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
              Coleta de indicadores para o estudo de estabilidade, realismo e segurança clínica
              (IDCG, ISC, coerência semântica, robustez operacional).
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            variant={onlyConsented ? "default" : "outline"}
            onClick={() => setOnlyConsented((v) => !v)}
            title="Somente sessões com consentimento LGPD (art. 7º da Lei 13.709/2018)"
          >
            <ShieldCheck className="h-4 w-4 mr-1.5" />
            {onlyConsented ? "Somente consentidas" : "Todas as sessões"}
          </Button>
          <Button variant="outline" onClick={runCoherence} disabled={computingSim || !filteredSessions.length}>
            {computingSim ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
            Recalcular coerência
          </Button>
          <Button
            variant="outline"
            onClick={() => runAiIdcg(filteredSessions.map((s) => s.id), "bulk")}
            disabled={aiGrading !== null || !filteredSessions.length}
          >
            {aiGrading === "bulk" ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Bot className="h-4 w-4 mr-1.5" />}
            Avaliar IDCG com IA (rubrica)
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={!filteredSessions.length}>
            <FileDown className="h-4 w-4 mr-1.5" /> CSV (SPSS/R)
          </Button>
          <Button variant="outline" onClick={exportXlsx} disabled={!filteredSessions.length}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
          </Button>
          <Button onClick={exportPdf} disabled={!filteredSessions.length}>
            <FileDown className="h-4 w-4 mr-1.5" /> Relatório PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {sessions.length === 0
              ? "Nenhuma sessão de paciente virtual encontrada para esta turma."
              : "Nenhuma sessão com consentimento LGPD registrado. Alterne o filtro para ver todas."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Sessões ({filteredSessions.length}
              {sessions.length !== filteredSessions.length && ` de ${sessions.length}`})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo / Aluno</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead className="text-center">LGPD</TableHead>
                  <TableHead className="text-center">Interações</TableHead>
                  <TableHead className="text-center">Latência méd.</TableHead>
                  <TableHead className="text-center">Coerência</TableHead>
                  <TableHead className="text-center">IDCG</TableHead>
                  <TableHead className="text-center">ISC</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSessions.map((s) => {
                  const m = metrics[s.id];
                  const cvp = cvpLookup[s.class_virtual_patient_id || ""];
                  const pat = patientLookup[s.patient_id];
                  const avgLat = s.total_latency_ms && s.total_interactions
                    ? (s.total_latency_ms / s.total_interactions / 1000).toFixed(2) + "s"
                    : "—";
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{cvp?.group_label || s.student_name || s.student_email || "—"}</div>
                        <div className="text-xs text-muted-foreground">{s.student_email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{pat?.name || s.patient_id}</div>
                        {pat?.module && <div className="text-xs text-muted-foreground">{pat.module}</div>}
                      </TableCell>
                      <TableCell className="text-center">
                        {s.research_consent === true ? (
                          <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" /> Sim</Badge>
                        ) : s.research_consent === false ? (
                          <Badge variant="destructive" className="gap-1"><ShieldX className="h-3 w-3" /> Não</Badge>
                        ) : (
                          <Badge variant="outline">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{s.total_interactions ?? "—"}</TableCell>
                      <TableCell className="text-center">{avgLat}</TableCell>
                      <TableCell className="text-center">
                        {m?.semantic_similarity_mean != null
                          ? m.semantic_similarity_mean.toFixed(3).replace(".", ",")
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {m?.idcg_score != null
                          ? <Badge variant="secondary">{m.idcg_score.toFixed(2).replace(".", ",")}</Badge>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {m?.isc_score != null ? (
                          <Badge variant={m.isc_score >= 2.5 ? "destructive" : m.isc_score >= 2.0 ? "default" : "secondary"}>
                            {m.isc_score.toFixed(2).replace(".", ",")}
                          </Badge>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => runAiIdcg([s.id], s.id)}
                            disabled={aiGrading !== null || s.research_consent === false}
                            title="Calcular IDCG automaticamente com IA usando a rubrica"
                          >
                            {aiGrading === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                            {m ? "Editar" : "Avaliar"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>

            </Table>
          </CardContent>
        </Card>
      )}

      {editing && (
        <Dialog open onOpenChange={(o) => { if (!o) setEditing(null); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Avaliação científica da sessão</DialogTitle>
            </DialogHeader>
            <EvaluationForm
              value={editing.metric}
              onChange={(v) => setEditing({ ...editing, metric: v })}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={saveMetric} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ============ Form ============

function EvaluationForm({ value, onChange }: {
  value: MetricRow;
  onChange: (v: MetricRow) => void;
}) {
  const upd = (patch: Partial<MetricRow>) => onChange({ ...value, ...patch });
  const numField = (label: string, key: keyof MetricRow, min = 1, max = 5, step = 0.5) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number" min={min} max={max} step={step}
        value={(value[key] as number | null) ?? ""}
        onChange={(e) => upd({ [key]: e.target.value === "" ? null : Number(e.target.value) } as any)}
      />
    </div>
  );

  const idcg = computeIdcg(value);
  const isc = computeIsc(value.unsafe_conducts || []);

  const addUnsafe = () => upd({ unsafe_conducts: [...(value.unsafe_conducts || []), { description: "", severity: 2 }] });
  const rmUnsafe = (i: number) => upd({ unsafe_conducts: value.unsafe_conducts.filter((_, j) => j !== i) });
  const updUnsafe = (i: number, patch: Partial<UnsafeConduct>) =>
    upd({ unsafe_conducts: value.unsafe_conducts.map((u, j) => j === i ? { ...u, ...patch } : u) });

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="font-semibold text-sm text-primary">IDCG — Desempenho Clínico Global (Likert 1–5)</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {numField("Empatia / Comunicação", "idcg_empathy")}
          {numField("Escuta ativa", "idcg_active_listening")}
          {numField("Raciocínio clínico", "idcg_reasoning")}
          {numField("Conduta terapêutica", "idcg_conduct")}
          {numField("Segurança do paciente", "idcg_safety")}
        </div>
        <div className="text-sm text-muted-foreground">
          IDCG calculado: <strong className="text-foreground">{idcg != null ? idcg.toFixed(2).replace(".", ",") : "—"}</strong>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> ISC — Condutas Inseguras
          </h3>
          <Button size="sm" variant="outline" onClick={addUnsafe}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
          </Button>
        </div>
        {(value.unsafe_conducts || []).map((u, i) => (
          <div key={i} className="flex gap-2 items-start">
            <Input
              placeholder="Descrição da conduta insegura"
              value={u.description}
              onChange={(e) => updUnsafe(i, { description: e.target.value })}
              className="flex-1"
            />
            <Select value={String(u.severity)} onValueChange={(v) => updUnsafe(i, { severity: Number(v) as 1 | 2 | 3 })}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Leve (1)</SelectItem>
                <SelectItem value="2">Moderada (2)</SelectItem>
                <SelectItem value="3">Grave (3)</SelectItem>
              </SelectContent>
            </Select>
            <Button size="icon" variant="ghost" onClick={() => rmUnsafe(i)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <div className="text-sm text-muted-foreground">
          ISC: <strong className="text-foreground">{isc.score.toFixed(2).replace(".", ",")}</strong>
          {" — "}Classe: <strong className="text-foreground">{isc.risk}</strong>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold text-sm text-primary">Realismo e Qualidade Conversacional (Likert 1–5)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {numField("Realismo geral", "realism_score")}
          {numField("Empatia verbal", "empathy_verbal_score")}
          {numField("Adequação clínica", "clinical_adequacy_score")}
          {numField("Naturalidade", "naturalness_score")}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold text-sm text-primary">Robustez informacional (RAG)</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Precisão RAG (0–1)</Label>
            <Input type="number" min={0} max={1} step={0.01}
              value={value.rag_accuracy ?? ""}
              onChange={(e) => upd({ rag_accuracy: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
          <div>
            <Label className="text-xs">Estabilidade comportamental (%)</Label>
            <Input type="number" min={0} max={100} step={0.1}
              value={value.behavioral_stability_pct ?? ""}
              onChange={(e) => upd({ behavioral_stability_pct: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
        </div>
      </section>

      <section>
        <Label className="text-sm font-semibold text-primary">Análise qualitativa</Label>
        <Textarea
          rows={4}
          placeholder="Observações qualitativas sobre a interação, aderência do paciente, coerência entre etapas, etc."
          value={value.qualitative_notes ?? ""}
          onChange={(e) => upd({ qualitative_notes: e.target.value || null })}
        />
      </section>

      {value.semantic_similarity_mean != null && (
        <section className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <div className="font-semibold text-primary mb-1">Métricas técnicas já coletadas</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div>Pares Q→R: <strong>{value.qr_pairs}</strong></div>
            <div>Comparáveis: <strong>{value.comparable_pairs}</strong></div>
            <div>Sim. média: <strong>{value.semantic_similarity_mean.toFixed(3)}</strong></div>
            <div>DP: <strong>{value.semantic_similarity_std?.toFixed(3) ?? "—"}</strong></div>
          </div>
        </section>
      )}
    </div>
  );
}
