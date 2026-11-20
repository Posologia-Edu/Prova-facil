import type { AvisoDoc } from "@/lib/doc-v2";
import type { CriterioDoc } from "@/lib/doc-v2-rubrica";

// Documentos extras da Documentação v2 (fase 2). Cada documento é um ESQUEMA (campos, verificadores, critério da rubrica e item da
// revisão cruzada) lido por um componente único. Os quatro documentos do núcleo continuam como estão. Sem rede, com testes.
// Hoje: "ram" (notificação de reação adversa, VigiMed + escala de Naranjo) e "incidente" (notificação de incidente de segurança, NSP/Notivisa). Os próximos entram acrescentando um esquema.

export type ExtraId = "ram" | "incidente";
export const EXTRAS_DISPONIVEIS: ExtraId[] = ["ram", "incidente"];

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
const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
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


// ---------- incidente de segurança (NSP / Notivisa) ----------

export type TipoIncidente = "circunstancia" | "quase_erro" | "sem_dano" | "evento_adverso";
export const ROTULO_TIPO_INCIDENTE: Record<TipoIncidente, string> = {
  circunstancia: "Circunstância notificável (situação com potencial de dano, sem incidente)",
  quase_erro: "Quase-erro (interceptado antes de chegar ao paciente)",
  sem_dano: "Incidente sem dano (chegou ao paciente, sem dano)",
  evento_adverso: "Evento adverso (incidente com dano)",
};
export type GrauDano = "nenhum" | "leve" | "moderado" | "grave" | "obito";
export const ROTULO_DANO: Record<GrauDano, string> = { nenhum: "Nenhum", leve: "Leve", moderado: "Moderado", grave: "Grave", obito: "Óbito" };

/** Palavras que atribuem culpa a uma pessoa. A notificação descreve fatos e fatores do sistema, não julga. */
export const TERMOS_ACUSATORIOS = ["negligência", "negligente", "incompetência", "incompetente", "culpa", "culpado", "descuido", "descuidado", "irresponsável", "irresponsabilidade", "imprudência", "imperícia", "desleixo"];
export const termosAcusatoriosEncontrados = (texto: string): string[] => {
  const t = norm(texto);
  return TERMOS_ACUSATORIOS.filter((x) => new RegExp("\\b" + norm(x) + "\\b").test(t));
};

/** Dias inteiros entre duas datas AAAA-MM-DD; null se alguma for inválida. */
export function diasEntre(inicio: string, fim: string): number | null {
  const a = Date.parse(inicio + "T00:00:00Z"), b = Date.parse(fim + "T00:00:00Z");
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) / 86400000) : null;
}

