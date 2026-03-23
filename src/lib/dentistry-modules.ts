import { Scan, ClipboardList, FileText, SmilePlus, BarChart3 } from "lucide-react";

export type DentistryModuleType = "anamnese_odontologica" | "exame_clinico" | "plano_tratamento" | "orientacao_higiene";

export const dentistryModules = [
  {
    id: "anamnese_odontologica" as DentistryModuleType,
    title: "Anamnese Odontológica",
    description: "Histórico de saúde bucal, queixa principal, medicamentos e antecedentes.",
    icon: ClipboardList,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  {
    id: "exame_clinico" as DentistryModuleType,
    title: "Exame Clínico",
    description: "Exame intra e extraoral, odontograma, índices periodontais e diagnóstico.",
    icon: Scan,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
  },
  {
    id: "plano_tratamento" as DentistryModuleType,
    title: "Plano de Tratamento",
    description: "Planejamento terapêutico, priorização de procedimentos e cronograma.",
    icon: FileText,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    id: "orientacao_higiene" as DentistryModuleType,
    title: "Orientação de Higiene",
    description: "Educação em saúde bucal, técnicas de escovação e uso do fio dental.",
    icon: SmilePlus,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    id: "aggregator" as any,
    title: "Agregador de Notas",
    description: "Visão consolidada das notas de todos os módulos de odontologia.",
    icon: BarChart3,
    route: "/dentistry/aggregator",
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
  },
];

export const dentistryModuleLabel: Record<string, string> = {
  anamnese_odontologica: "Anamnese Odontológica",
  exame_clinico: "Exame Clínico",
  plano_tratamento: "Plano de Tratamento",
  orientacao_higiene: "Orientação de Higiene",
};

export const dentistryDefaultFormTemplates: Record<DentistryModuleType, { title: string; form_type: string }[]> = {
  anamnese_odontologica: [
    { title: "Ficha de Anamnese Odontológica", form_type: "standard" },
    { title: "Espelho — Anamnese Odontológica", form_type: "answer_key" },
  ],
  exame_clinico: [
    { title: "Ficha de Exame Clínico", form_type: "standard" },
    { title: "Espelho — Exame Clínico", form_type: "answer_key" },
  ],
  plano_tratamento: [
    { title: "Plano de Tratamento", form_type: "standard" },
    { title: "Espelho — Plano de Tratamento", form_type: "answer_key" },
  ],
  orientacao_higiene: [
    { title: "Ficha de Orientação de Higiene", form_type: "standard" },
    { title: "Espelho — Orientação de Higiene", form_type: "answer_key" },
  ],
};
