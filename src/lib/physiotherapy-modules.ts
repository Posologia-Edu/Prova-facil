import { Activity, ClipboardList, FileText, Dumbbell, ArrowRightLeft, BarChart3 } from "lucide-react";

export type PhysiotherapyModuleType = "avaliacao_funcional" | "cinetico_funcional" | "plano_fisioterapeutico" | "evolucao_fisio";

export const physiotherapyModules = [
  {
    id: "avaliacao_funcional" as PhysiotherapyModuleType,
    title: "Avaliação Funcional",
    description: "Avaliação cinético-funcional completa: anamnese, inspeção, testes especiais e escalas funcionais.",
    icon: ClipboardList,
    color: "text-cyan-600",
    bgColor: "bg-cyan-600/10",
  },
  {
    id: "cinetico_funcional" as PhysiotherapyModuleType,
    title: "Diagnóstico Cinético-Funcional",
    description: "Identificação de disfunções do movimento, CIF e definição de objetivos terapêuticos.",
    icon: Activity,
    color: "text-teal-600",
    bgColor: "bg-teal-600/10",
  },
  {
    id: "plano_fisioterapeutico" as PhysiotherapyModuleType,
    title: "Plano Fisioterapêutico",
    description: "Seleção de recursos terapêuticos, parâmetros de tratamento e metas funcionais.",
    icon: FileText,
    color: "text-lime-600",
    bgColor: "bg-lime-600/10",
  },
  {
    id: "evolucao_fisio" as PhysiotherapyModuleType,
    title: "Evolução Fisioterapêutica",
    description: "Registro da evolução do paciente, reavaliação funcional e ajustes no plano de tratamento.",
    icon: Dumbbell,
    color: "text-amber-600",
    bgColor: "bg-amber-600/10",
  },
  {
    id: "aggregator" as any,
    title: "Agregador de Notas",
    description: "Visão consolidada das notas de todos os módulos de fisioterapia.",
    icon: BarChart3,
    route: "/physiotherapy/aggregator",
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
  },
];

export const moduleLabel: Record<string, string> = {
  avaliacao_funcional: "Avaliação Funcional",
  cinetico_funcional: "Diagnóstico Cinético-Funcional",
  plano_fisioterapeutico: "Plano Fisioterapêutico",
  evolucao_fisio: "Evolução Fisioterapêutica",
};

export const defaultFormTemplates: Record<PhysiotherapyModuleType, { title: string; form_type: string }[]> = {
  avaliacao_funcional: [
    { title: "Ficha de Avaliação Funcional", form_type: "standard" },
    { title: "Espelho — Avaliação Funcional", form_type: "answer_key" },
  ],
  cinetico_funcional: [
    { title: "Diagnóstico Cinético-Funcional", form_type: "standard" },
    { title: "Espelho — Diagnóstico", form_type: "answer_key" },
  ],
  plano_fisioterapeutico: [
    { title: "Plano Fisioterapêutico", form_type: "standard" },
    { title: "Espelho — Plano", form_type: "answer_key" },
  ],
  evolucao_fisio: [
    { title: "Evolução Fisioterapêutica", form_type: "standard" },
    { title: "Espelho — Evolução", form_type: "answer_key" },
  ],
};
