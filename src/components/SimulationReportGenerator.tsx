import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileDown, Loader2, Mail, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

export type StageType = "anamnese" | "soap" | "reconciliacao" | "documentacao";
export type { PairReport };

interface PairReport {
  pairIndex: number;
  students: { name: string; email?: string }[];
  score: number;
  maxScore: number;
  details: { label: string; value: string; score?: string }[];
  aiFeedback?: string | null;
  adminFeedback?: string | null;
  aiScore?: number | null;
  adminScore?: number | null;
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

export function SimulationReportGenerator({ stageName, stageType, roomTitle, roomDate, pairs }: SimulationReportProps) {
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generatedPdfs, setGeneratedPdfs] = useState<Map<number, { blob: Blob; base64: string }>>(new Map());
  const [sendResults, setSendResults] = useState<{ email: string; success: boolean }[]>([]);

  const generatePdf = (pair: PairReport): { blob: Blob; base64: string } => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    let y = 15;

    const addPageIfNeeded = (neededSpace: number) => {
      if (y + neededSpace > ph - 20) {
        doc.addPage();
        y = 20;
      }
    };

    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pw, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(`Relatório — ${stageLabels[stageType]}`, 15, 16);
    doc.setFontSize(10);
    doc.text(roomTitle, 15, 24);
    doc.text(roomDate || new Date().toLocaleDateString("pt-BR"), pw - 15, 24, { align: "right" });
    doc.setFontSize(9);
    doc.text("ProvaFácil", 15, 32);
    y = 48;

    // Students
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const studentLabel = pair.students.length > 1 ? "Dupla" : "Aluno(a)";
    doc.text(`${studentLabel}: ${pair.students.map(s => s.name).join(" & ")}`, 15, y);
    y += 10;

    // Score summary
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(15, y, pw - 30, 22, 3, 3, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Nota Final", 20, y + 9);
    doc.setFontSize(16);
    const scoreText = `${pair.score.toFixed(1)} / ${pair.maxScore.toFixed(1)}`;
    doc.text(scoreText, pw - 20, y + 14, { align: "right" });
    const pct = pair.maxScore > 0 ? (pair.score / pair.maxScore * 100) : 0;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`(${pct.toFixed(0)}%)`, pw - 20, y + 20, { align: "right" });
    y += 30;

    // Individual scores
    doc.setTextColor(0, 0, 0);
    if (pair.aiScore != null || pair.adminScore != null) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Detalhamento de Notas", 15, y); y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      if (pair.adminScore != null) {
        doc.text(`• Nota do Professor: ${pair.adminScore}`, 20, y); y += 5;
      }
      if (pair.aiScore != null) {
        doc.text(`• Nota da IA: ${pair.aiScore}`, 20, y); y += 5;
      }
      y += 5;
    }

    // Details (answers)
    if (pair.details.length > 0) {
      addPageIfNeeded(20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Respostas", 15, y); y += 7;

      for (const detail of pair.details) {
        addPageIfNeeded(20);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80, 80, 80);
        const labelLine = detail.score ? `${detail.label} (${detail.score})` : detail.label;
        doc.text(labelLine, 15, y); y += 4;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const lines = doc.splitTextToSize(detail.value || "—", pw - 35);
        for (const line of lines) {
          addPageIfNeeded(5);
          doc.text(line, 20, y); y += 4;
        }
        y += 3;
      }
    }

    // AI Feedback
    if (pair.aiFeedback) {
      addPageIfNeeded(30);
      y += 3;
      doc.setFillColor(239, 246, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("Feedback da IA", 15, y); y += 7;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(8);
      const feedbackLines = doc.splitTextToSize(pair.aiFeedback, pw - 35);
      for (const line of feedbackLines) {
        addPageIfNeeded(5);
        doc.text(line, 20, y); y += 4;
      }
      y += 5;
    }

    // Admin Feedback
    if (pair.adminFeedback) {
      addPageIfNeeded(30);
      y += 3;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 30, 200);
      doc.text("Feedback do Professor", 15, y); y += 7;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(8);
      const feedbackLines = doc.splitTextToSize(pair.adminFeedback, pw - 35);
      for (const line of feedbackLines) {
        addPageIfNeeded(5);
        doc.text(line, 20, y); y += 4;
      }
      y += 5;
    }

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${totalPages}`, pw / 2, ph - 8, { align: "center" });
      doc.text("Gerado por ProvaFácil", 15, ph - 8);
    }

    const blob = doc.output("blob");
    const base64 = doc.output("datauristring").split(",")[1];
    return { blob, base64 };
  };

  const handleGenerateAll = async () => {
    setGenerating(true);
    try {
      const pdfs = new Map<number, { blob: Blob; base64: string }>();
      for (const pair of pairs) {
        const result = generatePdf(pair);
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
    a.download = `relatorio-${stageType}-dupla${pair.pairIndex + 1}.pdf`;
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
          fileName: `relatorio-${stageType}-dupla${pair.pairIndex + 1}.pdf`,
          roomTitle,
          stageName: stageLabels[stageType],
          studentNames: pair.students.map(s => s.name),
        },
      });

      if (error) throw error;

      const results = data?.results || [];
      const newSendResults = results.map((r: any) => ({ email: r.email, success: r.success }));
      setSendResults(prev => [...prev, ...newSendResults]);

      const allSuccess = newSendResults.every((r: any) => r.success);
      if (allSuccess) {
        toast.success(`Relatório enviado para ${emails.join(", ")}`);
      } else {
        toast.error("Alguns emails falharam. Verifique os resultados.");
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
            fileName: `relatorio-${stageType}-dupla${pair.pairIndex + 1}.pdf`,
            roomTitle,
            stageName: stageLabels[stageType],
            studentNames: pair.students.map(s => s.name),
          },
        });
        if (!error && data?.results) {
          const results = data.results.map((r: any) => ({ email: r.email, success: r.success }));
          setSendResults(prev => [...prev, ...results]);
        }
      } catch {
        // continue with next
      }
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
