import { Heart, ClipboardList, FileText, Activity, ArrowRightLeft, BarChart3 } from "lucide-react";

export type NursingModuleType = "acolhimento" | "sae" | "evolucao" | "passagem_plantao";

export const nursingModules = [
  {
    id: "acolhimento" as NursingModuleType,
    title: "Acolhimento",
    description: "Coleta de dados do paciente, queixa principal, sinais vitais e classificação de risco.",
    icon: Heart,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
  },
  {
    id: "sae" as NursingModuleType,
    title: "SAE",
    description: "Sistematização da Assistência de Enfermagem: histórico, diagnóstico, planejamento, implementação e avaliação.",
    icon: ClipboardList,
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
  },
  {
    id: "evolucao" as NursingModuleType,
    title: "Evolução",
    description: "Registro cronológico da evolução do paciente com SOAP adaptado para enfermagem.",
    icon: Activity,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    id: "passagem_plantao" as NursingModuleType,
    title: "Passagem de Plantão",
    description: "Ficha SBAR: Situação, Background, Avaliação e Recomendação.",
    icon: ArrowRightLeft,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
  },
  {
    id: "aggregator" as any,
    title: "Agregador de Notas",
    description: "Visão consolidada das notas de todos os módulos de enfermagem.",
    icon: BarChart3,
    route: "/nursing/aggregator",
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
  },
];

export const moduleLabel: Record<string, string> = {
  acolhimento: "Acolhimento",
  sae: "SAE",
  evolucao: "Evolução",
  passagem_plantao: "Passagem de Plantão",
};

export const defaultFormTemplates: Record<NursingModuleType, { title: string; form_type: string }[]> = {
  acolhimento: [
    { title: "Ficha de Acolhimento", form_type: "standard" },
    { title: "Espelho — Ficha de Acolhimento", form_type: "answer_key" },
  ],
  sae: [
    { title: "Histórico de Enfermagem", form_type: "standard" },
    { title: "Espelho — Histórico", form_type: "answer_key" },
  ],
  evolucao: [
    { title: "Evolução de Enfermagem", form_type: "standard" },
    { title: "Espelho — Evolução", form_type: "answer_key" },
  ],
  passagem_plantao: [
    { title: "Ficha SBAR", form_type: "standard" },
    { title: "Espelho — SBAR", form_type: "answer_key" },
  ],
};
