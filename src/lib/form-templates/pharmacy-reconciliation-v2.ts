import type { FormField } from "@/components/forms/types";
import type { NativeTemplate } from "./index";

// Formulário da Reconciliação v2. Quatro partes: 1 dados e fontes, 2 BPMH (melhor história medicamentosa, enviada e travada
// antes de a prescrição aparecer), 3 conciliação linha a linha e segurança, 4 comunicação (SBAR e lista final ao paciente).
// Os ids são fixos porque a tela do aluno, o verificador de coerência e a correção por IA dependem deles.

export const RECON_V2 = {
  transicao: "r2-transicao",
  alergias: "r2-alergias",
  dados: "r2-dados",
  bpmh: "r2-bpmh",
  pendencias: "r2-pendencias",
  conciliacao: "r2-conciliacao",
  seguranca: "r2-seguranca",
  sbarS: "r2-sbar-s",
  sbarB: "r2-sbar-b",
  sbarA: "r2-sbar-a",
  sbarR: "r2-sbar-r",
  listaFinal: "r2-lista-final",
} as const;

export const RECON_V2_TRANSICOES = ["Admissão", "Transferência", "Alta"];
export const RECON_V2_ONDE = ["BPMH e prescrição", "Só BPMH", "Só prescrição"];
export const RECON_V2_CONDUTA = ["Mantido", "Alterado (dose, via ou frequência)", "Omitido", "Substituído", "Duplicado", "Novo"];
export const RECON_V2_INTENCAO = ["Intencional e documentada", "Intencional sem documentação", "Não intencional", "Preciso confirmar"];
export const RECON_V2_DANO = ["Sem dano", "Leve", "Moderado", "Grave"];
export const RECON_V2_ACAO = ["Manter", "Ajustar a dose", "Suspender", "Iniciar ou retomar", "Substituir", "Confirmar com o prescritor", "Orientar o paciente"];
export const RECON_V2_TIPOS_SEGURANCA = [
  "Duplicidade terapêutica",
  "Interação medicamentosa",
  "Ajuste por função renal",
  "Ajuste por função hepática",
  "Alergia",
  "Medicamento inapropriado no idoso",
  "Alta vigilância",
  "Via ou forma inadequada",
  "Outro",
];
export const RECON_V2_FONTES_CONFIRMACAO = ["Paciente", "Familiar ou cuidador", "UBS ou unidade de saúde", "Farmácia comunitária", "Hospital anterior", "Prescritor", "Outro"];
export const RECON_V2_DADOS = [
  "Peso (kg)",
  "Creatinina sérica (mg/dL)",
  "Clearance de creatinina (mL/min) e como calculou",
  "Função hepática",
  "Gestação ou lactação",
  "Outros dados que mudam a decisão",
];
export const RECON_V2_LINHAS_BPMH = 12;
export const RECON_V2_LINHAS_CONCILIACAO = 16;

const secao = (id: string, label: string, description = ""): FormField => ({ id, label, type: "section_header", description });
const paragrafo = (id: string, label: string, description?: string): FormField => ({
  id, label, type: "textarea", required: false, max_score: 0, ...(description ? { description } : {}),
});

