// Nota final da Documentação v2: 80% da rubrica confirmada pelo professor + 20% da revisão cruzada que a dupla RECEBEU.
// Sem a nota do professor a nota final ainda não existe. Sem revisão recebida (o colega não revisou), vale só a rubrica:
// a dupla não perde nota porque outra dupla não fez a revisão. Mesma regra do SOAP v2 e da Reconciliação v2.

export const PESO_RUBRICA_DOC_V2 = 0.8;

export function notaFinalDocV2(rubrica: number | null | undefined, revisaoRecebida: number | null | undefined): number | null {
  if (rubrica == null || !Number.isFinite(Number(rubrica))) return null;
  const r = Number(rubrica);
  if (revisaoRecebida == null || !Number.isFinite(Number(revisaoRecebida))) return r;
  return PESO_RUBRICA_DOC_V2 * r + (1 - PESO_RUBRICA_DOC_V2) * Number(revisaoRecebida);
}

/** Anel de revisão: a dupla i revisa a dupla seguinte. Mesma regra das funções (que não importam de src/). */
export function parARevisar(pair: number, pares: number[]): number | null {
  const lista = [...new Set(pares.filter((p) => p >= 0))].sort((a, b) => a - b);
  if (lista.length < 2 || !lista.includes(pair)) return null;
  return lista[(lista.indexOf(pair) + 1) % lista.length];
}

// ---------- checklist da revisão cruzada ----------

export type RespostaRevisao = "sim" | "parcial" | "nao";
export const ITENS_REVISAO: { id: string; texto: string }[] = [
  { id: "rv-destino", texto: "O encaminhamento diz a quem se dirige, a prioridade e o que pede, com prazo?" },
  { id: "rv-sbar", texto: "O SBAR traz dado do caso, o risco e uma recomendação específica?" },
  { id: "rv-cobertura", texto: "O cartão traz todos os medicamentos da conciliação, inclusive o que o paciente deve parar?" },
  { id: "rv-grade", texto: "Os horários da grade batem com a frequência de cada medicamento?" },
  { id: "rv-linguagem", texto: "O cartão está em linguagem que o paciente entende (frases curtas, sem jargão)?" },
  { id: "rv-alertas", texto: "Há o que fazer se esquecer uma dose e quando procurar atendimento?" },
  { id: "rv-coerencia", texto: "O registro de intervenção e o plano combinam com o encaminhamento e o cartão?" },
  { id: "rv-usaria", texto: "Você entregaria estes documentos ao paciente sem mudar nada?" },
];
export type RevisaoDoc = { respostas: Record<string, RespostaRevisao>; comentario: string };

export function revisaoCompleta(r: RevisaoDoc | null | undefined): boolean {
  return !!r && ITENS_REVISAO.every((i) => ["sim", "parcial", "nao"].includes(r.respostas?.[i.id] as string));
}

/** Nota de 0 a 10 que a revisão representa para a dupla revisada: sim vale 1, em parte 0,5, não 0. */
export function notaRevisao(respostas: Record<string, unknown> | null | undefined): number | null {
  if (!respostas) return null;
  let soma = 0;
  for (const i of ITENS_REVISAO) {
    const v = respostas[i.id];
    if (v === "sim") soma += 1;
    else if (v === "parcial") soma += 0.5;
    else if (v !== "nao") return null;
  }
  return Math.round((soma / ITENS_REVISAO.length) * 10 * 100) / 100;
}
