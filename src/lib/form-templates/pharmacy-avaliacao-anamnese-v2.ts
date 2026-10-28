import type { FormField } from "@/components/forms/types";
import type { NativeTemplate } from "./index";

// Instrumentos de avaliação da simulação realística de anamnese, versão 2 (alinhada ao formulário de anamnese farmacêutica
// e ao roteiro do paciente padronizado). Cada um soma 10 pontos; a nota do farmacêutico na rodada é a média dos dois.
// O registro escrito NÃO entra aqui: o professor só vê o formulário do aluno depois de enviar o seu, então ele é pontuado
// numa etapa à parte, depois do envio de todos os formulários.
// Cada critério mede UMA coisa (nada de "A, B e C" numa nota só). Os critérios que mais pedem julgamento trazem âncoras:
// o que significa cada nota (professor) ou cada resposta (observador).

let seq = 0;
const nid = (p: string) => `${p}-${++seq}`;

const secao = (p: string, label: string, description = ""): FormField => ({ id: nid(p), label, type: "section_header", description });

// Observador: Sim / Parcial / Não. Parcial vale exatamente metade do peso.
const sim = (label: string, peso: number, description?: string): FormField => ({
  id: nid("oe2"),
  label,
  type: "radio",
  options: ["Sim", "Parcial", "Não"],
  max_score: peso,
  option_scores: { "0": peso, "1": peso / 2 },
  correct_answer: "0",
  required: false,
  allow_na: true,
  ...(description ? { description } : {}),
});

