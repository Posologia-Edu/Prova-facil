import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileDown, Loader2, Mail, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

export type StageType = "anamnese" | "soap" | "reconciliacao" | "documentacao";

export interface ReportSection {
  title: string;
  items: { label: string; value: string; score?: string }[];
}

export interface PairReport {
  pairIndex: number;
  students: { name: string; email?: string }[];
  score: number;
  maxScore: number;
  details: { label: string; value: string; score?: string }[];
  sections?: ReportSection[];
  aiFeedback?: string | null;
  adminFeedback?: string | null;
  aiScore?: number | null;
  adminScore?: number | null;
  peerScore?: number | null;
}

interface SimulationReportProps {
  stageName: string;
  stageType: StageType;
  roomTitle: string;
  roomDate?: string;
  pairs: PairReport[];
}

const stageLabels: Record<StageType, string> = {
  anamnese: "Anamnese",
  soap: "SOAP",
  reconciliacao: "Reconciliacao",
  documentacao: "Documentacao",
};

// ─────────────────────────────────────────────
// Palette (marca ProvaFácil — navy + gold)
// ─────────────────────────────────────────────
const NAVY: [number, number, number] = [14, 30, 60];
const NAVY_DEEP: [number, number, number] = [8, 18, 40];
const GOLD: [number, number, number] = [194, 154, 60];
const GOLD_SOFT: [number, number, number] = [235, 214, 156];
const INK: [number, number, number] = [24, 34, 54];
const INK_SOFT: [number, number, number] = [71, 85, 105];
const MUTED: [number, number, number] = [120, 133, 158];
const HAIRLINE: [number, number, number] = [225, 229, 238];
const SURFACE: [number, number, number] = [248, 250, 253];
const OK: [number, number, number] = [22, 128, 84];
const WARN: [number, number, number] = [176, 108, 12];
const BAD: [number, number, number] = [176, 42, 42];

function cleanText(text: string): string {
  return String(text ?? "")
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "")
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, "")
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "")
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "")
    .replace(/[\u{200D}]/gu, "")
    .replace(/[\u{20E3}]/gu, "")
    .replace(/\*\*/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function scoreColor(pct: number): [number, number, number] {
  if (pct >= 70) return OK;
  if (pct >= 50) return WARN;
  return BAD;
}

// Parse a feedback body of the form
// "DIMENSÃO: Nota 0.75 — texto..." into structured chunks.
interface RubricChunk { title: string; score?: string; body: string; }
function parseRubric(feedback: string): RubricChunk[] {
  const cleaned = cleanText(feedback);
  if (!cleaned) return [];
  const chunks: RubricChunk[] = [];
  const parts = cleaned.split(/\n{2,}/);
  const rx = /^([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s/&-]{2,}?):\s*(?:Nota\s*([\d.,]+)\s*(?:—|-|–)\s*)?(.*)$/is;
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const m = trimmed.match(rx);
    if (m) chunks.push({ title: m[1].trim(), score: m[2]?.trim(), body: m[3].trim() });
    else if (chunks.length > 0) chunks[chunks.length - 1].body += "\n\n" + trimmed;
    else chunks.push({ title: "", body: trimmed });
  }
  return chunks;
}

