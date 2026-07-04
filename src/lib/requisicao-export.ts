import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} from "docx";
import { saveAs } from "file-saver";
import { slotToTime, formatDateBR } from "./oficio-export";

export interface RequisicaoVisitRow {
  title: string;             // visit name (e.g. "DNA Center")
  date: string | null;       // ISO YYYY-MM-DD
  time_slot: string | null;
}

// Known locations metadata (address + physical characterization), based on reference PDF
const LOCATION_META: Array<{ match: RegExp; address: string; nature: string }> = [
  { match: /dna\s*center/i, address: "R. Maj. Laurentino de Morais, 1220 - Tirol, Natal - RN, 59020-390", nature: "Laboratório de Análises Clínicas" },
  { match: /lab(orat[óo]rio)?\.?\s*(do\s*)?huol/i, address: "Hospital Universitário Onofre Lopes", nature: "Laboratório de Análises Clínicas" },
  { match: /farm[áa]cia\s*(do\s*)?huol/i, address: "Hospital Universitário Onofre Lopes", nature: "Farmácia Hospitalar" },
  { match: /farmaf[óo]rmula/i, address: "R. Brandão, 10 - Lagoa Nova, Natal - RN, 59054-330", nature: "Farmácia de manipulação" },
  { match: /\bi(t)?ep\b/i, address: "Rua dos Campos, nº 293, bairro Felipe Camarão", nature: "Laboratório de perícia" },
  { match: /nuplam/i, address: "Avenida Senador Salgado Filho, 3000 - Lagoa Nova, Natal - RN, 59078-970", nature: "Indústria farmacêutica" },
  { match: /pague\s*menos/i, address: "Av. Xavier da Silveira, 884, Lagoa Nova", nature: "Farmácia comunitária" },
  { match: /unicat/i, address: "R. Dr. Nilo Bezerra Ramalho, 1691 - Tirol, Natal - RN, 59015-300", nature: "Distribuição de medicamentos" },
  { match: /banco\s*de\s*sangue/i, address: "Av. Nilo Peçanha, 619 A - Petrópolis, Natal - RN, 59012-300", nature: "Unidade transfusional da UFRN" },
  { match: /farm[áa]cia\s*escola/i, address: "Centro de convivência - Campus Universitário", nature: "Farmácia comunitária" },
  { match: /crf(-|\s)?rn|conselho\s*regional\s*de\s*farm[áa]cia/i, address: "Praça André de Albuquerque, 634 - Cidade Alta, Natal - RN, 59025-580", nature: "Conselho de farmácia" },
];

function lookupMeta(title: string): { address: string; nature: string } {
  for (const l of LOCATION_META) if (l.match.test(title)) return { address: l.address, nature: l.nature };
  return { address: "—", nature: "—" };
}

const NAVY = "1E3A8A";

function th(text: string, width = 2340): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { fill: NAVY, type: ShadingType.CLEAR, color: "auto" },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF" })] })],
  });
}
function td(text: string, width = 2340, opts: { bold?: boolean; align?: typeof AlignmentType[keyof typeof AlignmentType] } = {}): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [new Paragraph({ alignment: opts.align, children: [new TextRun({ text, bold: opts.bold })] })],
  });
}

function labelRow(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun(value || "—"),
    ],
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24, color: NAVY })],
  });
}

const cellBorder = { style: BorderStyle.SINGLE, size: 6, color: "9CA3AF" };
const tblBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder, insideHorizontal: cellBorder, insideVertical: cellBorder };

