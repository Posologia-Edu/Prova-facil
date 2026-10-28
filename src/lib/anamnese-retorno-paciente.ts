import type { FormField } from "@/components/forms/types";
import { LABEL_OBS_PACIENTE, LABEL_SEGUIU_ROTEIRO } from "@/lib/form-templates/pharmacy-avaliacao-anamnese-v2";

// Retorno do observador ao aluno que representou o paciente (sem nota): "seguiu o roteiro?" e as observações.
// Enviado por e-mail pelo professor depois de revisar.

export type RodadaRetorno = { rodada: number; caso?: string; seguiu_roteiro?: string; observacoes?: string };
export type ItemRetorno = { email: string; nome: string; rodadas: RodadaRetorno[] };

export type EntradaRodada = {
  round_number: number;
  patient: { email?: string | null; name: string } | null;
  caso?: string;
  observerFields: FormField[];
  observerAnswers: Record<string, any> | null | undefined;
};

/** Retorno do observador de uma rodada, ou null quando ele não preencheu nenhum dos dois campos. */
export function retornoDaRodada(fields: FormField[], answers: Record<string, any> | null | undefined): { seguiu_roteiro?: string; observacoes?: string } | null {
  if (!answers) return null;
  const valor = (rotulo: string) => {
    const f = fields.find((x) => x.label === rotulo);
    const v = f ? answers[f.id] : undefined;
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  const seguiu_roteiro = valor(LABEL_SEGUIU_ROTEIRO);
  const observacoes = valor(LABEL_OBS_PACIENTE);
  return seguiu_roteiro || observacoes ? { seguiu_roteiro, observacoes } : null;
}

/** Um item por aluno-paciente (por e-mail), com as rodadas em que houve retorno. */
export function montarRetornos(rodadas: EntradaRodada[]): ItemRetorno[] {
  const porEmail = new Map<string, ItemRetorno>();
  for (const r of rodadas) {
    const email = r.patient?.email?.trim().toLowerCase();
    if (!r.patient || !email) continue;
    const retorno = retornoDaRodada(r.observerFields, r.observerAnswers);
    if (!retorno) continue;
    const item = porEmail.get(email) ?? { email, nome: r.patient.name, rodadas: [] };
    item.rodadas.push({ rodada: r.round_number, caso: r.caso, ...retorno });
    porEmail.set(email, item);
  }
  return [...porEmail.values()].map((i) => ({ ...i, rodadas: i.rodadas.sort((a, b) => a.rodada - b.rodada) }));
}
