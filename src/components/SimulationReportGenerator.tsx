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

// Clean text: remove emojis, special chars that jsPDF can't render
function cleanText(text: string): string {
  return text
    // Remove emojis and special unicode
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "")
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, "")
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "")
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "")
    .replace(/[\u{200D}]/gu, "")
    .replace(/[\u{20E3}]/gu, "")
    // Replace ** markdown bold markers
    .replace(/\*\*/g, "")
    .trim();
}

function generatePdf(pair: PairReport, stageType: StageType, roomTitle: string, roomDate?: string): { blob: Blob; base64: string } {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth(); // 210
  const ph = doc.internal.pageSize.getHeight(); // 297
  const ML = 16; // margin left
  const MR = 16; // margin right
  const CW = pw - ML - MR; // content width
  const LINE_H = 5; // standard line height for body text
  const BODY_SIZE = 9;
  const SMALL_SIZE = 8;
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > ph - 20) {
      doc.addPage();
      y = 22;
    }
  };

  const printWrapped = (
    text: string,
    x: number,
    maxW: number,
    fontSize: number,
    lineH: number,
    color: [number, number, number],
    fontStyle: "normal" | "bold" | "italic" = "normal"
  ): void => {
    const cleaned = cleanText(text);
    if (!cleaned) return;
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", fontStyle);
    doc.setTextColor(...color);
    const lines: string[] = doc.splitTextToSize(cleaned, maxW);
    for (const line of lines) {
      ensureSpace(lineH + 1);
      doc.text(line, x, y);
      y += lineH;
    }
  };

  // ════════════════════════════════════════
  // HEADER — Blue banner
  // ════════════════════════════════════════
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pw, 40, "F");
  doc.setFillColor(30, 64, 175); // darker accent strip
  doc.rect(0, 40, pw, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(`Relatorio - ${stageLabels[stageType]}`, ML, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(cleanText(roomTitle), ML, 24);

  doc.setFontSize(9);
  doc.setTextColor(190, 210, 255);
  doc.text(roomDate || new Date().toLocaleDateString("pt-BR"), pw - MR, 24, { align: "right" });
  doc.text("ProvaFacil", ML, 33);

  y = 52;

  // ════════════════════════════════════════
  // STUDENT INFO
  // ════════════════════════════════════════
  const studentLabel = pair.students.length > 1 ? "Dupla" : "Aluno(a)";
  const nameStr = pair.students.map(s => cleanText(s.name)).join(" & ");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text(`${studentLabel}: ${nameStr}`, ML, y);
  y += 12;

  // ════════════════════════════════════════
  // SCORE CARD
  // ════════════════════════════════════════
  const scoreBoxH = 30;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(ML, y, CW, scoreBoxH, 3, 3, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(ML, y, CW, scoreBoxH, 3, 3, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text("Nota Final", ML + 10, y + 12);

  const pct = pair.maxScore > 0 ? (pair.score / pair.maxScore * 100) : 0;
  if (pct >= 70) doc.setTextColor(22, 163, 74);
  else if (pct >= 50) doc.setTextColor(202, 138, 4);
  else doc.setTextColor(220, 38, 38);

  doc.setFontSize(22);
  doc.text(`${pair.score.toFixed(1)} / ${pair.maxScore.toFixed(1)}`, pw - MR - 10, y + 15, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`(${pct.toFixed(0)}%)`, pw - MR - 10, y + 23, { align: "right" });

  // Score breakdown
  const scoreBreakdown: string[] = [];
  if (pair.adminScore != null) scoreBreakdown.push(`Professor: ${pair.adminScore.toFixed(1)}`);
  if (pair.peerScore != null) scoreBreakdown.push(`Pares: ${pair.peerScore.toFixed(1)}`);
  if (pair.aiScore != null) scoreBreakdown.push(`IA: ${pair.aiScore.toFixed(1)}`);
  if (scoreBreakdown.length > 0) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(scoreBreakdown.join("   |   "), ML + 10, y + 23);
  }
  y += scoreBoxH + 12;

  // ════════════════════════════════════════
  // SECTIONS
  // ════════════════════════════════════════
  const allSections: ReportSection[] = [];
  if (pair.details.length > 0 && (!pair.sections || pair.sections.length === 0)) {
    allSections.push({ title: "Respostas", items: pair.details });
  }
  if (pair.sections) {
    allSections.push(...pair.sections);
  }

  const accentColors: [number, number, number][] = [
    [37, 99, 235],   // blue
    [22, 163, 74],   // green
    [126, 34, 206],  // purple
    [234, 88, 12],   // orange
  ];

  for (let si = 0; si < allSections.length; si++) {
    const section = allSections[si];
    const accent = accentColors[si % accentColors.length];

    ensureSpace(22);

    // Section divider line
    if (si > 0) {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(ML, y, pw - MR, y);
      y += 8;
    }

    // Section header with accent bar
    doc.setFillColor(...accent);
    doc.roundedRect(ML, y, 4, 10, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    const sectionTitle = cleanText(section.title);
    const titleLines = doc.splitTextToSize(sectionTitle, CW - 12);
    for (const tl of titleLines) {
      doc.text(tl, ML + 9, y + 7);
      y += 6;
    }
    y += 8;

    // Items
    for (let ii = 0; ii < section.items.length; ii++) {
      const item = section.items[ii];
      const cleanedValue = cleanText(item.value || "--");
      const cleanedLabel = cleanText(item.label);

      // Measure needed height
      doc.setFontSize(BODY_SIZE);
      const valueLines: string[] = doc.splitTextToSize(cleanedValue, CW - 20);
      const itemH = 8 + valueLines.length * LINE_H + 4;

      ensureSpace(itemH);

      // Alternating row background
      if (ii % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(ML, y - 2, CW, itemH, "F");
      }

      // Left accent dot
      doc.setFillColor(...accent);
      doc.circle(ML + 4, y + 3, 1.2, "F");

      // Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(SMALL_SIZE);
      doc.setTextColor(51, 65, 85);
      doc.text(cleanedLabel, ML + 9, y + 4);

      // Score on the right
      if (item.score) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(cleanText(item.score), pw - MR - 4, y + 4, { align: "right" });
      }

      // Value text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(BODY_SIZE);
      doc.setTextColor(51, 65, 85);
      let vy = y + 9;
      for (const vl of valueLines) {
        ensureSpace(LINE_H + 1);
        doc.text(vl, ML + 9, vy);
        vy += LINE_H;
      }
      y = vy + 3;
    }
    y += 4;
  }

  // ════════════════════════════════════════
  // AI FEEDBACK
  // ════════════════════════════════════════
  if (pair.aiFeedback) {
    ensureSpace(30);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(ML, y, pw - MR, y);
    y += 8;

    // Header bar
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(ML, y, CW, 12, 2, 2, "F");
    doc.setDrawColor(191, 219, 254);
    doc.setLineWidth(0.3);
    doc.roundedRect(ML, y, CW, 12, 2, 2, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235);
    doc.text("Feedback da IA", ML + 6, y + 8);
    y += 18;

    // Feedback body — split into paragraphs for readability
    const paragraphs = cleanText(pair.aiFeedback).split(/\n+/);
    for (const para of paragraphs) {
      if (!para.trim()) continue;

      // Check if it's a section header (e.g. "Conduta Farmaceutica: Nota 0.8")
      const isSubHeader = /^[A-Z][\w\s]+:/.test(para.trim()) && para.length < 120;

      if (isSubHeader) {
        ensureSpace(12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(BODY_SIZE);
        doc.setTextColor(30, 64, 175);
        const headerLines = doc.splitTextToSize(para.trim(), CW - 12);
        for (const hl of headerLines) {
          ensureSpace(LINE_H + 1);
          doc.text(hl, ML + 4, y);
          y += LINE_H;
        }
        y += 2;
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(BODY_SIZE);
        doc.setTextColor(51, 65, 85);
        const bodyLines = doc.splitTextToSize(para.trim(), CW - 12);
        for (const bl of bodyLines) {
          ensureSpace(LINE_H + 1);
          doc.text(bl, ML + 4, y);
          y += LINE_H;
        }
        y += 4; // paragraph spacing
      }
    }
    y += 4;
  }

  // ════════════════════════════════════════
  // ADMIN FEEDBACK
  // ════════════════════════════════════════
  if (pair.adminFeedback) {
    ensureSpace(30);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(ML, y, pw - MR, y);
    y += 8;

    // Header bar
    doc.setFillColor(250, 245, 255);
    doc.roundedRect(ML, y, CW, 12, 2, 2, "F");
    doc.setDrawColor(221, 214, 254);
    doc.setLineWidth(0.3);
    doc.roundedRect(ML, y, CW, 12, 2, 2, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(126, 34, 206);
    doc.text("Feedback do Professor", ML + 6, y + 8);
    y += 18;

    // Feedback body
    const paragraphs = cleanText(pair.adminFeedback).split(/\n+/);
    for (const para of paragraphs) {
      if (!para.trim()) continue;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(BODY_SIZE);
      doc.setTextColor(51, 65, 85);
      const bodyLines = doc.splitTextToSize(para.trim(), CW - 12);
      for (const bl of bodyLines) {
        ensureSpace(LINE_H + 1);
        doc.text(bl, ML + 4, y);
        y += LINE_H;
      }
      y += 4;
    }
    y += 4;
  }

  // ════════════════════════════════════════
  // FOOTER on every page
  // ════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Footer line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(ML, ph - 15, pw - MR, ph - 15);
    // Footer text
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(`Pagina ${i} de ${totalPages}`, pw / 2, ph - 9, { align: "center" });
    doc.text("Gerado por ProvaFacil", ML, ph - 9);
    doc.text(new Date().toLocaleString("pt-BR"), pw - MR, ph - 9, { align: "right" });
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
        if (!error && data?.results) {
          const results = data.results.map((r: any) => ({ email: r.email, success: r.success }));
          setSendResults(prev => [...prev, ...results]);
        }
      } catch { /* continue */ }
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
