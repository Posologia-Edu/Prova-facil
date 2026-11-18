import type { FormField } from "@/components/forms/types";

// Rubrica do SOAP v2: 10 critérios, escala 0–4 (0 vale 0%, 4 vale 100%), soma 10. A IA sugere, o professor confirma.
// A nota confirmada fica em soap_responses.admin_score; o detalhe (justificativas, auditoria, iceberg...) fica na tabela
// PRIVADA soap_v2_avaliacoes (coluna dados), que o navegador do aluno não lê. O aluno só recebe a devolutiva pela função
// soap-v2-devolutiva, depois que o professor libera.

/** Peso da rubrica confirmada na nota final do SOAP v2; o restante (20%) é a revisão por pares. */
export const PESO_RUBRICA_V2 = 0.8;

const crit = (id: string, label: string, peso: number, ancoras: string, allowNa = false): FormField => ({
  id,
  label,
  type: "scale",
  scale_max: 4,
  scale_min_label: "0",
  scale_max_label: "4",
  max_score: peso,
  correct_answer: "4",
  required: false,
  description: ancoras,
  ...(allowNa ? { allow_na: true } : {}),
});

export const SOAP_V2_CRITERIOS: FormField[] = [
  crit(
    "sv-s-relato",
    "O subjetivo traz o relato do paciente com as palavras dele, fiel ao registro, sem interpretação?",
    1,
    "0: em branco ou contradiz o registro. 1: mistura interpretação e dados medidos. 2: relata, mas sem as palavras do paciente ou com lacunas. 3: fiel ao registro, com pequenas interpretações. 4: fiel, nas palavras do paciente e sem interpretação.",
  ),
  crit(
    "sv-o-dados",
    "Os dados objetivos são rastreáveis (valor, unidade, condição da medida, fonte) e a farmacoterapia mostra uso prescrito e uso real?",
    1.5,
    "0: sem dados objetivos. 1: lista medicamentos ou valores sem detalhe. 2: valores sem condição da medida ou sem uso real. 3: dados completos para quase todos os itens. 4: todos rastreáveis, com prescrito x real e a discrepância explicada.",
  ),
  crit(
    "sv-alerta",
    "Reconheceu os sinais de alerta do caso e registrou a conduta de segurança?",
    1,
    "0: não considerou sinais de alerta. 1: citou sem relacionar ao caso. 2: reconheceu parte dos sinais, sem conduta. 3: reconheceu os principais e indicou conduta. 4: reconheceu todos, com conduta e prazo adequados. Marque “não se aplica” se o caso não tem sinais de alerta.",
    true,
  ),
  crit(
    "sv-a-problemas",
    "Identificou os problemas principais do caso, dentro do que o registro permitia?",
    1.5,
    "0: nenhum problema relevante. 1: um problema secundário. 2: parte dos problemas principais. 3: os principais, faltando algum menor. 4: todos os principais que o registro permitia identificar.",
  ),
  crit(
    "sv-a-classificacao",
    "Classificou corretamente cada problema (necessidade, efetividade, segurança, adesão, acesso)?",
    0.5,
    "0: sem categoria. 1: poucas categorias, quase todas incorretas. 2: metade correta. 3: quase todas corretas. 4: todas corretas.",
  ),
  crit(
    "sv-a-fio",
    "Cada problema se apoia em evidências do S e do O, sem achismo?",
    1.5,
    "0: problemas sem evidência. 1: evidências genéricas ou que não sustentam o problema. 2: parte dos problemas com evidência. 3: quase todos com evidência do registro. 4: todos ligados a evidências específicas do S e do O.",
  ),
  crit(
    "sv-a-prioridade",
    "Priorizou os problemas por risco ao paciente?",
    0.5,
    "0: sem prioridade. 1: prioridade sem critério. 2: ordem parcialmente coerente. 3: coerente com o risco. 4: coerente com o risco e justificada.",
  ),
  crit(
    "sv-p-plano",
    "O plano tem ação específica, meta mensurável, responsável e prazo, e é viável para a realidade do paciente?",
    1.5,
    "0: sem plano. 1: ações soltas, sem ligação com os problemas. 2: ação para parte dos problemas, sem meta ou prazo. 3: ação para quase todos, com meta ou prazo. 4: ação para todos, com meta mensurável, responsável, prazo e viável para o paciente.",
  ),
  crit(
    "sv-p-seguimento",
    "Há seguimento, orientação em linguagem simples e comunicação ou encaminhamento quando necessário?",
    0.5,
    "0: nenhum. 1: só uma orientação genérica. 2: orientação ou retorno, sem confirmar a compreensão. 3: orientação e retorno definidos. 4: orientação em linguagem simples, verificação da compreensão, retorno e encaminhamento quando necessário. Marque “não se aplica” se o caso não pede comunicação ou encaminhamento.",
    true,
  ),
  crit(
    "sv-redacao",
    "A redação é concisa, usa terminologia correta e as partes são coerentes entre si?",
    0.5,
    "0: incompreensível. 1: confusa ou com muitos erros. 2: compreensível, com contradições entre as partes. 3: clara, com pequenos deslizes. 4: clara, concisa, tecnicamente correta e sem contradições.",
  ),
];

export type AuditoriaSoap = {
  inventados: string[];
  nao_coletados: string[];
  contradicoes: string[];
};
export type IcebergItem = { fato: string; nivel?: string; impacto: string };
export type CoberturaItem = { problema: string; identificado: "sim" | "parcial" | "nao"; motivo: string };
export type CalibracaoItem = { problema: string; confianca_aluno: string; avaliacao: string; comentario: string };

export type AvaliacaoSoapV2 = {
  respostas: Record<string, any>;
  justificativas?: Record<string, string>;
  comentario?: string;
  auditoria?: AuditoriaSoap;
  iceberg?: IcebergItem[];
  cobertura?: CoberturaItem[];
  calibracao?: CalibracaoItem[];
  gabarito_origem?: "paciente_virtual" | "deduzido" | "nenhum";
  roteiro_encontrado?: boolean;
  registro_encontrado?: boolean;
  gerado_em?: string;
  confirmado: boolean;
  confirmado_em?: string;
  origem?: "professor" | "ia";
};

/** A resposta é de um SOAP v2? (os ids dos campos começam com "s2-") */
export function respostaEhSoapV2(answers: unknown): boolean {
  return !!answers && typeof answers === "object" && Object.keys(answers as object).some((k) => k.startsWith("s2-"));
}

/** Devolutiva que o aluno recebe (sem auditoria, cobertura nem gabarito). */
export type DevolutivaSoapV2 = {
  liberada: boolean;
  nota?: number | null;
  criterios?: Record<string, any>;
  justificativas?: Record<string, string>;
  comentario?: string;
  iceberg?: IcebergItem[];
  calibracao?: CalibracaoItem[];
  confirmado_em?: string | null;
};
