import { useState, useRef, useCallback } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface ExamQuestion {
  id: string;
  questionId: string;
  title: string;
  type: string;
  points: number;
  contentJson?: Record<string, any>;
}

export interface Section {
  id: string;
  name: string;
  questions: ExamQuestion[];
  collapsed: boolean;
}

interface ExamPDFExporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examTitle: string;
  sections: Section[];
  institutionName: string;
  teacherName: string;
  examDate: string;
  instructions: string;
}

const VERSION_LETTERS = ["A", "B", "C", "D"];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function shuffleSections(sections: Section[]): Section[] {
  return sections.map((section) => ({
    ...section,
    questions: shuffleArray(section.questions),
  }));
}

function getCorrectAnswer(q: ExamQuestion): string {
  const c = q.contentJson;
  if (!c) return "—";

  if (q.type === "multiple_choice") {
    const options = c.options as { text: string; isCorrect?: boolean }[] | undefined;
    if (options) {
      const idx = options.findIndex((o) => o.isCorrect);
      if (idx >= 0) {
        const letter = String.fromCharCode(97 + idx); // a, b, c, d...
        return `${letter}) ${options[idx].text}`;
      }
    }
    return c.correct_answer || c.correctAnswer || "—";
  }

  if (q.type === "true_false") {
    const answer = c.correct_answer ?? c.correctAnswer ?? c.isTrue;
    if (answer === true || answer === "true" || answer === "Verdadeiro") return "Verdadeiro";
    if (answer === false || answer === "false" || answer === "Falso") return "Falso";
    return String(answer ?? "—");
  }

  if (q.type === "matching") {
    const pairs = c.pairs as { left: string; right: string }[] | undefined;
    if (pairs) return pairs.map((p) => `${p.left} → ${p.right}`).join("; ");
    return c.correct_answer || "—";
  }

  if (q.type === "open_ended") {
    return c.expected_answer || c.expectedAnswer || c.correct_answer || "Resposta dissertativa";
  }

  return "—";
}

function getCorrectLetterOnly(q: ExamQuestion): string | null {
  if (q.type !== "multiple_choice") return null;
  const c = q.contentJson;
  if (!c) return null;
  const options = c.options as { text: string; isCorrect?: boolean }[] | undefined;
  if (options) {
    const idx = options.findIndex((o) => o.isCorrect);
    if (idx >= 0) return String.fromCharCode(65 + idx); // A, B, C, D
  }
  return null;
}

