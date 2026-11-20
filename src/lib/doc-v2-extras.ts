import type { AvisoDoc } from "@/lib/doc-v2";
import type { CriterioDoc } from "@/lib/doc-v2-rubrica";

// Documentos extras da Documentação v2 (fase 2). Cada documento é um ESQUEMA (campos, verificadores, critério da rubrica e item da
// revisão cruzada) lido por um componente único. Os quatro documentos do núcleo continuam como estão. Sem rede, com testes.
// Hoje: "ram" (notificação de reação adversa, VigiMed + escala de Naranjo). Os próximos entram acrescentando um esquema.

export type ExtraId = "ram";
export const EXTRAS_DISPONIVEIS: ExtraId[] = ["ram"];

export type CampoExtra =
  | { tipo: "secao"; id: string; rotulo: string }
  | { tipo: "texto" | "data"; id: string; rotulo: string; placeholder?: string }
  | { tipo: "area"; id: string; rotulo: string; placeholder?: string }
  | { tipo: "select"; id: string; rotulo: string; opcoes: { v: string; r: string }[] }
  | { tipo: "tabela"; id: string; rotulo: string; colunas: { id: string; rotulo: string }[] }
  | { tipo: "naranjo"; id: string; rotulo: string };

export type EsquemaExtra = {
  id: ExtraId;
  titulo: string;
  descricao: string;
  campos: CampoExtra[];
  criterio: CriterioDoc;
  itemRevisao: { id: string; texto: string };
  /** O que o professor escreve para o aluno ler: a ocorrência no caso que gera este documento. */
  dicaOcorrencia: string;
  verificar: (r: Record<string, any>) => Omit<AvisoDoc, "documento">[];
};

// ---------- escala de Naranjo ----------

export type RespostaNaranjo = "sim" | "nao" | "nsei";
export const NARANJO_PERGUNTAS: { id: string; texto: string; pontos: Record<RespostaNaranjo, number> }[] = [
  { id: "n1", texto: "Há relatos conclusivos anteriores desta reação?", pontos: { sim: 1, nao: 0, nsei: 0 } },
  { id: "n2", texto: "O evento apareceu depois que o medicamento suspeito foi administrado?", pontos: { sim: 2, nao: -1, nsei: 0 } },
  { id: "n3", texto: "A reação melhorou quando o medicamento foi suspenso ou um antagonista específico foi dado?", pontos: { sim: 1, nao: 0, nsei: 0 } },
  { id: "n4", texto: "A reação reapareceu quando o medicamento foi readministrado?", pontos: { sim: 2, nao: -1, nsei: 0 } },
  { id: "n5", texto: "Existem causas alternativas (além do medicamento) que poderiam, sozinhas, ter causado a reação?", pontos: { sim: -1, nao: 2, nsei: 0 } },
  { id: "n6", texto: "A reação reapareceu quando um placebo foi dado?", pontos: { sim: -1, nao: 1, nsei: 0 } },
  { id: "n7", texto: "O medicamento foi detectado no sangue (ou outros fluidos) em concentração sabidamente tóxica?", pontos: { sim: 1, nao: 0, nsei: 0 } },
  { id: "n8", texto: "A reação foi mais grave quando a dose aumentou, ou menos grave quando a dose diminuiu?", pontos: { sim: 1, nao: 0, nsei: 0 } },
  { id: "n9", texto: "O paciente já teve reação semelhante ao mesmo medicamento ou a outro parecido em exposição anterior?", pontos: { sim: 1, nao: 0, nsei: 0 } },
  { id: "n10", texto: "O evento foi confirmado por alguma evidência objetiva?", pontos: { sim: 1, nao: 0, nsei: 0 } },
];

export type CategoriaNaranjo = "definida" | "provavel" | "possivel" | "duvidosa";
export const ROTULO_NARANJO: Record<CategoriaNaranjo, string> = { definida: "Definida (9 ou mais)", provavel: "Provável (5 a 8)", possivel: "Possível (1 a 4)", duvidosa: "Duvidosa (0 ou menos)" };

/** Soma das respostas dadas e quantas das 10 perguntas foram respondidas (a pergunta sem resposta não soma). */
export function escoreNaranjo(resp: Record<string, unknown> | null | undefined): { escore: number; respondidas: number } {
  let escore = 0, respondidas = 0;
  for (const q of NARANJO_PERGUNTAS) {
    const v = resp?.[q.id];
    if (v === "sim" || v === "nao" || v === "nsei") { escore += q.pontos[v]; respondidas++; }
  }
  return { escore, respondidas };
}

export function categoriaNaranjo(escore: number): CategoriaNaranjo {
  return escore >= 9 ? "definida" : escore >= 5 ? "provavel" : escore >= 1 ? "possivel" : "duvidosa";
}

// ---------- verificação ----------

