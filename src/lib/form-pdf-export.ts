import jsPDF from "jspdf";
import type { FormField } from "@/components/forms/types";
import { getSections } from "@/components/forms/types";

interface FormPDFOptions {
  title: string;
  subtitle?: string;
  formType?: string;
  fields: FormField[];
  showScores?: boolean;
}

const COLORS = {
  primary: [30, 64, 175] as [number, number, number],      // blue-800
  primaryLight: [219, 234, 254] as [number, number, number], // blue-100
  accent: [79, 70, 229] as [number, number, number],        // indigo-600
  dark: [15, 23, 42] as [number, number, number],           // slate-900
  medium: [71, 85, 105] as [number, number, number],        // slate-500
  light: [148, 163, 184] as [number, number, number],       // slate-400
  bg: [248, 250, 252] as [number, number, number],          // slate-50
  white: [255, 255, 255] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],      // slate-200
  sectionBg: [238, 242, 255] as [number, number, number],   // indigo-50
};

const PAGE = {
  marginLeft: 25,
  marginRight: 25,
  marginTop: 30,
  marginBottom: 25,
  width: 210,
};

const contentWidth = PAGE.width - PAGE.marginLeft - PAGE.marginRight;

function addHeader(doc: jsPDF, title: string, subtitle?: string, formType?: string) {
  // Top accent bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, PAGE.width, 4, "F");

  // Title area
  let y = 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.dark);
  doc.text(title, PAGE.marginLeft, y);
  y += 8;

  if (formType) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.accent);
    doc.text(formType.toUpperCase(), PAGE.marginLeft, y);
    y += 5;
  }

  if (subtitle) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.medium);
    doc.text(subtitle, PAGE.marginLeft, y);
    y += 5;
  }

  // Date line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.light);
  const dateStr = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
  doc.text(`Gerado em ${dateStr}`, PAGE.width - PAGE.marginRight, y, { align: "right" });
  y += 4;

  // Separator
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(PAGE.marginLeft, y, PAGE.width - PAGE.marginRight, y);

  return y + 8;
}

function addFooter(doc: jsPDF, pageNumber: number, totalPages: number) {
  const y = 290;
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(PAGE.marginLeft, y - 3, PAGE.width - PAGE.marginRight, y - 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.light);
  doc.text(`Página ${pageNumber} de ${totalPages}`, PAGE.width - PAGE.marginRight, y, { align: "right" });
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 275) {
    doc.addPage();
    return PAGE.marginTop;
  }
  return y;
}

function renderSectionHeader(doc: jsPDF, field: FormField, y: number): number {
  y = checkPageBreak(doc, y, 20);

  // Section background with left accent
  const boxH = field.description ? 18 : 12;
  doc.setFillColor(...COLORS.sectionBg);
  doc.roundedRect(PAGE.marginLeft, y - 4, contentWidth, boxH, 2, 2, "F");

  doc.setFillColor(...COLORS.accent);
  doc.rect(PAGE.marginLeft, y - 4, 3, boxH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.accent);
  doc.text(field.label, PAGE.marginLeft + 8, y + 3);

  if (field.description) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.medium);
    doc.text(field.description, PAGE.marginLeft + 8, y + 10, {
      maxWidth: contentWidth - 12,
    });
  }

  return y + boxH + 6;
}

