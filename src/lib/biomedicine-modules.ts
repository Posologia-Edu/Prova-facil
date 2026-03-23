import { Microscope, ClipboardList, FileText, FlaskConical, TestTube, BarChart3 } from "lucide-react";

export type BiomedicineModuleType = "analise_laboratorial" | "controle_qualidade" | "interpretacao_resultados" | "laudo_tecnico";

export const biomedicineModules = [
  {
    id: "analise_laboratorial" as BiomedicineModuleType,
    title: "Análise Laboratorial",
    description: "Procedimentos pré-analíticos, analíticos e pós-analíticos em diferentes setores do laboratório.",
    icon: FlaskConical,
    color: "text-violet-600",
    bgColor: "bg-violet-600/10",
  },
  {
    id: "controle_qualidade" as BiomedicineModuleType,
    title: "Controle de Qualidade",
    description: "Controle interno e externo de qualidade, gráficos de Levey-Jennings e regras de Westgard.",
    icon: ClipboardList,
    color: "text-sky-600",
    bgColor: "bg-sky-600/10",
  },
  {
    id: "interpretacao_resultados" as BiomedicineModuleType,
    title: "Interpretação de Resultados",
    description: "Correlação clínico-laboratorial, valores de referência, alertas críticos e interferentes.",
    icon: TestTube,
    color: "text-rose-600",
    bgColor: "bg-rose-600/10",
  },
  {
    id: "laudo_tecnico" as BiomedicineModuleType,
    title: "Laudo Técnico",
    description: "Elaboração de laudos laboratoriais, liberação de resultados e comunicação de valores críticos.",
    icon: FileText,
    color: "text-emerald-600",
    bgColor: "bg-emerald-600/10",
  },
  {
    id: "aggregator" as any,
    title: "Agregador de Notas",
    description: "Visão consolidada das notas de todos os módulos de biomedicina.",
    icon: BarChart3,
    route: "/biomedicine/aggregator",
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
  },
];

export const moduleLabel: Record<string, string> = {
  analise_laboratorial: "Análise Laboratorial",
  controle_qualidade: "Controle de Qualidade",
  interpretacao_resultados: "Interpretação de Resultados",
  laudo_tecnico: "Laudo Técnico",
};

export const defaultFormTemplates: Record<BiomedicineModuleType, { title: string; form_type: string }[]> = {
  analise_laboratorial: [
    { title: "Ficha de Análise Laboratorial", form_type: "standard" },
    { title: "Espelho — Análise", form_type: "answer_key" },
  ],
  controle_qualidade: [
    { title: "Ficha de Controle de Qualidade", form_type: "standard" },
    { title: "Espelho — CQ", form_type: "answer_key" },
  ],
  interpretacao_resultados: [
    { title: "Ficha de Interpretação", form_type: "standard" },
    { title: "Espelho — Interpretação", form_type: "answer_key" },
  ],
  laudo_tecnico: [
    { title: "Laudo Técnico", form_type: "standard" },
    { title: "Espelho — Laudo", form_type: "answer_key" },
  ],
};
