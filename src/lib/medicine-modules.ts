import { Stethoscope, ClipboardList, FileText, Activity, ArrowRightLeft, BarChart3 } from "lucide-react";

export type MedicineModuleType = "anamnese_medica" | "exame_fisico" | "raciocinio_clinico" | "plano_terapeutico";

export const medicineModules = [
  {
    id: "anamnese_medica" as MedicineModuleType,
    title: "Anamnese Médica",
    description: "Coleta completa da história clínica: HDA, HPP, antecedentes familiares, hábitos de vida e revisão de sistemas.",
    icon: ClipboardList,
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
  },
  {
    id: "exame_fisico" as MedicineModuleType,
    title: "Exame Físico",
    description: "Inspeção, palpação, percussão e ausculta. Registro sistematizado dos achados por aparelhos e sistemas.",
    icon: Stethoscope,
    color: "text-emerald-600",
    bgColor: "bg-emerald-600/10",
  },
  {
    id: "raciocinio_clinico" as MedicineModuleType,
    title: "Raciocínio Clínico",
    description: "Hipóteses diagnósticas, diagnósticos diferenciais, solicitação e interpretação de exames complementares.",
    icon: Activity,
    color: "text-purple-600",
    bgColor: "bg-purple-600/10",
  },
  {
    id: "plano_terapeutico" as MedicineModuleType,
    title: "Plano Terapêutico",
    description: "Prescrição médica, orientações ao paciente, encaminhamentos e seguimento clínico.",
    icon: FileText,
    color: "text-orange-600",
    bgColor: "bg-orange-600/10",
  },
  {
    id: "aggregator" as any,
    title: "Agregador de Notas",
    description: "Visão consolidada das notas de todos os módulos de medicina.",
    icon: BarChart3,
    route: "/medicine/aggregator",
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
  },
];

export const moduleLabel: Record<string, string> = {
  anamnese_medica: "Anamnese Médica",
  exame_fisico: "Exame Físico",
  raciocinio_clinico: "Raciocínio Clínico",
  plano_terapeutico: "Plano Terapêutico",
};

export const defaultFormTemplates: Record<MedicineModuleType, { title: string; form_type: string }[]> = {
  anamnese_medica: [
    { title: "Ficha de Anamnese", form_type: "standard" },
    { title: "Espelho — Anamnese", form_type: "answer_key" },
  ],
  exame_fisico: [
    { title: "Ficha de Exame Físico", form_type: "standard" },
    { title: "Espelho — Exame Físico", form_type: "answer_key" },
  ],
  raciocinio_clinico: [
    { title: "Ficha de Raciocínio Clínico", form_type: "standard" },
    { title: "Espelho — Raciocínio", form_type: "answer_key" },
  ],
  plano_terapeutico: [
    { title: "Plano Terapêutico", form_type: "standard" },
    { title: "Espelho — Plano Terapêutico", form_type: "answer_key" },
  ],
};