function renderField(doc: jsPDF, field: FormField, y: number, showScores: boolean): number {
  if (field.type === "section_header") return renderSectionHeader(doc, field, y);
  if (field.type === "image_block" || field.type === "video_block") return y;

  const estimatedHeight = getFieldHeight(field);
  y = checkPageBreak(doc, y, estimatedHeight);

  // Field label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.dark);

  let labelText = field.label;
  if (field.required) labelText += " *";
  const labelLines = doc.splitTextToSize(labelText, contentWidth - (showScores && field.max_score ? 30 : 0));
  doc.text(labelLines, PAGE.marginLeft, y);

  // Score badge
  if (showScores && field.max_score) {
    const badgeX = PAGE.width - PAGE.marginRight - 22;
    doc.setFillColor(...COLORS.primaryLight);
    doc.roundedRect(badgeX, y - 4, 22, 7, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.primary);
    doc.text(`${field.max_score} pts`, badgeX + 11, y + 0.5, { align: "center" });
  }

  y += labelLines.length * 4.5;

  // Description
  if (field.description) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.medium);
    const descLines = doc.splitTextToSize(field.description, contentWidth);
    doc.text(descLines, PAGE.marginLeft, y);
    y += descLines.length * 3.5 + 1;
  }

  y += 2;

  // Render input area based on type
  switch (field.type) {
    case "text":
      y = renderInputLine(doc, y);
      break;
    case "textarea":
      y = renderTextarea(doc, y);
      break;
    case "radio":
      y = renderRadioOptions(doc, field, y);
      break;
    case "checkbox":
      y = renderCheckboxOptions(doc, field, y);
      break;
    case "dropdown":
      y = renderDropdown(doc, field, y);
      break;
    case "scale":
      y = renderScale(doc, field, y);
      break;
    case "rating":
      y = renderRating(doc, field, y);
      break;
    case "date":
      y = renderDateField(doc, y);
      break;
    case "file_upload":
      y = renderFileUpload(doc, y);
      break;
  }

  return y + 4;
}

function renderInputLine(doc: jsPDF, y: number): number {
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.4);
  doc.line(PAGE.marginLeft, y + 6, PAGE.width - PAGE.marginRight, y + 6);
  return y + 10;
}

function renderTextarea(doc: jsPDF, y: number): number {
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.setFillColor(...COLORS.bg);
  doc.roundedRect(PAGE.marginLeft, y, contentWidth, 24, 2, 2, "FD");
  // Internal lines
  for (let i = 1; i <= 3; i++) {
    const ly = y + i * 6;
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.15);
    doc.line(PAGE.marginLeft + 3, ly, PAGE.width - PAGE.marginRight - 3, ly);
  }
  return y + 28;
}

function renderRadioOptions(doc: jsPDF, field: FormField, y: number): number {
  if (!field.options) return y;
  for (const opt of field.options) {
    y = checkPageBreak(doc, y, 7);
    // Radio circle
    doc.setDrawColor(...COLORS.medium);
    doc.setLineWidth(0.4);
    doc.circle(PAGE.marginLeft + 4, y + 1.5, 2.5);
    // Label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    doc.text(opt, PAGE.marginLeft + 10, y + 2.5);
    y += 7;
  }
  return y;
}

function renderCheckboxOptions(doc: jsPDF, field: FormField, y: number): number {
  if (!field.options) return y;
  for (const opt of field.options) {
    y = checkPageBreak(doc, y, 7);
    // Checkbox square
    doc.setDrawColor(...COLORS.medium);
    doc.setLineWidth(0.4);
    doc.roundedRect(PAGE.marginLeft + 2, y - 0.5, 5, 5, 0.8, 0.8);
    // Label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    doc.text(opt, PAGE.marginLeft + 10, y + 3);
    y += 7;
  }
  return y;
}

function renderDropdown(doc: jsPDF, field: FormField, y: number): number {
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.4);
  doc.setFillColor(...COLORS.white);
  doc.roundedRect(PAGE.marginLeft, y, contentWidth * 0.6, 8, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.light);
  doc.text("Selecione uma opção ▾", PAGE.marginLeft + 3, y + 5.5);

  // List options below
  if (field.options && field.options.length > 0) {
    y += 11;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.medium);
    doc.text("Opções: " + field.options.join(" · "), PAGE.marginLeft, y, {
      maxWidth: contentWidth,
    });
    y += 4;
  } else {
    y += 12;
  }
  return y;
}