function generatePdf(pair: PairReport, stageType: StageType, roomTitle: string, roomDate?: string): { blob: Blob; base64: string } {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ML = 18;
  const MR = 18;
  const CW = pw - ML - MR;
  const BODY = 9.5;
  const SMALL = 8;
  const LH = 5.2;
  let y = 0;
  let pageStartY = 30;

  const fillRect = (x: number, yy: number, w: number, h: number, c: [number, number, number], r = 0) => {
    doc.setFillColor(...c);
    if (r > 0) doc.roundedRect(x, yy, w, h, r, r, "F");
    else doc.rect(x, yy, w, h, "F");
  };

  const drawFooter = (i: number, n: number) => {
    doc.setDrawColor(...HAIRLINE);
    doc.setLineWidth(0.3);
    doc.line(ML, ph - 14, pw - MR, ph - 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...NAVY);
    doc.text("PROVAFÁCIL", ML, ph - 8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.setFontSize(7);
    doc.text(cleanText(roomTitle) + "  ·  " + stageLabels[stageType], pw / 2, ph - 8, { align: "center" });
    doc.text(`Página ${i} / ${n}`, pw - MR, ph - 8, { align: "right" });
  };

  const drawRunningHeader = () => {
    // slim navy strip with gold underline
    fillRect(0, 0, pw, 14, NAVY);
    fillRect(0, 14, pw, 0.8, GOLD);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("PROVAFÁCIL", ML, 9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GOLD_SOFT);
    doc.setFontSize(7.5);
    doc.text("Relatório de " + stageLabels[stageType], pw - MR, 9, { align: "right" });
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > ph - 20) {
      doc.addPage();
      drawRunningHeader();
      y = pageStartY;
    }
  };

  const printWrapped = (
    text: string,
    x: number,
    maxW: number,
    fontSize: number,
    lineH: number,
    color: [number, number, number],
    style: "normal" | "bold" | "italic" = "normal"
  ) => {
    const cleaned = cleanText(text);
    if (!cleaned) return;
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", style);
    doc.setTextColor(...color);
    const lines: string[] = doc.splitTextToSize(cleaned, maxW);
    for (const line of lines) {
      ensureSpace(lineH);
      doc.text(line, x, y);
      y += lineH;
    }
  };

  // ═══════════════════════════════════════════════════════════
  // COVER
  // ═══════════════════════════════════════════════════════════
  fillRect(0, 0, pw, 90, NAVY);
  fillRect(0, 88, pw, 2, GOLD);
  // decorative corner block
  fillRect(pw - 46, 0, 46, 46, NAVY_DEEP);
  fillRect(pw - 46, 44, 46, 2, GOLD);

  // Brand mark
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD_SOFT);
  doc.text("PROVAFÁCIL", ML, 16);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(ML, 18.5, ML + 20, 18.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD_SOFT);
  doc.text("SIMULAÇÃO REALÍSTICA", ML, 24);

  // Big title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text("Relatório de " + stageLabels[stageType], ML, 46);

  // Subtitle: room + date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...GOLD_SOFT);
  const dateStr = roomDate || new Date().toLocaleDateString("pt-BR");
  const subtitle = cleanText(roomTitle) + "  ·  " + dateStr;
  doc.text(subtitle, ML, 56);

  // Student band
  const studentLabel = pair.students.length > 1 ? "DUPLA" : "ALUNO(A)";
  const nameStr = pair.students.map(s => cleanText(s.name)).join("  &  ");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...GOLD_SOFT);
  doc.text(studentLabel, ML, 72);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  const nameLines: string[] = doc.splitTextToSize(nameStr, CW - 20);
  let ny = 79;
  for (const l of nameLines.slice(0, 2)) { doc.text(l, ML, ny); ny += 6; }

  y = 100;
  pageStartY = 30;

  // ═══════════════════════════════════════════════════════════
  // SCORE PANEL
  // ═══════════════════════════════════════════════════════════
  const panelH = 42;
  fillRect(ML, y, CW, panelH, SURFACE, 3);
  doc.setDrawColor(...HAIRLINE);
  doc.setLineWidth(0.4);
  doc.roundedRect(ML, y, CW, panelH, 3, 3, "S");
  // gold accent bar
  fillRect(ML, y, 3, panelH, GOLD);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("DESEMPENHO GERAL", ML + 9, y + 9);

  const pct = pair.maxScore > 0 ? (pair.score / pair.maxScore) * 100 : 0;
  const scColor = scoreColor(pct);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...NAVY);
  doc.text(pair.score.toFixed(1), ML + 9, y + 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  const scoreNumWidth = doc.getTextWidth(pair.score.toFixed(1));
  doc.text(` / ${pair.maxScore.toFixed(1)}`, ML + 9 + scoreNumWidth + 1, y + 24);

  // Progress bar
  const barX = ML + 9;
  const barY = y + 30;
  const barW = CW * 0.55;
  const barH = 3.2;
  fillRect(barX, barY, barW, barH, HAIRLINE, 1.6);
  fillRect(barX, barY, Math.max(1, barW * Math.min(1, pct / 100)), barH, scColor, 1.6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...scColor);
  doc.text(`${pct.toFixed(0)}%`, barX + barW + 4, y + 32);

  // Breakdown chips (right side)
  const chips: { label: string; value: string; color: [number, number, number] }[] = [];
  if (pair.adminScore != null) chips.push({ label: "Professor", value: pair.adminScore.toFixed(1), color: NAVY });
  if (pair.peerScore != null) chips.push({ label: "Pares", value: pair.peerScore.toFixed(1), color: GOLD });
  if (pair.aiScore != null) chips.push({ label: "IA", value: pair.aiScore.toFixed(1), color: [88, 80, 168] });
  if (chips.length > 0) {
    const chipW = 30;
    const chipH = 14;
    const gap = 3;
    const totalW = chips.length * chipW + (chips.length - 1) * gap;
    let cx = pw - MR - totalW - 6;
    const cy = y + (panelH - chipH) / 2;
    for (const chip of chips) {
      fillRect(cx, cy, chipW, chipH, [255, 255, 255], 2);
      doc.setDrawColor(...HAIRLINE);
      doc.setLineWidth(0.3);
      doc.roundedRect(cx, cy, chipW, chipH, 2, 2, "S");
      fillRect(cx, cy, 2, chipH, chip.color, 1);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(...MUTED);
      doc.text(chip.label.toUpperCase(), cx + 5, cy + 5.5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      doc.text(chip.value, cx + 5, cy + 11);
      cx += chipW + gap;
    }
  }
  y += panelH + 14;

  // ═══════════════════════════════════════════════════════════
  // SECTIONS (Respostas)
  // ═══════════════════════════════════════════════════════════
  const allSections: ReportSection[] = [];
  if (pair.details.length > 0 && (!pair.sections || pair.sections.length === 0)) {
    allSections.push({ title: "Respostas", items: pair.details });
  }
  if (pair.sections) allSections.push(...pair.sections);

  for (let si = 0; si < allSections.length; si++) {
    const section = allSections[si];
    ensureSpace(24);

    // Section header: numbered gold badge + navy title + hairline underline
    const badgeSize = 8;
    fillRect(ML, y - 1, badgeSize, badgeSize, NAVY, 1.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GOLD_SOFT);
    doc.text(String(si + 1).padStart(2, "0"), ML + badgeSize / 2, y + 4.4, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    const secTitle = cleanText(section.title);
    doc.text(secTitle, ML + badgeSize + 4, y + 5);
    y += badgeSize + 3;
    doc.setDrawColor(...HAIRLINE);
    doc.setLineWidth(0.4);
    doc.line(ML, y, pw - MR, y);
    y += 6;

    // Items — clean list, no zebra; hairline separator between items
    for (let ii = 0; ii < section.items.length; ii++) {
      const item = section.items[ii];
      const cleanedValue = cleanText(item.value || "—");
      const cleanedLabel = cleanText(item.label);

      doc.setFontSize(BODY);
      const valueLines: string[] = doc.splitTextToSize(cleanedValue, CW - 6);
      const itemH = 5 + valueLines.length * LH + 4;
      ensureSpace(itemH + 2);

      // Label row
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.2);
      doc.setTextColor(...NAVY);
      doc.text(cleanedLabel.toUpperCase(), ML, y);
      if (item.score) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.2);
        doc.setTextColor(...GOLD);
        doc.text(cleanText(item.score), pw - MR, y, { align: "right" });
      }
      y += 4.4;

      // Value
      doc.setFont("helvetica", "normal");
      doc.setFontSize(BODY);
      doc.setTextColor(...INK_SOFT);
      for (const vl of valueLines) {
        ensureSpace(LH);
        doc.text(vl, ML, y);
        y += LH;
      }
      y += 3.5;

      if (ii < section.items.length - 1) {
        doc.setDrawColor(...HAIRLINE);
        doc.setLineWidth(0.2);
        doc.line(ML, y - 1, pw - MR, y - 1);
        y += 2;
      }
    }
    y += 6;
  }

  // ═══════════════════════════════════════════════════════════
  // FEEDBACK BLOCK (rubric-aware)
  // ═══════════════════════════════════════════════════════════
  const renderFeedback = (
    title: string,
    body: string,
    accent: [number, number, number],
    tint: [number, number, number]
  ) => {
    ensureSpace(28);
    // Heading strip
    fillRect(ML, y, CW, 12, tint, 2);
    fillRect(ML, y, 3, 12, accent, 1);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...accent);
    doc.text(title.toUpperCase(), ML + 8, y + 8);
    y += 17;

    const chunks = parseRubric(body);
    if (chunks.length === 0) return;

    for (const chunk of chunks) {
      ensureSpace(14);
      if (chunk.title) {
        // rubric header line: title + score chip
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...NAVY);
        const titleLines: string[] = doc.splitTextToSize(chunk.title, CW - 22);
        for (const tl of titleLines) {
          ensureSpace(LH);
          doc.text(tl, ML, y);
          y += LH;
        }
        if (chunk.score) {
          // gold pill on right of first title line
          const pillTxt = `Nota ${chunk.score}`;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          const pw2 = doc.getTextWidth(pillTxt) + 6;
          const pillY = y - LH - 3.8;
          fillRect(pw - MR - pw2, pillY, pw2, 5.4, GOLD_SOFT, 1.8);
          doc.setTextColor(...NAVY);
          doc.text(pillTxt, pw - MR - pw2 / 2, pillY + 3.8, { align: "center" });
        }
        y += 1;
      }
      if (chunk.body) {
        const paras = chunk.body.split(/\n{2,}/);
        for (const para of paras) {
          const t = para.trim();
          if (!t) continue;
          printWrapped(t, ML, CW, BODY, LH, INK_SOFT, "normal");
          y += 2.2;
        }
      }
      y += 3;
    }
    y += 3;
  };

  if (pair.aiFeedback) {
    renderFeedback("Análise da IA", pair.aiFeedback, [88, 80, 168], [242, 240, 252]);
  }
  if (pair.adminFeedback) {
    renderFeedback("Parecer do Professor", pair.adminFeedback, NAVY, [239, 243, 250]);
  }

  // ═══════════════════════════════════════════════════════════
  // FOOTERS
  // ═══════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  const blob = doc.output("blob");
  const base64 = doc.output("datauristring").split(",")[1];
  return { blob, base64 };
}

