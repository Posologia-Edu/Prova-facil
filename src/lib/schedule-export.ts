import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ScheduleExportVisit {
  title: string;
  location: string | null;
  teacher_name: string | null;
  time_slot: string | null;
  preceptor_name: string | null;
  preceptor_phone: string | null;
  students: string[];
}

export interface ScheduleExportLesson {
  lesson_date: string | null;
  title: string;
  lesson_type: string;
  status: string;
  teacher_name: string | null;
  time_slot: string | null;
  notes?: string | null;
  visits: ScheduleExportVisit[];
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "cronograma";
}

export function exportScheduleToExcel(name: string, lessons: ScheduleExportLesson[]) {
  // Sheet 1: aulas
  const aulasRows = lessons.map((l) => ({
    Data: l.lesson_date ?? "",
    "Título": l.title,
    Tipo: l.lesson_type,
    Status: l.status,
    Turno: l.time_slot ?? "",
    Professor: l.teacher_name ?? "",
    Visitas: l.visits.length,
    Notas: l.notes ?? "",
  }));

  // Sheet 2: visitas
  const visitasRows: any[] = [];
  lessons.forEach((l) => {
    l.visits.forEach((v) => {
      visitasRows.push({
        Data: l.lesson_date ?? "",
        Aula: l.title,
        Visita: v.title,
        Turno: v.time_slot ?? "",
        Professor: v.teacher_name ?? "",
        "Local (URL)": v.location ?? "",
        Preceptor: v.preceptor_name ?? "",
        Telefone: v.preceptor_phone ?? "",
        "Nº Alunos": v.students.length,
        Alunos: v.students.join("; "),
      });
    });
  });

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(aulasRows);
  ws1["!cols"] = [{ wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 8 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Aulas");

  if (visitasRows.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(visitasRows);
    ws2["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 10 }, { wch: 22 }, { wch: 45 }, { wch: 22 }, { wch: 18 }, { wch: 10 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Visitas");
  }

  XLSX.writeFile(wb, `${slugify(name)}.xlsx`);
}

export function exportScheduleToPdf(name: string, lessons: ScheduleExportLesson[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(name, pageWidth / 2, 40, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, pageWidth / 2, 55, { align: "center" });

  // Main lessons table
  autoTable(doc, {
    startY: 70,
    head: [["Data", "Aula", "Tipo", "Turno", "Professor", "Status", "Visitas"]],
    body: lessons.map((l) => [
      l.lesson_date ?? "",
      l.title,
      l.lesson_type,
      l.time_slot ?? "",
      l.teacher_name ?? "",
      l.status,
      String(l.visits.length),
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  // Visits section
  const visitLessons = lessons.filter((l) => l.visits.length > 0);
  if (visitLessons.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Visitas técnicas", 40, 40);

    const visitRows: any[] = [];
    visitLessons.forEach((l) => {
      l.visits.forEach((v) => {
        visitRows.push([
          l.lesson_date ?? "",
          l.title,
          v.title,
          v.time_slot ?? "",
          v.teacher_name ?? "",
          v.preceptor_name ?? "",
          v.preceptor_phone ?? "",
          v.location ?? "",
          `${v.students.length} aluno(s)${v.students.length ? ": " + v.students.join(", ") : ""}`,
        ]);
      });
    });

    autoTable(doc, {
      startY: 55,
      head: [["Data", "Aula", "Visita", "Turno", "Prof.", "Preceptor", "Telefone", "Local (URL)", "Alunos"]],
      body: visitRows,
      styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [30, 58, 138], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        7: { cellWidth: 120 },
        8: { cellWidth: 150 },
      },
    });
  }

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 40, doc.internal.pageSize.getHeight() - 20, { align: "right" });
  }

  doc.save(`${slugify(name)}.pdf`);
}