const txt = (v: unknown) => String(v ?? "").trim();
const linhasCom = (t: unknown, cols: string[]) => (Array.isArray(t) ? t : []).filter((l) => l && cols.some((c) => txt(l[c])));

function verificarRam(r: Record<string, any>): Omit<AvisoDoc, "documento">[] {
  const out: Omit<AvisoDoc, "documento">[] = [];
  const aviso = (id: string, texto: string) => out.push({ id: `ram-${id}`, nivel: "aviso", texto });

  // Privacidade: o relato usa iniciais, nunca o nome.
  const ini = txt(r.iniciais);
  if (!ini) aviso("iniciais", "Falta identificar o paciente pelas iniciais.");
  else if (ini.replace(/[^A-Za-zÀ-ÿ]/g, "").length > 4) {
    aviso("privacidade", "O paciente deve ser identificado só pelas iniciais, nunca pelo nome. Parece que o nome foi digitado.");
  }
  if (!txt(r.idade)) aviso("idade", "Falta a idade do paciente.");
  if (!txt(r.descricao)) aviso("descricao", "Descreva a reação adversa (o que aconteceu, onde, como).");
  if (!txt(r.inicio_reacao)) aviso("inicio-reacao", "Falta a data de início da reação.");
  if (!r.desfecho) aviso("desfecho", "Marque o desfecho da reação.");
  if (!r.gravidade) aviso("gravidade", "Marque se a reação foi grave ou não.");

  const suspeitos = linhasCom(r.suspeitos, ["medicamento", "dose", "inicio", "fim"]);
  if (!suspeitos.length) aviso("suspeito", "Informe ao menos um medicamento suspeito.");
  suspeitos.forEach((l: any, i: number) => {
    if (!txt(l.medicamento)) aviso(`susp-nome-${i}`, `Medicamento suspeito ${i + 1}: falta o nome.`);
    if (!txt(l.dose)) aviso(`susp-dose-${i}`, `${txt(l.medicamento) || `Medicamento suspeito ${i + 1}`}: falta dose e via.`);
    if (!txt(l.inicio)) aviso(`susp-inicio-${i}`, `${txt(l.medicamento) || `Medicamento suspeito ${i + 1}`}: falta a data de início do uso.`);
    // Causalidade temporal: o uso precisa ter começado antes da reação (datas em AAAA-MM-DD comparam como texto).
    if (txt(l.inicio) && txt(r.inicio_reacao) && txt(l.inicio) > txt(r.inicio_reacao)) {
      aviso(`temporal-${i}`, `${txt(l.medicamento) || `Medicamento suspeito ${i + 1}`}: o uso começou depois da reação. Confira as datas; um suspeito precisa ter sido usado antes.`);
    }
  });

  if (!r.acao_medicamento) aviso("acao", "Informe o que foi feito com o medicamento suspeito (suspenso, dose reduzida, mantido).");

  // Naranjo: as 10 perguntas, e o escore e a categoria que o aluno informou precisam bater com as respostas dele.
  const nar = r.naranjo && typeof r.naranjo === "object" ? r.naranjo : {};
  const { escore, respondidas } = escoreNaranjo(nar);
  if (respondidas < NARANJO_PERGUNTAS.length) aviso("naranjo-incompleto", `Naranjo: responda as 10 perguntas (faltam ${NARANJO_PERGUNTAS.length - respondidas}).`);
  else {
    if (txt(r.nar_escore) === "") aviso("naranjo-escore", "Informe o escore total de Naranjo.");
    else if (Number(txt(r.nar_escore).replace(",", ".")) !== escore) aviso("naranjo-soma", "O escore informado não bate com as suas respostas de Naranjo. Refaça a soma.");
    if (!r.nar_categoria) aviso("naranjo-categoria", "Marque a categoria de causalidade.");
    else if (txt(r.nar_escore) !== "" && r.nar_categoria !== categoriaNaranjo(Number(txt(r.nar_escore).replace(",", ".")))) {
      aviso("naranjo-categoria-incoerente", "A categoria de causalidade não corresponde ao escore informado.");
    }
  }

  if (!txt(r.notificador)) aviso("notificador", "Falta a identificação de quem notifica.");
  if (!txt(r.data_notificacao)) aviso("data-notificacao", "Falta a data da notificação.");
  else if (txt(r.inicio_reacao) && txt(r.data_notificacao) < txt(r.inicio_reacao)) aviso("data-ordem", "A data da notificação é anterior à da reação.");
  return out;
}

