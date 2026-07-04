import {
  Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} from "docx";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { parseSlot } from "./class-schedule-notation";

export interface OficioVisitEntry {
  date: string | null;       // YYYY-MM-DD
  time_slot: string | null;  // e.g. "6M234"
  teacher_name: string | null;
}

export interface OficioGroup {
  title: string;             // location/visit name
  entries: OficioVisitEntry[];
  objective: string;
}

// Known location -> objective text (case-insensitive substring match on visit title)
const KNOWN_OBJECTIVES: Array<{ match: RegExp; text: string }> = [
  { match: /dna\s*center/i, text: "Conhecer o âmbito da profissão farmacêutica nas análises clínicas, com âmbito na biologia molecular e citogenética." },
  { match: /lab(orat[óo]rio)?\.?\s*(do\s*)?huol/i, text: "Conhecer o âmbito da profissão farmacêutica nas análises clínicas." },
  { match: /farm[áa]cia\s*(do\s*)?huol/i, text: "Conhecer o âmbito da profissão farmacêutica na Farmácia Hospitalar." },
  { match: /farmaf[óo]rmula/i, text: "Conhecer o âmbito da profissão farmacêutica na Farmácia Magistral." },
  { match: /\biep\b/i, text: "Conhecer o âmbito da profissão farmacêutica na área da perícia criminal e forense." },
  { match: /nuplam/i, text: "Conhecer o âmbito da indústria farmacêutica." },
  { match: /pague\s*menos/i, text: "Conhecer o âmbito da profissão farmacêutica na farmácia comunitária." },
  { match: /unicat/i, text: "Conhecer o âmbito da profissão farmacêutica na Assistência farmacêutica." },
];

export function lookupObjective(title: string): string | null {
  const t = title || "";
  for (const k of KNOWN_OBJECTIVES) if (k.match.test(t)) return k.text;
  return null;
}

// Time slot -> HH:MM. 6M234 → 08:00, 6N234 → 19:30, T → 17:00
export function slotToTime(slot: string | null): string {
  if (!slot) return "—";
  const p = parseSlot(slot)[0];
  const shift = p?.shift ?? (/[MTN]/i.exec(slot)?.[0]?.toUpperCase() as "M" | "T" | "N" | undefined);
  if (shift === "M") return "08:00";
  if (shift === "T") return "17:00";
  if (shift === "N") return "19:30";
  return "—";
}

export function formatDateBR(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}`;
}

function todayLongBR(): string {
  const d = new Date();
  const months = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  return `Natal, ${String(d.getDate()).padStart(2,"0")} de ${months[d.getMonth()]} de ${d.getFullYear()}.`;
}

function slugify(s: string): string {
  return (s || "oficio").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "oficio";
}

const NAVY: string = "1E3A8A";

function headerCell(text: string): TableCell {
  return new TableCell({
    width: { size: 3120, type: WidthType.DXA },
    shading: { fill: NAVY, type: ShadingType.CLEAR, color: "auto" },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: "FFFFFF" })],
    })],
  });
}
function bodyCell(text: string): TableCell {
  return new TableCell({
    width: { size: 3120, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(text)] })],
  });
}

function buildOficioDoc(group: OficioGroup): Document {
  const disciplina = "INTRODUÇÃO A FARMÁCIA";
  const sortedEntries = [...group.entries].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [headerCell("Dia"), headerCell("Hora"), headerCell("Professor")],
    }),
    ...sortedEntries.map((e) => new TableRow({
      children: [
        bodyCell(formatDateBR(e.date)),
        bodyCell(slotToTime(e.time_slot)),
        bodyCell(e.teacher_name || "—"),
      ],
    })),
  ];

  const children: Paragraph[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "UNIVERSIDADE FEDERAL DO RIO GRANDE DO NORTE", bold: true, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "CENTRO DE CIÊNCIAS DA SAÚDE", bold: true, size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "CURSO DE FARMÁCIA", bold: true, size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DEPARTAMENTO DE FARMÁCIA", bold: true, size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `DISCIPLINA ${disciplina}`, bold: true, size: 22 })] }),
    new Paragraph({ children: [new TextRun("")] }),
    new Paragraph({
      children: [
        new TextRun({ text: "Ofício Circular xx DFAR", bold: true }),
        new TextRun({ text: "\t\t\t\t" }),
        new TextRun({ text: todayLongBR(), bold: true }),
      ],
    }),
    new Paragraph({ children: [new TextRun("")] }),
    new Paragraph({
      children: [new TextRun({ text: `Ao(À) responsável — ${group.title}`, bold: true })],
    }),
    new Paragraph({ children: [new TextRun("")] }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun("Solicitamos vossa valiosa colaboração no sentido de permitir aos acadêmicos do Curso de Graduação em Farmácia da Universidade Federal do Rio Grande do Norte que estão cursando a disciplina de "),
        new TextRun({ text: disciplina, bold: true }),
        new TextRun(`. Estas visitas ocorrerão no semestre letivo em curso e constará de 1 professor e até 10 estudantes.`),
      ],
    }),
    new Paragraph({ children: [new TextRun("")] }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun("No tocante às datas, logo abaixo desse ofício são transcritas as sugestões de datas e horários para as visitas técnicas. As datas podem ser alteradas, a depender da necessidade do local e da UFRN, sempre havendo comunicação antecipada.")],
    }),
    new Paragraph({ children: [new TextRun("")] }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun("As visitas ocorrerão em vários momentos, sendo uma para cada turma e têm por objetivo: "),
        new TextRun({ text: group.objective, bold: true }),
      ],
    }),
    new Paragraph({ children: [new TextRun("")] }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun("Na certeza de contarmos com a compreensão e empenho desta direção, antecipadamente agradecemos.")],
    }),
    new Paragraph({ children: [new TextRun("")] }),
  ];

  const cellBorder = { style: BorderStyle.SINGLE, size: 6, color: "9CA3AF" };
  const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder, insideHorizontal: cellBorder, insideVertical: cellBorder };

  const table = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3120, 3120, 3120],
    borders,
    rows: tableRows,
  });

  const footer: Paragraph[] = [
    new Paragraph({ children: [new TextRun("")] }),
    new Paragraph({ children: [new TextRun("")] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("Atenciosamente,")] }),
    new Paragraph({ children: [new TextRun("")] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Chefia DFAR", bold: true })] }),
  ];

  return new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [...children, table, ...footer],
    }],
  });
}

export async function exportOficiosZip(className: string, groups: OficioGroup[]): Promise<void> {
  const zip = new JSZip();
  for (const g of groups) {
    const doc = buildOficioDoc(g);
    const blob = await Packer.toBlob(doc);
    zip.file(`Oficio_${slugify(g.title)}.docx`, blob);
  }
  const out = await zip.generateAsync({ type: "blob" });
  saveAs(out, `Oficios_${slugify(className)}.zip`);
}
