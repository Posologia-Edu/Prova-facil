import {
  RECON_V2,
  RECON_V2_LINHAS_CONCILIACAO,
} from "@/lib/form-templates/pharmacy-reconciliation-v2";

// Reconciliação v2 (sem rede): esquema do caso, validação do gerador e do editor, calculadora de clearance,
// pré-montagem da conciliação e verificador de coerência do aluno.

export type Transicao = "admissao" | "transferencia" | "alta";
export type TipoFonte = "relato" | "caixa" | "receita" | "retiradas" | "sumario" | "exames" | "outro";
export type Intencionalidade = "intencional_documentada" | "intencional_sem_documentacao" | "nao_intencional";
export type Risco = "sem_dano" | "leve" | "moderado" | "grave";
export type TipoDiscrepancia = "omissao" | "comissao" | "dose" | "duplicidade" | "interacao" | "alergia" | "ajuste_renal" | "via" | "outro";

export const TRANSICOES: Transicao[] = ["admissao", "transferencia", "alta"];
export const TIPOS_FONTE: TipoFonte[] = ["relato", "caixa", "receita", "retiradas", "sumario", "exames", "outro"];
export const INTENCIONALIDADES: Intencionalidade[] = ["intencional_documentada", "intencional_sem_documentacao", "nao_intencional"];
export const RISCOS: Risco[] = ["sem_dano", "leve", "moderado", "grave"];
export const TIPOS_DISCREPANCIA: TipoDiscrepancia[] = ["omissao", "comissao", "dose", "duplicidade", "interacao", "alergia", "ajuste_renal", "via", "outro"];

export const ROTULO_TRANSICAO: Record<Transicao, string> = { admissao: "Admissão", transferencia: "Transferência", alta: "Alta" };
export const ROTULO_FONTE: Record<TipoFonte, string> = {
  relato: "Relato", caixa: "Caixa de medicamentos", receita: "Receita ou sumário anterior", retiradas: "Retiradas na farmácia",
  sumario: "Prontuário", exames: "Exames e dados clínicos", outro: "Outra fonte",
};
export const ROTULO_RISCO: Record<Risco, string> = { sem_dano: "Sem dano", leve: "Leve", moderado: "Moderado", grave: "Grave" };
export const ROTULO_INTENCAO: Record<Intencionalidade, string> = {
  intencional_documentada: "Intencional e documentada", intencional_sem_documentacao: "Intencional sem documentação", nao_intencional: "Não intencional",
};
export const ROTULO_DISCREPANCIA: Record<TipoDiscrepancia, string> = {
  omissao: "Omissão", comissao: "Comissão", dose: "Dose, via ou frequência", duplicidade: "Duplicidade", interacao: "Interação",
  alergia: "Alergia", ajuste_renal: "Ajuste renal", via: "Via ou forma", outro: "Outra",
};

export type Fonte = { id: string; tipo: TipoFonte; titulo: string; texto: string; nota?: string };

/** O que o aluno lê. Nunca traz a prescrição nem o gabarito. */
export type CasoV2 = {
  versao: 2;
  /** Paciente virtual de onde o caso foi derivado (liga a dupla ao paciente que ela atendeu na anamnese e no SOAP). */
  origem_vp_id?: string;
  titulo: string;
  resumo: string;
  transicao: Transicao;
  nivel: "iniciante" | "intermediario" | "avancado";
  paciente: {
    nome: string;
    idade: number;
    sexo: "F" | "M";
    peso_kg: number;
    altura_m?: number;
    creatinina_mg_dl?: number;
    alergias_registradas: string;
    motivo: string;
  };
  fontes: Fonte[];
};

/** Privado: só o servidor entrega, e só depois que a BPMH foi enviada. */
export type ItemPrescricao = { medicamento: string; dose: string; via: string; frequencia: string; observacao?: string };

export type Discrepancia = {
  id: string;
  medicamento: string;
  tipo: TipoDiscrepancia;
  intencionalidade: Intencionalidade;
  risco: Risco;
  critica: boolean;
  fontes: string[];
  descricao: string;
  acao_esperada: string;
};
export type ItemBpmhGabarito = { medicamento: string; uso_real: string; fontes: string[] };
/** Persona do prescritor virtual (o médico que recebe o SBAR). Privada, como o resto do gabarito. */
export type PersonaPrescritor = { nome: string; perfil: string; temperamento: string; resistencias: string[]; criterios_para_ceder: string[] };
export type Gabarito = { discrepancias: Discrepancia[]; bpmh: ItemBpmhGabarito[]; outros_problemas: string[]; prescritor?: PersonaPrescritor };