export const ESQUEMAS_EXTRA: Record<ExtraId, EsquemaExtra> = {
  ram: {
    id: "ram",
    titulo: "Notificação de reação adversa",
    descricao: "Relato de suspeita de reação adversa a medicamento, no modelo do VigiMed simplificado para o ensino, com a causalidade pela escala de Naranjo. Use dados fictícios do caso.",
    dicaOcorrencia: "Descreva o que aconteceu depois: o sinal ou sintoma novo, quando começou em relação ao medicamento iniciado ou alterado, o que foi feito e como evoluiu.",
    campos: [
      { tipo: "secao", id: "s-pac", rotulo: "Paciente" },
      { tipo: "texto", id: "iniciais", rotulo: "Iniciais do paciente (nunca o nome)", placeholder: "Ex.: M.S." },
      { tipo: "texto", id: "idade", rotulo: "Idade" },
      { tipo: "select", id: "sexo", rotulo: "Sexo", opcoes: [{ v: "F", r: "Feminino" }, { v: "M", r: "Masculino" }, { v: "ni", r: "Não informado" }] },
      { tipo: "secao", id: "s-rea", rotulo: "Reação adversa" },
      { tipo: "area", id: "descricao", rotulo: "Descrição da reação", placeholder: "O que aconteceu, em que ordem, com que intensidade." },
      { tipo: "data", id: "inicio_reacao", rotulo: "Início da reação" },
      { tipo: "select", id: "desfecho", rotulo: "Desfecho", opcoes: [{ v: "recuperado", r: "Recuperado" }, { v: "recuperando", r: "Em recuperação" }, { v: "nao", r: "Não recuperado" }, { v: "sequela", r: "Recuperado com sequela" }, { v: "obito", r: "Óbito" }, { v: "desconhecido", r: "Desconhecido" }] },
      { tipo: "select", id: "gravidade", rotulo: "Gravidade", opcoes: [{ v: "nao_grave", r: "Não grave" }, { v: "grave", r: "Grave (internação, risco de vida, incapacidade ou óbito)" }] },
      { tipo: "secao", id: "s-med", rotulo: "Medicamentos" },
      { tipo: "tabela", id: "suspeitos", rotulo: "Medicamento(s) suspeito(s)", colunas: [{ id: "medicamento", rotulo: "Medicamento" }, { id: "dose", rotulo: "Dose e via" }, { id: "inicio", rotulo: "Início (AAAA-MM-DD)" }, { id: "fim", rotulo: "Fim (se suspenso)" }, { id: "indicacao", rotulo: "Indicação" }] },
      { tipo: "tabela", id: "concomitantes", rotulo: "Medicamentos concomitantes", colunas: [{ id: "medicamento", rotulo: "Medicamento" }, { id: "dose", rotulo: "Dose" }, { id: "periodo", rotulo: "Período de uso" }] },
      { tipo: "select", id: "acao_medicamento", rotulo: "Ação com o medicamento suspeito", opcoes: [{ v: "suspenso", r: "Suspenso" }, { v: "reduzida", r: "Dose reduzida" }, { v: "mantida", r: "Dose mantida" }, { v: "desconhecida", r: "Desconhecida" }] },
      { tipo: "area", id: "tratamento", rotulo: "Tratamento da reação e evolução", placeholder: "O que foi feito para tratar e como o paciente evoluiu." },
      { tipo: "secao", id: "s-nar", rotulo: "Causalidade" },
      { tipo: "naranjo", id: "naranjo", rotulo: "Escala de Naranjo" },
      { tipo: "texto", id: "nar_escore", rotulo: "Escore total de Naranjo (soma das suas respostas)" },
      { tipo: "select", id: "nar_categoria", rotulo: "Categoria de causalidade", opcoes: (Object.keys(ROTULO_NARANJO) as CategoriaNaranjo[]).map((k) => ({ v: k, r: ROTULO_NARANJO[k] })) },
      { tipo: "secao", id: "s-not", rotulo: "Notificador" },
      { tipo: "texto", id: "notificador", rotulo: "Nome e profissão de quem notifica" },
      { tipo: "data", id: "data_notificacao", rotulo: "Data da notificação" },
    ],
    criterio: {
      id: "dx-ram", peso: 1,
      label: "A notificação de reação adversa é completa, protege a identidade do paciente e justifica a causalidade (Naranjo)?",
      ancoras: "0: sem notificação. 1: poucos campos, sem causalidade. 2: relato da reação sem medicamento suspeito claro, ou nome do paciente exposto. 3: completa, com Naranjo preenchido mas com erro na soma ou na categoria. 4: completa, paciente só por iniciais, datas coerentes, Naranjo correto e coerente com o caso.",
    },
    itemRevisao: { id: "rv-ram", texto: "A notificação de reação adversa identifica o paciente só por iniciais, traz o medicamento suspeito com datas coerentes e o Naranjo parece correto?" },
    verificar: verificarRam,
  },
};

export const rotuloExtra = (id: string): string => ESQUEMAS_EXTRA[id as ExtraId]?.titulo ?? id;
/** Só os ids que o sistema conhece, na ordem canônica (a sala pode ter guardado um id futuro ou inválido). */
export const extrasValidos = (ids: unknown): ExtraId[] => (Array.isArray(ids) ? EXTRAS_DISPONIVEIS.filter((e) => ids.includes(e)) : []);
