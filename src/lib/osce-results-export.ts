import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Exportação dos resultados do OSCE em CSV e PDF.
// Recebe os mesmos dados que a tela de resultados já calcula; não consulta o banco.

export interface OsceExportStation {
  id: string;
  title: string;
  position: number;
}

export interface OsceExportEvaluation {
  station_id: string;
  total_score: number | null;
  max_score: number | null;
  passed: boolean | null;
  observations: string | null;
  finished_at: string | null;
}

export interface OsceExportStudent {
  name: string;
  evaluations: OsceExportEvaluation[];
  competencies: { category: string; score: number; maxScore: number }[];
}

export interface OsceExportInput {
  examTitle: string;
  applicationLabel: string;
  stations: OsceExportStation[];
  students: OsceExportStudent[];
}

const pct = (score: number, max: number) => (max > 0 ? Math.round((score / max) * 100) : 0);
const num = (value: number | null | undefined) => Number(value ?? 0);
const decimal = (value: number) => value.toFixed(1).replace(".", ",");

function studentTotals(student: OsceExportStudent) {
  const score = student.evaluations.reduce((sum, e) => sum + num(e.total_score), 0);
  const max = student.evaluations.reduce((sum, e) => sum + num(e.max_score), 0);
  const failed = student.evaluations.filter((e) => e.passed === false).length;
  return { score, max, failed };
}

function stationAverages(input: OsceExportInput) {
  return input.stations.map((station) => {
    const evals = input.students
      .flatMap((s) => s.evaluations)
      .filter((e) => e.station_id === station.id && e.finished_at);
    const score = evals.reduce((sum, e) => sum + num(e.total_score), 0);
    const max = evals.reduce((sum, e) => sum + num(e.max_score), 0);
    return { station, count: evals.length, avg: evals.length ? score / evals.length : 0, avgMax: evals.length ? max / evals.length : 0, failed: evals.filter((e) => e.passed === false).length };
  });
}

const fileSlug = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "osce";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// CSV com ponto e vírgula e BOM, para abrir direto no Excel em português.
export function exportOsceResultsCsv(input: OsceExportInput) {
  const cell = (value: string | number) => {
    const text = String(value ?? "");
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const stationTitle = new Map(input.stations.map((s) => [s.id, s.title]));
  const header = ["Aluno", "Estação", "Nota", "Máximo", "Aproveitamento (%)", "Situação", "Observações"];
  const rows: (string | number)[][] = [];
  for (const student of input.students) {
    for (const e of student.evaluations) {
      rows.push([
        student.name,
        stationTitle.get(e.station_id) ?? "—",
        decimal(num(e.total_score)),
        decimal(num(e.max_score)),
        pct(num(e.total_score), num(e.max_score)),
        e.passed ? "Aprovado" : "Reprovado",
        (e.observations ?? "").replace(/\s+/g, " ").trim(),
      ]);
    }
  }
  const lines = [header, ...rows].map((r) => r.map(cell).join(";"));
  download(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `osce-${fileSlug(input.examTitle)}-resultados.csv`);
}

export function exportOsceResultsPdf(input: OsceExportInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const brand: [number, number, number] = [20, 40, 75];
  const left = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...brand);
  doc.text("Resultados do OSCE", left, 50);
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text(input.examTitle, left, 70);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(`${input.applicationLabel} · ${input.students.length} alunos · ${input.stations.length} estações · gerado em ${new Date().toLocaleDateString("pt-BR")}`, left, 86);

  const headStyles = { fillColor: brand, textColor: 255, fontSize: 9 };
  const baseStyles = { fontSize: 9, cellPadding: 5 };

  // 1. Resumo por aluno
  autoTable(doc, {
    startY: 104,
    head: [["Aluno", "Nota total", "Máximo", "Aproveitamento", "Estações reprovadas"]],
    body: input.students.map((s) => {
      const t = studentTotals(s);
      return [s.name, decimal(t.score), decimal(t.max), `${pct(t.score, t.max)}%`, String(t.failed)];
    }),
    styles: baseStyles,
    headStyles,
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
  });

  // 2. Desempenho por estação
  const afterSummary = (doc as any).lastAutoTable.finalY + 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...brand);
  doc.text("Desempenho por estação", left, afterSummary);
  autoTable(doc, {
    startY: afterSummary + 8,
    head: [["#", "Estação", "Média", "Avaliações", "Reprovações"]],
    body: stationAverages(input).map(({ station, count, avg, avgMax, failed }) => [
      String(station.position),
      station.title,
      count ? `${decimal(avg)} / ${decimal(avgMax)} (${pct(avg, avgMax)}%)` : "—",
      String(count),
      String(failed),
    ]),
    styles: baseStyles,
    headStyles,
  });

  // 3. Detalhe por aluno: estações e competências
  const stationTitle = new Map(input.stations.map((s) => [s.id, s.title]));
  for (const student of input.students) {
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...brand);
    doc.text(student.name, left, 50);
    const totals = studentTotals(student);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(`Nota total ${decimal(totals.score)} de ${decimal(totals.max)} (${pct(totals.score, totals.max)}%)`, left, 66);

    autoTable(doc, {
      startY: 80,
      head: [["Estação", "Nota", "Situação", "Observações"]],
      body: student.evaluations.map((e) => [
        stationTitle.get(e.station_id) ?? "—",
        `${decimal(num(e.total_score))} / ${decimal(num(e.max_score))}`,
        e.passed ? "Aprovado" : "Reprovado",
        (e.observations ?? "—").replace(/\s+/g, " ").trim(),
      ]),
      styles: baseStyles,
      headStyles,
      columnStyles: { 3: { cellWidth: 200 } },
    });

    if (student.competencies.length > 0) {
      const y = (doc as any).lastAutoTable.finalY + 22;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...brand);
      doc.text("Competências", left, y);
      autoTable(doc, {
        startY: y + 8,
        head: [["Competência", "Pontos", "Máximo", "Aproveitamento"]],
        body: student.competencies.map((c) => [c.category, decimal(c.score), decimal(c.maxScore), `${pct(c.score, c.maxScore)}%`]),
        styles: baseStyles,
        headStyles,
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      });
    }
  }

  doc.save(`osce-${fileSlug(input.examTitle)}-resultados.pdf`);
}
