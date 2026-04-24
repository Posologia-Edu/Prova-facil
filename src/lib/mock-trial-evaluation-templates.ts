import type { FormField } from "@/components/forms/types";

/**
 * Templates de critérios de avaliação para Júri Simulado.
 * Cada critério é uma escala 0-10. A nota total é a média dos critérios.
 */

const scaleField = (id: string, label: string, description?: string): FormField => ({
  id,
  type: "scale" as any,
  label,
  description,
  required: true,
  min: 0,
  max: 10,
} as any);

export const JUDGE_EVALUATION_TEMPLATE: { title: string; fields: FormField[] } = {
  title: "Avaliação do Juiz - Postura processual",
  fields: [
    scaleField("rito", "Respeito ao rito processual", "A equipe seguiu a ordem das falas, tempos e regras do júri?"),
    scaleField("clareza", "Clareza e objetividade da argumentação", "A fala foi compreensível e direta ao ponto?"),
    scaleField("postura", "Postura e conduta da equipe", "Demonstrou respeito ao tribunal, aos adversários e às testemunhas?"),
    scaleField("testemunhas", "Uso pertinente de testemunhas", "Acionou testemunhas no momento correto e com objetivo definido?"),
    scaleField("tempo", "Cumprimento do tempo", "Soube administrar o tempo da defesa/acusação sem extrapolar?"),
    {
      id: "comments",
      type: "long_text" as any,
      label: "Observações do Juiz (opcional)",
      required: false,
    } as any,
  ],
};

export const TEACHER_EVALUATION_TEMPLATE: { title: string; fields: FormField[] } = {
  title: "Avaliação do Professor - Critérios técnicos",
  fields: [
    scaleField("dominio_caso", "Domínio do caso clínico", "Demonstrou conhecer o prontuário, exames e linha do tempo?"),
    scaleField("evidencia", "Uso de evidências científicas e diretrizes", "Citou guidelines, protocolos ou literatura pertinente?"),
    scaleField("raciocinio", "Raciocínio clínico", "A linha argumentativa é clinicamente coerente?"),
    scaleField("argumentacao", "Qualidade da argumentação técnica", "Os argumentos são fortes, encadeados e bem fundamentados?"),
    scaleField("refutacao", "Refutação dos argumentos contrários", "Conseguiu rebater pontos da equipe adversária?"),
    scaleField("comunicacao", "Comunicação verbal", "Clareza, dicção, tom e capacidade de convencer?"),
    scaleField("trabalho_equipe", "Trabalho em equipe", "Distribuição de papéis, apoio mútuo e sincronia?"),
    scaleField("coerencia", "Coerência com o processo", "As alegações batem com as evidências apresentadas no processo?"),
    {
      id: "comments",
      type: "long_text" as any,
      label: "Observações do Professor (opcional)",
      required: false,
    } as any,
  ],
};

/**
 * Calcula nota média (0-10) a partir das respostas de critérios escalares.
 */
export function computeScoreFromCriteria(
  fields: FormField[],
  answers: Record<string, any>
): { score: number; criteria: Record<string, number> } {
  const criteria: Record<string, number> = {};
  let sum = 0;
  let count = 0;
  for (const f of fields) {
    if ((f as any).type === "scale") {
      const v = Number(answers?.[f.id]);
      if (!isNaN(v)) {
        criteria[f.id] = v;
        sum += v;
        count += 1;
      }
    }
  }
  return { score: count > 0 ? Number((sum / count).toFixed(2)) : 0, criteria };
}
