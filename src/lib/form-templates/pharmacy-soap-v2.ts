import type { FormField } from "@/components/forms/types";
import type { NativeTemplate } from "./index";

// Formulário SOAP v2 (simulação realística). Quatro partes: S (o que o paciente relata), O (o que foi medido e verificado),
// A (lista de problemas com evidências, prioridade e confiança) e P (plano por problema). S e O chegam pré-montados do
// registro da anamnese; A e P são do aluno. Os ids são fixos porque a pré-montagem e o verificador de coerência dependem deles.

export const SOAP_V2 = {
  queixa: "s2-queixa",
  historia: "s2-historia",
  adesao: "s2-adesao",
  desconfortos: "s2-desconfortos",
  perspectiva: "s2-perspectiva",
  contexto: "s2-contexto",
  parametros: "s2-parametros",
  alerta: "s2-alerta",
  alertaDesc: "s2-alerta-desc",
  farmaco: "s2-farmaco",
  fonte: "s2-fonte",
  outros: "s2-outros",
  clinico: "s2-clinico",
  sintese: "s2-sintese",
  problemas: "s2-problemas",
  lacunas: "s2-lacunas",
  plano: "s2-plano",
  orientacoes: "s2-orientacoes",
  seguimento: "s2-seguimento",
  comunicacao: "s2-comunicacao",
} as const;

export const SOAP_V2_CATEGORIAS = [
  "Necessidade não tratada",
  "Sem indicação atual aparente",
  "Efetividade insuficiente",
  "Dose/posologia inadequada",
  "Segurança",
  "Suspeita de evento adverso",
  "Interação medicamentosa",
  "Interação com alimento/produto natural",
  "Adesão",
  "Acesso",
  "Outro",
];
export const SOAP_V2_NIVEIS = ["Alta", "Média", "Baixa"];
export const SOAP_V2_ALERTA = ["Não identificados", "Presentes", "Ainda não avaliados"];
export const SOAP_V2_LINHAS_PROBLEMAS = 6;
export const SOAP_V2_LINHAS_PLANO = 6;
export const SOAP_V2_PARAMETROS = ["PA (mmHg)", "PA em ortostase (mmHg)", "FC (bpm)", "Glicemia capilar (mg/dL)", "Temperatura (°C)", "SpO₂ (%)", "Peso / altura (kg / m)", "IMC (kg/m²)", "Outro"];

const secao = (id: string, label: string, description = ""): FormField => ({ id, label, type: "section_header", description });
const paragrafo = (id: string, label: string, description?: string, required = false): FormField => ({
  id, label, type: "textarea", required, max_score: 0, ...(description ? { description } : {}),
});