function verificarIncidente(r: Record<string, any>): Omit<AvisoDoc, "documento">[] {
  const out: Omit<AvisoDoc, "documento">[] = [];
  const aviso = (id: string, texto: string) => out.push({ id: `inc-${id}`, nivel: "aviso", texto });

  const ini = txt(r.iniciais);
  if (!ini) aviso("iniciais", "Falta identificar o paciente pelas iniciais.");
  else if (ini.replace(/[^A-Za-zÀ-ÿ]/g, "").length > 4) aviso("privacidade", "O paciente deve ser identificado só pelas iniciais, nunca pelo nome. Parece que o nome foi digitado.");
  if (!txt(r.data_incidente)) aviso("data", "Falta a data do incidente.");
  if (!txt(r.local)) aviso("local", "Falta o local ou setor onde ocorreu.");
  if (!txt(r.descricao)) aviso("descricao", "Descreva o que aconteceu, em ordem, só com fatos.");
  if (!txt(r.medicamento)) aviso("medicamento", "Informe o medicamento envolvido.");
  if (!r.etapa) aviso("etapa", "Marque em que etapa do circuito do medicamento ocorreu (prescrição, dispensação, preparo, administração...).");
  if (!r.tipo) aviso("tipo", "Classifique o tipo de incidente.");
  if (!r.dano) aviso("dano", "Marque o grau de dano ao paciente.");
  if (!r.interceptado) aviso("interceptado", "Informe se o incidente foi interceptado antes de chegar ao paciente.");

  // Coerência entre o tipo, o dano e a interceptação (definições do ICPS/OMS usadas pela Anvisa).
  if ((r.tipo === "quase_erro" || r.tipo === "circunstancia" || r.tipo === "sem_dano") && r.dano && r.dano !== "nenhum") {
    aviso("tipo-dano", "Esse tipo de incidente não tem dano. Se houve dano, é um evento adverso; se não houve, o dano é \"nenhum\".");
  }
  if (r.tipo === "evento_adverso" && r.dano === "nenhum") aviso("evento-sem-dano", "Evento adverso é incidente COM dano. Sem dano, classifique como incidente sem dano.");
  if (r.tipo === "quase_erro" && r.interceptado === "nao") aviso("quase-erro-interceptado", "Quase-erro é o que foi interceptado antes de chegar ao paciente. Se chegou, é incidente sem dano ou evento adverso.");
  if ((r.tipo === "sem_dano" || r.tipo === "evento_adverso") && r.interceptado === "sim") aviso("chegou-interceptado", "Se foi interceptado antes de chegar ao paciente, é um quase-erro, não um incidente que atingiu o paciente.");

  // Prazo: óbito relacionado a evento adverso é notificado em até 72 horas (RDC 36/2013, conforme notas técnicas da Anvisa).
  if (r.dano === "obito") {
    const d = txt(r.data_incidente) && txt(r.data_notificacao) ? diasEntre(txt(r.data_incidente), txt(r.data_notificacao)) : null;
    if (d !== null && d > 3) aviso("prazo-obito", `Óbito relacionado a evento adverso é notificado em até 72 horas. Entre o incidente e a notificação passaram ${d} dias.`);
  }
  if (txt(r.data_incidente) && txt(r.data_notificacao) && txt(r.data_notificacao) < txt(r.data_incidente)) aviso("data-ordem", "A data da notificação é anterior à do incidente.");

  // Fatores contribuintes: erro raramente tem causa única.
  const fatores = linhasCom(r.fatores, ["categoria", "descricao"]);
  if (fatores.length < 2) aviso("fatores", "Identifique ao menos dois fatores contribuintes (pessoa, tarefa, comunicação, ambiente, organização). Incidente raramente tem causa única.");
  fatores.forEach((l: any, i: number) => { if (!txt(l.categoria) || !txt(l.descricao)) aviso(`fator-${i}`, `Fator ${i + 1}: preencha a categoria e a descrição.`); });
  if (!txt(r.acao_imediata)) aviso("acao", "Descreva a ação imediata tomada.");
  if (!txt(r.analise)) aviso("analise", "Falta a análise: por que o incidente ocorreu.");
  if (!txt(r.prevencao)) aviso("prevencao", "Falta o plano de prevenção (o que muda no processo para não se repetir).");

  const culpa = termosAcusatoriosEncontrados([r.descricao, r.analise, r.acao_imediata, r.prevencao].map(txt).join(" "));
  if (culpa.length) aviso("culpa", `A notificação deve descrever fatos e fatores do sistema, sem culpar pessoas. Termos a rever: ${culpa.join(", ")}.`);
  if (!txt(r.notificador)) aviso("notificador", "Falta a identificação de quem notifica.");
  if (!txt(r.data_notificacao)) aviso("data-notificacao", "Falta a data da notificação.");
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

  incidente: {
    id: "incidente",
    titulo: "Notificação de incidente de segurança",
    descricao: "Notificação ao Núcleo de Segurança do Paciente (NSP), no modelo simplificado do Notivisa, módulo Assistência à Saúde. Descreva fatos, classifique o incidente e analise os fatores do sistema, sem culpar pessoas. Use dados fictícios do caso.",
    dicaOcorrencia: "Descreva um erro de medicação no circuito do caso (prescrição, dispensação, preparo, administração ou monitorização): o que aconteceu, quem percebeu, se chegou ao paciente e o que ocorreu com ele.",
    campos: [
      { tipo: "secao", id: "s-id", rotulo: "Identificação" },
      { tipo: "texto", id: "iniciais", rotulo: "Iniciais do paciente (nunca o nome)", placeholder: "Ex.: M.S." },
      { tipo: "data", id: "data_incidente", rotulo: "Data do incidente" },
      { tipo: "texto", id: "local", rotulo: "Local ou setor onde ocorreu" },
      { tipo: "secao", id: "s-desc", rotulo: "O que aconteceu" },
      { tipo: "area", id: "descricao", rotulo: "Descrição do incidente (fatos, em ordem)", placeholder: "O que aconteceu, quando, quem percebeu. Sem julgamento." },
      { tipo: "texto", id: "medicamento", rotulo: "Medicamento envolvido (nome, dose e via)" },
      { tipo: "select", id: "etapa", rotulo: "Etapa do circuito do medicamento", opcoes: [{ v: "prescricao", r: "Prescrição" }, { v: "transcricao", r: "Transcrição" }, { v: "dispensacao", r: "Dispensação" }, { v: "preparo", r: "Preparo" }, { v: "administracao", r: "Administração" }, { v: "monitorizacao", r: "Monitorização" }] },
      { tipo: "select", id: "interceptado", rotulo: "Foi interceptado antes de chegar ao paciente?", opcoes: [{ v: "sim", r: "Sim" }, { v: "nao", r: "Não, chegou ao paciente" }] },
      { tipo: "secao", id: "s-cls", rotulo: "Classificação" },
      { tipo: "select", id: "tipo", rotulo: "Tipo de incidente", opcoes: (Object.keys(ROTULO_TIPO_INCIDENTE) as TipoIncidente[]).map((k) => ({ v: k, r: ROTULO_TIPO_INCIDENTE[k] })) },
      { tipo: "select", id: "dano", rotulo: "Grau de dano ao paciente", opcoes: (Object.keys(ROTULO_DANO) as GrauDano[]).map((k) => ({ v: k, r: ROTULO_DANO[k] })) },
      { tipo: "secao", id: "s-ana", rotulo: "Análise" },
      { tipo: "tabela", id: "fatores", rotulo: "Fatores contribuintes", colunas: [{ id: "categoria", rotulo: "Categoria (pessoa, tarefa, comunicação, ambiente, organização)" }, { id: "descricao", rotulo: "Descrição do fator" }] },
      { tipo: "area", id: "acao_imediata", rotulo: "Ação imediata tomada" },
      { tipo: "area", id: "analise", rotulo: "Análise: por que o incidente ocorreu", placeholder: "Pergunte \"por quê?\" mais de uma vez, até chegar a fatores do processo." },
      { tipo: "area", id: "prevencao", rotulo: "Plano de prevenção", placeholder: "O que muda no processo, quem faz e até quando." },
      { tipo: "secao", id: "s-not", rotulo: "Notificador" },
      { tipo: "texto", id: "notificador", rotulo: "Nome e profissão de quem notifica" },
      { tipo: "data", id: "data_notificacao", rotulo: "Data da notificação" },
    ],
    criterio: {
      id: "dx-incidente", peso: 1,
      label: "A notificação de incidente classifica corretamente (tipo e dano), descreve fatos sem culpar pessoas, aponta fatores do sistema e propõe prevenção?",
      ancoras: "0: sem notificação. 1: relato do que aconteceu, sem classificação nem análise. 2: classificação incoerente (por exemplo, quase-erro com dano) ou linguagem que culpa pessoas. 3: classificação correta e fatores apontados, faltando prevenção concreta ou um fator do sistema. 4: tipo e dano corretos e coerentes, fatos sem julgamento, mais de um fator do sistema e plano de prevenção que muda o processo.",
    },
    itemRevisao: { id: "rv-incidente", texto: "A notificação de incidente classifica bem o tipo e o dano, descreve só fatos e propõe uma prevenção que muda o processo?" },
    verificar: verificarIncidente,
  },
};

export const rotuloExtra = (id: string): string => ESQUEMAS_EXTRA[id as ExtraId]?.titulo ?? id;
/** Só os ids que o sistema conhece, na ordem canônica (a sala pode ter guardado um id futuro ou inválido). */
export const extrasValidos = (ids: unknown): ExtraId[] => (Array.isArray(ids) ? EXTRAS_DISPONIVEIS.filter((e) => ids.includes(e)) : []);
