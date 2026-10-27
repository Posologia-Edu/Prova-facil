// Roteiro do paciente padronizado: a parte do caso de Paciente Virtual (v2) que um colega precisa para representar o paciente
// na simulação realística. Só leva o que é do paciente: gabarito, penalidades, rubrica e a observação clínica dos
// medicamentos ("não diga ao aluno") nunca entram. O roteiro é uma CÓPIA congelada, guardada no caso da simulação.
import type { NivelRevelacao, VersaoKey, VpCaseData } from "@/lib/vp-case-schema";
import { NIVEIS } from "@/lib/vp-case-schema";

export const ROTEIRO_VERSION = 1;

export type RoteiroAchadoTipo = "documento" | "parametro_clinico" | "sinal_vital" | "exame_fisico" | "exame";

export interface PatientRoteiro {
  versao: typeof ROTEIRO_VERSION;
  identidade: {
    nome: string;
    idade: number;
    sexo: string;
    ocupacao: string;
    estado_civil?: string;
    moradia?: string;
    escolaridade?: string;
    alergias?: string;
    habitos?: string;
    historico_familiar?: string;
  };
  temperamento: string;
  modo_de_falar: string;
  letramento_saude: string;
  local: string;
  motivo_da_vinda: string;
  abertura: string;
  tratamento: string;
  fatos: Array<{ id: string; categoria: string; conteudo: string; nivel: NivelRevelacao; quando: string; fala: string }>;
  medicamentos: Array<{ como_chama: string; prescrito: string; uso_real: string; acha_que_serve: string }>;
  achados: Array<{ tipo: RoteiroAchadoTipo; titulo: string; conteudo: string; quando: string }>;
  como_se_sente: string;
  perguntas_do_paciente: string[];
  fora_do_roteiro: string[];
  dicas_de_atuacao: string[];
}

export const NIVEL_SELO: Record<NivelRevelacao, string> = {
  espontanea: "Fala espontaneamente",
  pergunta_aberta: "Revela em pergunta aberta",
  direta: "Só se perguntado diretamente",
  vinculo: "Só com empatia e vínculo",
};

export const ACHADO_TIPO_LABEL: Record<RoteiroAchadoTipo, string> = {
  documento: "Documento",
  parametro_clinico: "Parâmetro clínico",
  sinal_vital: "Sinal vital",
  exame_fisico: "Exame físico",
  exame: "Exame já realizado",
};

export function isPatientRoteiro(x: unknown): x is PatientRoteiro {
  const r = x as any;
  return !!r && r.versao === ROTEIRO_VERSION && !!r.identidade && Array.isArray(r.fatos);
}