export type DecisaoPrescritor = "aceita" | "adia" | "recusa" | "em_aberto";
export const ROTULO_DECISAO: Record<DecisaoPrescritor, string> = { aceita: "Aceitou", adia: "Adiou", recusa: "Recusou", em_aberto: "Não discutida" };
export const MAX_TURNOS_PRESCRITOR = 8;

export type CasoCompleto = { caso: CasoV2; prescricao: ItemPrescricao[]; gabarito: Gabarito };

// ---------- clearance de creatinina ----------

/** Cockcroft-Gault, em mL/min. Devolve null se faltar dado ou ele for inválido. */
export function clearanceCreatinina(idade: number, pesoKg: number, creatinina: number, sexo: "F" | "M"): number | null {
  if (![idade, pesoKg, creatinina].every((n) => Number.isFinite(n) && n > 0)) return null;
  const v = ((140 - idade) * pesoKg) / (72 * creatinina);
  return Math.max(0, sexo === "F" ? v * 0.85 : v);
}

// ---------- validação do caso (gerador e editor) ----------

export type AvisoCaso = { nivel: "erro" | "aviso"; texto: string };

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/** Nome do princípio ativo sem concentração: "Losartana potássica 50 mg" vira "losartana potassica". */
export function chaveMedicamento(nome: string): string {
  const n = norm(nome);
  const corte = n.search(/\d/);
  return (corte >= 0 ? n.slice(0, corte) : n).replace(/[(),;]/g, " ").replace(/\s+/g, " ").trim();
}

export function validarCaso({ caso, prescricao, gabarito }: CasoCompleto): AvisoCaso[] {
  const out: AvisoCaso[] = [];
  const erro = (texto: string) => out.push({ nivel: "erro", texto });
  const aviso = (texto: string) => out.push({ nivel: "aviso", texto });

  if (!caso.titulo?.trim()) erro("O caso não tem título.");
  if (!caso.resumo?.trim()) erro("O caso não tem resumo.");
  const p = caso.paciente;
  if (!p?.nome?.trim() || !(p.idade > 0) || !(p.peso_kg > 0)) erro("Faltam nome, idade ou peso do paciente.");
  if (!p?.motivo?.trim()) erro("Falta o motivo da transição.");

  const fontes = caso.fontes || [];
  if (fontes.length < 3) erro("O dossiê precisa de pelo menos 3 fontes.");
  const ids = new Set<string>();
  for (const f of fontes) {
    if (!f.id || ids.has(f.id)) erro(`Fonte com id repetido ou em branco (${f.titulo || "sem título"}).`);
    ids.add(f.id);
    if (!f.titulo?.trim() || !f.texto?.trim()) erro(`A fonte "${f.titulo || f.id}" está sem título ou sem texto.`);
    if (/discrep[aâ]ncia|gabarito|uso exclusivo do professor/i.test(f.texto || "")) aviso(`A fonte "${f.titulo}" cita discrepância ou gabarito: o aluno leria isso.`);
  }

  if (!(prescricao || []).length) erro("A prescrição está vazia.");
  (prescricao || []).forEach((m, i) => {
    if (!m.medicamento?.trim() || !m.dose?.trim() || !m.frequencia?.trim()) erro(`Prescrição, linha ${i + 1}: falta medicamento, dose ou frequência.`);
  });

  const disc = gabarito?.discrepancias || [];
  if (disc.length < 2) erro("O gabarito precisa de pelo menos 2 discrepâncias.");
  if (!(gabarito?.bpmh || []).length) erro("O gabarito não traz a BPMH esperada.");
  if (!disc.some((d) => d.intencionalidade === "nao_intencional")) erro("Nenhuma discrepância é não intencional.");
  if (!disc.some((d) => d.risco === "grave")) erro("Nenhuma discrepância é de risco grave.");
  if (!disc.some((d) => d.risco === "sem_dano" || d.risco === "leve")) aviso("Não há discrepância de baixo risco: o aluno não precisa priorizar.");

  const idsDisc = new Set<string>();
  const nomesPresc = new Set((prescricao || []).map((m) => chaveMedicamento(m.medicamento)));
  const nomesBpmh = new Set((gabarito?.bpmh || []).map((m) => chaveMedicamento(m.medicamento)));
  for (const d of disc) {
    if (!d.id || idsDisc.has(d.id)) erro(`Discrepância com id repetido ou em branco (${d.medicamento || "sem nome"}).`);
    idsDisc.add(d.id);
    if (!d.medicamento?.trim() || !d.descricao?.trim() || !d.acao_esperada?.trim()) erro(`A discrepância ${d.id || "?"} está sem medicamento, descrição ou ação esperada.`);
    if (!(d.fontes || []).length) erro(`A discrepância ${d.id} não diz em qual fonte o aluno a descobre.`);
    for (const f of d.fontes || []) if (!ids.has(f)) erro(`A discrepância ${d.id} aponta para uma fonte que não existe (${f}).`);
    const k = chaveMedicamento(d.medicamento);
    if (k && !nomesPresc.has(k) && !nomesBpmh.has(k)) aviso(`A discrepância ${d.id} cita "${d.medicamento}", que não está na prescrição nem na BPMH esperada.`);
    if (d.tipo === "ajuste_renal" && !(p?.creatinina_mg_dl && p.creatinina_mg_dl > 0)) erro(`A discrepância ${d.id} depende da função renal, mas o paciente não tem creatinina.`);
    if (d.tipo === "alergia" && !(p?.alergias_registradas ?? "").toString().trim()) aviso(`A discrepância ${d.id} é de alergia: confirme o que consta como alergia registrada ("nenhuma" também vale).`);
    if (d.critica && d.risco !== "grave" && d.risco !== "moderado") aviso(`A discrepância ${d.id} é crítica, mas o risco é baixo.`);
  }

  const pr = gabarito?.prescritor;
  if (!pr || !pr.nome?.trim() || !(pr.resistencias || []).length || !(pr.criterios_para_ceder || []).length) {
    aviso("O caso não tem persona completa do prescritor (nome, resistências e critérios para ceder): o prescritor virtual usará uma persona genérica.");
  }

  for (const b of gabarito?.bpmh || []) {
    if (!b.medicamento?.trim() || !b.uso_real?.trim()) erro("Há item da BPMH esperada sem medicamento ou sem uso real.");
    for (const f of b.fontes || []) if (!ids.has(f)) erro(`A BPMH esperada aponta para uma fonte que não existe (${f}).`);
  }
  return out;
}

