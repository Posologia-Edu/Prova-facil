import { ESQUEMAS_EXTRA, EXTRAS_DISPONIVEIS, type ExtraId } from "@/lib/doc-v2-extras";

// Rubrica da Documentação v2: 10 critérios, escala 0–4 (0 vale 0%, 4 vale 100%), pesos somam 10. A IA sugere, o professor confirma.
// Os dois critérios de aconselhamento dependem do paciente virtual (etapa 3): enquanto a sala não usa o paciente, ficam de fora e a
// nota é recalculada só sobre os critérios que se aplicam (sempre de 0 a 10).
// O detalhe fica na tabela PRIVADA documentation_v2_avaliacoes; o aluno só recebe a devolutiva pela função doc-v2-devolutiva.

export type CriterioDoc = {
  id: string;
  label: string;
  peso: number;
  ancoras: string;
  /** Só vale quando a sala tem o paciente virtual de aconselhamento. */
  requerPaciente?: boolean;
  allowNa?: boolean;
};

export const DOC_V2_CRITERIOS: CriterioDoc[] = [
  { id: "dv-fidelidade", peso: 1.5, label: "Os documentos são fiéis ao caso e à conciliação: nenhum dado inventado, nenhum medicamento esquecido ou trocado?",
    ancoras: "0: dados que contradizem o caso ou conciliação ignorada. 1: vários erros ou omissões de medicamento. 2: poucos erros, mas algum de dose, via ou frequência. 3: fiel, com um deslize sem risco. 4: todos os dados e medicamentos conferem com o caso e a conciliação, inclusive os suspensos." },
  { id: "dv-encaminhamento", peso: 1.5, label: "O encaminhamento é acionável: o destinatário certo, o problema priorizado, a evidência do caso e uma recomendação específica com prazo?",
    ancoras: "0: sem encaminhamento. 1: relato do caso sem pedido claro. 2: pedido genérico (“avaliar”), sem prioridade. 3: pedido específico e destinatário adequado, faltando prazo ou prioridade. 4: destinatário certo, SBAR completo, problemas priorizados com evidência e recomendação com dose ou conduta e prazo." },
  { id: "dv-intervencao", peso: 1, label: "O registro de intervenção está completo e coerente (problema, causa, intervenção, a quem se dirigiu, aceitação e desfecho)?",
    ancoras: "0: sem registro. 1: só descreve o problema. 2: problema e intervenção, sem causa ou sem a quem. 3: completo, com um campo fraco. 4: todos os campos coerentes entre si e com o encaminhamento." },
  { id: "dv-cartao", peso: 1.5, label: "O cartão de medicamentos serve ao paciente: grade de horários correta, o que mudou, o que parar e o que fazer se esquecer ou piorar?",
    ancoras: "0: sem cartão ou ilegível. 1: lista de nomes sem horários. 2: horários incompletos ou incoerentes com a frequência. 3: grade correta, faltando o que mudou, o que parar ou os alertas. 4: grade correta, mudanças e suspensões claras, dose esquecida, sinais de alerta e onde conseguir os medicamentos." },
  { id: "dv-linguagem", peso: 1, label: "Cada documento usa a linguagem do seu leitor (técnica para o prescritor, simples para o paciente)?",
    ancoras: "0: o mesmo jargão para todos. 1: cartão técnico, quase ilegível ao leigo. 2: cartão com muitos termos técnicos ou frases longas. 3: cartão simples com um termo técnico solto. 4: cartão em frases curtas e palavras do dia a dia; encaminhamento técnico e objetivo." },
  { id: "dv-plano", peso: 0.5, label: "O plano de cuidado tem metas mensuráveis, ações com responsável, o que monitorar e quando o paciente volta?",
    ancoras: "0: sem plano. 1: intenções vagas. 2: metas sem monitoramento. 3: metas e monitoramento, sem retorno. 4: metas mensuráveis, ações com responsável, monitoramento e retorno definidos." },
  { id: "dv-formais", peso: 0.5, label: "Os requisitos formais estão cumpridos (identificação do paciente e do farmacêutico, data, assinatura, campos obrigatórios)?",
    ancoras: "0: sem identificação nem data. 1: quase tudo em branco. 2: falta assinatura ou data. 3: completo, com um campo menor em branco. 4: identificação, data e assinatura completas em todos os documentos." },
  { id: "dv-aconselhamento", peso: 1, requerPaciente: true, label: "No aconselhamento, abriu a conversa, descobriu as barreiras do paciente e adaptou a explicação?",
    ancoras: "0: despejou informação sem ouvir. 1: poucas perguntas, ignorou as barreiras. 2: perguntou, mas explicou igual para todos. 3: descobriu a maioria das barreiras e adaptou. 4: abriu bem, descobriu as barreiras escondidas e adaptou cada explicação." },
  { id: "dv-teachback", peso: 1, requerPaciente: true, label: "Verificou a compreensão (teach-back) e o paciente demonstrou entender o essencial?",
    ancoras: "0: não verificou. 1: perguntou “entendeu?”. 2: pediu para repetir só uma mensagem. 3: pediu para repetir as principais e corrigiu. 4: teach-back das mensagens-chave, corrigiu o que faltou e o paciente repetiu certo." },
  { id: "dv-coerencia", peso: 0.5, label: "As peças são coerentes entre si (o que o encaminhamento pede aparece no cartão, no registro e no plano)?",
    ancoras: "0: contradições entre as peças. 1: várias divergências. 2: uma divergência relevante. 3: coerentes, com uma lacuna menor. 4: totalmente coerentes: a mesma mudança aparece em todas as peças." },
];

