import type { FormField } from "@/components/forms/types";
import type { NativeTemplate } from "./index";

// Instrumentos de avaliação da simulação realística de anamnese, versão 2 (alinhada ao formulário de anamnese farmacêutica
// e ao roteiro do paciente padronizado). Cada um soma 10 pontos; a nota do farmacêutico na rodada é a média dos dois.
// O registro escrito NÃO entra aqui: o professor só vê o formulário do aluno depois de enviar o seu, então ele é pontuado
// numa etapa à parte, depois do envio de todos os formulários.

let seq = 0;
const nid = (p: string) => `${p}-${++seq}`;

const secao = (p: string, label: string, description = ""): FormField => ({ id: nid(p), label, type: "section_header", description });

// Observador: Sim / Parcial / Não. Parcial vale exatamente metade do peso.
const sim = (label: string, peso: number): FormField => ({
  id: nid("oe2"),
  label,
  type: "radio",
  options: ["Sim", "Parcial", "Não"],
  max_score: peso,
  option_scores: { "0": peso, "1": peso / 2 },
  correct_answer: "0",
  required: false,
});

// Professor: escala de 0 a 4, proporcional ao peso (0 vale 0%, 4 vale 100%).
const nota = (label: string, peso: number): FormField => ({
  id: nid("pe2"),
  label,
  type: "scale",
  scale_max: 4,
  scale_min_label: "0",
  scale_max_label: "4",
  max_score: peso,
  correct_answer: "4",
  required: false,
});

const livre = (p: string, label: string, description?: string): FormField => ({ id: nid(p), label, type: "textarea", required: false, max_score: 0, ...(description ? { description } : {}) });

function buildObservador(): FormField[] {
  seq = 0;
  return [
    secao(
      "oe2",
      "Ficha de observação | Entrevista farmacêutica",
      "Esta ficha deve ser preenchida por um estudante enquanto observa a simulação da entrevista farmacêutica entre colegas. Marque se o farmacêutico simulado realizou cada ação. “Parcial” vale metade do ponto. A qualidade e o raciocínio ficam com o professor; use o campo de feedback para comentários construtivos.",
    ),
    { id: nid("oe2"), label: "Data", type: "date", required: true, max_score: 0 },

    secao("oe2", "Acolhimento e comunicação"),
    sim("Acolheu o paciente e explicou o objetivo da entrevista", 1.0),
    sim("Usou linguagem acessível, sem jargão", 0.5),
    sim("Demonstrou escuta ativa (olhar, acenos, silêncio ativo)", 0.5),
    sim("Fez perguntas abertas antes das fechadas", 1.0),

    secao("oe2", "Coleta de dados"),
    sim("Caracterizou a queixa (início, duração, o que piora e melhora, impacto nas atividades)", 0.5),
    sim("Pediu ou aferiu os parâmetros pertinentes (PA, PA em ortostase, glicemia) e investigou sinais de alerta", 1.0),
    sim("Investigou a farmacoterapia (uso prescrito e uso real) e confirmou os medicamentos por fonte confiável, não por cor ou formato", 1.0),
    sim("Perguntou sobre chás, plantas e produtos sem prescrição", 0.5),
    sim("Perguntou sobre adesão e dificuldades com o tratamento, sem julgamento", 1.0),
    sim("Perguntou sobre alergias e sobre reações ou desconfortos com medicamentos", 0.5),
    sim("Verificou acesso, armazenamento e barreiras para usar os medicamentos", 0.5),
    sim("Explorou a perspectiva do paciente (preocupações e expectativas)", 0.5),

    secao("oe2", "Fechamento"),
    sim("Resumiu, combinou plano e seguimento e verificou a compreensão com as palavras do paciente", 1.0),
    sim("Encerramento empático e respeitoso", 0.5),

    secao("oe2", "Feedback ao aluno-paciente (sem nota)", "Não vale pontos. Serve de retorno a quem representou o paciente."),
    {
      id: nid("oe2"),
      label: "O paciente revelou as informações no momento certo, de acordo com o roteiro?",
      type: "radio",
      options: ["Seguiu o roteiro", "Seguiu em parte", "Não seguiu o roteiro"],
      max_score: 0,
      required: false,
    },
    livre("oe2", "Observações sobre o desempenho do aluno-paciente"),
  ];
}

function buildProfessor(): FormField[] {
  seq = 0;
  return [
    secao(
      "pe2",
      "Instruções para o Professor",
      "Avalie o desempenho do aluno durante a entrevista na escala de 0 a 4:\n\n0 - Não realizou (0% do critério).\n\n1 - Insuficiente: realizou de forma inadequada.\n\n2 - Em desenvolvimento: realizou parcialmente, com insegurança ou falta de aprofundamento.\n\n3 - Adequado: cumpriu o esperado com boa técnica.\n\n4 - Excelente: demonstrou domínio, fluidez, empatia e excelente raciocínio clínico.\n\nO registro escrito (formulário preenchido) não é avaliado aqui: ele é pontuado depois, quando todos os formulários forem enviados.",
    ),

    secao("pe2", "Comunicação e vínculo"),
    nota("O aluno criou um ambiente seguro e acolhedor e transmitiu confiança sobre o objetivo da entrevista?", 1.0),
    nota("O aluno traduziu os termos técnicos para o paciente compreender, sem infantilizá-lo?", 1.0),

    secao("pe2", "Raciocínio clínico e segurança"),
    nota("Ao investigar os sintomas, o aluno fez as conexões corretas (por exemplo, suspeitou que a queixa pudesse ser efeito adverso de algum medicamento)?", 1.5),
    nota("A investigação do uso real dos medicamentos foi minuciosa o bastante para identificar erros de dose, interações ou duplicidades?", 1.0),
    nota("O aluno reconheceu os sinais de alerta do caso e decidiu corretamente sobre encaminhamento?", 1.5),
    nota("O aluno investigou adesão, uso de chás e plantas e barreiras de acesso, criando um ambiente sem julgamentos?", 1.0),

    secao("pe2", "Síntese e plano"),
    nota("O aluno identificou e priorizou os problemas do paciente, incluindo os relacionados a medicamentos?", 1.0),
    nota("O plano e as orientações foram coerentes, pactuados com o paciente e com verificação da compreensão?", 1.0),
    nota("O resumo final foi preciso, englobando os pontos críticos da consulta sem causar alarme?", 1.0),

    secao("pe2", "Feedback do professor"),
    livre("pe2", "Pontos fortes do aluno"),
    livre("pe2", "Oportunidades de melhoria"),
  ];
}

export const observadorV2Template: NativeTemplate = {
  area: "pharmacy",
  module_type: "anamnese",
  form_type: "observer_eval",
  title: "Formulário de avaliação | Observador (v2)",
  description: "Checklist de observação com 14 critérios (Sim/Parcial/Não) alinhado ao formulário de anamnese farmacêutica, com retorno ao aluno-paciente",
  content_json: buildObservador(),
};

export const professorV2Template: NativeTemplate = {
  area: "pharmacy",
  module_type: "anamnese",
  form_type: "professor_eval",
  title: "Instrumento de Avaliação Docente (v2)",
  description: "Avaliação na escala de 0 a 4 (0 = 0%) com 9 critérios de comunicação, raciocínio, segurança, síntese e plano",
  content_json: buildProfessor(),
};