// ---------- tela do aluno ----------

const celula = (m: any, r: number, c: number): string => String(Array.isArray(m) ? m[r]?.[c] ?? "" : "").trim();
const linhasPreenchidas = (m: any, colunas: number[]): number[] => {
  const out: number[] = [];
  const n = Array.isArray(m) ? m.length : 0;
  for (let r = 0; r < n; r++) if (colunas.some((c) => celula(m, r, c))) out.push(r);
  return out;
};

/** Medicamentos que o aluno escreveu na BPMH (coluna 0), na ordem. */
export function medicamentosBpmh(answers: Record<string, any>): string[] {
  const m = answers?.[RECON_V2.bpmh];
  return linhasPreenchidas(m, [0]).map((r) => celula(m, r, 0));
}

/**
 * Pré-monta a primeira coluna e "onde aparece" da conciliação com os medicamentos da BPMH e da prescrição.
 * Só junta o que já existe: a classificação continua sendo do aluno. Nomes diferentes para o mesmo remédio viram duas linhas,
 * e perceber isso (nome comercial, equivalente) faz parte da tarefa.
 */
export function montarConciliacao(bpmh: string[], prescricao: ItemPrescricao[]): string[][] {
  const linhas: string[][] = [];
  const chavePresc = new Map<string, ItemPrescricao>();
  for (const m of prescricao) chavePresc.set(chaveMedicamento(m.medicamento), m);
  const usadas = new Set<string>();
  for (const nome of bpmh) {
    const k = chaveMedicamento(nome);
    if (!k) continue;
    const noPresc = chavePresc.has(k);
    if (noPresc) usadas.add(k);
    linhas.push([nome, noPresc ? "BPMH e prescrição" : "Só BPMH", "", "", "", "", ""]);
  }
  for (const m of prescricao) {
    const k = chaveMedicamento(m.medicamento);
    if (usadas.has(k)) continue;
    linhas.push([`${m.medicamento} ${m.dose}`.trim(), "Só prescrição", "", "", "", "", ""]);
  }
  while (linhas.length < RECON_V2_LINHAS_CONCILIACAO) linhas.push(["", "", "", "", "", "", ""]);
  return linhas.slice(0, Math.max(RECON_V2_LINHAS_CONCILIACAO, linhas.length));
}

