// Ficha eletrônica do atendimento (P20). As seções são genéricas, iguais às de um prontuário real:
// nunca trazem campos específicos do caso, para a ficha não virar um roteiro de perguntas.
// Encontro 1 = anamnese, 2 = comunicação ao prescritor/equipe (SBAR), 3 = evolução (SOAP).

export type FichaVersao = "farmaceutico" | "enfermeiro" | "medico";

export interface FichaSection {
  key: string;
  label: string;
  placeholder: string;
}

export interface FichaSchema {
  title: string;
  hint: string;
  sections: FichaSection[];
}

const ANAMNESE_BASE: Record<string, FichaSection> = {
  identificacao: { key: "identificacao", label: "Identificação", placeholder: "Quem é o paciente e quem o acompanha." },
  queixa_hda: { key: "queixa_hda", label: "Queixa principal e história da doença atual", placeholder: "Motivo da consulta, início, evolução, fatores de melhora e piora." },
  antecedentes: { key: "antecedentes", label: "Antecedentes pessoais e familiares", placeholder: "Doenças, internações, cirurgias, histórico na família." },
  medicamentos: { key: "medicamentos", label: "Medicamentos em uso", placeholder: "Prescritos, sem receita, fitoterápicos e suplementos." },
  alergias: { key: "alergias", label: "Alergias e reações adversas", placeholder: "" },
  habitos: { key: "habitos", label: "Hábitos de vida", placeholder: "Alimentação, sono, atividade física, tabaco, álcool." },
  social: { key: "social", label: "Contexto social e rede de apoio", placeholder: "Moradia, trabalho, quem ajuda, condição financeira." },
  objetivos: { key: "objetivos", label: "Dados objetivos", placeholder: "Sinais vitais, exame físico e exames que você pediu e recebeu." },
  impressao: { key: "impressao", label: "Impressão", placeholder: "O que você identificou e como interpreta o caso." },
};

const ANAMNESE_POR_VERSAO: Record<FichaVersao, Partial<Record<string, Partial<FichaSection>>>> = {
  farmaceutico: {
    medicamentos: { label: "Medicamentos em uso e como são usados de fato", placeholder: "Nome, dose, horário, adesão, prescritos, sem receita, fitoterápicos e suplementos." },
    impressao: { label: "Problemas relacionados a medicamentos", placeholder: "Problemas identificados e como você os classifica." },
  },
  enfermeiro: {
    objetivos: { label: "Dados objetivos e exame físico", placeholder: "Sinais vitais, avaliação física e o que você observou." },
    impressao: { label: "Problemas e diagnósticos de enfermagem", placeholder: "Necessidades afetadas e diagnósticos que você levanta." },
  },
  medico: {
    objetivos: { label: "Exame físico e exames complementares", placeholder: "Sinais vitais, exame físico e exames que você pediu e recebeu." },
    impressao: { label: "Hipóteses diagnósticas", placeholder: "Hipóteses em ordem de probabilidade e diagnósticos que não podem ser perdidos." },
  },
};

const ANAMNESE_ORDEM = ["identificacao", "queixa_hda", "antecedentes", "medicamentos", "alergias", "habitos", "social", "objetivos", "impressao"];

const SBAR: FichaSchema = {
  title: "Comunicação ao prescritor (SBAR)",
  hint: "Organize o que você vai comunicar. Registre a decisão do prescritor em Recomendação.",
  sections: [
    { key: "situacao", label: "Situação", placeholder: "Por que você está entrando em contato agora." },
    { key: "historia", label: "Histórico (Background)", placeholder: "O que é relevante do paciente e do tratamento." },
    { key: "avaliacao", label: "Avaliação (Assessment)", placeholder: "O que você identificou e qual é a sua leitura do problema." },
    { key: "recomendacao", label: "Recomendação", placeholder: "O que você propõe e o que ficou combinado." },
  ],
};

const SOAP: FichaSchema = {
  title: "Evolução (SOAP)",
  hint: "Registre o retorno do paciente. Esta evolução fecha o atendimento.",
  sections: [
    { key: "subjetivo", label: "S · Subjetivo", placeholder: "O que o paciente relata." },
    { key: "objetivo", label: "O · Objetivo", placeholder: "Dados medidos ou observados." },
    { key: "avaliacao", label: "A · Avaliação", placeholder: "Sua análise do que mudou e do que persiste." },
    { key: "plano", label: "P · Plano", placeholder: "Orientações, monitorização, encaminhamentos e retorno." },
  ],
};

export function fichaSchema(encounter: number, versao: FichaVersao): FichaSchema {
  if (encounter === 2) return SBAR;
  if (encounter === 3) return SOAP;
  const over = ANAMNESE_POR_VERSAO[versao] || {};
  return {
    title: "Ficha de anamnese",
    hint: "Registre aqui o que você coletou. Anote só o que o paciente disse ou o que você verificou.",
    sections: ANAMNESE_ORDEM.map((k) => ({ ...ANAMNESE_BASE[k], ...(over[k] || {}) }) as FichaSection),
  };
}
