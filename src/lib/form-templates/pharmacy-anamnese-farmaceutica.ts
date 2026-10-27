import type { FormField } from "@/components/forms/types";
import type { NativeTemplate } from "./index";

// Formulário de anamnese farmacêutica (roteiro para entrevista clínica e registro do cuidado farmacêutico).
// Reproduz as 10 seções do formulário em PDF do professor, mais o registro de raciocínio do aluno.
// Os "☐ Não ☐ Sim" são escolha única; os grupos de "☐" são caixas de seleção; as grades são campos de tabela.

let n = 0;
const nid = () => `afm-${++n}`;

const secao = (label: string, description = ""): FormField => ({ id: nid(), label, type: "section_header", description });
const texto = (label: string, description?: string): FormField => ({ id: nid(), label, type: "text", required: false, max_score: 0, ...(description ? { description } : {}) });
const paragrafo = (label: string, description?: string): FormField => ({ id: nid(), label, type: "textarea", required: false, max_score: 0, ...(description ? { description } : {}) });
const data = (label: string): FormField => ({ id: nid(), label, type: "date", required: false, max_score: 0 });
const escolha = (label: string, options: string[], description?: string): FormField => ({ id: nid(), label, type: "radio", options, required: false, max_score: 0, ...(description ? { description } : {}) });
const marcar = (label: string, options: string[], description?: string): FormField => ({ id: nid(), label, type: "checkbox", options, required: false, max_score: 0, ...(description ? { description } : {}) });
const tabela = (label: string, table_columns: string[], extra: { rows?: number; labels?: string[]; header?: string; description?: string } = {}): FormField => ({
  id: nid(),
  label,
  type: "table",
  required: false,
  max_score: 0,
  table_columns,
  ...(extra.labels ? { table_row_labels: extra.labels, table_row_header: extra.header } : { table_rows: extra.rows ?? 3 }),
  ...(extra.description ? { description: extra.description } : {}),
});

const NAO_SIM = ["Não", "Sim"];