/** Monta o roteiro a partir de uma versão do caso. Devolve null se a versão não existir. */
export function buildPatientRoteiro(d: VpCaseData, key: VersaoKey = "farmaceutico"): PatientRoteiro | null {
  const v = d.versoes?.[key];
  if (!v) return null;
  const n = d.nucleo;
  const id = n.identidade;

  const ordem = (nivel: NivelRevelacao) => NIVEIS.indexOf(nivel);
  const fatos = (v.revelacao || [])
    .map((r, i) => ({ r, i, fato: n.fatos.find((f) => f.id === r.id) }))
    .filter((x) => x.fato)
    .sort((a, b) => ordem(a.r.nivel) - ordem(b.r.nivel) || a.i - b.i)
    .map(({ r, fato }) => ({
      id: r.id,
      categoria: fato!.categoria,
      conteudo: fato!.conteudo,
      nivel: r.nivel,
      quando: r.quando,
      fala: r.fala,
    }));

  const achadosGatilho = (v.gatilhos_achados || [])
    .map((g) => {
      const a = n.achados.find((x) => x.id === g.achado);
      return a ? { tipo: a.tipo as RoteiroAchadoTipo, titulo: a.titulo, conteudo: a.conteudo, quando: g.quando } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
  const exames = (n.exames || []).map((e) => ({
    tipo: "exame" as RoteiroAchadoTipo,
    titulo: e.nome,
    conteudo: `${e.resultado}${e.referencia ? ` (referência: ${e.referencia})` : ""}`,
    quando: "Quando o farmacêutico perguntar por esse exame ou pedir para ver os resultados.",
  }));

  return {
    versao: ROTEIRO_VERSION,
    identidade: {
      nome: id.nome,
      idade: id.idade,
      sexo: id.sexo,
      ocupacao: id.ocupacao,
      estado_civil: id.estado_civil,
      moradia: id.moradia,
      escolaridade: id.escolaridade,
      alergias: id.alergias,
      habitos: id.habitos,
      historico_familiar: id.historico_familiar,
    },
    temperamento: n.temperamento,
    modo_de_falar: n.modo_de_falar,
    letramento_saude: n.letramento_saude,
    local: v.cenario.local,
    motivo_da_vinda: v.cenario.motivo_da_vinda,
    abertura: v.cenario.abertura,
    tratamento: v.cenario.tratamento,
    fatos,
    medicamentos: (n.medicamentos || []).map((m) => ({
      como_chama: m.como_chama,
      prescrito: m.prescrito,
      uso_real: m.uso_real,
      acha_que_serve: m.acha_que_serve,
    })),
    achados: [...achadosGatilho, ...exames],
    como_se_sente: n.como_se_sente,
    perguntas_do_paciente: v.perguntas_do_paciente || [],
    fora_do_roteiro: v.fora_do_roteiro || [],
    dicas_de_atuacao: v.dicas_de_atuacao || [],
  };
}

export function roteiroTitle(r: PatientRoteiro): string {
  return `${r.identidade.nome}, ${r.identidade.idade} anos`;
}

/** Versão em texto simples (reserva): é o que leitores antigos do caso (banco de casos, listas) enxergam. */
export function roteiroToText(r: PatientRoteiro): string {
  const id = r.identidade;
  const bloco = (titulo: string, linhas: Array<string | null | undefined>) =>
    [`${titulo}:`, ...linhas.filter((l): l is string => !!l), ""].join("\n");
  return [
    bloco("QUEM VOCÊ É", [
      `${id.nome}, ${id.idade} anos, ${id.sexo}, ${id.ocupacao}.`,
      [id.estado_civil, id.moradia, id.escolaridade ? `Escolaridade: ${id.escolaridade}` : null].filter(Boolean).join(". "),
      id.alergias ? `Alergias: ${id.alergias}.` : null,
      id.habitos ? `Hábitos: ${id.habitos}.` : null,
      id.historico_familiar ? `Histórico familiar: ${id.historico_familiar}.` : null,
      `Temperamento: ${r.temperamento}`,
      `Modo de falar: ${r.modo_de_falar}`,
      `Letramento em saúde: ${r.letramento_saude}`,
    ]),
    bloco("POR QUE VOCÊ VEIO", [`Local: ${r.local}.`, r.motivo_da_vinda, `Fala sugerida de abertura: "${r.abertura}"`]),
    bloco("O QUE VOCÊ SABE (E QUANDO CONTAR)", r.fatos.map((f) => `- [${NIVEL_SELO[f.nivel]}] ${f.conteudo} Quando: ${f.quando} Fala: "${f.fala}"`)),
    bloco("SEUS MEDICAMENTOS", r.medicamentos.map((m) => `- ${m.como_chama} | Prescrito: ${m.prescrito} | Como realmente usa: ${m.uso_real} | Para que acha que serve: ${m.acha_que_serve}`)),
    r.achados.length ? bloco("CARTÕES DE ACHADOS (SÓ INFORME QUANDO PEDIREM)", r.achados.map((a) => `- ${ACHADO_TIPO_LABEL[a.tipo]}: ${a.titulo}: ${a.conteudo}. Quando: ${a.quando}`)) : "",
    bloco("COMO VOCÊ SE SENTE", [r.como_se_sente, ...r.perguntas_do_paciente.map((p) => `- ${p}`)]),
    r.fora_do_roteiro.length ? bloco("SE PERGUNTAREM ALGO FORA DO ROTEIRO", r.fora_do_roteiro.map((p) => `- ${p}`)) : "",
    r.dicas_de_atuacao.length ? bloco("DICAS DE ATUAÇÃO", r.dicas_de_atuacao.map((p) => `- ${p}`)) : "",
  ].filter(Boolean).join("\n");
}