export type AvisoRecon = { id: string; nivel: "aviso" | "ok"; parte: "1" | "2" | "3" | "4"; texto: string };

/**
 * Verificador de coerência. Regras fixas, sem IA: só avisa, nunca bloqueia o envio.
 * `prescricao` vem da função do servidor depois do envio da BPMH (vazio antes disso).
 */
export function verificarCoerenciaRecon(answers: Record<string, any>, prescricao: ItemPrescricao[]): AvisoRecon[] {
  const avisos: AvisoRecon[] = [];
  const aviso = (id: string, parte: AvisoRecon["parte"], texto: string) => avisos.push({ id, nivel: "aviso", parte, texto });
  const txt = (id: string) => String(answers?.[id] ?? "").trim();

  if (!txt(RECON_V2.alergias)) aviso("alergias", "1", "As alergias estão em branco. Se não há nenhuma, escreva isso e de qual fonte.");

  const bpmh = answers?.[RECON_V2.bpmh];
  const linhasBpmh = linhasPreenchidas(bpmh, [0]);
  if (linhasBpmh.length === 0) aviso("bpmh-vazia", "2", "A BPMH está vazia.");
  for (const r of linhasBpmh) {
    const nome = celula(bpmh, r, 0);
    if (!celula(bpmh, r, 1)) aviso(`bpmh-uso-${r}`, "2", `${nome}: falta como o paciente realmente usa.`);
    if (!celula(bpmh, r, 2)) aviso(`bpmh-fonte-${r}`, "2", `${nome}: falta a fonte que confirma.`);
  }
  const pend = answers?.[RECON_V2.pendencias];
  for (const r of linhasPreenchidas(pend, [0, 1])) {
    if (!celula(pend, r, 0) || !celula(pend, r, 1)) aviso(`pend-${r}`, "2", `Pendência da linha ${r + 1}: diga o que falta confirmar e com quem.`);
  }

  const conc = answers?.[RECON_V2.conciliacao];
  const linhasConc = linhasPreenchidas(conc, [0, 1, 2, 3, 4, 5, 6]);
  const chavesConc = new Set(linhasConc.map((r) => chaveMedicamento(celula(conc, r, 0))));
  if (prescricao.length > 0) {
    for (const m of prescricao) {
      if (!chavesConc.has(chaveMedicamento(m.medicamento))) aviso(`conc-presc-${m.medicamento}`, "3", `${m.medicamento} está na prescrição e não tem linha na conciliação.`);
    }
    for (const nome of linhasBpmh.map((r) => celula(bpmh, r, 0))) {
      if (!chavesConc.has(chaveMedicamento(nome))) aviso(`conc-bpmh-${nome}`, "3", `${nome} está na sua BPMH e não tem linha na conciliação.`);
    }
  }
  let temGrave = false;
  for (const r of linhasConc) {
    const nome = celula(conc, r, 0) || `linha ${r + 1}`;
    const onde = celula(conc, r, 1), conduta = celula(conc, r, 2), int = celula(conc, r, 3), dano = celula(conc, r, 4), acao = celula(conc, r, 6);
    if (!onde || !conduta || !int || !dano || !acao) aviso(`conc-incompleta-${r}`, "3", `${nome}: falta classificar (onde aparece, conduta, intencionalidade, dano ou ação).`);
    if (onde === "Só BPMH" && conduta && conduta !== "Omitido") aviso(`conc-omitido-${r}`, "3", `${nome}: está só na BPMH, então a conduta da prescrição seria "Omitido".`);
    if (onde === "Só prescrição" && (conduta === "Omitido" || conduta === "Mantido")) aviso(`conc-novo-${r}`, "3", `${nome}: está só na prescrição, então não pode ser "${conduta}".`);
    if (int === "Não intencional" && dano === "Sem dano") aviso(`conc-risco-${r}`, "3", `${nome}: não intencional e sem dano. Rever o risco.`);
    if (dano === "Grave") temGrave = true;
    if (dano === "Grave" && acao === "Manter") aviso(`conc-grave-${r}`, "3", `${nome}: risco grave e ação "Manter". Rever.`);
  }

  const sbar = [RECON_V2.sbarS, RECON_V2.sbarB, RECON_V2.sbarA, RECON_V2.sbarR];
  if (temGrave && sbar.every((id) => !txt(id))) aviso("sbar-grave", "4", "Há discrepância de risco grave e o SBAR ao prescritor está em branco.");
  else if (sbar.some((id) => txt(id)) && sbar.some((id) => !txt(id))) aviso("sbar-parcial", "4", "O SBAR está incompleto: preencha as quatro partes.");

  if (avisos.length === 0) avisos.push({ id: "ok", nivel: "ok", parte: "3", texto: "Nenhum aviso." });
  return avisos;
}

