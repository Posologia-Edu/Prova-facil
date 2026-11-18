import type { FormField } from "@/components/forms/types";

// Rubrica da Reconciliação v2: 10 critérios, escala 0–4 (0 vale 0%, 4 vale 100%), soma 10. A IA sugere, o professor confirma.
// A nota confirmada fica em reconciliation_responses.admin_score; o detalhe (matriz de discrepâncias, justificativas...) fica na
// tabela PRIVADA reconciliation_v2_avaliacoes, que o navegador do aluno não lê. O aluno só recebe a devolutiva pela função
// recon-v2-devolutiva, depois que o professor confirma e libera.

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

export const RECON_V2_CRITERIOS: FormField[] = [
  crit(
    "rv-bpmh-completa",
    "A BPMH é completa: todos os medicamentos em uso, inclusive sem receita, fitoterápicos, chás e uso não oral?",
    1.5,
    "0: BPMH em branco ou com poucos itens. 1: menos da metade dos medicamentos do caso. 2: cerca de metade, ou todos os prescritos mas nenhum sem receita. 3: quase todos, faltando um item secundário. 4: todos os medicamentos que o dossiê permitia identificar, inclusive os sem receita.",
  ),
  crit(
    "rv-bpmh-fiel",
    "A BPMH é fiel: registra o uso real (não só o prescrito), cruza as fontes e sinaliza os conflitos entre elas?",
    1,
    "0: copia a receita sem checar o uso. 1: uso real em poucos itens. 2: uso real em parte, sem citar conflito entre fontes. 3: uso real em quase todos, com as fontes que confirmam. 4: uso real correto, fontes cruzadas e conflitos explicitados (ex.: relato x retiradas).",
  ),
  crit(
    "rv-disc-ident",
    "Identificou as discrepâncias do caso, sem inventar discrepância que não existe?",
    2,
    "0: nenhuma discrepância identificada. 1: só uma ou duas, de baixo risco. 2: cerca de metade, ou todas mas com várias inventadas. 3: quase todas, faltando uma de baixo risco. 4: todas as discrepâncias do caso e nenhuma inventada.",
  ),
  crit(
    "rv-disc-classif",
    "Classificou cada discrepância (conduta da prescrição, intencionalidade e documentação)?",
    1,
    "0: sem classificação. 1: poucas classificadas, a maioria errada. 2: metade correta. 3: quase todas corretas. 4: todas corretas, inclusive a diferença entre intencional documentada e sem documentação.",
  ),
  crit(
    "rv-dano",
    "Avaliou o potencial de dano de cada discrepância e priorizou o que é mais grave?",
    1,
    "0: sem avaliação de dano. 1: dano genérico, sem relação com o paciente. 2: dano avaliado em parte, sem priorizar. 3: dano coerente, com priorização parcial. 4: dano coerente com o caso (função renal, idade, alergia) e as graves vêm primeiro.",
  ),
  crit(
    "rv-seguranca",
    "Viu os problemas de segurança além da lista de medicamentos (duplicidade, interação, função renal ou hepática, alergia, idoso, alta vigilância)?",
    1,
    "0: nenhum. 1: um problema secundário. 2: parte dos problemas de segurança do caso. 3: os principais. 4: todos os que o dossiê permitia ver, com o medicamento envolvido e a conduta.",
  ),
  crit(
    "rv-condutas",
    "Propôs condutas específicas e adequadas para cada discrepância (o que fazer, com qual medicamento e dose quando for o caso)?",
    1,
    "0: sem conduta. 1: condutas genéricas (“avaliar”). 2: conduta específica para parte das discrepâncias. 3: específica para quase todas. 4: específica e correta para todas, com dose ou alternativa quando necessário.",
  ),
  crit(
    "rv-sbar",
    "Comunicou ao prescritor com clareza (SBAR): situação, dado do caso, risco e recomendação?",
    0.5,
    "0: sem SBAR. 1: partes em branco ou sem recomendação. 2: completo, mas genérico. 3: claro, com dados do caso. 4: claro, com dados do caso, risco e recomendação com dose e prazo, priorizando o mais grave.",
  ),
  crit(
    "rv-pendencias",
    "Listou as pendências e escolheu a fonte certa para confirmar cada uma?",
    0.5,
    "0: sem pendências, mesmo havendo conflito no dossiê. 1: pendências sem dizer com quem confirmar. 2: pendências com a fonte em parte. 3: pendências adequadas, com fonte. 4: todas as dúvidas reais do caso, cada uma com a fonte certa.",
  ),
  crit(
    "rv-lista-final",
    "Entregou a lista final e a orientação ao paciente em linguagem simples (o que mudou e como tomar)?",
    0.5,
    "0: em branco, quando era alta. 1: lista técnica, sem orientação. 2: lista com orientação incompleta. 3: lista clara, faltando o que mudou. 4: lista clara, em linguagem simples, com o que mudou e como tomar. Marque “não se aplica” em admissão e transferência.",
    true,
  ),
];

/** Soma dos pesos (deve ser 10). */
export const SOMA_PESOS_RECON_V2 = RECON_V2_CRITERIOS.reduce((s, c) => s + (c.max_score || 0), 0);

export type Tri = "sim" | "parcial" | "nao";
export type LinhaMatriz = {
  id: string;
  medicamento: string;
  tipo: string;
  risco: string;
  critica: boolean;
  descricao: string;
  acao_esperada: string;
  /** Títulos das fontes em que a discrepância podia ser descoberta. */
  fontes: string[];
  /** A dupla abriu alguma dessas fontes? */
  fonte_aberta: boolean;
  achou: Tri;
  classificou: Tri | "na";
  risco_avaliado: Tri | "na";
  acao: Tri | "na";
  comentario: string;
};
export type LinhaBpmh = { medicamento: string; achou: Tri; comentario: string };

export type AvaliacaoReconV2 = {
  respostas: Record<string, any>;
  justificativas?: Record<string, string>;
  comentario?: string;
  matriz?: LinhaMatriz[];
  bpmh?: LinhaBpmh[];
  inventadas?: string[];
  seguranca?: { problema: string; identificado: Tri }[];
  /** Conferência feita em código, sem IA. */
  codigo?: { prescricao_sem_linha: string[]; bpmh_sem_linha: string[]; fontes_abertas: number; fontes_total: number };
  caso_id?: string;
  caso_titulo?: string;
  gerado_em?: string;
  confirmado: boolean;
  confirmado_em?: string;
  origem?: "professor" | "ia";
};

/** Discrepâncias críticas que a dupla não identificou, ou cuja ação ficou parcial ou ausente. */
export function criticasEmRisco(m: LinhaMatriz[] | undefined): LinhaMatriz[] {
  return (m || []).filter((l) => l.critica && (l.achou !== "sim" || l.acao === "nao" || l.acao === "parcial"));
}

/** Devolutiva que o aluno recebe (sem a auditoria do código nem os alertas internos). */
export type DevolutivaReconV2 = {
  liberada: boolean;
  nota?: number | null;
  criterios?: Record<string, any>;
  justificativas?: Record<string, string>;
  comentario?: string;
  matriz?: LinhaMatriz[];
  bpmh?: LinhaBpmh[];
  confirmado_em?: string | null;
};
