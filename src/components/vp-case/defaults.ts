import type { Encontro, Gabarito, Versao, VersaoKey } from "@/lib/vp-case-schema";

export const VERSAO_LABEL: Record<VersaoKey, string> = {
  farmaceutico: "Farmacêutico",
  enfermeiro: "Enfermeiro",
  medico: "Médico",
};

export const emptyGabarito = (): Gabarito => ({
  problemas_esperados: [],
  red_flags: [],
  informacoes_alvo: [],
  conduta_esperada: [],
  orientacoes_esperadas: [],
  encaminhamentos: [],
  objetivos_aprendizagem: [],
  referencias: [],
});

export const emptyEncontro = (numero: 1 | 2 | 3): Encontro => ({
  numero,
  tipo: numero === 1 ? "anamnese" : numero === 2 ? "discussao_prescritor" : "retorno",
  interlocutor: numero === 2 ? "prescritor" : "paciente",
  cartao: { cenario: "", tarefa: "" },
});

export const emptyVersao = (): Versao => ({
  cenario: { local: "", tratamento: "", motivo_da_vinda: "", abertura: "" },
  revelacao: [],
  gatilhos_achados: [],
  perguntas_do_paciente: [],
  fora_do_roteiro: [],
  dicas_de_atuacao: [],
  encontros: [emptyEncontro(1), emptyEncontro(2), emptyEncontro(3)],
  gabarito: emptyGabarito(),
});

/** Copia uma versão existente como ponto de partida para outra profissão (o docente adapta depois). */
export const cloneVersao = (v: Versao): Versao => JSON.parse(JSON.stringify(v));