/** Quantos campos de cada parte estão preenchidos, para a barra de passos. */
export function progressoRecon(answers: Record<string, any>, bpmhEnviada: boolean): { feitos: number; total: number }[] {
  const tem = (m: any, cols: number[]) => linhasPreenchidas(m, cols).length > 0;
  const txt = (id: string) => !!String(answers?.[id] ?? "").trim();
  return [
    { feitos: [txt(RECON_V2.alergias), tem(answers?.[RECON_V2.dados], [0, 1])].filter(Boolean).length, total: 2 },
    { feitos: [bpmhEnviada, tem(answers?.[RECON_V2.pendencias], [0])].filter(Boolean).length, total: 2 },
    { feitos: [tem(answers?.[RECON_V2.conciliacao], [2, 3, 4]), tem(answers?.[RECON_V2.seguranca], [0])].filter(Boolean).length, total: 2 },
    { feitos: [RECON_V2.sbarS, RECON_V2.sbarB, RECON_V2.sbarA, RECON_V2.sbarR].filter(txt).length, total: 4 },
  ];
}

// ---------- editor ----------

/** Armadilhas que o gerador pode trabalhar no caso. O professor marca quais quer. */
export const ARMADILHAS: string[] = [
  "Omissão de uso contínuo (levotiroxina, anticoagulante, antiepiléptico, betabloqueador)",
  "Duplicidade por nome comercial",
  "Equivalente do padrão do hospital",
  "Ajuste pela função renal ou hepática",
  "Interação medicamentosa relevante",
  "Medicamento potencialmente inapropriado no idoso",
  "Alergia relatada e não registrada",
  "Via ou forma inadequada (triturar, sonda)",
  "Medicamento de alta vigilância (insulina, anticoagulante, opioide)",
  "Nomes parecidos (LASA) e unidades (mcg e mg)",
  "\"Se necessário\" sem critério",
  "Suspenso na internação e esquecido na alta",
  "Duplicidade na alta (novo e antigo da mesma classe)",
  "Uso não oral (insulina, colírio, adesivo)",
  "Chás, fitoterápicos e automedicação",
  "Retirada na farmácia que contradiz o relato",
];

export function casoEmBranco(): CasoCompleto {
  return {
    caso: {
      versao: 2, titulo: "", resumo: "", transicao: "admissao", nivel: "intermediario",
      paciente: { nome: "", idade: 0, sexo: "F", peso_kg: 0, alergias_registradas: "", motivo: "" },
      fontes: [
        { id: "f1", tipo: "relato", titulo: "Relato do paciente ou do cuidador", texto: "" },
        { id: "f2", tipo: "caixa", titulo: "Caixa de medicamentos trazida", texto: "" },
        { id: "f3", tipo: "sumario", titulo: "Prontuário e exames", texto: "" },
      ],
    },
    prescricao: [{ medicamento: "", dose: "", via: "", frequencia: "" }],
    gabarito: { discrepancias: [], bpmh: [{ medicamento: "", uso_real: "", fontes: [] }], outros_problemas: [], prescritor: { nome: "", perfil: "", temperamento: "", resistencias: [], criterios_para_ceder: [] } },
  };
}

/** Próximo id livre com o prefixo dado ("f" ou "d"). */
export function proximoId(prefixo: string, existentes: string[]): string {
  let n = existentes.length + 1;
  while (existentes.includes(`${prefixo}${n}`)) n++;
  return `${prefixo}${n}`;
}
