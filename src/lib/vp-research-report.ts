import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Navy & gold premium research report — modeled on the article's tables and figures.

export interface VPResearchRow {
  group_label: string;
  clinical_context: string;
  patient_name: string;
  student_name?: string | null;
  student_email?: string | null;

  // IDCG
  idcg_empathy?: number | null;
  idcg_active_listening?: number | null;
  idcg_reasoning?: number | null;
  idcg_conduct?: number | null;
  idcg_safety?: number | null;
  idcg_score?: number | null;

  // ISC
  unsafe_conducts?: Array<{ description: string; severity: 1 | 2 | 3 }>;
  isc_total?: number | null;
  isc_count?: number | null;
  isc_score?: number | null;
  isc_risk_class?: string | null;

  // Semantic coherence + robustness
  qr_pairs?: number | null;
  comparable_pairs?: number | null;
  semantic_similarity_mean?: number | null;
  semantic_similarity_std?: number | null;
  same_stage_similarity?: number | null;
  between_stages_similarity?: number | null;
  total_tokens?: number | null;
  total_latency_ms?: number | null;
  total_interactions?: number | null;
  operational_failures?: number | null;

  // Realism / RAG
  realism_score?: number | null;
  empathy_verbal_score?: number | null;
  clinical_adequacy_score?: number | null;
  naturalness_score?: number | null;
  rag_accuracy?: number | null;
  behavioral_stability_pct?: number | null;

  qualitative_notes?: string | null;
}

export interface VPResearchInput {
  className: string;
  period: string;
  evaluatorName: string;
  rows: VPResearchRow[];
}

const NAVY: [number, number, number] = [15, 30, 60];
const GOLD: [number, number, number] = [191, 149, 63];
const LIGHT: [number, number, number] = [245, 247, 252];
const TEXT: [number, number, number] = [30, 41, 59];

const fmt = (n: number | null | undefined, digits = 2) =>
  n == null || Number.isNaN(Number(n)) ? "—" : Number(n).toFixed(digits).replace(".", ",");
const fmtInt = (n: number | null | undefined) =>
  n == null ? "—" : String(Math.round(Number(n)));
const fmtPct = (n: number | null | undefined) =>
  n == null ? "—" : `${(Number(n) * 100).toFixed(0)}%`;

function mean(nums: (number | null | undefined)[]): number {
  const vs = nums.filter((n): n is number => n != null && !Number.isNaN(n));
  if (!vs.length) return 0;
  return vs.reduce((s, n) => s + n, 0) / vs.length;
}

function drawHeader(doc: jsPDF, title: string, page: number) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, w, 18, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 18, w, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title, 14, 12);
  doc.setFontSize(8);
  doc.text(`Página ${page}`, w - 14, 12, { align: "right" });
  doc.setTextColor(...TEXT);
}

function drawFooter(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(14, h - 14, w - 14, h - 14);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120, 130, 145);
  doc.text(
    "Relatório de Pesquisa • Pacientes Virtuais mediados por IA • Farmacologia Clínica",
    w / 2,
    h - 9,
    { align: "center" },
  );
  doc.setTextColor(...TEXT);
}

function tableStyle() {
  return {
    theme: "grid" as const,
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: "bold" as const,
      fontSize: 8.5,
      halign: "center" as const,
    },
    bodyStyles: { fontSize: 8.5, textColor: TEXT, cellPadding: 2.2 },
    alternateRowStyles: { fillColor: LIGHT },
    styles: { lineColor: [220, 226, 236] as [number, number, number], lineWidth: 0.15 },
  };
}

function newSection(doc: jsPDF, title: string, y: number): number {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(14, y, w - 28, 8, "F");
  doc.setFillColor(...GOLD);
  doc.rect(14, y + 8, w - 28, 1.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 18, y + 5.7);
  doc.setTextColor(...TEXT);
  return y + 14;
}

function ensureSpace(doc: jsPDF, y: number, needed: number, headerTitle: string, pageRef: { n: number }): number {
  const h = doc.internal.pageSize.getHeight();
  if (y + needed > h - 20) {
    drawFooter(doc);
    doc.addPage();
    pageRef.n += 1;
    drawHeader(doc, headerTitle, pageRef.n);
    return 28;
  }
  return y;
}

