import type { FormField } from "@/components/forms/types";

const uid = (prefix: string, i: number) => `${prefix}-${i}`;

export const pharmacyTemplates: { area: string; module_type: string; form_type: string; title: string; description: string; content_json: FormField[] }[] = [
  // ══════════════════════════════════════════
  //  ANAMNESE — Formulário de Entrevista
  // ══════════════════════════════════════════
  {
    area: "pharmacy", module_type: "anamnese", form_type: "anamnesis",
    title: "Roteiro de Entrevista Farmacêutica",
    description: "Roteiro completo para conduzir entrevista farmacêutica com pacientes simulados",
    content_json: [
      { id: uid("an",0), label: "Roteiro de Entrevista", type: "section_header", description: "Este roteiro tem como objetivo conduzir uma entrevista farmacêutica com pacientes simulados" },
      { id: uid("an",1), label: "Preparação inicial (antes da consulta)", type: "section_header", description: "- Verifique se você tem papel, caneta ou ficha para registrar informações.\n- Mantenha postura acolhedora, escuta ativa e boa comunicação não verbal.\n- Respire fundo e lembre-se: você está aqui para compreender, não julgar" },
      { id: uid("an",2), label: "Acolhimento do paciente", type: "section_header", description: "- Cumprimente o paciente pelo nome, apresente-se e explique o objetivo da entrevista.\n- Exemplo: \"Bom dia, sou estudante de Farmácia e gostaria de conversar com você sobre o uso dos seus medicamentos. Podemos conversar um pouco?\"" },
      { id: uid("an",3), label: "Levantamento de informações", type: "section_header", description: "" },
      { id: uid("an",4), label: "Queixas e sintomas", type: "textarea", required: false, max_score: 0, description: "- O que trouxe você até aqui hoje? - Há quanto tempo está com esse problema? - Houve piora ou melhora recente?" },
      { id: uid("an",5), label: "Histórico de saúde", type: "textarea", required: false, max_score: 0, description: "- Você possui algum problema de saúde já diagnosticado? - Faz acompanhamento médico? - Já realizou exames recentes?" },
      { id: uid("an",6), label: "Medicamentos em uso", type: "textarea", required: false, max_score: 0, description: "- Quais medicamentos você está usando atualmente? - Como você costuma tomar cada um deles (horários, forma)? - Algum medicamento foi iniciado ou interrompido recentemente? - Algum desses medicamentos causa efeitos colaterais?" },
      { id: uid("an",7), label: "Adesão e dificuldades", type: "textarea", required: false, max_score: 0, description: "- Consegue tomar os medicamentos nos horários corretos? - Já esqueceu de tomar algum? - Tem dificuldade para engolir ou usar algum medicamento? - Alguém ajuda a lembrar ou preparar os medicamentos?" },
      { id: uid("an",8), label: "Aspectos sociais e culturais", type: "textarea", required: false, max_score: 0, description: "- Você consome bebidas alcoólicas, fuma ou faz uso de plantas medicinais? - Alguém da sua casa ajuda com os medicamentos? - Alguma dificuldade para conseguir os remédios?" },
      { id: uid("an",9), label: "Encerramento", type: "section_header", description: "- Faça um resumo breve do que foi conversado com o paciente.\n- Agradeça a disponibilidade para a conversa.\n- Exemplo: \"Agradeço por ter conversado comigo. Isso vai nos ajudar a cuidar melhor da sua saúde.\"" },
    ],
  },

  // ── Anamnese — Ficha de Observação (Observador) ──
  {
    area: "pharmacy", module_type: "anamnese", form_type: "observer_eval",
    title: "Ficha de Observação — Entrevista Farmacêutica",
    description: "Checklist para o observador avaliar a entrevista farmacêutica entre colegas",
    content_json: [
      { id: uid("ao",0), label: "Ficha de observação | Entrevista Farmacêutica", type: "section_header", description: "Esta ficha deve ser preenchida por um estudante enquanto observa a simulação da entrevista farmacêutica entre colegas. Aponte se o Farmacêutico simulado realizou as ações propostas e use o campo de observações para comentários construtivos." },
      { id: uid("ao",1), label: "Data", type: "date", required: true, max_score: 0 },
      { id: uid("ao",2), label: "Cumprimentou o paciente de forma acolhedora?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("ao",3), label: "Explicou o objetivo da entrevista", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("ao",4), label: "Utilizou linguagem acessível", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("ao",5), label: "Demonstrou escuta ativa (olhar, acenos, silêncio ativo)", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("ao",6), label: "Fez perguntas abertas antes das fechadas", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 1.5, option_scores: {"0": 1.5, "1": 0.75}, correct_answer: 0 },
      { id: uid("ao",7), label: "Explorou as queixas e sintomas do paciente", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 1.5, option_scores: {"0": 1.5, "1": 0.75}, correct_answer: 0 },
      { id: uid("ao",8), label: "Investigou a farmacoterapia atual de forma completa", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 1.5, option_scores: {"0": 1.5, "1": 0.75}, correct_answer: 0 },
      { id: uid("ao",9), label: "Perguntou sobre adesão e dificuldades com o tratamento", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 1.5, option_scores: {"0": 1.5, "1": 0.75}, correct_answer: 0 },
      { id: uid("ao",10), label: "Verificou acesso e armazenamento dos medicamentos", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 1, option_scores: {"0": 1, "1": 0.5}, correct_answer: 0 },
      { id: uid("ao",11), label: "Resumiu as informações ao final da entrevista", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("ao",12), label: "Encerramento empático e respeitoso", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
    ],
  },

  // ── Anamnese — Avaliação do Professor ──
  {
    area: "pharmacy", module_type: "anamnese", form_type: "professor_eval",
    title: "Avaliação do Professor — Entrevista Farmacêutica",
    description: "Escala de avaliação docente (1-4) para desempenho na entrevista farmacêutica",
    content_json: [
      { id: uid("ap",0), label: "Instruções para o Professor", type: "section_header", description: "Avalie o desempenho do aluno utilizando a escala de 1 a 4, onde:\n\n1 - Insuficiente: Não realizou ou realizou de forma inadequada.\n\n2 - Em Desenvolvimento: Realizou parcialmente, mas demonstrou insegurança ou falta de aprofundamento.\n\n3 - Adequado: Cumpriu o esperado com boa técnica.\n\n4 - Excelente: Demonstrou domínio, fluidez, empatia e excelente raciocínio clínico." },
      { id: uid("ap",1), label: "Preparação e Acolhimento", type: "section_header" },
      { id: uid("ap",2), label: "O aluno conseguiu estabelecer um ambiente seguro e acolhedor logo no início da consulta?", type: "scale", required: false, max_score: 1, scale_max: 4, correct_answer: 4, scale_max_label: "4", scale_min_label: "1" } as any,
      { id: uid("ap",3), label: "A explicação sobre o objetivo da entrevista farmacêutica foi clara e transmitiu confiança ao paciente?", type: "scale", required: false, max_score: 1, scale_max: 4, correct_answer: 4, scale_max_label: "4", scale_min_label: "1" } as any,
      { id: uid("ap",4), label: "Habilidades de Comunicação", type: "section_header" },
      { id: uid("ap",5), label: "O aluno conseguiu \"traduzir\" jargões técnicos de forma que o paciente realmente compreendesse, sem infantilizá-lo?", type: "scale", required: false, max_score: 1, scale_max: 4, correct_answer: 4, scale_max_label: "4", scale_min_label: "1" } as any,
      { id: uid("ap",6), label: "O aluno utilizou perguntas abertas corretamente e evitou interromper ou confrontar o paciente de forma ríspida?", type: "scale", required: false, max_score: 1, scale_max: 4, correct_answer: 4, scale_max_label: "4", scale_min_label: "1" } as any,
      { id: uid("ap",7), label: "Coleta de Dados e Raciocínio Clínico", type: "section_header" },
      { id: uid("ap",8), label: "Ao investigar os sintomas, o aluno fez as conexões corretas (ex: suspeitou se a queixa poderia ser um efeito adverso de algum medicamento)?", type: "scale", required: false, max_score: 1, scale_max: 4, correct_answer: 4, scale_max_label: "4", scale_min_label: "1" } as any,
      { id: uid("ap",9), label: "A investigação sobre como o paciente toma os medicamentos foi minuciosa o suficiente para identificar erros de dosagem ou interações?", type: "scale", required: false, max_score: 1, scale_max: 4, correct_answer: 4, scale_max_label: "4", scale_min_label: "1" } as any,
      { id: uid("ap",10), label: "O aluno foi empático ao investigar falhas na adesão, criando um ambiente sem julgamentos para que o paciente assumisse que esquece de tomar os remédios?", type: "scale", required: false, max_score: 1, scale_max: 4, correct_answer: 4, scale_max_label: "4", scale_min_label: "1" } as any,
      { id: uid("ap",11), label: "O aluno conseguiu correlacionar o uso de chás/plantas ou dificuldades financeiras/acesso com o sucesso do tratamento?", type: "scale", required: false, max_score: 1, scale_max: 4, correct_answer: 4, scale_max_label: "4", scale_min_label: "1" } as any,
      { id: uid("ap",12), label: "Encerramento e Capacidade de Síntese", type: "section_header" },
      { id: uid("ap",13), label: "O resumo final feito para o paciente foi preciso, englobando os pontos críticos identificados na consulta sem causar alarme?", type: "scale", required: false, max_score: 2, scale_max: 4, correct_answer: 4, scale_max_label: "4", scale_min_label: "1" } as any,
      { id: uid("ap",14), label: "Feedback do professor", type: "section_header" },
      { id: uid("ap",15), label: "Pontos Fortes do Aluno", type: "textarea", required: false, max_score: 0 },
      { id: uid("ap",16), label: "Oportunidades de Melhoria", type: "textarea", required: false, max_score: 0 },
    ],
  },

  // ══════════════════════════════════════════
  //  SOAP — Formulário de Documentação
  // ══════════════════════════════════════════
  {
    area: "pharmacy", module_type: "soap", form_type: "soap",
    title: "Formulário de Documentação SOAP",
    description: "Registro estruturado do atendimento farmacêutico em formato S-O-A-P",
    content_json: [
      { id: uid("sp",0), label: "Formulário de documentação SOAP", type: "section_header" },
      { id: uid("sp",1), label: "Nome do paciente (colega)", type: "textarea", required: true, max_score: 0 },
      { id: uid("sp",2), label: "S - Subjetivo (Queixa e percepção do \"paciente\")", type: "section_header" },
      { id: uid("sp",3), label: "Queixa principal: Qual a principal queixa do \"paciente\"? Descreva com as palavras dele.", type: "textarea", required: false, max_score: 0 },
      { id: uid("sp",4), label: "Histórico da queixa: Desde quando a queixa existe? O que a piora ou melhora? A queixa se irradia ou afeta outras partes do corpo?", type: "textarea", required: false, max_score: 0 },
      { id: uid("sp",5), label: "Percepção sobre o tratamento/saúde: O que o \"paciente\" pensa sobre sua condição de saúde, seus medicamentos ou seu tratamento?", type: "textarea", required: false, max_score: 0 },
      { id: uid("sp",6), label: "O - Objetivo (Dados clínicos e informações verificáveis)", type: "section_header" },
      { id: uid("sp",7), label: "Histórico de saúde e hábitos: Descreva o histórico de saúde do \"paciente\" (condições pré-existentes, cirurgias, alergias). Inclua também informações sobre estilo de vida (tabagismo, etilismo, dieta, sono, etc.).", type: "textarea", required: false, max_score: 0 },
      { id: uid("sp",8), label: "Medicamentos em uso: Liste todos os medicamentos que o \"paciente\" utiliza (prescritos e não prescritos), incluindo doses e frequência.", type: "textarea", required: false, max_score: 0 },
      { id: uid("sp",9), label: "Adesão e Acesso: Descreva a adesão do \"paciente\" ao tratamento (ex: \"relata esquecer\") e como ele obtém os medicamentos (ex: \"recebe na unidade de saúde\", \"compra\").", type: "textarea", required: false, max_score: 0 },
      { id: uid("sp",10), label: "A - Avaliação (Análise e interpretação dos dados)", type: "section_header" },
      { id: uid("sp",11), label: "Síntese e Análise: Resuma e analise a relação entre os dados subjetivos (S) e objetivos (O). Que problemas de saúde ou relacionados ao tratamento podem ser identificados?", type: "textarea", required: false, max_score: 0 },
      { id: uid("sp",12), label: "Riscos e Intervenções: Quais são os principais riscos identificados (ex: interações medicamentosas, automedicação, baixa adesão)? Qual é a sua interpretação profissional sobre a situação?", type: "textarea", required: false, max_score: 0 },
      { id: uid("sp",13), label: "P - Plano (Conduta e ações propostas)", type: "section_header" },
      { id: uid("sp",14), label: "Plano de ação: Liste, em tópicos, as ações que você propõe para abordar os problemas identificados na avaliação (A). O que deve ser feito para melhorar a saúde e o tratamento do \"paciente\"? Seja específico.", type: "textarea", required: false, max_score: 0 },
    ],
  },

  // ── SOAP — Checklist de Revisão entre Pares ──
  {
    area: "pharmacy", module_type: "soap", form_type: "peer_evaluation",
    title: "Checklist de Revisão entre Pares — SOAP",
    description: "Avaliação por pares da documentação SOAP com escala Sim/Parcial/Não",
    content_json: [
      { id: uid("spe",0), label: "Checklist de Revisão entre Pares – documentação usando o SOAP", type: "section_header", description: "Instruções: Para cada item, marque \"Sim\" se a informação estiver presente e for adequada, e \"Não\" se estiver ausente ou inadequada. Atribua a pontuação correspondente" },
      { id: uid("spe",1), label: "Nome do aluno avaliado", type: "textarea", required: false, max_score: 0 },
      { id: uid("spe",2), label: "S - Subjetivo", type: "section_header" },
      { id: uid("spe",3), label: "Queixa Principal: A queixa principal do \"paciente\" está claramente descrita usando as palavras dele?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("spe",4), label: "Histórico da Queixa: O histórico da queixa inclui detalhes relevantes (tempo, características, fatores de melhora/piora)?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("spe",5), label: "Sintomas Adicionais: Outros sintomas ou percepções relevantes do \"paciente\" (ex: hábitos, percepções sobre o tratamento) foram incluídos?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("spe",6), label: "Linguagem do Paciente: O texto reflete a linguagem e a perspectiva do \"paciente\", sem interpretações do avaliador?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("spe",7), label: "Clareza e Organização: As informações estão organizadas de forma lógica e são fáceis de entender?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("spe",8), label: "O - Objetivo (5 pontos)", type: "section_header" },
      { id: uid("spe",9), label: "Dados Verificáveis: Foram incluídos dados mensuráveis ou observáveis (ex: medicamentos em uso, doses, frequência)?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("spe",10), label: "Histórico Clínico: Informações do histórico de saúde do \"paciente\" (ex: comorbidades, alergias) foram citadas?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("spe",11), label: "Dados Não Clínicos: Foram incluídas informações objetivas sobre estilo de vida, hábitos ou dados sociais relevantes?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("spe",12), label: "Adesão e Acesso: A adesão ao tratamento e o acesso aos medicamentos foram descritos de forma objetiva (ex: \"refere esquecer\", \"recebe na farmácia\")?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("spe",13), label: "Diferenciação S x O: As informações objetivas estão separadas das subjetivas (sem incluir percepções ou queixas)?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("spe",14), label: "A - Avaliação", type: "section_header" },
      { id: uid("spe",15), label: "Síntese dos Dados: A seção A faz uma síntese da relação entre os dados de S e O?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("spe",16), label: "Problemas Identificados: Foram identificados os problemas ou a situação clínica (ex: risco de interações, baixa adesão, automedicação)?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("spe",17), label: "Análise Profissional: A avaliação reflete uma análise profissional do caso, indo além da simples repetição dos dados?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("spe",18), label: "Priorização: Os problemas mais importantes foram priorizados ou destacados na avaliação?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("spe",19), label: "Sem Julgamentos: A avaliação é descritiva e não contém julgamentos sobre o \"paciente\"?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("spe",20), label: "P - Plano", type: "section_header" },
      { id: uid("spe",21), label: "Clareza do Plano: O plano de ação está claro e específico?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("spe",22), label: "Direcionado aos Problemas: O plano de ação aborda diretamente os problemas identificados na seção A?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("spe",23), label: "Propostas de Intervenção: Foram propostas intervenções específicas (ex: \"sugerir organizador\", \"orientar sobre riscos\")?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("spe",24), label: "Relevância: O plano de ação é clinicamente relevante para o caso apresentado?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("spe",25), label: "Organização: O plano está bem estruturado (ex: em tópicos) para facilitar a execução?", type: "radio", options: ["Sim","Parcial","Não"], required: false, max_score: 0.5, option_scores: {"0": 0.5, "1": 0.25}, correct_answer: 0 },
      { id: uid("spe",26), label: "Feedback e Pontuação Final", type: "section_header" },
      { id: uid("spe",27), label: "Pontos Fortes do Preenchimento", type: "textarea", required: false, max_score: 0 },
      { id: uid("spe",28), label: "Pontos a Melhorar no Preenchimento", type: "textarea", required: false, max_score: 0 },
      { id: uid("spe",29), label: "Comentários Adicionais do Avaliador", type: "textarea", required: false, max_score: 0 },
    ],
  },

  // ══════════════════════════════════════════
  //  RECONCILIAÇÃO — Ficha de Reconciliação Medicamentosa
  // ══════════════════════════════════════════
  {
    area: "pharmacy", module_type: "reconciliacao", form_type: "reconciliation",
    title: "Ficha de Reconciliação Medicamentosa",
    description: "Comparação entre medicamentos prévios e prescritos com análise de discrepâncias",
    content_json: [
      { id: uid("rc",0), label: "Ficha de reconciliação medicamentosa", type: "section_header", description: "Esta ficha deve ser preenchida com base na comparação entre os medicamentos que o paciente utilizava antes da transição de cuidado (domicílio, outro serviço ou internação anterior) e os medicamentos prescritos após a transição (admissão hospitalar, alta ou transferência de unidade)." },
      { id: uid("rc",1), label: "Caso clínico analisado", type: "dropdown", options: ["Caso 1","Caso 2","Caso 3","Caso 4","Caso 5"], required: false, max_score: 0 },
      { id: uid("rc",2), label: "Data", type: "date", required: false, max_score: 0 },
      { id: uid("rc",3), label: "Medicamentos prévios", type: "textarea", required: false, max_score: 1.25 },
      { id: uid("rc",4), label: "Medicamentos Prescritos", type: "textarea", required: false, max_score: 1.25 },
      { id: uid("rc",5), label: "Tipo de discrepância (Mantido (sem alteração), Suspenso (omitido), Modificado (dose, via, frequência), Adicionado (novo medicamento) ou Substituído (por outro da mesma classe ou diferente))", type: "textarea", required: false, max_score: 2.5 },
      { id: uid("rc",6), label: "Justificativa Clínica", type: "textarea", required: false, max_score: 2.5 },
      { id: uid("rc",7), label: "Conduta Farmacêutica", type: "textarea", required: false, max_score: 2.5 },
    ],
  },

  // ── Reconciliação — Espelho de Respostas ──
  {
    area: "pharmacy", module_type: "reconciliacao", form_type: "answer_key",
    title: "Espelho — Reconciliação Medicamentosa",
    description: "Gabarito por caso clínico para a ficha de reconciliação",
    content_json: [
      { id: uid("rce",0), label: "Medicamentos prévios", type: "textarea", required: false, max_score: 1.25, correct_answer: "Listar todos os medicamentos que o paciente utilizava antes da transição de cuidado, com nome, dose, frequência e via." },
      { id: uid("rce",1), label: "Medicamentos Prescritos", type: "textarea", required: false, max_score: 1.25, correct_answer: "Listar todos os medicamentos prescritos após a transição, com nome, dose, frequência e via." },
      { id: uid("rce",2), label: "Tipo de discrepância (Mantido (sem alteração), Suspenso (omitido), Modificado (dose, via, frequência), Adicionado (novo medicamento) ou Substituído (por outro da mesma classe ou diferente))", type: "textarea", required: false, max_score: 2.5, correct_answer: "Classificar cada medicamento quanto à discrepância: Mantido, Suspenso, Modificado, Adicionado ou Substituído, detalhando a alteração." },
      { id: uid("rce",3), label: "Justificativa Clínica", type: "textarea", required: false, max_score: 2.5, correct_answer: "Para cada discrepância, justificar se é intencional ou não intencional, com base em diretrizes clínicas e no contexto do paciente." },
      { id: uid("rce",4), label: "Conduta Farmacêutica", type: "textarea", required: false, max_score: 2.5, correct_answer: "Propor intervenções para cada discrepância identificada, incluindo comunicação com a equipe médica e orientação ao paciente." },
    ],
  },

  // ══════════════════════════════════════════
  //  DOCUMENTAÇÃO — Ficha de Encaminhamento
  // ══════════════════════════════════════════
  {
    area: "pharmacy", module_type: "documentacao", form_type: "referral",
    title: "Encaminhamento Farmacêutico",
    description: "Ficha de encaminhamento farmacêutico com identificação e conduta",
    content_json: [
      { id: uid("dc",0), label: "Encaminhamento Farmacêutico", type: "section_header" },
      { id: uid("dc",1), label: "Nome dos Farmacêuticos", type: "textarea", required: false, max_score: 0 },
      { id: uid("dc",2), label: "Identificação", type: "section_header" },
      { id: uid("dc",3), label: "Nome completo", type: "textarea", required: false, max_score: 0 },
      { id: uid("dc",4), label: "Data de nascimento", type: "date", required: false, max_score: 0 },
      { id: uid("dc",5), label: "Sexo", type: "radio", options: ["Masculino","Feminino"], required: false, max_score: 0 },
      { id: uid("dc",6), label: "ENCAMINHAMENTO", type: "section_header" },
      { id: uid("dc",7), label: "MOTIVO DO ENCAMINHAMENTO", type: "textarea", required: false, max_score: 1.25 },
      { id: uid("dc",8), label: "HISTÓRICO CLÍNICO/FARMACOTERAPÊUTICO RESUMIDO", type: "textarea", required: false, max_score: 1.25 },
      { id: uid("dc",9), label: "ACHADOS DA AVALIAÇÃO FARMACÊUTICA", type: "textarea", required: false, max_score: 1.25 },
      { id: uid("dc",10), label: "CONDUTA OU PROPOSTA DE INTERVENÇÃO", type: "textarea", required: false, max_score: 1.25 },
      { id: uid("dc",11), label: "OBSERVAÇÕES ADICIONAIS (se houver)", type: "textarea", required: false, max_score: 0 },
    ],
  },

  // ── Documentação — Espelho do Encaminhamento ──
  {
    area: "pharmacy", module_type: "documentacao", form_type: "referral_answer_key",
    title: "Espelho — Encaminhamento Farmacêutico",
    description: "Gabarito por caso clínico para a ficha de encaminhamento",
    content_json: [
      { id: uid("dce",0), label: "MOTIVO DO ENCAMINHAMENTO", type: "textarea", required: false, max_score: 1.25, correct_answer: "Justificar clinicamente o encaminhamento com base nos achados da avaliação farmacêutica, incluindo o contexto clínico do paciente e a especialidade indicada." },
      { id: uid("dce",1), label: "HISTÓRICO CLÍNICO/FARMACOTERAPÊUTICO RESUMIDO", type: "textarea", required: false, max_score: 1.25, correct_answer: "Síntese do histórico: diagnósticos, medicamentos em uso, eventos relevantes durante a internação e evolução clínica." },
      { id: uid("dce",2), label: "ACHADOS DA AVALIAÇÃO FARMACÊUTICA", type: "textarea", required: false, max_score: 1.25, correct_answer: "Descrever os problemas identificados na reconciliação e no acompanhamento: discrepâncias, interações, riscos de RAM, falhas de adesão." },
      { id: uid("dce",3), label: "CONDUTA OU PROPOSTA DE INTERVENÇÃO", type: "textarea", required: false, max_score: 1.25, correct_answer: "Listar intervenções realizadas ou propostas: ajustes de prescrição comunicados, orientações ao paciente, monitoramento sugerido." },
    ],
  },

  // ── Documentação — Quadro Resumo de Medicamentos (estrutura de colunas) ──
  {
    area: "pharmacy", module_type: "documentacao", form_type: "medication_summary",
    title: "Quadro Resumo de Medicamentos",
    description: "Tabela resumo com Medicamento, Dose, Via, Horário, Finalidade e Observações",
    content_json: [
      { id: uid("dm",0), label: "Medicamento", type: "text" },
      { id: uid("dm",1), label: "Dose", type: "text" },
      { id: uid("dm",2), label: "Via de Administração", type: "text" },
      { id: uid("dm",3), label: "Horário de Uso", type: "text" },
      { id: uid("dm",4), label: "Finalidade", type: "text" },
      { id: uid("dm",5), label: "Observações", type: "text" },
    ],
  },
];