// Professor: escala de 0 a 4, proporcional ao peso (0 vale 0%, 4 vale 100%).
const nota = (label: string, peso: number, description?: string): FormField => ({
  id: nid("pe2"),
  label,
  type: "scale",
  scale_max: 4,
  scale_min_label: "0",
  scale_max_label: "4",
  max_score: peso,
  correct_answer: "4",
  required: false,
  allow_na: true,
  ...(description ? { description } : {}),
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
    sim(
      "Pediu ou aferiu os parâmetros pertinentes (PA, PA em ortostase, glicemia) e investigou sinais de alerta",
      1.0,
      "Sim: pediu ou aferiu os parâmetros pertinentes e investigou sinais de alerta. Parcial: fez só uma das duas coisas. Não: nenhuma.",
    ),
    sim(
      "Investigou a farmacoterapia (uso prescrito e uso real) e confirmou os medicamentos por fonte confiável, não por cor ou formato",
      1.0,
      "Sim: perguntou o uso prescrito e o real de cada medicamento e confirmou por fonte (receita, embalagem, prontuário). Parcial: investigou só parte dos medicamentos ou não confirmou a fonte. Não: não investigou.",
    ),
    sim("Perguntou sobre chás, plantas e produtos sem prescrição", 0.5),
    sim(
      "Perguntou sobre adesão e dificuldades com o tratamento, sem julgamento",
      1.0,
      "Sim: perguntou sobre o uso de cada medicamento, sem julgar. Parcial: perguntou só de forma geral (“toma direitinho?”). Não: não perguntou.",
    ),
    sim("Perguntou sobre alergias e sobre reações ou desconfortos com medicamentos", 0.5),
    sim("Verificou acesso, armazenamento e barreiras para usar os medicamentos", 0.5),
    sim("Explorou a perspectiva do paciente (preocupações e expectativas)", 0.5),

    secao("oe2", "Fechamento"),
    sim(
      "Resumiu as informações e combinou plano e seguimento",
      0.5,
      "Sim: resumiu e combinou o que fazer, quem faz e quando voltar. Parcial: resumiu ou sugeriu ações, sem combinar prazo ou seguimento. Não: não fez.",
    ),
    sim(
      "Verificou a compreensão do paciente com as palavras dele",
      0.5,
      "Sim: pediu ao paciente que explicasse com as próprias palavras o que combinaram. Parcial: perguntou só “ficou claro?”. Não: não verificou.",
    ),
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
      "Avalie o desempenho do aluno durante a entrevista na escala de 0 a 4:\n\n0 - Não realizou (0% do critério).\n\n1 - Insuficiente: realizou de forma inadequada.\n\n2 - Em desenvolvimento: realizou parcialmente, com insegurança ou falta de aprofundamento.\n\n3 - Adequado: cumpriu o esperado com boa técnica.\n\n4 - Excelente: demonstrou domínio, fluidez, empatia e excelente raciocínio clínico.\n\nOs critérios com orientação própria dizem o que significa cada nota. O registro escrito (formulário preenchido) não é avaliado aqui: ele é pontuado depois, quando todos os formulários forem enviados.",
    ),

    secao("pe2", "Comunicação e vínculo"),
    nota("O aluno criou um ambiente seguro e acolhedor, sem julgamentos, do início ao fim da entrevista?", 1.0),
    nota("O aluno traduziu os termos técnicos para o paciente compreender, sem infantilizá-lo?", 0.5),

    secao("pe2", "Raciocínio clínico e segurança"),
    nota("Ao investigar os sintomas, o aluno fez as conexões corretas (por exemplo, suspeitou que a queixa pudesse ser efeito adverso de algum medicamento)?", 1.5),
    nota(
      "A investigação do uso real dos medicamentos foi minuciosa o bastante para identificar erros de dose, interações ou duplicidades?",
      1.0,
      "0: não investigou o uso real. 1: perguntou só quais medicamentos usa. 2: perguntou dose e horário de alguns. 3: investigou todos (dose, horário, como toma) e percebeu discrepâncias. 4: além disso, identificou erro de dose, interação ou duplicidade e relacionou ao quadro.",
    ),
    nota(
      "O aluno reconheceu os sinais de alerta do caso e decidiu corretamente sobre encaminhamento?",
      1.5,
      "0: não percebeu os sinais de alerta. 1: percebeu, mas não investigou nem encaminhou. 2: investigou, mas a decisão sobre encaminhamento foi inadequada ou tardia. 3: reconheceu e decidiu adequadamente. 4: além disso, explicou ao paciente o motivo e as orientações de segurança.",
    ),
    nota(
      "O aluno investigou a adesão ao tratamento?",
      0.5,
      "0: não perguntou sobre adesão. 1: perguntou de forma genérica (“toma direitinho?”) e aceitou a resposta. 2: perguntou sem julgar, mas não investigou medicamento por medicamento nem os motivos. 3: explorou cada medicamento e identificou onde há falha. 4: além disso, identificou os motivos e relacionou a falha ao problema do paciente.",
    ),
    nota(
      "O aluno investigou o uso de chás, plantas e produtos sem prescrição?",
      0.5,
      "0: não perguntou. 2: perguntou de forma geral. 4: perguntou de forma específica (chás, garrafadas, plantas, suplementos) e avaliou a relação com a queixa ou com os medicamentos.",
    ),
    nota("O aluno investigou as barreiras de acesso (custo, deslocamento, disponibilidade) e a relação delas com o tratamento?", 0.5),

    secao("pe2", "Síntese e plano"),
    nota("O aluno identificou e priorizou os problemas do paciente, incluindo os relacionados a medicamentos?", 1.0),
    nota(
      "O plano e as orientações propostas foram coerentes com os problemas identificados?",
      1.0,
      "0: não propôs plano. 1: propôs ações genéricas, sem relação com os problemas. 2: propôs ações pertinentes, mas incompletas ou sem responsável e prazo. 3: plano coerente com os problemas priorizados, com orientações claras. 4: além disso, adequou o plano à realidade do paciente (acesso, rotina, crenças).",
    ),
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
  description: "Checklist de observação com 15 critérios (Sim/Parcial/Não) alinhado ao formulário de anamnese farmacêutica, com retorno ao aluno-paciente",
  content_json: buildObservador(),
};

export const professorV2Template: NativeTemplate = {
  area: "pharmacy",
  module_type: "anamnese",
  form_type: "professor_eval",
  title: "Instrumento de Avaliação Docente (v2)",
  description: "Avaliação na escala de 0 a 4 (0 = 0%) com 11 critérios de comunicação, raciocínio, segurança, síntese e plano, com orientações do que significa cada nota",
  content_json: buildProfessor(),
};