function buildRequisicaoDoc(params: {
  className: string;
  proponentName: string;
  visits: RequisicaoVisitRow[];
}): Document {
  const { className, proponentName, visits } = params;
  const dated = visits.filter(v => v.date).sort((a, b) => (a.date! < b.date! ? -1 : 1));
  const first = dated[0]?.date ?? null;
  const last = dated[dated.length - 1]?.date ?? null;
  const fmt = (d: string | null) => d ? formatDateBR(d) + "/" + d.slice(0, 4) : "—";
  const currentYear = new Date().getFullYear();

  // unique locations (preserve order of first appearance)
  const seen = new Set<string>();
  const uniqueLocations: string[] = [];
  visits.forEach(v => {
    const key = (v.title || "").trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    uniqueLocations.push(key);
  });

  // Locais table
  const locaisRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [th("Local", 2600), th("Endereço", 4400), th("Caracterização Física", 2360)],
    }),
    ...uniqueLocations.map((title) => {
      const meta = lookupMeta(title);
      return new TableRow({
        children: [
          td(title, 2600, { bold: true }),
          td(meta.address, 4400),
          td(meta.nature, 2360),
        ],
      });
    }),
  ];

  // Cronogramas table
  const cronogramaRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [th("Data", 1800), th("Horário", 1600), th("Descrição das Atividades", 5960)],
    }),
    ...dated.map((v) => new TableRow({
      children: [
        td(formatDateBR(v.date) + "/" + (v.date || "").slice(0, 4), 1800, { align: AlignmentType.CENTER }),
        td(slotToTime(v.time_slot), 1600, { align: AlignmentType.CENTER }),
        td(`Visita a ${v.title}`, 5960),
      ],
    })),
  ];

  // Proponentes table (single row from provided name / defaults from PDF)
  const proponentesRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [th("Proponente", 3600), th("Categoria", 1500), th("Unidade", 2660), th("Autorização", 1600)],
    }),
    new TableRow({
      children: [
        td(proponentName, 3600, { bold: true }),
        td("Docente", 1500, { align: AlignmentType.CENTER }),
        td("DEPARTAMENTO DE FARMÁCIA (15.13)", 2660),
        td("APROVADA", 1600, { align: AlignmentType.CENTER }),
      ],
    }),
  ];

  const children: Array<Paragraph | Table> = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "UNIVERSIDADE FEDERAL DO RIO GRANDE DO NORTE", bold: true, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DEPARTAMENTO DE FARMÁCIA", bold: true, size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Requisição de Atividade de Campo", bold: true, size: 26 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: className, italics: true })] }),

    h2("Proposta da Atividade"),
    labelRow("Número/Ano", `___/${currentYear}`),
    labelRow("Situação", "ENVIADA"),
    labelRow("Unidade Requisitante", "DEPARTAMENTO DE FARMÁCIA (15.13)"),
    labelRow("Natureza da Atividade", "Visita Técnica"),
    labelRow("Período da Atividade", `${fmt(first)} até ${fmt(last)}`),

    h2(`Proponentes da Atividade de Campo (1)`),
    new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [3600, 1500, 2660, 1600], borders: tblBorders, rows: proponentesRows }),

    h2("Descrição da Atividade"),
    labelRow("Objetivo da Atividade", "Apresentar para os estudantes do curso de Farmácia as áreas de atuação do farmacêutico, in loco"),

    h2(`Locais da Atividade (${uniqueLocations.length})`),
    new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [2600, 4400, 2360], borders: tblBorders, rows: locaisRows }),

    h2(`Cronogramas Cadastrados (${dated.length})`),
    new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [1800, 1600, 5960], borders: tblBorders, rows: cronogramaRows }),

    h2("Demais Informações"),
    labelRow("Observações", "—"),
    labelRow("Alojamento/Base", "Não se aplica"),
    labelRow("Meio de Transporte", "Próprio ou público"),
    labelRow("Descrição do Deslocamento", "Residência para o local da visita"),
    labelRow("Substâncias Utilizadas", "Não se aplica"),
    labelRow("Utensílios Utilizados", "Não se aplica"),
    labelRow("Dispositivos de comunicação do proponente e acompanhante líder", "Celular, WhatsApp e SIGAA"),
    labelRow("Riscos Presumidos pelo Proponente", "Acidente entre sua residência e o local de visita e riscos específicos de cada local de visita"),
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
      children,
    }],
  });
}

function slugify(s: string): string {
  return (s || "requisicao").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "requisicao";
}

export async function exportRequisicaoDocx(params: {
  className: string;
  proponentName: string;
  visits: RequisicaoVisitRow[];
}): Promise<void> {
  const doc = buildRequisicaoDoc(params);
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Requisicao_${slugify(params.className)}.docx`);
}