// ═══════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════
export function SimulationReportGenerator({ stageName, stageType, roomTitle, roomDate, pairs }: SimulationReportProps) {
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generatedPdfs, setGeneratedPdfs] = useState<Map<number, { blob: Blob; base64: string }>>(new Map());
  const [sendResults, setSendResults] = useState<{ email: string; success: boolean; error?: string }[]>([]);

  const handleGenerateAll = async () => {
    setGenerating(true);
    try {
      const pdfs = new Map<number, { blob: Blob; base64: string }>();
      for (const pair of pairs) {
        const result = generatePdf(pair, stageType, roomTitle, roomDate);
        pdfs.set(pair.pairIndex, result);
      }
      setGeneratedPdfs(pdfs);
      setDialogOpen(true);
      toast.success(`${pdfs.size} relatorio(s) gerado(s) com sucesso!`);
    } catch (err) {
      toast.error("Erro ao gerar relatorios");
      console.error(err);
    }
    setGenerating(false);
  };

  const downloadPdf = (pair: PairReport) => {
    const pdf = generatedPdfs.get(pair.pairIndex);
    if (!pdf) return;
    const url = URL.createObjectURL(pdf.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${stageType}-${pair.pairIndex + 1}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendEmail = async (pair: PairReport, specificEmail?: string, specificName?: string) => {
    const pdf = generatedPdfs.get(pair.pairIndex);
    if (!pdf) return;
    const allEmails = pair.students.map(s => s.email).filter((e): e is string => !!e);
    const emails = specificEmail ? [specificEmail] : allEmails;
    if (emails.length === 0) {
      toast.error("Nenhum email cadastrado.");
      return;
    }
    const studentNames = specificName
      ? [specificName]
      : pair.students.map(s => s.name);
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-simulation-report", {
        body: {
          emails,
          pdfBase64: pdf.base64,
          fileName: `relatorio-${stageType}-${pair.pairIndex + 1}.pdf`,
          roomTitle,
          stageName: stageLabels[stageType],
          studentNames,
        },
      });
      if (error) throw error;
      const results = data?.results || [];
      const newSendResults = results.map((r: any) => ({ email: r.email, success: r.success, error: r.error }));
      setSendResults(prev => [...prev.filter(p => !newSendResults.find((n: any) => n.email === p.email)), ...newSendResults]);
      if (newSendResults.every((r: any) => r.success)) {
        toast.success(`Relatorio enviado para ${emails.join(", ")}`);
      } else {
        const failed = newSendResults.filter((r: any) => !r.success);
        toast.error(`Falha ao enviar: ${failed.map((f: any) => `${f.email} (${f.error || "erro desconhecido"})`).join("; ")}`);
      }
    } catch (err: any) {
      toast.error(`Erro ao enviar email: ${err?.message || err}`);
      console.error(err);
    }
    setSending(false);
  };

  const sendAllEmails = async () => {
    setSending(true);
    setSendResults([]);
    for (const pair of pairs) {
      const pdf = generatedPdfs.get(pair.pairIndex);
      if (!pdf) continue;
      const emails = pair.students.map(s => s.email).filter((e): e is string => !!e);
      if (emails.length === 0) continue;
      try {
        const { data, error } = await supabase.functions.invoke("send-simulation-report", {
          body: {
            emails,
            pdfBase64: pdf.base64,
            fileName: `relatorio-${stageType}-${pair.pairIndex + 1}.pdf`,
            roomTitle,
            stageName: stageLabels[stageType],
            studentNames: pair.students.map(s => s.name),
          },
        });
        if (error) {
          const failed = emails.map(email => ({ email, success: false, error: error.message || "erro desconhecido" }));
          setSendResults(prev => [...prev, ...failed]);
          continue;
        }
        if (data?.results) {
          const results = data.results.map((r: any) => ({ email: r.email, success: r.success, error: r.error }));
          setSendResults(prev => [...prev, ...results]);
        }
      } catch (err: any) {
        const failed = emails.map(email => ({ email, success: false, error: err?.message || "erro desconhecido" }));
        setSendResults(prev => [...prev, ...failed]);
      }
    }
    setSending(false);
    toast.success("Envio concluido!");
  };

  return (
    <>
      <Button onClick={handleGenerateAll} disabled={generating || pairs.length === 0} variant="outline" className="gap-2">
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
        Gerar Relatorios
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Relatorios - {stageLabels[stageType]}</DialogTitle>
            <DialogDescription>{roomTitle} - {pairs.length} relatorio(s) gerado(s)</DialogDescription>
          </DialogHeader>

          <div className="flex justify-end mb-4">
            <Button onClick={sendAllEmails} disabled={sending} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Enviar Todos por Email
            </Button>
          </div>

          <div className="space-y-3">
            {pairs.map(pair => {
              const studentsWithEmail = pair.students.filter(s => !!s.email);
              const sentEmails = sendResults.filter(r => pair.students.some(s => s.email === r.email));
              return (
                <div key={pair.pairIndex} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{pair.students.map(s => s.name).join(" & ")}</p>
                      <p className="text-xs text-muted-foreground">
                        Nota: {pair.score.toFixed(1)}/{pair.maxScore.toFixed(1)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => downloadPdf(pair)}>
                      <FileDown className="h-3.5 w-3.5 mr-1" />PDF
                    </Button>
                  </div>

                  {/* Per-student email actions */}
                  <div className="space-y-1.5">
                    {pair.students.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground truncate">
                          {s.name}{s.email ? ` — ${s.email}` : " — sem email"}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendEmail(pair, s.email, s.name)}
                          disabled={!s.email || sending}
                        >
                          <Mail className="h-3.5 w-3.5 mr-1" />Enviar
                        </Button>
                      </div>
                    ))}
                    {studentsWithEmail.length > 1 && (
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => sendEmail(pair)}
                          disabled={sending}
                        >
                          <Mail className="h-3.5 w-3.5 mr-1" />Enviar para a dupla
                        </Button>
                      </div>
                    )}
                  </div>

                  {sentEmails.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {sentEmails.map((r, i) => (
                        <Badge
                          key={i}
                          variant={r.success ? "default" : "destructive"}
                          className="text-xs"
                          title={r.error || ""}
                        >
                          {r.success ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                          {r.email}{!r.success && r.error ? `: ${r.error}` : ""}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