export default function ExamPDFExporter({
  open,
  onOpenChange,
  examTitle,
  sections,
  institutionName,
  teacherName,
  examDate,
  instructions,
}: ExamPDFExporterProps) {
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState("CONFIDENCIAL");
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [includeAnswerSheet, setIncludeAnswerSheet] = useState(false);
  const [versionCount, setVersionCount] = useState("1");
  const [isGenerating, setIsGenerating] = useState(false);
  const renderRef = useRef<HTMLDivElement>(null);

  const formattedDate = (() => {
    try {
      return new Date(examDate).toLocaleDateString("pt-BR");
    } catch {
      return examDate;
    }
  })();

  const addWatermark = useCallback((pdf: jsPDF, text: string) => {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.saveGraphicsState();
    pdf.setGState(new (pdf as any).GState({ opacity: 0.08 }));
    pdf.setFontSize(60);
    pdf.setTextColor(100, 100, 100);
    const textWidth = pdf.getTextWidth(text);
    const cx = pageWidth / 2;
    const cy = pageHeight / 2;
    pdf.text(text, cx - textWidth / 2 * Math.cos(Math.PI / 4), cy, {
      angle: 45,
    });
    pdf.restoreGraphicsState();
  }, []);

  const addAnswerKeyPage = useCallback(
    (pdf: jsPDF, versionSections: Section[], versionLetter: string) => {
      pdf.addPage();
      const pageWidth = pdf.internal.pageSize.getWidth();
      let y = 20;

      // Header
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("GABARITO — CHAVE DE CORREÇÃO", pageWidth / 2, y, { align: "center" });
      y += 8;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${examTitle} — Versão ${versionLetter}`, pageWidth / 2, y, { align: "center" });
      y += 6;
      pdf.text(`${institutionName} | Prof. ${teacherName} | ${formattedDate}`, pageWidth / 2, y, { align: "center" });
      y += 10;

      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.3);

      // Table header
      const col1 = 15;
      const col2 = 30;
      const col3 = 65;
      const col4 = 90;
      const col5 = 110;
      const rowH = 8;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setFillColor(240, 240, 240);
      pdf.rect(col1 - 2, y - 4, 185, rowH, "F");
      pdf.text("Nº", col1, y);
      pdf.text("Seção", col2, y);
      pdf.text("Tipo", col3, y);
      pdf.text("Pts", col4, y);
      pdf.text("Resposta Correta", col5, y);
      y += 2;
      pdf.line(col1 - 2, y, 198, y);
      y += 5;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      let questionNum = 1;
      for (const section of versionSections) {
        for (const q of section.questions) {
          const typeLabel =
            q.type === "multiple_choice" ? "Múlt. Escolha" :
            q.type === "true_false" ? "V ou F" :
            q.type === "open_ended" ? "Dissertativa" :
            q.type === "matching" ? "Associação" : q.type;

          const answer = getCorrectAnswer(q);

          // Alternating row bg
          if (questionNum % 2 === 0) {
            pdf.setFillColor(248, 248, 248);
            pdf.rect(col1 - 2, y - 4, 185, rowH, "F");
          }

          pdf.setFont("helvetica", "bold");
          pdf.text(String(questionNum).padStart(2, "0"), col1, y);
          pdf.setFont("helvetica", "normal");
          pdf.text(section.name.substring(0, 20), col2, y);
          pdf.text(typeLabel, col3, y);
          pdf.text(`${q.points}`, col4, y);

          // Truncate long answers
          const maxAnswerWidth = 85;
          let answerText = answer;
          if (pdf.getTextWidth(answerText) > maxAnswerWidth) {
            while (pdf.getTextWidth(answerText + "...") > maxAnswerWidth && answerText.length > 0) {
              answerText = answerText.slice(0, -1);
            }
            answerText += "...";
          }
          pdf.setFont("helvetica", "bold");
          pdf.text(answerText, col5, y);
          pdf.setFont("helvetica", "normal");

          y += rowH;
          questionNum++;

          if (y > 270) {
            pdf.addPage();
            y = 20;
          }
        }
      }

      // Summary
      y += 5;
      pdf.setLineWidth(0.5);
      pdf.line(col1 - 2, y, 198, y);
      y += 7;
      const totalPts = versionSections.reduce((s, sec) => s + sec.questions.reduce((qs, q) => qs + q.points, 0), 0);
      const totalQ = versionSections.reduce((s, sec) => s + sec.questions.length, 0);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text(`Total: ${totalQ} questões — ${totalPts} pontos`, col1, y);

      if (watermarkEnabled && watermarkText) {
        addWatermark(pdf, watermarkText);
      }
    },
    [examTitle, institutionName, teacherName, formattedDate, watermarkEnabled, watermarkText, addWatermark]
  );

  const addAnswerSheetPage = useCallback(
    (pdf: jsPDF, versionSections: Section[], versionLetter: string) => {
      pdf.addPage();
      const pageWidth = pdf.internal.pageSize.getWidth();
      let y = 20;

      // Header
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("CARTÃO-RESPOSTA", pageWidth / 2, y, { align: "center" });
      y += 7;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${examTitle} — Versão ${versionLetter}`, pageWidth / 2, y, { align: "center" });
      y += 6;
      pdf.text(`${institutionName} | ${formattedDate}`, pageWidth / 2, y, { align: "center" });
      y += 10;

      // Student info fields
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text("Nome: ______________________________________________", 15, y);
      pdf.text("RA: ________________", 145, y);
      y += 10;

      pdf.setDrawColor(150, 150, 150);
      pdf.setLineWidth(0.3);
      pdf.line(15, y, 195, y);
      y += 8;

      // Bubble grid
      const options = ["A", "B", "C", "D", "E"];
      const colStart = 20;
      const bubbleR = 3;
      const colSpacing = 12;
      const rowSpacing = 9;
      const numColStart = colStart;
      const optStart = colStart + 15;

      // Column headers
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text("Nº", numColStart, y);
      options.forEach((opt, i) => {
        pdf.text(opt, optStart + i * colSpacing, y);
      });

      // Second column headers (for >25 questions)
      const col2Offset = 105;
      const allQuestions: { num: number; type: string }[] = [];
      let num = 1;
      for (const section of versionSections) {
        for (const q of section.questions) {
          allQuestions.push({ num, type: q.type });
          num++;
        }
      }

      const hasCol2 = allQuestions.length > 25;
      if (hasCol2) {
        pdf.text("Nº", numColStart + col2Offset, y);
        options.forEach((opt, i) => {
          pdf.text(opt, optStart + col2Offset + i * colSpacing, y);
        });
      }
      y += 6;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);

      const startY = y;
      allQuestions.forEach((q, idx) => {
        const inCol2 = idx >= 25;
        const row = inCol2 ? idx - 25 : idx;
        const xOffset = inCol2 ? col2Offset : 0;
        const currentY = startY + row * rowSpacing;

        if (currentY > 275) return; // safety

        // Question number
        pdf.setFont("helvetica", "bold");
        pdf.text(String(q.num).padStart(2, "0"), numColStart + xOffset, currentY + 1);
        pdf.setFont("helvetica", "normal");

        if (q.type === "multiple_choice") {
          // Draw bubbles
          options.forEach((_, i) => {
            const cx = optStart + xOffset + i * colSpacing;
            pdf.circle(cx, currentY - 0.5, bubbleR);
          });
        } else if (q.type === "true_false") {
          // V / F bubbles
          pdf.setFontSize(7);
          pdf.text("V", optStart + xOffset - 1, currentY + 1);
          pdf.circle(optStart + xOffset, currentY - 0.5, bubbleR);
          pdf.text("F", optStart + xOffset + colSpacing - 1, currentY + 1);
          pdf.circle(optStart + xOffset + colSpacing, currentY - 0.5, bubbleR);
          pdf.setFontSize(8);
        } else {
          // For open_ended / matching - show "Ver prova"
          pdf.setFontSize(7);
          pdf.setTextColor(150, 150, 150);
          pdf.text("(ver prova)", optStart + xOffset, currentY + 1);
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(8);
        }
      });

      // Footer instructions
      const footerY = 280;
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      pdf.text("Preencha completamente o círculo correspondente à alternativa escolhida. Use caneta preta ou azul.", 15, footerY);
      pdf.text("Não rasure nem amasse este cartão.", 15, footerY + 4);
      pdf.setTextColor(0, 0, 0);

      if (watermarkEnabled && watermarkText) {
        addWatermark(pdf, watermarkText);
      }
    },
    [examTitle, institutionName, formattedDate, watermarkEnabled, watermarkText, addWatermark]
  );

  const renderExamHTML = useCallback(
    async (versionLetter: string, versionSections: Section[]) => {
      const container = document.createElement("div");
      container.style.width = "794px";
      container.style.minHeight = "1123px";
      container.style.padding = "60px";
      container.style.backgroundColor = "#ffffff";
      container.style.fontFamily = "'Georgia', 'Times New Roman', serif";
      container.style.fontSize = "13px";
      container.style.lineHeight = "1.6";
      container.style.color = "#1a1a1a";
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.zIndex = "-1";

      const numVersions = parseInt(versionCount);
      const versionTag = numVersions > 1 ? ` — Versão ${versionLetter}` : "";

      // Generate unique exam ID for QR code
      const examUniqueId = `PF-${Date.now().toString(36).toUpperCase()}-${versionLetter}`;

      let html = `
        <div style="text-align:center;margin-bottom:24px">
          <table style="width:100%;margin-bottom:8px"><tr>
            <td style="text-align:left;vertical-align:middle">
              <span style="font-size:16px;font-weight:bold;color:#1a1a2e;">🎓 ProvaFácil</span>
            </td>
            <td style="text-align:right;vertical-align:middle">
              <div id="qr-placeholder" style="width:80px;height:80px;border:1px dashed #ccc;text-align:center;line-height:80px;font-size:8px;color:#999;display:inline-block;">QR</div>
            </td>
          </tr></table>
          <h2 style="font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;margin:0">${institutionName}</h2>
          <hr style="border:none;border-top:1px solid #ccc;margin:12px 0"/>
          <h3 style="font-size:17px;font-weight:bold;margin:8px 0">${examTitle}${versionTag}</h3>
          <p style="font-size:8px;color:#aaa;margin:2px 0">ID: ${examUniqueId}</p>
          <table style="width:100%;font-size:11px;color:#666;margin-top:10px"><tr>
            <td style="text-align:left">Professor(a): ${teacherName}</td>
            <td style="text-align:right">Data: ${formattedDate}</td>
          </tr></table>
          <div style="margin-top:12px;border-bottom:1px dashed #999;padding-bottom:8px">
            <p style="font-size:11px;margin:0">Nome do Aluno: ________________________________________ RA: _______________</p>
          </div>
          ${instructions ? `<p style="font-size:11px;font-style:italic;color:#666;text-align:left;margin-top:12px"><strong>Instruções:</strong> ${instructions}</p>` : ""}
        </div>
      `;

      let questionNum = 1;
      for (const section of versionSections) {
        html += `<div style="margin-bottom:20px">
          <h4 style="font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">${section.name}
            <span style="font-size:10px;color:#888;font-weight:normal;float:right">${section.questions.reduce((s, q) => s + q.points, 0)} pts</span>
          </h4>`;

        for (const q of section.questions) {
          html += `<div style="margin-bottom:14px;padding-left:8px">
            <p style="margin:0"><strong style="font-size:12px">${questionNum}.</strong> ${q.title} <span style="font-size:9px;color:#999">[${q.points} pts]</span></p>`;

          if (q.type === "multiple_choice") {
            const opts = q.contentJson?.options;
            if (opts && typeof opts === "object" && !Array.isArray(opts)) {
              // Object format: {a: "...", b: "..."}
              const entries = Object.entries(opts as Record<string, string>).sort(([a], [b]) => a.localeCompare(b));
              html += `<div style="margin-top:6px;padding-left:20px;font-size:11px;color:#333">`;
              entries.forEach(([letter, text]) => {
                html += `<p style="margin:2px 0">${letter}) ${text}</p>`;
              });
              html += `</div>`;
            } else if (Array.isArray(opts) && opts.length > 0) {
              html += `<div style="margin-top:6px;padding-left:20px;font-size:11px;color:#333">`;
              opts.forEach((opt: any, i: number) => {
                const letter = String.fromCharCode(97 + i);
                const text = typeof opt === "string" ? opt : opt.text;
                html += `<p style="margin:2px 0">${letter}) ${text}</p>`;
              });
              html += `</div>`;
            } else {
              html += `<div style="margin-top:6px;padding-left:20px;font-size:11px;color:#666">
                <p style="margin:2px 0">a) ________________________</p>
                <p style="margin:2px 0">b) ________________________</p>
                <p style="margin:2px 0">c) ________________________</p>
                <p style="margin:2px 0">d) ________________________</p>
              </div>`;
            }
          } else if (q.type === "true_false") {
            html += `<p style="margin-top:6px;padding-left:20px;font-size:11px;color:#666">( ) Verdadeiro &nbsp;&nbsp; ( ) Falso</p>`;
          } else if (q.type === "open_ended") {
            html += `<div style="margin-top:6px;border-bottom:1px dashed #ccc;height:50px"></div>`;
          } else if (q.type === "matching") {
            const colA = q.contentJson?.column_a as string[] | undefined;
            const colB = q.contentJson?.column_b as string[] | undefined;
            if (colA && colB && colA.length > 0) {
              html += `<table style="margin-top:6px;padding-left:20px;font-size:11px;color:#333;width:100%"><tr><td style="vertical-align:top;width:50%">`;
              html += `<p style="font-weight:bold;margin-bottom:4px">Coluna A</p>`;
              colA.forEach((item, i) => {
                html += `<p style="margin:2px 0">${i + 1}. ${item}</p>`;
              });
              html += `</td><td style="vertical-align:top;width:50%"><p style="font-weight:bold;margin-bottom:4px">Coluna B</p>`;
              colB.forEach((item, i) => {
                html += `<p style="margin:2px 0">${String.fromCharCode(97 + i)}) ${item}</p>`;
              });
              html += `</td></tr></table>`;
            } else {
              // fallback for pairs format
              const pairs = q.contentJson?.pairs as { left: string }[] | undefined;
              if (pairs && pairs.length > 0) {
                html += `<div style="margin-top:6px;padding-left:20px;font-size:11px;color:#333">`;
                pairs.forEach((p) => {
                  html += `<p style="margin:2px 0">( ) ${p.left} — ________________________</p>`;
                });
                html += `</div>`;
              } else {
                html += `<div style="margin-top:6px;padding-left:20px;font-size:11px;color:#666">
                  <p style="margin:2px 0">( ) Item A — ________________________</p>
                  <p style="margin:2px 0">( ) Item B — ________________________</p>
                </div>`;
              }
            }
          }

          html += `</div>`;
          questionNum++;
        }
        html += `</div>`;
      }

      // Footer with ProvaFácil branding
      html += `<div style="margin-top:30px;padding-top:10px;border-top:1px solid #ddd;text-align:center;font-size:9px;color:#aaa;">
        Gerado por <strong>ProvaFácil</strong> — provafacil.com
      </div>`;

      container.innerHTML = html;

      // Replace QR placeholder with actual QR code
      const qrPlaceholder = container.querySelector('#qr-placeholder');
      if (qrPlaceholder) {
        try {
          const qrDataUrl = await QRCode.toDataURL(examUniqueId, {
            width: 80,
            margin: 1,
            errorCorrectionLevel: 'M',
          });
          qrPlaceholder.innerHTML = `<img src="${qrDataUrl}" style="width:80px;height:80px;" />`;
        } catch (e) {
          console.error('QR code generation failed:', e);
        }
      }

      return container;
    },
    [versionCount, institutionName, examTitle, teacherName, formattedDate, instructions]
  );

  const generatePDF = useCallback(async () => {
    if (sections.length === 0 || sections.every((s) => s.questions.length === 0)) {
      toast.error("Adicione questões à prova antes de exportar.");
      return;
    }

    setIsGenerating(true);
    try {
      const numVersions = parseInt(versionCount);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      let isFirstPage = true;

      const A4_WIDTH_MM = 210;
      const A4_HEIGHT_MM = 297;
      const MARGIN_MM = 0;

      for (let v = 0; v < numVersions; v++) {
        const versionLetter = VERSION_LETTERS[v];
        const versionSections = numVersions > 1 ? shuffleSections(sections) : sections;

        const container = await renderExamHTML(versionLetter, versionSections);
        // Add data-pdf-section to each major block
        container.querySelectorAll(':scope > div').forEach((el) => {
          (el as HTMLElement).setAttribute('data-pdf-section', 'true');
        });
        document.body.appendChild(container);

        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });

        document.body.removeChild(container);

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const pdfWidth = A4_WIDTH_MM;
        const totalHeightMM = (canvas.height * pdfWidth) / canvas.width;

        // Multi-page: slice the canvas into A4-sized pages
        const pageContentHeight = A4_HEIGHT_MM;
        const totalPages = Math.ceil(totalHeightMM / pageContentHeight);

        for (let page = 0; page < totalPages; page++) {
          if (!isFirstPage) pdf.addPage();
          isFirstPage = false;

          // Calculate source slice in canvas pixels
          const sliceTopPx = (page * pageContentHeight / totalHeightMM) * canvas.height;
          const sliceHeightPx = Math.min(
            (pageContentHeight / totalHeightMM) * canvas.height,
            canvas.height - sliceTopPx
          );

          // Create a sub-canvas for this page
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.round(sliceHeightPx);
          const ctx = pageCanvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(
              canvas,
              0, Math.round(sliceTopPx), canvas.width, Math.round(sliceHeightPx),
              0, 0, pageCanvas.width, pageCanvas.height
            );
          }

          const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.95);
          const sliceHeightMM = (pageCanvas.height * pdfWidth) / pageCanvas.width;
          pdf.addImage(pageImgData, "JPEG", MARGIN_MM, MARGIN_MM, pdfWidth, sliceHeightMM);

          if (watermarkEnabled && watermarkText) {
            addWatermark(pdf, watermarkText);
          }
        }

        if (includeAnswerSheet) {
          addAnswerSheetPage(pdf, versionSections, versionLetter);
        }

        if (includeAnswerKey) {
          addAnswerKeyPage(pdf, versionSections, versionLetter);
        }
      }

      const safeName = examTitle.replace(/[^a-zA-Z0-9À-ÿ\s-]/g, "").replace(/\s+/g, "-").toLowerCase();
      pdf.save(`${safeName}.pdf`);
      toast.success("PDF exportado com sucesso!");
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar o PDF. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  }, [sections, versionCount, renderExamHTML, watermarkEnabled, watermarkText, addWatermark, includeAnswerKey, includeAnswerSheet, addAnswerKeyPage, addAnswerSheetPage, examTitle, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Exportar Prova em PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Marca d'água */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="watermark-toggle" className="text-sm font-medium">
                Marca d'água
              </Label>
              <Switch
                id="watermark-toggle"
                checked={watermarkEnabled}
                onCheckedChange={setWatermarkEnabled}
              />
            </div>
            {watermarkEnabled && (
              <Input
                placeholder="Ex: CONFIDENCIAL, RASCUNHO"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
              />
            )}
          </div>

          <Separator />

          {/* Gabarito */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="answer-key"
                checked={includeAnswerKey}
                onCheckedChange={(checked) => setIncludeAnswerKey(checked === true)}
              />
              <div>
                <Label htmlFor="answer-key" className="text-sm font-medium">
                  Gabarito com chave de correção
                </Label>
                <p className="text-xs text-muted-foreground">
                  Página com todas as respostas corretas para o professor
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="answer-sheet"
                checked={includeAnswerSheet}
                onCheckedChange={(checked) => setIncludeAnswerSheet(checked === true)}
              />
              <div>
                <Label htmlFor="answer-sheet" className="text-sm font-medium">
                  Cartão-resposta (folha de respostas)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Folha com bolhas para o aluno marcar as respostas
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Versões embaralhadas */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Versões embaralhadas (anti-cola)</Label>
            <Select value={versionCount} onValueChange={setVersionCount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 versão (sem embaralhamento)</SelectItem>
                <SelectItem value="2">2 versões (A e B)</SelectItem>
                <SelectItem value="3">3 versões (A, B e C)</SelectItem>
                <SelectItem value="4">4 versões (A, B, C e D)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Cada versão terá as questões em ordem diferente dentro de cada seção.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button onClick={generatePDF} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                Gerar PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      <div ref={renderRef} className="hidden" />
    </Dialog>
  );
}
