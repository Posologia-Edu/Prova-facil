import { Apple, ClipboardList, Scale, Salad, BarChart3 } from "lucide-react";

export type NutritionModuleType = "anamnese_nutricional" | "avaliacao_antropometrica" | "plano_alimentar" | "orientacao_nutricional";

export const nutritionModules = [
  {
    id: "anamnese_nutricional" as NutritionModuleType,
    title: "Anamnese Nutricional",
    description: "Histórico alimentar, hábitos, alergias, intolerâncias e preferências do paciente.",
    icon: ClipboardList,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    id: "avaliacao_antropometrica" as NutritionModuleType,
    title: "Avaliação Antropométrica",
    description: "Medidas corporais, IMC, composição corporal e indicadores nutricionais.",
    icon: Scale,
    color: "text-sky-500",
    bgColor: "bg-sky-500/10",
  },
  {
    id: "plano_alimentar" as NutritionModuleType,
    title: "Plano Alimentar",
    description: "Elaboração de cardápio, cálculo calórico, distribuição de macronutrientes.",
    icon: Salad,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    id: "orientacao_nutricional" as NutritionModuleType,
    title: "Orientação Nutricional",
    description: "Educação alimentar, orientações ao paciente e acompanhamento.",
    icon: Apple,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
  },
  {
    id: "aggregator" as any,
    title: "Agregador de Notas",
    description: "Visão consolidada das notas de todos os módulos de nutrição.",
    icon: BarChart3,
    route: "/nutrition/aggregator",
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
  },
];

export const nutritionModuleLabel: Record<string, string> = {
  anamnese_nutricional: "Anamnese Nutricional",
  avaliacao_antropometrica: "Avaliação Antropométrica",
  plano_alimentar: "Plano Alimentar",
  orientacao_nutricional: "Orientação Nutricional",
};

export const nutritionDefaultFormTemplates: Record<NutritionModuleType, { title: string; form_type: string }[]> = {
  anamnese_nutricional: [
    { title: "Ficha de Anamnese Nutricional", form_type: "standard" },
    { title: "Espelho — Anamnese Nutricional", form_type: "answer_key" },
  ],
  avaliacao_antropometrica: [
    { title: "Ficha de Avaliação Antropométrica", form_type: "standard" },
    { title: "Espelho — Avaliação Antropométrica", form_type: "answer_key" },
  ],
  plano_alimentar: [
    { title: "Plano Alimentar", form_type: "standard" },
    { title: "Espelho — Plano Alimentar", form_type: "answer_key" },
  ],
  orientacao_nutricional: [
    { title: "Ficha de Orientação Nutricional", form_type: "standard" },
    { title: "Espelho — Orientação Nutricional", form_type: "answer_key" },
  ],
};