function build(): FormField[] {
  n = 0;
  return [
    secao(
      "1 Identificação e acolhimento",
      "Orientações ao aluno: inicie com perguntas abertas, escute sem julgamento e registre os sintomas nas palavras do paciente. Confirme os medicamentos em fontes confiáveis. Use “não informado”, “não investigado” ou “não se aplica” quando pertinente. Discuta a avaliação e o plano com o supervisor.",
    ),
    texto("Nome"),
    texto("Como prefere ser chamado(a)"),
    texto("Idade"),
    data("Data de nascimento"),
    texto("Sexo"),
    data("Data do atendimento"),
    texto("Horário"),
    texto("Serviço/local"),
    texto("Aluno/profissional"),
    texto("Supervisor"),
    texto("Acompanhante/cuidador e vínculo"),
    texto("Contato"),
    texto("Fonte das informações"),
    paragrafo("Motivo principal da consulta nas palavras do paciente", "Pergunta de abertura: “O que trouxe você aqui hoje?”"),

    secao("2 Caracterização da queixa principal"),
    texto("Queixa/sintoma"),
    texto("Início e evolução"),
    texto("Duração/frequência e quando ocorre"),
    texto("Localização e intensidade, quando aplicável"),
    texto("O que desencadeia/piora"),
    texto("O que melhora e medidas já tentadas"),
    texto("Sintomas associados"),
    texto("Impacto nas atividades diárias"),
    escolha("Já ocorreu antes?", NAO_SIM),
    texto("Se já ocorreu, quando"),
    marcar("Eventos relacionados", ["Queda", "Desmaio", "Trauma", "Urgência", "Internação"]),
    texto("Detalhes/outros eventos"),

    secao("3 Parâmetros clínicos", "Registrar os parâmetros pertinentes e as condições da medida, incluindo data, horário e relação com refeições quando aplicável."),
    tabela("Parâmetros clínicos", ["Resultado", "Condições da medida e observações"], {
      labels: ["PA (mmHg)", "PA em ortostase (mmHg)", "FC (bpm)", "Glicemia capilar (mg/dL)", "Temperatura (°C)", "SpO₂ (%)", "Peso / altura (kg / m)", "IMC (kg/m²)", "Outro"],
      header: "Parâmetro",
    }),
    escolha("Sinais de alerta", ["Não identificados", "Presentes", "Ainda não avaliados"]),
    paragrafo("Descrição dos sinais e conduta adotada"),
    escolha("Encaminhamento imediato", NAO_SIM),
    texto("Motivo/destino do encaminhamento imediato"),

    secao("4 História farmacoterapêutica", "Confirme nome, concentração e forma farmacêutica. Registre o uso prescrito e o uso real, inclusive medicamentos interrompidos recentemente. Não identifique o produto apenas por cor ou formato."),
    tabela("Medicamentos em uso", ["Medicamento e concentração", "Dose e via", "Horário ou frequência", "Indicação e início", "Como realmente usa"], { rows: 5 }),
    marcar("Fonte de confirmação", ["Paciente", "Receita", "Embalagens", "Prontuário", "Cuidador/familiar", "Sistema eletrônico", "Outra"]),
    texto("Outra fonte de confirmação (qual?)"),
    escolha("Mudanças recentes", NAO_SIM),
    texto("Produto, dose, data e motivo da mudança"),
    paragrafo("Medicamentos pendentes de confirmação e como serão confirmados"),
    marcar("Outros produtos", ["Sem prescrição", "Chás/plantas", "Fitoterápicos", "Vitaminas", "Suplementos", "Outros"]),
    texto("Outros produtos (quais?)"),
    tabela("Produtos sem prescrição, chás, fitoterápicos e suplementos", ["Produto e motivo de uso", "Quantidade ou preparo", "Frequência e início"], { rows: 3 }),

    secao("5 Experiência e adesão aos medicamentos"),
    escolha(
      "Muitas pessoas às vezes esquecem ou deixam de tomar algum medicamento. Isso acontece com você?",
      ["Nunca", "Raramente", "Às vezes", "Frequentemente"],
    ),
    texto("Período referido"),
    texto("Medicamento(s) e situações em que não usa"),
    marcar("Motivos", ["Esquecimento", "Efeito indesejado", "Dificuldade para administrar", "Custo/acesso", "Não percebe benefício", "Acredita não precisar", "Regime complexo", "Outro"]),
    texto("Outro motivo (qual?)"),
    escolha("Modificou dose ou interrompeu por conta própria?", NAO_SIM),
    paragrafo("Qual medicamento, quando e por quê"),
    texto("Quem organiza/administra os medicamentos?"),

    secao("6 Segurança da farmacoterapia"),
    escolha("Alergias", ["Nega", "Sim", "Desconhecidas"]),
    texto("Substância"),
    texto("Reação e quando ocorreu"),
    escolha("Desconfortos relacionados a medicamentos", ["Não relatados", "Sim", "Não investigados"]),
    tabela("Desconfortos relacionados a medicamentos", ["Medicamento suspeito", "Problema relatado", "Início e evolução", "Conduta do paciente"], { rows: 3 }),
    marcar("Possíveis problemas identificados pelo aluno/profissional", [
      "Necessidade não tratada",
      "Sem indicação atual aparente",
      "Efetividade insuficiente",
      "Dose/posologia inadequada",
      "Segurança",
      "Suspeita de evento adverso",
      "Interação entre medicamentos",
      "Interação com alimento/produto natural",
      "Adesão",
      "Acesso",
      "Outro",
    ]),
    texto("Outro problema (qual?)"),

    secao("7 História clínica"),
    tabela("Condições e problemas de saúde", ["Condição ou problema de saúde", "Tempo de evolução", "Controle e observações"], { rows: 3 }),
    escolha("Internações", NAO_SIM),
    texto("Internações: motivo e data"),
    escolha("Cirurgias", NAO_SIM),
    texto("Cirurgias: quais e quando"),
    texto("Antecedentes familiares relevantes"),
    texto("Outros antecedentes, gestação ou lactação quando pertinente"),
    paragrafo("Exames relevantes com resultado e data"),

    secao("8 Hábitos de vida e contexto social"),
    escolha("Tabagismo", ["Não", "Atual", "Ex-tabagista"]),
    texto("Tabagismo: quantidade e tempo"),
    escolha("Álcool", NAO_SIM),
    texto("Álcool: quantidade e frequência"),
    texto("Café/cafeína"),
    texto("Ingestão de água"),
    texto("Alimentação"),
    texto("Sono"),
    texto("Atividade física"),
    texto("Mobilidade, dor e limitações"),
    escolha("Mora", ["Sozinho(a)", "Com familiares", "Outros"]),
    texto("Mora com outros (quem?)"),
    texto("Rede de apoio/cuidador"),
    escolha("Obtém os medicamentos regularmente?", ["Sim", "Não", "Não sabe"]),
    marcar("Barreiras", ["Financeira", "Transporte", "Disponibilidade", "Compreensão", "Dificuldade física", "Organização dos horários", "Outra"]),
    texto("Outra barreira (qual?)"),

    secao("9 Perspectiva do paciente"),
    paragrafo("O que mais preocupa você em relação ao seu problema de saúde?"),
    paragrafo("O que você acha que pode estar causando esse problema?"),
    paragrafo("O que você espera deste atendimento?"),

    secao("10 Avaliação, plano e fechamento"),
    paragrafo("Síntese clínica e farmacoterapêutica validada com o paciente"),
    texto("Problema prioritário 1"),
    texto("Problema prioritário 2"),
    texto("Problema prioritário 3"),
    marcar("Intervenções", ["Educação em saúde", "Orientação sobre medicamento", "Adesão", "Medidas não farmacológicas", "Prevenção de quedas", "Comunicação com equipe", "Encaminhamento", "Monitorização", "Outra"]),
    texto("Outra intervenção (qual?)"),
    tabela("Plano pactuado", ["Plano pactuado e objetivo", "Responsável", "Prazo e como acompanhar"], { rows: 3 }),
    paragrafo("Resposta do paciente", "Verificação da compreensão: “Para eu ter certeza de que expliquei corretamente, poderia me dizer com suas próprias palavras o que combinamos?”"),
    escolha("Compreensão do paciente", ["Compreensão adequada", "Necessitou nova explicação", "Não foi possível avaliar"]),
    escolha("Encaminhamento", NAO_SIM),
    texto("Encaminhamento: para quem, motivo e prazo"),
    marcar("Seguimento", ["Não necessário", "Retorno em dias/semanas", "Contato telefônico", "Reavaliar parâmetros", "Reavaliar farmacoterapia"]),
    texto("Retorno em (dias/semanas) e data"),
    texto("Orientações de segurança e quando procurar atendimento"),

    secao("Registro de raciocínio clínico do aluno"),
    paragrafo("Hipóteses clínicas e farmacoterapêuticas"),
    paragrafo("Informações que ainda preciso obter"),
    paragrafo("Sinais de alerta que preciso excluir"),
  ];
}

export const anamneseFarmaceuticaTemplate: NativeTemplate = {
  area: "pharmacy",
  module_type: "anamnese",
  form_type: "anamnesis",
  title: "Formulário de anamnese farmacêutica",
  description: "Roteiro para entrevista clínica e registro do cuidado farmacêutico, com tabelas de parâmetros, medicamentos e plano",
  content_json: build(),
};
