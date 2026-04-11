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
  reconciliacao: "Reconciliação",
  documentacao: "Documentação",
};

// Colors
const BLUE = [37, 99, 235] as const;
const DARK = [30, 41, 59] as const;
const MUTED = [100, 116, 139] as const;
const LIGHT_BG = [248, 250, 252] as const;
const BLUE_BG = [239, 246, 255] as const;
const GREEN_BG = [240, 253, 244] as const;
const PURPLE_BG = [250, 245, 255] as const;
const BORDER = [226, 232, 240] as const;

function generatePdf(pair: PairReport, stageType: StageType, roomTitle: string, roomDate?: string): { blob: Blob; base64: string } {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const marginL = 14;
  const marginR = 14;
  const contentW = pw - marginL - marginR;
  let y = 0;

  const addPageIfNeeded = (space: number) => {
    if (y + space > ph - 22) {
      doc.addPage();
      y = 18;
    }
  };

  const drawLine = (yPos: number) => {
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(marginL, yPos, pw - marginR, yPos);
  };

  const writeWrapped = (text: string, x: number, startY: number, maxW: number, fontSize: number, color: readonly [number, number, number], bold = false): number => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxW);
    const lineH = fontSize * 0.45;
    for (const line of lines) {
      addPageIfNeeded(lineH + 1);
      doc.text(line, x, startY);
      startY += lineH;
    }
    return startY;
  };

  // ── HEADER ──
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pw, 42, "F");
  // Accent bar
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 42, pw, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`Relatório — ${stageLabels[stageType]}`, marginL, 16);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(roomTitle, marginL, 25);

  doc.setFontSize(9);
  doc.setTextColor(200, 220, 255);
  doc.text(roomDate || new Date().toLocaleDateString("pt-BR"), pw - marginR, 25, { align: "right" });
  doc.text("ProvaFácil", marginL, 34);
  y = 54;

  // ── STUDENT NAME ──
  const studentLabel = pair.students.length > 1 ? "Dupla" : "Aluno(a)";
  const nameStr = pair.students.map(s => s.name).join(" & ");
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(`${studentLabel}: ${nameStr}`, marginL, y);
  y += 10;

  // ── SCORE BOX ──
  const boxH = 28;
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(marginL, y, contentW, boxH, 3, 3, "F");
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.roundedRect(marginL, y, contentW, boxH, 3, 3, "S");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Nota Final", marginL + 8, y + 11);

  const pct = pair.maxScore > 0 ? (pair.score / pair.maxScore * 100) : 0;
  // Color based on score
  if (pct >= 70) doc.setTextColor(22, 163, 74);
  else if (pct >= 50) doc.setTextColor(202, 138, 4);
  else doc.setTextColor(220, 38, 38);

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(`${pair.score.toFixed(1)} / ${pair.maxScore.toFixed(1)}`, pw - marginR - 8, y + 14, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text(`(${pct.toFixed(0)}%)`, pw - marginR - 8, y + 22, { align: "right" });

  // Score breakdown inside box
  const scores: string[] = [];
  if (pair.adminScore != null) scores.push(`Professor: ${pair.adminScore.toFixed(1)}`);
  if (pair.peerScore != null) scores.push(`Pares: ${pair.peerScore.toFixed(1)}`);
  if (pair.aiScore != null) scores.push(`IA: ${pair.aiScore.toFixed(1)}`);
  if (scores.length > 0) {
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(scores.join("  •  "), marginL + 8, y + 22);
  }
  y += boxH + 10;

  // ── SECTIONS (peer evaluations, student answers, etc.) ──
  const allSections: ReportSection[] = [];
  
  // If there are details but no sections, put details in a default section
  if (pair.details.length > 0 && (!pair.sections || pair.sections.length === 0)) {
    allSections.push({ title: "Respostas", items: pair.details });
  }
  if (pair.sections) {
    allSections.push(...pair.sections);
  }

  const sectionColors: { bg: readonly [number, number, number]; accent: readonly [number, number, number] }[] = [
    { bg: LIGHT_BG, accent: BLUE },
    { bg: GREEN_BG, accent: [22, 163, 74] },
    { bg: PURPLE_BG, accent: [126, 34, 206] },
    { bg: BLUE_BG, accent: BLUE },
  ];

  for (let si = 0; si < allSections.length; si++) {
    const section = allSections[si];
    const colors = sectionColors[si % sectionColors.length];

    addPageIfNeeded(20);
    // Section header
    doc.setFillColor(...colors.accent);
    doc.rect(marginL, y, 3, 8, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(section.title, marginL + 7, y + 6);
    y += 12;

    for (const item of section.items) {
      addPageIfNeeded(16);
      // Item background
      doc.setFillColor(...colors.bg);
      const valueLines = doc.splitTextToSize(item.value || "—", contentW - 16);
      const itemH = Math.max(10, 6 + valueLines.length * 3.8);
      doc.roundedRect(marginL + 2, y - 2, contentW - 4, itemH + 2, 1.5, 1.5, "F");

      // Label
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      const labelText = item.label;
      doc.text(labelText, marginL + 6, y + 3);

      // Score badge
      if (item.score) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...MUTED);
        doc.text(item.score, pw - marginR - 6, y + 3, { align: "right" });
      }

      // Value
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      let vy = y + 7;
      for (const line of valueLines) {
        addPageIfNeeded(5);
        doc.text(line, marginL + 6, vy);
        vy += 3.8;
      }
      y += itemH + 3;
    }
    y += 4;
  }

  // ── AI FEEDBACK ──
  if (pair.aiFeedback) {
    addPageIfNeeded(25);
    drawLine(y);
    y += 6;
    doc.setFillColor(...BLUE_BG);
    doc.roundedRect(marginL, y - 3, contentW, 10, 2, 2, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BLUE);
    doc.text("🤖  Feedback da IA", marginL + 5, y + 3);
    y += 12;

    y = writeWrapped(pair.aiFeedback, marginL + 5, y, contentW - 10, 8, DARK);
    y += 6;
  }

  // ── ADMIN FEEDBACK ──
  if (pair.adminFeedback) {
    addPageIfNeeded(25);
    drawLine(y);
    y += 6;
    doc.setFillColor(...PURPLE_BG);
    doc.roundedRect(marginL, y - 3, contentW, 10, 2, 2, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(126, 34, 206);
    doc.text("👨‍🏫  Feedback do Professor", marginL + 5, y + 3);
    y += 12;

    y = writeWrapped(pair.adminFeedback, marginL + 5, y, contentW - 10, 8, DARK);
    y += 6;
  }

  // ── FOOTER ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Footer line
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(marginL, ph - 14, pw - marginR, ph - 14);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`Página ${i} de ${totalPages}`, pw / 2, ph - 8, { align: "center" });
    doc.text("Gerado por ProvaFácil", marginL, ph - 8);
    doc.text(new Date().toLocaleString("pt-BR"), pw - marginR, ph - 8, { align: "right" });
  }

  const blob = doc.output("blob");
  const base64 = doc.output("datauristring").split(",")[1];
  return { blob, base64 };
}

