import type { FormField } from "@/components/forms/types";

const uid = (prefix: string, i: number) => `${prefix}-${i}`;

export const biomedicineTemplates: { area: string; module_type: string; form_type: string; title: string; description: string; content_json: FormField[] }[] = [
  // ── Análise Laboratorial ──
  {
    area: "biomedicine", module_type: "analise_laboratorial", form_type: "standard",
    title: "Ficha de Análise Laboratorial",
    description: "Registro do procedimento analítico",
    content_json: [
      { id: uid("al",0), label: "Informações da Amostra", type: "section_header" },
      { id: uid("al",1), label: "Tipo de amostra biológica", type: "radio", options: ["Sangue total","Soro","Plasma","Urina","Liquor","Outro"], required: true, max_score: 0.5 },
      { id: uid("al",2), label: "Condições pré-analíticas (jejum, anticoagulante, conservação)", type: "textarea", required: true, max_score: 1.5 },
      { id: uid("al",3), label: "Método Analítico", type: "section_header" },
      { id: uid("al",4), label: "Método utilizado e princípio", type: "textarea", required: true, max_score: 2 },
      { id: uid("al",5), label: "Reagentes utilizados", type: "textarea", required: true, max_score: 1 },
      { id: uid("al",6), label: "Equipamentos", type: "textarea", max_score: 1 },
      { id: uid("al",7), label: "Procedimento", type: "section_header" },
      { id: uid("al",8), label: "Descrição passo a passo do procedimento", type: "textarea", required: true, max_score: 2 },
      { id: uid("al",9), label: "Controles utilizados (interno e externo)", type: "textarea", required: true, max_score: 1.5 },
      { id: uid("al",10), label: "Observações e intercorrências", type: "textarea", max_score: 0.5 },
    ],
  },
  {
    area: "biomedicine", module_type: "analise_laboratorial", form_type: "answer_key",
    title: "Espelho — Análise Laboratorial",
    description: "Gabarito de análise laboratorial",
    content_json: [
      { id: uid("ale",0), label: "Amostra", type: "section_header" },
      { id: uid("ale",1), label: "Tipo de amostra", type: "radio", options: ["Sangue total","Soro","Plasma","Urina","Liquor","Outro"], max_score: 0.5 },
      { id: uid("ale",2), label: "Condições pré-analíticas", type: "textarea", max_score: 1.5, correct_answer: "Verificar jejum adequado, anticoagulante correto, temperatura de transporte, tempo até processamento." },
      { id: uid("ale",3), label: "Método", type: "section_header" },
      { id: uid("ale",4), label: "Método e princípio", type: "textarea", max_score: 2, correct_answer: "Descrever princípio analítico (enzimático, imunológico, espectrofotométrico) e justificativa da escolha." },
      { id: uid("ale",7), label: "Procedimento", type: "section_header" },
      { id: uid("ale",8), label: "Procedimento", type: "textarea", max_score: 2, correct_answer: "POP detalhado com volumes, tempos de incubação, comprimentos de onda e temperaturas." },
      { id: uid("ale",9), label: "Controles", type: "textarea", max_score: 1.5, correct_answer: "CQI com materiais de controle em 2 níveis. PNCQ/PELM como controle externo." },
    ],
  },
  // ── Controle de Qualidade ──
  {
    area: "biomedicine", module_type: "controle_qualidade", form_type: "standard",
    title: "Ficha de Controle de Qualidade",
    description: "CQI com regras de Westgard",
    content_json: [
      { id: uid("cq",0), label: "Controle Interno", type: "section_header" },
      { id: uid("cq",1), label: "Analito avaliado", type: "text", required: true, max_score: 0.5 },
      { id: uid("cq",2), label: "Valores do controle (nível 1 e nível 2)", type: "textarea", required: true, max_score: 1.5 },
      { id: uid("cq",3), label: "Gráfico de Levey-Jennings (descrição dos pontos)", type: "textarea", required: true, max_score: 2 },
      { id: uid("cq",4), label: "Regras de Westgard", type: "section_header" },
      { id: uid("cq",5), label: "Regras de Westgard violadas", type: "checkbox", options: ["1-2s (alerta)","1-3s (rejeição)","2-2s (rejeição)","R-4s (rejeição)","4-1s (rejeição)","10x (rejeição)","Nenhuma"], required: true, max_score: 2 },
      { id: uid("cq",6), label: "Interpretação e decisão", type: "textarea", required: true, max_score: 2 },
      { id: uid("cq",7), label: "Calibração", type: "section_header" },
      { id: uid("cq",8), label: "Necessidade e tipo de calibração", type: "textarea", max_score: 1 },
      { id: uid("cq",9), label: "Ações corretivas implementadas", type: "textarea", max_score: 1 },
    ],
  },
  {
    area: "biomedicine", module_type: "controle_qualidade", form_type: "answer_key",
    title: "Espelho — Controle de Qualidade",
    description: "Gabarito de CQI e Westgard",
    content_json: [
      { id: uid("cqe",0), label: "CQI", type: "section_header" },
      { id: uid("cqe",2), label: "Valores do controle", type: "textarea", max_score: 1.5, correct_answer: "Registrar valores obtidos, média e DP do lote. Avaliar se dentro de ±2DP." },
      { id: uid("cqe",3), label: "Levey-Jennings", type: "textarea", max_score: 2, correct_answer: "Plotar pontos em relação à média ±1DP, ±2DP, ±3DP. Identificar tendências e desvios." },
      { id: uid("cqe",4), label: "Westgard", type: "section_header" },
      { id: uid("cqe",5), label: "Regras violadas", type: "checkbox", options: ["1-2s (alerta)","1-3s (rejeição)","2-2s (rejeição)","R-4s (rejeição)","4-1s (rejeição)","10x (rejeição)","Nenhuma"], max_score: 2 },
      { id: uid("cqe",6), label: "Interpretação", type: "textarea", max_score: 2, correct_answer: "Diferenciar erro aleatório vs. sistemático. Decidir se libera ou repete a corrida." },
      { id: uid("cqe",9), label: "Ações corretivas", type: "textarea", max_score: 1, correct_answer: "Recalibrar, trocar reagente, manutenção preventiva, nova corrida de CQ." },
    ],
  },
  // ── Interpretação de Resultados ──
  {
    area: "biomedicine", module_type: "interpretacao_resultados", form_type: "standard",
    title: "Ficha de Interpretação de Resultados",
    description: "Correlação clínico-laboratorial",
    content_json: [
      { id: uid("ir",0), label: "Resultados", type: "section_header" },
      { id: uid("ir",1), label: "Resultados obtidos (analito, valor, unidade)", type: "textarea", required: true, max_score: 1.5 },
      { id: uid("ir",2), label: "Valores de referência", type: "textarea", required: true, max_score: 1 },
      { id: uid("ir",3), label: "Correlação Clínica", type: "section_header" },
      { id: uid("ir",4), label: "Significado clínico dos resultados", type: "textarea", required: true, max_score: 3 },
      { id: uid("ir",5), label: "Interferentes pré-analíticos e analíticos possíveis", type: "textarea", required: true, max_score: 2 },
      { id: uid("ir",6), label: "Necessidade de exames complementares", type: "textarea", max_score: 1 },
      { id: uid("ir",7), label: "Conclusão técnica", type: "textarea", required: true, max_score: 1.5 },
    ],
  },
  {
    area: "biomedicine", module_type: "interpretacao_resultados", form_type: "answer_key",
    title: "Espelho — Interpretação de Resultados",
    description: "Gabarito de interpretação",
    content_json: [
      { id: uid("ire",0), label: "Resultados", type: "section_header" },
      { id: uid("ire",1), label: "Resultados", type: "textarea", max_score: 1.5, correct_answer: "Apresentar de forma clara com unidades e método." },
      { id: uid("ire",2), label: "Valores de referência", type: "textarea", max_score: 1, correct_answer: "Valores de referência estratificados por sexo/idade quando aplicável." },
      { id: uid("ire",3), label: "Correlação", type: "section_header" },
      { id: uid("ire",4), label: "Significado clínico", type: "textarea", max_score: 3, correct_answer: "Correlacionar achados laboratoriais com hipóteses diagnósticas. Usar sensibilidade/especificidade." },
      { id: uid("ire",5), label: "Interferentes", type: "textarea", max_score: 2, correct_answer: "Lipemia, hemólise, icterícia, medicamentos, jejum inadequado." },
      { id: uid("ire",7), label: "Conclusão", type: "textarea", max_score: 1.5, correct_answer: "Síntese técnica com recomendações de confirmação se necessário." },
    ],
  },
  // ── Laudo Técnico ──
  {
    area: "biomedicine", module_type: "laudo_tecnico", form_type: "standard",
    title: "Modelo de Laudo Técnico",
    description: "Laudo laboratorial padronizado",
    content_json: [
      { id: uid("lt",0), label: "Dados do Paciente", type: "section_header" },
      { id: uid("lt",1), label: "Nome, idade, sexo, médico solicitante", type: "textarea", required: true },
      { id: uid("lt",2), label: "Data e hora da coleta", type: "text", required: true },
      { id: uid("lt",3), label: "Resultados", type: "section_header" },
      { id: uid("lt",4), label: "Exame 1 — Analito, resultado, valor de referência, método", type: "textarea", required: true, max_score: 2 },
      { id: uid("lt",5), label: "Exame 2 — Analito, resultado, valor de referência, método", type: "textarea", max_score: 2 },
      { id: uid("lt",6), label: "Exame 3 — Analito, resultado, valor de referência, método", type: "textarea", max_score: 2 },
      { id: uid("lt",7), label: "Observações", type: "section_header" },
      { id: uid("lt",8), label: "Observações técnicas", type: "textarea", max_score: 1 },
      { id: uid("lt",9), label: "Responsável técnico (nome e registro)", type: "text", required: true, max_score: 0.5 },
    ],
  },
  {
    area: "biomedicine", module_type: "laudo_tecnico", form_type: "answer_key",
    title: "Espelho — Laudo Técnico",
    description: "Gabarito de laudo laboratorial",
    content_json: [
      { id: uid("lte",3), label: "Resultados", type: "section_header" },
      { id: uid("lte",4), label: "Exame 1", type: "textarea", max_score: 2, correct_answer: "Formato: Analito | Resultado + Unidade | VR estratificado | Método. Flags para valores críticos." },
      { id: uid("lte",5), label: "Exame 2", type: "textarea", max_score: 2, correct_answer: "Mesmo formato padronizado. Incluir nota se resultado fora do VR." },
      { id: uid("lte",6), label: "Exame 3", type: "textarea", max_score: 2, correct_answer: "Mesmo formato. Consistência entre exames correlatos." },
      { id: uid("lte",7), label: "Observações", type: "section_header" },
      { id: uid("lte",8), label: "Observações técnicas", type: "textarea", max_score: 1, correct_answer: "Informar interferentes, repetição, diluição quando aplicável." },
      { id: uid("lte",9), label: "Responsável", type: "text", max_score: 0.5, correct_answer: "Nome do biomédico + CRBm." },
    ],
  },
];
