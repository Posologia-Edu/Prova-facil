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

function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
}

const MINUTES_PER_PERIOD = 50;

// Conta os horários (períodos) de uma notação como "4T12" ou "6M234, 6N234".
// Cada notação vale periods.length horários; múltiplos dias na mesma notação
// (ex.: 245T12) representam a mesma aula recorrente, então contamos uma vez por data.
function countPeriods(timeSlot: string | null | undefined): number {
  if (!timeSlot) return 0;
  return timeSlot
    .split(/[,;\s]+/)
    .filter(Boolean)
    .reduce((acc, part) => {
      const m = /^([1-7]+)([MTN])(\d+)$/.exec(part.trim().toUpperCase());
      return acc + (m ? m[3].length : 0);
    }, 0);
}

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

interface TeacherSummary {
  name: string;
  firstDate: string;
  lastDate: string;
  minutes: number;
  slots: Set<string>;
}

export function buildTeacherSummary(lessons: ScheduleExportLesson[]): TeacherSummary[] {
  const map = new Map<string, TeacherSummary>();

  const add = (name: string | null, date: string | null, timeSlot: string | null) => {
    const n = (name || "").trim();
    if (!n) return;
    const entry = map.get(n) || { name: n, firstDate: "", lastDate: "", minutes: 0, slots: new Set<string>() };
    if (date) {
      if (!entry.firstDate || date < entry.firstDate) entry.firstDate = date;
      if (!entry.lastDate || date > entry.lastDate) entry.lastDate = date;
    }
    entry.minutes += countPeriods(timeSlot) * MINUTES_PER_PERIOD;
    if (timeSlot) timeSlot.split(/[,;\s]+/).filter(Boolean).forEach((s) => entry.slots.add(s.toUpperCase()));
    map.set(n, entry);
  };

  lessons.forEach((l) => {
    if (l.visits.length > 0) {
      l.visits.forEach((v) => add(v.teacher_name, l.lesson_date, v.time_slot));
    } else {
      add(l.teacher_name, l.lesson_date, l.time_slot);
    }
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
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
      formatDateBR(l.lesson_date),
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

    // Group visits by date, then by lesson title (rowSpan merges)
    type Item = { lesson: ScheduleExportLesson; visit: ScheduleExportVisit };
    const dateOrder: string[] = [];
    const byDate = new Map<string, Item[]>();
    visitLessons.forEach((l) => {
      l.visits.forEach((v) => {
        const d = l.lesson_date ?? "";
        if (!byDate.has(d)) { byDate.set(d, []); dateOrder.push(d); }
        byDate.get(d)!.push({ lesson: l, visit: v });
      });
    });

    // Alternating group colors per date (so consecutive dates are visually distinct)
    const groupColors: [number, number, number][] = [
      [219, 234, 254], // blue-100
      [254, 243, 199], // amber-100
    ];
    const rowGroup: number[] = []; // group index per body row

    const visitRows: any[] = [];
    dateOrder.forEach((d, gi) => {
      const items = byDate.get(d)!;
      // sub-groups by consecutive same lesson title
      const titleSpans: { title: string; count: number; startIdx: number }[] = [];
      items.forEach((it, i) => {
        const last = titleSpans[titleSpans.length - 1];
        if (last && last.title === it.lesson.title) last.count++;
        else titleSpans.push({ title: it.lesson.title, count: 1, startIdx: i });
      });
      const titleAtIdx = new Map<number, { title: string; span: number }>();
      titleSpans.forEach((s) => titleAtIdx.set(s.startIdx, { title: s.title, span: s.count }));

      items.forEach((it, i) => {
        const row: any[] = [];
        if (i === 0) row.push({ content: formatDateBR(d), rowSpan: items.length, styles: { valign: "middle", halign: "center", fontStyle: "bold" } });
        const t = titleAtIdx.get(i);
        if (t) row.push({ content: t.title, rowSpan: t.span, styles: { valign: "middle", fontStyle: "bold" } });
        row.push(
          it.visit.title,
          it.visit.time_slot ?? "",
          it.visit.teacher_name ?? "",
          it.visit.preceptor_name ?? "",
          it.visit.preceptor_phone ?? "",
          it.visit.location ?? "",
          `${it.visit.students.length} aluno(s)${it.visit.students.length ? ": " + it.visit.students.join(", ") : ""}`,
        );
        rowGroup.push(gi % groupColors.length);
        visitRows.push(row);
      });
    });

    autoTable(doc, {
      startY: 55,
      head: [["Data", "Aula", "Visita", "Turno", "Prof.", "Preceptor", "Telefone", "Local (URL)", "Alunos"]],
      body: visitRows,
      styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak", lineColor: [180, 190, 210], lineWidth: 0.4 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255 },
      columnStyles: {
        7: { cellWidth: 120, textColor: [30, 64, 175] },
        8: { cellWidth: 150 },
      },
      didParseCell: (data) => {
        if (data.section === "body") {
          const gi = rowGroup[data.row.index];
          if (gi != null) data.cell.styles.fillColor = groupColors[gi];
        }
      },
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 7) {
          const url = String(data.cell.raw ?? "").trim();
          if (url && /^https?:\/\//i.test(url)) {
            doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
          }
        }
      },
    });
  }


  // Teachers summary (period, workload)
  const teachers = buildTeacherSummary(lessons);
  if (teachers.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Relação de professores e carga horária", 40, 40);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Cada horário equivale a 50 minutos.", 40, 54);
    doc.setTextColor(0);

    const totalMinutes = teachers.reduce((s, t) => s + t.minutes, 0);
    autoTable(doc, {
      startY: 66,
      head: [["Professor", "Início", "Término", "Turnos/Horários", "Horários (nº)", "Carga horária"]],
      body: teachers.map((t) => [
        t.name,
        formatDateBR(t.firstDate),
        formatDateBR(t.lastDate),
        Array.from(t.slots).sort().join(", "),
        String(Math.round(t.minutes / MINUTES_PER_PERIOD)),
        formatHours(t.minutes),
      ]),
      foot: [["Total", "", "", "", String(Math.round(totalMinutes / MINUTES_PER_PERIOD)), formatHours(totalMinutes)]],
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255 },
      footStyles: { fillColor: [226, 232, 240], textColor: 20, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
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
