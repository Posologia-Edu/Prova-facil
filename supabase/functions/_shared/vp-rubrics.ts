// Rubrica da correção dos pacientes virtuais em 2 camadas (P12).
//  - Camada 1 (núcleo, igual para todas as profissões): fica no prompt de grade-virtual-patient.
//  - Camada 2 (lente profissional): este arquivo. Define o que duas dimensões da anamnese significam para cada profissão.
// A Farmácia é a única lente validada com alunos. Enfermagem e Medicina são ponto de partida e precisam de revisão
// da coordenação antes de serem usadas em turma.

import type { VersaoKey } from "./vp-case-schema.ts";

export interface ProfessionalLens {
  /** Frase do cabeçalho do prompt: "...para a disciplina de {disciplina}". */
  disciplina: string;
  /** Texto da dimensão historia_medicamentosa. */
  historiaMedicamentosa: string;
  /** Texto da dimensão escuta_raciocinio_clinico. */
  escutaRaciocinio: string;
  /** Âncora de nota de historia_medicamentosa (só entra quando o caso tem gabarito). */
  ancoraHistoria: string;
}

const LENTES: Record<VersaoKey, ProfessionalLens> = {
  farmaceutico: {
    disciplina: "Farmacologia Aplicada / Cuidado Farmacêutico",
    historiaMedicamentosa:
      "Investigação ATIVA de TODOS os medicamentos em uso (prescritos, OTC, fitoterápicos, suplementos), dose, posologia, há quanto tempo, adesão, automedicação prévia.",
    escutaRaciocinio:
      "Capacidade de fazer perguntas abertas, escuta ativa, reformulação, hipóteses farmacoterapêuticas coerentes, identificação de problemas relacionados a medicamentos (PRM/RNM).",
    ancoraHistoria:
      "historia_medicamentosa: 1,0 = investigou ativamente TODOS os medicamentos (prescritos, sem receita, fitoterápicos), com dose, horário, tempo de uso e adesão. Só os prescritos, com dose = 0,5. Nada específico = 0.",
  },
  enfermeiro: {
    disciplina: "Cuidado de Enfermagem",
    historiaMedicamentosa:
      "Investigação ATIVA do uso de medicamentos e dos cuidados em curso (prescritos, sem receita, fitoterápicos, suplementos), dose, horário, tempo de uso, adesão, dificuldades de acesso e de administração, e como o paciente conduz o próprio cuidado.",
    escutaRaciocinio:
      "Capacidade de fazer perguntas abertas, escuta ativa, reformulação, levantamento coerente das necessidades de cuidado e dos problemas de enfermagem a partir dos dados, e priorização do que é urgente.",
    ancoraHistoria:
      "historia_medicamentosa: 1,0 = investigou ativamente TODOS os medicamentos e cuidados em curso (prescritos, sem receita, fitoterápicos), com dose, horário, tempo de uso, adesão e dificuldades de administração. Só os prescritos, com dose = 0,5. Nada específico = 0.",
  },
  medico: {
    disciplina: "Clínica Médica",
    historiaMedicamentosa:
      "Investigação ATIVA dos medicamentos em uso (prescritos, sem receita, fitoterápicos, suplementos), dose, posologia, tempo de uso, adesão, reações adversas e tratamentos anteriores.",
    escutaRaciocinio:
      "Capacidade de fazer perguntas abertas, escuta ativa, reformulação, hipóteses diagnósticas coerentes com os dados, diagnóstico diferencial e identificação dos sinais de alarme.",
    ancoraHistoria:
      "historia_medicamentosa: 1,0 = investigou ativamente TODOS os medicamentos em uso (prescritos, sem receita, fitoterápicos), com dose, tempo de uso, adesão e reações adversas. Só os prescritos, com dose = 0,5. Nada específico = 0.",
  },
};

/** Casos legados (sem profissão resolvida) seguem com a lente da Farmácia, como antes do P12. */
export function getProfessionalLens(key: string | null | undefined): ProfessionalLens {
  return LENTES[(key as VersaoKey) || "farmaceutico"] ?? LENTES.farmaceutico;
}