function renderScale(doc: jsPDF, field: FormField, y: number): number {
  const scaleMax = field.scale_max || field.max_score || 10;
  const barWidth = contentWidth - 30;

  // Labels
  if (field.scale_min_label || field.scale_max_label) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.medium);
    if (field.scale_min_label) doc.text(field.scale_min_label, PAGE.marginLeft, y + 2);
    if (field.scale_max_label) doc.text(field.scale_max_label, PAGE.marginLeft + barWidth + 15, y + 2, { align: "right" });
    y += 5;
  }

  // Track
  doc.setFillColor(...COLORS.border);
  doc.roundedRect(PAGE.marginLeft, y, barWidth, 3, 1.5, 1.5, "F");

  // Scale markers
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.light);
  const step = barWidth / scaleMax;
  for (let i = 0; i <= scaleMax; i++) {
    const x = PAGE.marginLeft + i * step;
    doc.line(x, y - 1, x, y + 4);
    doc.text(String(i), x, y + 8, { align: "center" });
  }

  return y + 12;
}

function renderRating(doc: jsPDF, field: FormField, y: number): number {
  const max = field.rating_max || 5;
  for (let i = 0; i < max; i++) {
    const x = PAGE.marginLeft + i * 10;
    doc.setDrawColor(...COLORS.light);
    doc.setLineWidth(0.3);
    // Star outline (simplified as pentagon-ish)
    drawStar(doc, x + 4, y + 3, 4);
  }
  return y + 10;
}

function drawStar(doc: jsPDF, cx: number, cy: number, r: number) {
  const points: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 2) + (i * Math.PI / 5);
    const radius = i % 2 === 0 ? r : r * 0.45;
    points.push([cx + Math.cos(angle) * radius, cy - Math.sin(angle) * radius]);
  }
  doc.setDrawColor(...COLORS.light);
  doc.setLineWidth(0.3);
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    doc.line(points[i][0], points[i][1], next[0], next[1]);
  }
}

function renderDateField(doc: jsPDF, y: number): number {
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.4);
  doc.setFillColor(...COLORS.white);
  doc.roundedRect(PAGE.marginLeft, y, 50, 8, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.light);
  doc.text("DD/MM/AAAA", PAGE.marginLeft + 3, y + 5.5);
  return y + 12;
}

function renderFileUpload(doc: jsPDF, y: number): number {
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.4);
  doc.setLineDashPattern([2, 2], 0);
  doc.roundedRect(PAGE.marginLeft, y, contentWidth, 14, 2, 2);
  doc.setLineDashPattern([], 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.light);
  doc.text("Área para upload de arquivo", PAGE.marginLeft + contentWidth / 2, y + 8, { align: "center" });
  return y + 18;
}

function getFieldHeight(field: FormField): number {
  if (field.type === "section_header") return field.description ? 24 : 18;
  let h = 14; // base label + margin
  if (field.description) h += 6;
  switch (field.type) {
    case "text": h += 12; break;
    case "textarea": h += 30; break;
    case "radio": h += (field.options?.length || 0) * 7; break;
    case "checkbox": h += (field.options?.length || 0) * 7; break;
    case "dropdown": h += 16; break;
    case "scale": h += 18; break;
    case "rating": h += 12; break;
    case "date": h += 14; break;
    case "file_upload": h += 20; break;
  }
  return h;
}

export function exportFormToPDF({ title, subtitle, formType, fields, showScores = false }: FormPDFOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let y = addHeader(doc, title, subtitle, formType);

  const sections = getSections(fields);
  const hasSections = sections.some(s => s.header !== null);

  if (hasSections) {
    for (const section of sections) {
      if (section.header) {
        y = renderSectionHeader(doc, section.header, y);
      }
      for (const field of section.fields) {
        y = renderField(doc, field, y, showScores);
      }
    }
  } else {
    for (const field of fields) {
      if (field.type === "section_header") continue;
      y = renderField(doc, field, y, showScores);
    }
  }

  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  const fileName = `${title.replace(/[^a-zA-Z0-9À-ÿ ]/g, "").replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}
