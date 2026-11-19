// Nota final da Reconciliação v2: 80% da rubrica confirmada pelo professor + 20% da revisão cruzada que a dupla RECEBEU.
// Sem a nota do professor a nota final ainda não existe. Sem revisão recebida (o colega não revisou), vale só a rubrica:
// a dupla não perde nota porque outra dupla não fez a revisão. Mesma regra do SOAP v2.

export const PESO_RUBRICA_RECON_V2 = 0.8;

export function notaFinalReconV2(rubrica: number | null | undefined, revisaoRecebida: number | null | undefined): number | null {
  if (rubrica == null || !Number.isFinite(Number(rubrica))) return null;
  const r = Number(rubrica);
  if (revisaoRecebida == null || !Number.isFinite(Number(revisaoRecebida))) return r;
  return PESO_RUBRICA_RECON_V2 * r + (1 - PESO_RUBRICA_RECON_V2) * Number(revisaoRecebida);
}

/**
 * Anel de revisão: a dupla i revisa a dupla seguinte (na ordem dos índices, voltando ao início no fim).
 * Devolve o índice da dupla que `pair` deve revisar, ou null se não houver outra dupla.
 */
export function parARevisar(pair: number, pares: number[]): number | null {
  const lista = [...new Set(pares.filter((p) => p >= 0))].sort((a, b) => a - b);
  if (lista.length < 2 || !lista.includes(pair)) return null;
  return lista[(lista.indexOf(pair) + 1) % lista.length];
}