export function SimulationReportGenerator({ stageName, stageType, roomTitle, roomDate, pairs }: SimulationReportProps) {
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generatedPdfs, setGeneratedPdfs] = useState<Map<number, { blob: Blob; base64: string }>>(new Map());
  const [sendResults, setSendResults] = useState<{ email: string; success: boolean }[]>([]);

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
      toast.success(`${pdfs.size} relatório(s) gerado(s) com sucesso!`);
    } catch (err) {
      toast.error("Erro ao gerar relatórios");
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

  const sendEmail = async (pair: PairReport) => {
    const pdf = generatedPdfs.get(pair.pairIndex);
    if (!pdf) return;
    const emails = pair.students.map(s => s.email).filter((e): e is string => !!e);
    if (emails.length === 0) {
      toast.error("Nenhum email cadastrado para esta dupla.");
      return;
    }
    setSending(true);
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
      if (error) throw error;
      const results = data?.results || [];
      const newSendResults = results.map((r: any) => ({ email: r.email, success: r.success }));
      setSendResults(prev => [...prev, ...newSendResults]);
      if (newSendResults.every((r: any) => r.success)) {
        toast.success(`Relatório enviado para ${emails.join(", ")}`);
      } else {
        toast.error("Alguns emails falharam.");
      }
    } catch (err) {
      toast.error("Erro ao enviar email");
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
    toast.success("Envio concluído!");
  };

  return (
    <>
      <Button onClick={handleGenerateAll} disabled={generating || pairs.length === 0} variant="outline" className="gap-2">
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
        Gerar Relatórios
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Relatórios — {stageLabels[stageType]}</DialogTitle>
            <DialogDescription>{roomTitle} • {pairs.length} relatório(s) gerado(s)</DialogDescription>
          </DialogHeader>

          <div className="flex justify-end mb-4">
            <Button onClick={sendAllEmails} disabled={sending} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Enviar Todos por Email
            </Button>
          </div>

          <div className="space-y-3">
            {pairs.map(pair => {
              const hasEmails = pair.students.some(s => !!s.email);
              const sentEmails = sendResults.filter(r => pair.students.some(s => s.email === r.email));
              return (
                <div key={pair.pairIndex} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{pair.students.map(s => s.name).join(" & ")}</p>
                      <p className="text-xs text-muted-foreground">
                        Nota: {pair.score.toFixed(1)}/{pair.maxScore.toFixed(1)}
                        {pair.students.map(s => s.email).filter(Boolean).length > 0 && (
                          <> • {pair.students.map(s => s.email).filter(Boolean).join(", ")}</>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => downloadPdf(pair)}>
                        <FileDown className="h-3.5 w-3.5 mr-1" />PDF
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => sendEmail(pair)} disabled={!hasEmails || sending}>
                        <Mail className="h-3.5 w-3.5 mr-1" />Email
                      </Button>
                    </div>
                  </div>
                  {sentEmails.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {sentEmails.map((r, i) => (
                        <Badge key={i} variant={r.success ? "default" : "destructive"} className="text-xs">
                          {r.success ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                          {r.email}
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