function build(): FormField[] {
  return [
    secao("r2-h-1", "1 · Dados e fontes", "Leia todas as fontes do dossiê antes de começar. Registre os dados que mudam a decisão e as alergias, com a fonte de cada uma."),
    { id: RECON_V2.transicao, label: "Tipo de transição de cuidado", type: "radio", options: RECON_V2_TRANSICOES, required: false, max_score: 0 },
    paragrafo(RECON_V2.alergias, "Alergias e a fonte de cada uma", "Se uma fonte relata e outra não registra, escreva as duas."),
    {
      id: RECON_V2.dados,
      label: "Dados para decidir",
      type: "table",
      required: false,
      max_score: 0,
      table_columns: ["Valor", "Fonte e observações"],
      table_row_labels: RECON_V2_DADOS,
      table_row_header: "Dado",
    },

    secao("r2-h-2", "2 · BPMH", "A melhor história medicamentosa possível: o que o paciente realmente usa, cruzando as fontes. Ao enviar, a lista fica travada e a prescrição é liberada."),
    {
      id: RECON_V2.bpmh,
      label: "BPMH: o que o paciente realmente usa",
      type: "table",
      required: false,
      max_score: 0,
      description: "Uma linha por medicamento, inclusive sem receita, chás, fitoterápicos e uso não oral.",
      table_columns: ["Medicamento (DCB, concentração, forma)", "Como realmente usa", "Fontes que confirmam", "Última dose e conflito entre fontes"],
      table_rows: RECON_V2_LINHAS_BPMH,
    },
    {
      id: RECON_V2.pendencias,
      label: "Pendências: o que falta confirmar e com quem",
      type: "table",
      required: false,
      max_score: 0,
      table_columns: ["O que falta confirmar", "Com quem confirmar"],
      table_rows: 5,
      table_col_options: [null, RECON_V2_FONTES_CONFIRMACAO],
    },

    secao("r2-h-3", "3 · Conciliação", "Agora com a prescrição em mãos. Uma linha por medicamento, da BPMH ou da prescrição: onde aparece, o que a prescrição fez, se foi intencional, o risco e o que você propõe."),
    {
      id: RECON_V2.conciliacao,
      label: "Conciliação linha a linha",
      type: "table",
      required: false,
      max_score: 0,
      table_columns: ["Medicamento", "Onde aparece", "Conduta da prescrição", "Intencionalidade", "Potencial de dano", "Justificativa clínica", "Ação proposta"],
      table_rows: RECON_V2_LINHAS_CONCILIACAO,
      table_col_options: [null, RECON_V2_ONDE, RECON_V2_CONDUTA, RECON_V2_INTENCAO, RECON_V2_DANO, null, RECON_V2_ACAO],
    },
    {
      id: RECON_V2.seguranca,
      label: "Problemas de segurança além das discrepâncias",
      type: "table",
      required: false,
      max_score: 0,
      description: "Duplicidade, interação, ajuste pela função renal ou hepática, alergia, idoso, alta vigilância.",
      table_columns: ["Problema", "Tipo", "Medicamento(s)", "Conduta proposta"],
      table_rows: 5,
      table_col_options: [null, RECON_V2_TIPOS_SEGURANCA, null, null],
    },

    secao("r2-h-4", "4 · Comunicação", "O que você diz ao prescritor e, na alta, o que o paciente leva para casa."),
    paragrafo(RECON_V2.sbarS, "SBAR · Situação", "Quem é o paciente e qual é o problema, em uma ou duas frases."),
    paragrafo(RECON_V2.sbarB, "SBAR · Histórico", "O que o dossiê mostra e a BPMH confirmou."),
    paragrafo(RECON_V2.sbarA, "SBAR · Avaliação", "O que você acha que está acontecendo e o risco."),
    paragrafo(RECON_V2.sbarR, "SBAR · Recomendação", "O que você pede, com dose e prazo quando for o caso."),
    {
      id: RECON_V2.listaFinal,
      label: "Lista final para o paciente, em linguagem simples",
      type: "table",
      required: false,
      max_score: 0,
      description: "Só na alta. Na admissão ou na transferência, deixe em branco.",
      table_columns: ["Medicamento", "Para que serve", "Como tomar", "O que mudou"],
      table_rows: 10,
    },
  ];
}

export const reconciliationV2Template: NativeTemplate = {
  area: "pharmacy",
  module_type: "reconciliacao",
  form_type: "reconciliation",
  title: "Reconciliação v2 (simulação realística)",
  description: "BPMH enviada antes da prescrição, conciliação linha a linha, problemas de segurança, SBAR e lista final ao paciente",
  content_json: build(),
};
