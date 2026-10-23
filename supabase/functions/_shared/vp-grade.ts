// Conta da nota base dos Pacientes Virtuais. Compartilhada entre a correção (servidor) e a tela
// de análise do docente (ajuste manual), para as duas chegarem sempre ao mesmo número.
//
// Sem ficha (casos legados e notas antigas): anamnese 6 dimensões (0–6) + MAI 4 dimensões (0–4).
// Com ficha (casos v2, P20): anamnese vale 4, MAI 4 e ficha 2, somando 10. O MAI mantém 40%.
//
// Módulo puro (sem imports de Deno) para poder ser testado fora do servidor.

export const ANAMNESE_KEYS = [
  "identificacao_acolhimento", "queixa_principal_hda", "historia_medicamentosa",
  "antecedentes_comorbidades", "habitos_estilo_vida", "escuta_raciocinio_clinico",
];
export const MAI_KEYS = ["mai_completude", "mai_coerencia_clinica", "mai_justificativa_critica", "mai_seguranca_paciente"];
export const FICHA_KEYS = ["ficha_completude", "ficha_fidelidade", "ficha_raciocinio"];

export const FICHA_LABELS: Record<string, string> = {
  ficha_completude: "Completude do registro",
  ficha_fidelidade: "Fidelidade à conversa",
  ficha_raciocinio: "Raciocínio e clareza",
};

/** Pontos máximos de cada bloco quando há ficha. */
export const COM_FICHA = { anamnese: 4, mai: 4, ficha: 2 } as const;

/** Pontos máximos quando há ficha e NÃO há MAI (Enfermagem e Medicina): os 4 pontos do MAI vão 2 para a anamnese e 2 para a ficha. */
export const COM_FICHA_SEM_MAI = { anamnese: 6, ficha: 4 } as const;

const round2 = (v: number) => Math.round(v * 100) / 100;
const dim = (subs: Record<string, unknown> | null | undefined, k: string) => {
  const n = Number(subs?.[k]);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
};
const sum = (subs: Record<string, unknown> | null | undefined, keys: string[]) =>
  keys.reduce((s, k) => s + dim(subs, k), 0);

/** A nota tem ficha quando as subnotas da ficha foram gravadas (mesmo que zeradas). */
export function hasFichaScores(subs: Record<string, unknown> | null | undefined): boolean {
  return !!subs && FICHA_KEYS.some((k) => k in subs);
}

/** Há MAI na nota quando as subnotas do MAI foram gravadas (zeradas ou não). Sem ficha, o MAI sempre existe. */
export function hasMaiScores(subs: Record<string, unknown> | null | undefined): boolean {
  return !hasFichaScores(subs) || MAI_KEYS.some((k) => !!subs && k in subs);
}

export function baseScores(subs: Record<string, unknown> | null | undefined) {
  const comFicha = hasFichaScores(subs);
  const comMai = hasMaiScores(subs);
  const pesos = comFicha ? (comMai ? COM_FICHA : { ...COM_FICHA_SEM_MAI, mai: 0 }) : null;
  const anamnese = sum(subs, ANAMNESE_KEYS) * (pesos ? pesos.anamnese / ANAMNESE_KEYS.length : 1);
  const mai = comMai ? sum(subs, MAI_KEYS) : 0;
  const ficha = pesos ? sum(subs, FICHA_KEYS) * (pesos.ficha / FICHA_KEYS.length) : 0;
  return {
    comFicha,
    comMai,
    anamnese: round2(anamnese),
    mai: round2(mai),
    ficha: round2(ficha),
    total: round2(anamnese + mai + ficha),
  };
}
