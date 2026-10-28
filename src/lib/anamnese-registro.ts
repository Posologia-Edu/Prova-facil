import type { FormField } from "@/components/forms/types";

// Pontuação do REGISTRO ESCRITO (formulário de anamnese preenchido pelo aluno-farmacêutico) na simulação realística.
// O professor só vê o registro depois que todos enviam, então ele é pontuado à parte, por rodada, e entra com 30% na nota.
// A pontuação fica no `score` (0–10) da resposta da anamnese; o detalhe por critério, em answers_json._avaliacao_registro.

export const PESO_REGISTRO = 0.3;

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

// 7 critérios, escala 0–4 (0 vale 0%, 4 vale 100%), soma 10.
export const REGISTRO_CRITERIOS: FormField[] = [
  crit(
    "rg-completude",
    "O registro contempla as informações essenciais da entrevista (queixa, histórico, farmacoterapia, hábitos, alergias)?",
    2,
    "0: registro em branco ou irrelevante. 1: contém poucos itens e faltam áreas inteiras. 2: contém o básico, com lacunas importantes. 3: contém quase tudo, faltam detalhes menores. 4: contém tudo o que a entrevista permitiu obter.",
  ),
  crit(
    "rg-fidelidade",
    "O que foi registrado corresponde ao que o paciente informou, sem omitir nem inventar dados?",
    2,
    "0: o registro contradiz o caso. 1: vários dados incorretos ou inventados. 2: alguns dados incorretos ou inventados. 3: fiel, com imprecisões pequenas. 4: fiel ao que o paciente disse, sem acréscimos.",
  ),
  crit(
    "rg-farmacoterapia",
    "A farmacoterapia foi registrada com uso prescrito e uso real de cada medicamento, destacando as discrepâncias?",
    1.5,
    "0: não registrou os medicamentos. 1: listou só os nomes. 2: registrou dose e horário de alguns. 3: registrou prescrito e real de todos. 4: além disso, destacou as discrepâncias e o que elas significam.",
    true,
  ),
  crit(
    "rg-parametros",
    "Os parâmetros aferidos e os sinais de alerta foram registrados?",
    1,
    "0: não registrou. 1: registrou valores sem interpretar. 2: registrou parte dos parâmetros ou dos sinais de alerta. 3: registrou parâmetros e sinais de alerta. 4: além disso, relacionou aos achados do caso.",
    true,
  ),
  crit(
    "rg-prm",
    "Os problemas relacionados a medicamentos (PRM) foram identificados e priorizados?",
    1.5,
    "0: nenhum PRM identificado. 1: citou PRM sem justificar. 2: identificou parte dos PRM sem priorizar. 3: identificou os principais e justificou. 4: além disso, priorizou por risco ao paciente.",
    true,
  ),
  crit(
    "rg-plano",
    "O plano de cuidado e o seguimento foram registrados?",
    1,
    "0: sem plano. 1: ações soltas, sem responsável nem prazo. 2: plano parcial, sem seguimento. 3: plano com ações e seguimento. 4: além disso, ações específicas, com responsável, prazo e critério de retorno.",
    true,
  ),
  crit(
    "rg-raciocinio",
    "O registro mostra o raciocínio clínico, com clareza, coerência e linguagem técnica adequada?",
    1,
    "0: texto incompreensível. 1: só descreve, sem raciocínio. 2: raciocínio parcial ou confuso. 3: raciocínio claro, linguagem adequada. 4: raciocínio claro e bem argumentado, objetivo e profissional.",
  ),
];

export type AvaliacaoRegistro = {
  respostas: Record<string, any>;
  comentario?: string;
  confirmado: boolean;
  confirmado_em?: string;
  origem?: "professor" | "ia";
};

/** Pontuação confirmada do registro (0–10) de uma resposta de anamnese, ou null se ainda não foi pontuado. */
export function notaDoRegistro(response: { score?: number | null; answers_json?: unknown; registro?: unknown } | null | undefined): number | null {
  if (!response) return null;
  const av = (response.registro ?? (response.answers_json as any)?._avaliacao_registro) as AvaliacaoRegistro | null | undefined;
  if (!av?.confirmado) return null;
  return response.score != null ? Number(response.score) : null;
}

/**
 * Nota da rodada: 70% da média (professor, observador) + 30% do registro. Sem a nota do registro, vale só a média
 * (marcada como parcial). Os dois primeiros são null quando o formulário não foi enviado.
 */
export function notaDaRodada(prof: number | null, obs: number | null, registro: number | null): { nota: number; comRegistro: boolean } {
  const disponiveis = [prof, obs].filter((n): n is number => n != null);
  const media = disponiveis.length > 0 ? disponiveis.reduce((a, b) => a + b, 0) / disponiveis.length : 0;
  if (registro == null) return { nota: media, comRegistro: false };
  return { nota: (1 - PESO_REGISTRO) * media + PESO_REGISTRO * registro, comRegistro: true };
}