function build(): FormField[] {
  const rotulosProblemas = Array.from({ length: SOAP_V2_LINHAS_PROBLEMAS }, (_, i) => `P${i + 1}`);
  return [
    secao("s2-h-s", "S · Subjetivo", "O que o paciente relata, nas palavras dele. Já vem preenchido com o seu registro da anamnese: confira, corrija e organize. Não coloque aqui medidas nem a sua interpretação."),
    paragrafo(SOAP_V2.queixa, "Queixa principal, nas palavras do paciente", undefined, true),
    paragrafo(SOAP_V2.historia, "História da queixa", "Início, evolução, o que piora e melhora, impacto nas atividades."),
    paragrafo(SOAP_V2.adesao, "Uso dos medicamentos e adesão, segundo o paciente"),
    paragrafo(SOAP_V2.desconfortos, "Desconfortos que o paciente relaciona aos medicamentos"),
    paragrafo(SOAP_V2.perspectiva, "Perspectiva do paciente", "Preocupações, crenças e expectativas."),
    paragrafo(SOAP_V2.contexto, "Hábitos de vida, contexto social, acesso e barreiras"),

    secao("s2-h-o", "O · Objetivo", "O que foi medido, verificado ou documentado. Informe o valor, a unidade e a condição da medida, e a fonte de cada medicamento."),
    {
      id: SOAP_V2.parametros,
      label: "Parâmetros clínicos",
      type: "table",
      required: false,
      max_score: 0,
      table_columns: ["Resultado", "Condições da medida e observações"],
      table_row_labels: SOAP_V2_PARAMETROS,
      table_row_header: "Parâmetro",
    },
    { id: SOAP_V2.alerta, label: "Sinais de alerta", type: "radio", options: SOAP_V2_ALERTA, required: false, max_score: 0 },
    paragrafo(SOAP_V2.alertaDesc, "Sinais de alerta encontrados e a conduta adotada"),
    {
      id: SOAP_V2.farmaco,
      label: "Farmacoterapia: uso prescrito e uso real",
      type: "table",
      required: false,
      max_score: 0,
      table_columns: ["Medicamento e concentração", "Prescrito (dose, via e frequência)", "Como realmente usa", "Discrepância e o que ela significa"],
      table_rows: 6,
    },
    paragrafo(SOAP_V2.fonte, "Fonte de confirmação dos medicamentos e mudanças recentes"),
    paragrafo(SOAP_V2.outros, "Produtos sem prescrição, chás, fitoterápicos e suplementos"),
    paragrafo(SOAP_V2.clinico, "Alergias, condições de saúde, internações, cirurgias e exames relevantes", "Com data e resultado, quando houver."),

    secao("s2-h-a", "A · Avaliação", "Sua análise. Liste cada problema, classifique, aponte as evidências do S e do O que o sustentam, defina a prioridade e diga o quanto você confia nele."),
    paragrafo(SOAP_V2.sintese, "Síntese clínica e farmacoterapêutica", "Duas ou três frases que juntem o que o paciente relata e o que foi verificado."),
    {
      id: SOAP_V2.problemas,
      label: "Lista de problemas",
      type: "table",
      required: false,
      max_score: 0,
      description: "Um problema por linha. Cada problema precisa de evidência e, no plano, de pelo menos uma ação.",
      table_columns: ["Problema", "Categoria", "Evidências do S e do O", "Prioridade", "Sua confiança"],
      table_row_labels: rotulosProblemas,
      table_row_header: "Nº",
      table_col_options: [null, SOAP_V2_CATEGORIAS, null, SOAP_V2_NIVEIS, SOAP_V2_NIVEIS],
    },
    paragrafo(SOAP_V2.lacunas, "O que ainda preciso saber ou excluir", "Informações que faltam, hipóteses em aberto e sinais de alerta a descartar."),

    secao("s2-h-p", "P · Plano", "Uma ou mais ações para cada problema da lista, com meta que dê para medir, responsável e prazo."),
    {
      id: SOAP_V2.plano,
      label: "Plano por problema",
      type: "table",
      required: false,
      max_score: 0,
      table_columns: ["Problema", "Ação proposta", "Meta e como medir", "Responsável", "Prazo e seguimento"],
      table_rows: SOAP_V2_LINHAS_PLANO,
      table_col_ref: [{ field: SOAP_V2.problemas, col: 0, prefix: "P" }, null, null, null, null],
    },
    paragrafo(SOAP_V2.orientacoes, "Orientações ao paciente, em linguagem simples", "O que você vai dizer e como vai confirmar que ele entendeu."),
    paragrafo(SOAP_V2.seguimento, "Encaminhamento e seguimento", "Para quem, por quê, em quanto tempo; quando o paciente volta e o que será reavaliado."),
    paragrafo(SOAP_V2.comunicacao, "Comunicação ao prescritor ou à equipe", "Se for necessária: o que você diria, em poucas linhas."),
  ];
}

export const soapV2Template: NativeTemplate = {
  area: "pharmacy",
  module_type: "soap",
  form_type: "soap",
  title: "SOAP v2 (simulação realística)",
  description: "SOAP estruturado: S e O pré-montados da anamnese, lista de problemas com evidências e plano por problema",
  content_json: build(),
};