export function generateVPResearchReport(input: VPResearchInput): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const headerTitle = `Pesquisa VP • ${input.className}`;
  const pageRef = { n: 1 };

  // ============ COVER ============
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, w, h, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, h * 0.55, w, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("RELATÓRIO DE PESQUISA CIENTÍFICA", w / 2, 40, { align: "center" });
  doc.setFontSize(22);
  doc.text("Pacientes Virtuais mediados por IA", w / 2, 60, { align: "center" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Avaliação de Estabilidade, Realismo e Segurança", w / 2, 72, { align: "center" });
  doc.text("no ensino de Farmacologia Clínica", w / 2, 80, { align: "center" });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(w / 2 - 40, 90, w / 2 + 40, 90);

  doc.setFontSize(12);
  doc.text(input.className, w / 2, 120, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(220, 210, 180);
  doc.text(`Período: ${input.period}`, w / 2, 130, { align: "center" });
  doc.text(`Docente avaliador: ${input.evaluatorName}`, w / 2, 137, { align: "center" });
  doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`, w / 2, 144, { align: "center" });

  // Executive summary card on cover
  const rows = input.rows;
  const n = rows.length;
  const avgIdcg = mean(rows.map((r) => r.idcg_score));
  const avgIsc = mean(rows.map((r) => r.isc_score));
  const avgCoh = mean(rows.map((r) => r.semantic_similarity_mean));
  const avgLat = mean(
    rows.map((r) =>
      r.total_latency_ms && r.total_interactions
        ? r.total_latency_ms / r.total_interactions / 1000
        : null,
    ),
  );

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(20, h * 0.7, w - 40, 55, 3, 3, "F");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("SUMÁRIO EXECUTIVO", w / 2, h * 0.7 + 8, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT);
  const cx = [w * 0.2, w * 0.4, w * 0.6, w * 0.8];
  const labels = ["Sessões", "IDCG médio", "ISC médio", "Coerência"];
  const values = [String(n), fmt(avgIdcg), fmt(avgIsc), fmt(avgCoh, 3)];
  labels.forEach((l, i) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...NAVY);
    doc.text(values[i], cx[i], h * 0.7 + 25, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 100, 115);
    doc.text(l, cx[i], h * 0.7 + 32, { align: "center" });
  });
  doc.setFontSize(8);
  doc.setTextColor(90, 100, 115);
  doc.text(
    `Latência média por interação: ${fmt(avgLat, 2)} s`,
    w / 2,
    h * 0.7 + 45,
    { align: "center" },
  );

  // ============ CONTENT PAGES ============
  doc.addPage();
  pageRef.n = 2;
  drawHeader(doc, headerTitle, pageRef.n);

  let y = 28;

  // 1. Methods
  y = newSection(doc, "1. Metodologia resumida", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  const methodText =
    "Este relatório sintetiza indicadores técnicos e pedagógicos coletados a partir das interações " +
    "entre estudantes e pacientes virtuais mediados por IA. Os indicadores seguem o protocolo do estudo: " +
    "IDCG (Índice de Desempenho Clínico Global, média de cinco dimensões em escala Likert 1–5); " +
    "ISC (Índice de Segurança Clínica, soma ponderada das condutas inseguras dividida pelo número " +
    "de ocorrências, com gravidade 1=leve, 2=moderada, 3=grave); coerência semântica (similaridade " +
    "de cosseno entre respostas da IA a perguntas equivalentes, TF-IDF ≥ 0,35); realismo conversacional " +
    "(Likert 1–5); precisão do módulo RAG; e robustez operacional (latência, tokens, falhas).";
  const split = doc.splitTextToSize(methodText, w - 32);
  doc.text(split, 16, y);
  y += split.length * 4 + 4;

  // 2. Table 1 — Semantic coherence
  y = ensureSpace(doc, y, 40, headerTitle, pageRef);
  y = newSection(doc, "Tabela 1 — Coerência semântica do paciente virtual", y);
  autoTable(doc, {
    ...tableStyle(),
    startY: y,
    head: [[
      "Grupo", "Contexto clínico", "Q→R",
      "Pares compar.", "Sim. média", "DP", "Mesma etapa", "Entre etapas",
    ]],
    body: rows.map((r) => [
      r.group_label,
      r.clinical_context || r.patient_name,
      fmtInt(r.qr_pairs),
      fmtInt(r.comparable_pairs),
      fmt(r.semantic_similarity_mean, 3),
      fmt(r.semantic_similarity_std, 3),
      fmt(r.same_stage_similarity, 3),
      fmt(r.between_stages_similarity, 3),
    ]),
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // 3. Table 2 — Behavioral stability, latency, realism
  y = ensureSpace(doc, y, 40, headerTitle, pageRef);
  y = newSection(doc, "Tabela 2 — Estabilidade comportamental, latência e realismo", y);
  autoTable(doc, {
    ...tableStyle(),
    startY: y,
    head: [[
      "Grupo", "Estab. comport. (%)", "Latência méd. (s)",
      "Realismo", "Empatia verbal", "Adequação clínica", "Naturalidade",
    ]],
    body: rows.map((r) => [
      r.group_label,
      fmt(r.behavioral_stability_pct, 1),
      fmt(
        r.total_latency_ms && r.total_interactions
          ? r.total_latency_ms / r.total_interactions / 1000
          : null,
        2,
      ),
      fmt(r.realism_score, 1),
      fmt(r.empathy_verbal_score, 1),
      fmt(r.clinical_adequacy_score, 1),
      fmt(r.naturalness_score, 1),
    ]),
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // 4. Table 3 — IDCG
  y = ensureSpace(doc, y, 40, headerTitle, pageRef);
  y = newSection(doc, "Tabela 3 — Índice de Desempenho Clínico Global (IDCG)", y);
  autoTable(doc, {
    ...tableStyle(),
    startY: y,
    head: [[
      "Grupo", "Contexto clínico",
      "Empatia", "Escuta", "Raciocínio", "Conduta", "Segurança", "IDCG",
    ]],
    body: [
      ...rows.map((r) => [
        r.group_label,
        r.clinical_context || r.patient_name,
        fmt(r.idcg_empathy, 1),
        fmt(r.idcg_active_listening, 1),
        fmt(r.idcg_reasoning, 1),
        fmt(r.idcg_conduct, 1),
        fmt(r.idcg_safety, 1),
        fmt(r.idcg_score, 2),
      ]),
      [
        { content: "Média global", styles: { fontStyle: "bold" as const, fillColor: LIGHT } },
        "—",
        fmt(mean(rows.map((r) => r.idcg_empathy)), 1),
        fmt(mean(rows.map((r) => r.idcg_active_listening)), 1),
        fmt(mean(rows.map((r) => r.idcg_reasoning)), 1),
        fmt(mean(rows.map((r) => r.idcg_conduct)), 1),
        fmt(mean(rows.map((r) => r.idcg_safety)), 1),
        { content: fmt(avgIdcg, 2), styles: { fontStyle: "bold" as const, textColor: NAVY } },
      ],
    ],
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // 5. Table 4 — ISC
  y = ensureSpace(doc, y, 40, headerTitle, pageRef);
  y = newSection(doc, "Tabela 4 — Índice de Segurança Clínica (ISC)", y);
  autoTable(doc, {
    ...tableStyle(),
    startY: y,
    head: [[
      "Grupo", "Contexto clínico",
      "ISC total", "N condutas", "ISC/conduta", "Classe de risco",
    ]],
    body: [
      ...rows.map((r) => [
        r.group_label,
        r.clinical_context || r.patient_name,
        fmt(r.isc_total, 1),
        fmtInt(r.isc_count),
        fmt(r.isc_score, 2),
        r.isc_risk_class || "—",
      ]),
      [
        { content: "Média global", styles: { fontStyle: "bold" as const, fillColor: LIGHT } },
        "—",
        fmt(mean(rows.map((r) => r.isc_total)), 1),
        fmt(mean(rows.map((r) => r.isc_count)), 1),
        { content: fmt(avgIsc, 2), styles: { fontStyle: "bold" as const, textColor: NAVY } },
        "—",
      ],
    ],
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  doc.setFontSize(7.5);
  doc.setTextColor(110, 120, 135);
  doc.text(
    "ISC = soma ponderada (leve=1, moderada=2, grave=3) ÷ n. Classes: <2,0 leve-moderado; 2,0–2,4 moderado-alto; ≥2,5 alto.",
    16,
    y,
  );
  doc.setTextColor(...TEXT);
  y += 6;

  // 6. Figure — IDCG × ISC scatter (SVG-like drawing)
  y = ensureSpace(doc, y, 80, headerTitle, pageRef);
  y = newSection(doc, "Figura 1 — Correlação IDCG × ISC", y);
  const cx0 = 30, cy0 = y + 4, cw = w - 60, ch = 60;
  doc.setDrawColor(200, 208, 220);
  doc.rect(cx0, cy0, cw, ch);
  // Axes labels
  doc.setFontSize(8);
  doc.setTextColor(80, 90, 110);
  doc.text("IDCG (1–5)", cx0 + cw / 2, cy0 + ch + 8, { align: "center" });
  doc.text("ISC", cx0 - 6, cy0 + ch / 2, { angle: 90, align: "center" });
  // Plot points
  const idcgMin = 1, idcgMax = 5, iscMin = 0, iscMax = 3.5;
  rows.forEach((r) => {
    if (r.idcg_score == null || r.isc_score == null) return;
    const px = cx0 + ((r.idcg_score - idcgMin) / (idcgMax - idcgMin)) * cw;
    const py = cy0 + ch - ((r.isc_score - iscMin) / (iscMax - iscMin)) * ch;
    doc.setFillColor(...GOLD);
    doc.circle(px, py, 1.6, "F");
    doc.setFontSize(7);
    doc.setTextColor(...NAVY);
    doc.text(r.group_label, px + 2, py - 1);
  });
  doc.setTextColor(...TEXT);
  y = cy0 + ch + 14;

  // 7. Table 5 — Operational robustness
  y = ensureSpace(doc, y, 40, headerTitle, pageRef);
  y = newSection(doc, "Tabela 5 — Robustez operacional e consistência informacional", y);
  autoTable(doc, {
    ...tableStyle(),
    startY: y,
    head: [["Grupo", "Interações", "Tokens totais", "Tokens/inter.", "Latência méd. (s)", "Falhas", "RAG"]],
    body: [
      ...rows.map((r) => [
        r.group_label,
        fmtInt(r.total_interactions),
        fmtInt(r.total_tokens),
        fmt(
          r.total_tokens && r.total_interactions ? r.total_tokens / r.total_interactions : null,
          1,
        ),
        fmt(
          r.total_latency_ms && r.total_interactions
            ? r.total_latency_ms / r.total_interactions / 1000
            : null,
          2,
        ),
        fmtInt(r.operational_failures ?? 0),
        fmtPct(r.rag_accuracy),
      ]),
      [
        { content: "Médias", styles: { fontStyle: "bold" as const, fillColor: LIGHT } },
        fmt(mean(rows.map((r) => r.total_interactions)), 0),
        fmt(mean(rows.map((r) => r.total_tokens)), 0),
        fmt(
          mean(
            rows.map((r) =>
              r.total_tokens && r.total_interactions ? r.total_tokens / r.total_interactions : null,
            ),
          ),
          1,
        ),
        fmt(avgLat, 2),
        fmt(mean(rows.map((r) => r.operational_failures ?? 0)), 1),
        fmt(mean(rows.map((r) => r.rag_accuracy)), 2),
      ],
    ],
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // 8. Qualitative analysis
  y = ensureSpace(doc, y, 40, headerTitle, pageRef);
  y = newSection(doc, "Análise qualitativa", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  rows.forEach((r) => {
    if (!r.qualitative_notes) return;
    y = ensureSpace(doc, y, 25, headerTitle, pageRef);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    doc.text(`${r.group_label} — ${r.clinical_context || r.patient_name}`, 16, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    const lines = doc.splitTextToSize(r.qualitative_notes, w - 32);
    doc.text(lines, 16, y);
    y += lines.length * 4.4 + 4;
  });

  // 9. Unsafe conducts detail
  const anyUnsafe = rows.some((r) => (r.unsafe_conducts || []).length > 0);
  if (anyUnsafe) {
    y = ensureSpace(doc, y, 40, headerTitle, pageRef);
    y = newSection(doc, "Condutas inseguras identificadas", y);
    rows.forEach((r) => {
      const list = r.unsafe_conducts || [];
      if (!list.length) return;
      y = ensureSpace(doc, y, 20, headerTitle, pageRef);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...NAVY);
      doc.text(`${r.group_label}`, 16, y);
      y += 4;
      autoTable(doc, {
        ...tableStyle(),
        startY: y,
        head: [["#", "Descrição", "Gravidade"]],
        body: list.map((u, i) => [
          String(i + 1),
          u.description,
          u.severity === 3 ? "Grave" : u.severity === 2 ? "Moderada" : "Leve",
        ]),
        margin: { left: 16, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    });
  }

  drawFooter(doc);
  return doc;
}
