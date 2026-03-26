import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface ReportData {
  title: string;
  subtitle?: string;
  date?: string;
  stats: { label: string; value: string | number }[];
  students: { name: string; email?: string; score: number; maxScore: number }[];
  chartElementId?: string;
  competencies?: { name: string; avg: number }[];
}

interface Props {
  data: ReportData;
  variant?: "sm" | "default";
}

export function AdvancedPDFReport({ data, variant = "default" }: Props) {
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      let y = 15;

      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pw, 35, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text(data.title, 15, 18);
      doc.setFontSize(10);
      doc.text(data.subtitle || "Relatório ProvaFácil", 15, 26);
      doc.text(data.date || new Date().toLocaleDateString("pt-BR"), pw - 15, 26, { align: "right" });
      y = 45;

      // Stats
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text("Resumo Estatístico", 15, y); y += 8;
      doc.setFontSize(9);

      const scores = data.students.map(s => s.maxScore > 0 ? (s.score / s.maxScore) * 100 : 0);
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const sorted = [...scores].sort((a, b) => a - b);
      const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
      const stdDev = scores.length > 0 ? Math.sqrt(scores.reduce((s, v) => s + (v - avg) ** 2, 0) / scores.length) : 0;

      const allStats = [
        { label: "Alunos", value: data.students.length },
        { label: "Média", value: `${avg.toFixed(1)}%` },
        { label: "Mediana", value: `${median.toFixed(1)}%` },
        { label: "Desvio Padrão", value: `${stdDev.toFixed(1)}%` },
        { label: "Maior Nota", value: `${(sorted[sorted.length - 1] || 0).toFixed(1)}%` },
        { label: "Menor Nota", value: `${(sorted[0] || 0).toFixed(1)}%` },
        ...data.stats,
      ];

      const cols = 3;
      const colW = (pw - 30) / cols;
      allStats.forEach((s, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const sx = 15 + col * colW;
        const sy = y + row * 14;
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(s.label, sx, sy);
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text(String(s.value), sx, sy + 6);
      });
      y += Math.ceil(allStats.length / cols) * 14 + 10;

      // Chart capture
      if (data.chartElementId) {
        const el = document.getElementById(data.chartElementId);
        if (el) {
          try {
            const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2 });
            const imgData = canvas.toDataURL("image/png");
            const imgW = pw - 30;
            const imgH = (canvas.height / canvas.width) * imgW;
            if (y + imgH > 280) { doc.addPage(); y = 15; }
            doc.addImage(imgData, "PNG", 15, y, imgW, imgH);
            y += imgH + 10;
          } catch { /* chart capture failed, skip */ }
        }
      }

      // Distribution histogram (text-based)
      doc.setFontSize(12);
      if (y > 250) { doc.addPage(); y = 15; }
      doc.text("Distribuição de Notas", 15, y); y += 8;
      doc.setFontSize(9);
      const ranges = ["0-20%", "21-40%", "41-60%", "61-80%", "81-100%"];
      const rangeCounts = [0, 0, 0, 0, 0];
      scores.forEach(s => {
        if (s <= 20) rangeCounts[0]++;
        else if (s <= 40) rangeCounts[1]++;
        else if (s <= 60) rangeCounts[2]++;
        else if (s <= 80) rangeCounts[3]++;
        else rangeCounts[4]++;
      });
      const maxCount = Math.max(...rangeCounts, 1);
      ranges.forEach((r, i) => {
        const barW = (rangeCounts[i] / maxCount) * (pw - 80);
        doc.setFillColor(37, 99, 235);
        doc.rect(50, y - 3, barW, 5, "F");
        doc.setTextColor(0);
        doc.text(r, 15, y);
        doc.text(String(rangeCounts[i]), 52 + barW, y);
        y += 8;
      });
      y += 5;

      // Student table
      if (y > 230) { doc.addPage(); y = 15; }
      doc.setFontSize(12);
      doc.text("Desempenho por Aluno", 15, y); y += 8;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text("Nome", 15, y);
      doc.text("Nota", pw / 2, y);
      doc.text("%", pw - 30, y);
      y += 5;
      doc.setDrawColor(200);
      doc.line(15, y, pw - 15, y); y += 4;

      doc.setTextColor(0);
      data.students.forEach(s => {
        if (y > 280) { doc.addPage(); y = 15; }
        const pct = s.maxScore > 0 ? ((s.score / s.maxScore) * 100).toFixed(0) : "0";
        doc.text(s.name || s.email || "—", 15, y);
        doc.text(`${s.score.toFixed(1)} / ${s.maxScore.toFixed(1)}`, pw / 2, y);
        doc.text(`${pct}%`, pw - 30, y);
        y += 6;
      });

      // Competencies if available
      if (data.competencies && data.competencies.length > 0) {
        doc.addPage(); y = 15;
        doc.setFontSize(12);
        doc.text("Competências", 15, y); y += 10;
        doc.setFontSize(9);
        data.competencies.forEach(c => {
          if (y > 280) { doc.addPage(); y = 15; }
          const barW = (c.avg / 100) * (pw - 80);
          doc.text(c.name, 15, y);
          doc.setFillColor(c.avg >= 70 ? 34 : c.avg >= 50 ? 234 : 220, c.avg >= 70 ? 197 : c.avg >= 50 ? 179 : 38, c.avg >= 70 ? 94 : c.avg >= 50 ? 8 : 38);
          doc.rect(70, y - 3, barW, 5, "F");
          doc.text(`${c.avg.toFixed(0)}%`, 72 + barW, y);
          y += 8;
        });
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`ProvaFácil — Página ${i}/${totalPages}`, pw / 2, doc.internal.pageSize.getHeight() - 7, { align: "center" });
      }

      doc.save(`relatorio_${data.title.replace(/\s+/g, "_")}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF");
    }
    setGenerating(false);
  };

  return (
    <Button onClick={generate} disabled={generating} size={variant === "sm" ? "sm" : "default"} variant="outline">
      {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
      Exportar PDF
    </Button>
  );
}