export const SOMA_PESOS_DOC_V2 = DOC_V2_CRITERIOS.reduce((s, c) => s + c.peso, 0);

/** Os critérios que se aplicam à sala: os do núcleo (menos os de paciente, se a sala não o usa) mais um por documento extra ativo. */
export const criteriosAplicaveis = (usaPaciente: boolean, extras: ExtraId[] = []): CriterioDoc[] => [
  ...DOC_V2_CRITERIOS.filter((c) => usaPaciente || !c.requerPaciente),
  ...extras.map((id) => ESQUEMAS_EXTRA[id].criterio),
];

/** Todos os critérios que existem (núcleo e extras), para achar o texto de um critério pelo id. */
export const todosCriterios = (): CriterioDoc[] => [...DOC_V2_CRITERIOS, ...EXTRAS_DISPONIVEIS.map((id) => ESQUEMAS_EXTRA[id].criterio)];

/** Nota da rubrica de 0 a 10: soma ponderada dos critérios que se aplicam (nota "n/a" e critérios de fora saem do cálculo). */
export function notaRubricaDoc(respostas: Record<string, number | string | null | undefined>, usaPaciente: boolean, extras: ExtraId[] = []): number {
  let ganho = 0, maximo = 0;
  for (const c of criteriosAplicaveis(usaPaciente, extras)) {
    const v = respostas?.[c.id];
    if (v === undefined || v === null || v === "__na__") continue;
    const n = Math.max(0, Math.min(4, Number(v)));
    if (Number.isNaN(n)) continue;
    maximo += c.peso;
    ganho += (c.peso * n) / 4;
  }
  return maximo > 0 ? Math.round((ganho / maximo) * 10 * 100) / 100 : 0;
}

export type AvaliacaoDoc = {
  respostas: Record<string, number | string>;
  justificativas?: Record<string, string>;
  comentario?: string;
  /** Erros que podem causar dano ao paciente se o documento fosse usado como está. */
  alertas?: string[];
  gerado_em?: string;
  confirmado: boolean;
  confirmado_em?: string;
  origem?: "professor" | "ia";
};

export type DevolutivaDoc = {
  liberada: boolean;
  nota?: number | null;
  /** Revisão cruzada recebida (0 a 10) e a nota final 80/20. */
  revisao_nota?: number | null;
  revisao_comentario?: string;
  nota_final?: number | null;
  criterios?: Record<string, number | string>;
  justificativas?: Record<string, string>;
  comentario?: string;
  alertas?: string[];
};
