import { chaveMedicamento } from "@/lib/recon-v2";

// Documentação v2 (sem rede): modelo dos 4 documentos do núcleo e verificadores determinísticos (sem IA).
// Os verificadores só avisam, nunca bloqueiam o envio. A conciliação de referência vem do servidor (privada).

export type TipoDocumento = "encaminhamento" | "intervencao" | "cartao" | "plano";
export const TIPOS_DOCUMENTO: TipoDocumento[] = ["encaminhamento", "intervencao", "cartao", "plano"];
export const ROTULO_DOCUMENTO: Record<TipoDocumento, string> = {
  encaminhamento: "Encaminhamento ao prescritor",
  intervencao: "Registro de intervenção farmacêutica",
  cartao: "Cartão de medicamentos do paciente",
  plano: "Plano de cuidado",
};

export type Prioridade = "rotina" | "prioritario" | "urgente";
export const ROTULO_PRIORIDADE: Record<Prioridade, string> = { rotina: "Rotina", prioritario: "Prioritário", urgente: "Urgente" };

export type LinhaProblema = { problema: string; evidencia: string; sugestao: string; prioridade: Prioridade | "" };
export type Encaminhamento = {
  destinatario: string; cargo: string; servico: string;
  prioridade: Prioridade | ""; prazo: string;
  s: string; b: string; a: string; r: string;
  problemas: LinhaProblema[];
  farmaceutico: string; crf: string; data: string;
};

export type LinhaIntervencao = {
  medicamento: string; problema: string; causa: string; intervencao: string; alvo: string; aceitacao: string; desfecho: string;
};
export type Intervencao = { linhas: LinhaIntervencao[] };

export type Mudanca = "novo" | "mantido" | "alterado" | "suspenso" | "";
export type LinhaCartao = {
  medicamento: string; para_que: string; como_tomar: string; frequencia: string;
  manha: boolean; tarde: boolean; noite: boolean; deitar: boolean; mudou: Mudanca; cuidado: string;
};
export type LinhaPare = { medicamento: string; motivo: string };
export type Cartao = {
  linhas: LinhaCartao[]; pare: LinhaPare[];
  se_esquecer: string; procure_atendimento: string; onde_conseguir: string;
};

export type Plano = { metas: string; acoes: string; monitorizacao: string; retorno: string };

export type RespostasV2 = { encaminhamento: Encaminhamento; intervencao: Intervencao; cartao: Cartao; plano: Plano };

export const linhaProblemaVazia = (): LinhaProblema => ({ problema: "", evidencia: "", sugestao: "", prioridade: "" });
export const linhaIntervencaoVazia = (): LinhaIntervencao => ({ medicamento: "", problema: "", causa: "", intervencao: "", alvo: "", aceitacao: "", desfecho: "" });
export const linhaCartaoVazia = (): LinhaCartao => ({ medicamento: "", para_que: "", como_tomar: "", frequencia: "", manha: false, tarde: false, noite: false, deitar: false, mudou: "", cuidado: "" });

export function respostasEmBranco(): RespostasV2 {
  return {
    encaminhamento: {
      destinatario: "", cargo: "", servico: "", prioridade: "", prazo: "", s: "", b: "", a: "", r: "",
      problemas: [linhaProblemaVazia()], farmaceutico: "", crf: "", data: "",
    },
    intervencao: { linhas: [linhaIntervencaoVazia()] },
    cartao: { linhas: [linhaCartaoVazia()], pare: [], se_esquecer: "", procure_atendimento: "", onde_conseguir: "" },
    plano: { metas: "", acoes: "", monitorizacao: "", retorno: "" },
  };
}

/** Junta o que veio salvo com o formato atual, para um rascunho antigo ou incompleto nunca quebrar a tela. */
export function normalizarRespostas(bruto: any): RespostasV2 {
  const base = respostasEmBranco();
  const o = bruto && typeof bruto === "object" ? bruto : {};
  const lista = <T,>(v: any, vazio: () => T, padrao: T[]): T[] =>
    Array.isArray(v) && v.length ? v.map((x) => ({ ...vazio(), ...(x && typeof x === "object" ? x : {}) })) : padrao;
  return {
    encaminhamento: { ...base.encaminhamento, ...(o.encaminhamento || {}), problemas: lista(o.encaminhamento?.problemas, linhaProblemaVazia, base.encaminhamento.problemas) },
    intervencao: { linhas: lista(o.intervencao?.linhas, linhaIntervencaoVazia, base.intervencao.linhas) },
    cartao: {
      ...base.cartao, ...(o.cartao || {}),
      linhas: lista(o.cartao?.linhas, linhaCartaoVazia, base.cartao.linhas),
      pare: Array.isArray(o.cartao?.pare) ? o.cartao.pare.map((x: any) => ({ medicamento: String(x?.medicamento ?? ""), motivo: String(x?.motivo ?? "") })) : [],
    },
    plano: { ...base.plano, ...(o.plano || {}) },
  };
}

// ---------- verificadores ----------

export type AvisoDoc = { id: string; documento: TipoDocumento; nivel: "aviso" | "ok"; texto: string };

/** Conciliação de referência (privada): o que o paciente deve usar depois da transição. */
export type ItemReferencia = { medicamento: string; conduta: "mantido" | "alterado" | "novo" | "suspenso"; frequencia?: string };

const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
/**
 * Primeira versão da conciliação de referência, a partir do caso da Reconciliação v2: a prescrição do serviço mais o que o
 * gabarito pede (ação esperada de cada discrepância). É um rascunho para o professor revisar, não a palavra final.
 */
export function derivarReferencia(
  prescricao: { medicamento: string; dose: string; frequencia: string }[],
  discrepancias: { medicamento: string; acao_esperada: string }[],
): ItemReferencia[] {
  const acao = (nome: string) => {
    const k = chaveMedicamento(nome);
    return discrepancias.find((d) => chaveMedicamento(d.medicamento) === k)?.acao_esperada || "";
  };
  const tipo = (a: string): ItemReferencia["conduta"] =>
    /suspend|interromp|retir|descontinu|n[aã]o usar|parar/i.test(a) ? "suspenso"
      : /ajust|reduz|troc|substitu|alter|aument|diminu/i.test(a) ? "alterado"
      : /inici|introduz|adicion|incluir|incluir/i.test(a) ? "novo" : "mantido";
  const itens: ItemReferencia[] = prescricao.map((m) => ({ medicamento: `${m.medicamento} ${m.dose}`.replace(/\s+/g, " ").trim(), conduta: tipo(acao(m.medicamento)), frequencia: m.frequencia }));
  const nos = new Set(prescricao.map((m) => chaveMedicamento(m.medicamento)));
  // Discrepância de um medicamento que não está na prescrição (uso próprio a suspender, por exemplo) entra como item a parte.
  for (const d of discrepancias) {
    const k = chaveMedicamento(d.medicamento);
    if (k && !nos.has(k)) { nos.add(k); itens.push({ medicamento: d.medicamento, conduta: tipo(d.acao_esperada) }); }
  }
  return itens;
}

const preenchida =(l: LinhaCartao) => !!(l.medicamento.trim() || l.para_que.trim() || l.como_tomar.trim() || l.frequencia.trim());

/** Quantas doses por dia a frequência escrita indica. Devolve null quando o texto não permite concluir. */
export function dosesPorDia(frequencia: string): number | null {
  const t = norm(frequencia);
  if (!t) return null;
  const horas = t.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*(h|hora)/) || t.match(/a cada\s*(\d{1,2})\s*(h|hora)/);
  if (horas) {
    const h = Number(horas.length === 4 ? horas[2] : horas[1]);
    return h > 0 && h <= 24 ? Math.round(24 / h) : null;
  }
  const x = t.match(/(\d{1,2})\s*(x|vez|vezes)\b/);
  if (x) return Number(x[1]);
  const ext: Record<string, number> = { uma: 1, um: 1, duas: 2, dois: 2, tres: 3, quatro: 4 };
  const e = t.match(/\b(uma|um|duas|dois|tres|quatro)\s+(vez|vezes)\b/);
  if (e) return ext[e[1]];
  if (/\b(pela manha|de manha|ao acordar|a noite|ao deitar|antes de dormir|no almoco|ao dia)\b/.test(t) && !/(vezes|x)/.test(t)) return 1;
  return null;
}

const contarHorarios = (l: LinhaCartao) => [l.manha, l.tarde, l.noite, l.deitar].filter(Boolean).length;

/**
 * Verificador do cartão: cobertura da conciliação de referência, frequência x grade de horários e campos em falta.
 * `referencia` vem do servidor; vazio = não confere cobertura.
 */
export function verificarCartao(c: Cartao, referencia: ItemReferencia[]): AvisoDoc[] {
  const out: AvisoDoc[] = [];
  const aviso = (id: string, texto: string) => out.push({ id, documento: "cartao", nivel: "aviso", texto });
  const linhas = c.linhas.filter(preenchida);
  if (!linhas.length) aviso("cartao-vazio", "O cartão está vazio.");

  const chaves = new Set(linhas.map((l) => chaveMedicamento(l.medicamento)));
  const chavesPare = new Set((c.pare || []).map((l) => chaveMedicamento(l.medicamento)));
  for (const r of referencia) {
    const k = chaveMedicamento(r.medicamento);
    if (r.conduta === "suspenso") {
      if (!chavesPare.has(k) && !chaves.has(k)) aviso(`pare-${k}`, `${r.medicamento} foi suspenso e não aparece em "Pare de usar". O paciente pode continuar tomando.`);
      if (chaves.has(k)) aviso(`suspenso-na-grade-${k}`, `${r.medicamento} foi suspenso, mas está na grade de horários como se fosse para tomar.`);
    } else if (!chaves.has(k)) {
      aviso(`falta-${k}`, `${r.medicamento} está na conciliação e não aparece no cartão.`);
    }
  }

  linhas.forEach((l, i) => {
    const nome = l.medicamento.trim() || `linha ${i + 1}`;
    if (!l.medicamento.trim()) aviso(`nome-${i}`, `Linha ${i + 1}: falta o nome do medicamento.`);
    if (!l.para_que.trim()) aviso(`paraque-${i}`, `${nome}: diga para que serve, em palavras do paciente.`);
    if (!l.como_tomar.trim()) aviso(`como-${i}`, `${nome}: falta como tomar (com água, em jejum, depois da refeição...).`);
    if (!l.mudou) aviso(`mudou-${i}`, `${nome}: marque o que mudou (novo, mantido, alterado).`);
    const n = contarHorarios(l);
    if (n === 0 && !/se necess|sos|se precisar|se dor|se febre/.test(norm(l.frequencia))) aviso(`grade-${i}`, `${nome}: nenhum horário marcado na grade.`);
    const esperado = dosesPorDia(l.frequencia);
    if (esperado !== null && n > 0 && esperado !== n) aviso(`dose-${i}`, `${nome}: a frequência escrita indica ${esperado} vez(es) ao dia e a grade marca ${n}.`);
  });

  for (const campo of [["se_esquecer", "o que fazer se esquecer uma dose"], ["procure_atendimento", "sinais para procurar atendimento"], ["onde_conseguir", "onde conseguir os medicamentos"]] as const) {
    if (!String(c[campo[0]] ?? "").trim()) aviso(`campo-${campo[0]}`, `Falta ${campo[1]}.`);
  }
  if (!out.length) out.push({ id: "ok-cartao", documento: "cartao", nivel: "ok", texto: "Nenhum aviso no cartão." });
  return out;
}

export function verificarEncaminhamento(e: Encaminhamento): AvisoDoc[] {
  const out: AvisoDoc[] = [];
  const aviso = (id: string, texto: string) => out.push({ id, documento: "encaminhamento", nivel: "aviso", texto });
  if (!e.destinatario.trim()) aviso("dest", "Diga a quem a carta é dirigida.");
  if (!e.prioridade) aviso("prio", "Marque a prioridade do encaminhamento.");
  if (e.prioridade === "urgente" && !e.prazo.trim()) aviso("prazo", "Encaminhamento urgente precisa de prazo de resposta.");
  const sbar = [e.s, e.b, e.a, e.r];
  if (sbar.some((x) => !x.trim())) aviso("sbar", "O SBAR está incompleto: preencha as quatro partes.");
  const probs = e.problemas.filter((p) => p.problema.trim() || p.sugestao.trim());
  if (!probs.length) aviso("prob", "Liste ao menos um problema com a sugestão de conduta.");
  probs.forEach((p, i) => {
    if (!p.sugestao.trim()) aviso(`sug-${i}`, `Problema ${i + 1}: falta a sugestão de conduta.`);
    if (!p.prioridade) aviso(`pri-${i}`, `Problema ${i + 1}: falta a prioridade.`);
  });
  if (!e.farmaceutico.trim() || !e.crf.trim()) aviso("assin", "Falta a identificação do farmacêutico (nome e CRF fictício).");
  if (!e.data.trim()) aviso("data", "Falta a data.");
  if (!out.length) out.push({ id: "ok-enc", documento: "encaminhamento", nivel: "ok", texto: "Nenhum aviso no encaminhamento." });
  return out;
}

export function verificarIntervencao(iv: Intervencao): AvisoDoc[] {
  const out: AvisoDoc[] = [];
  const linhas = iv.linhas.filter((l) => Object.values(l).some((v) => String(v).trim()));
  if (!linhas.length) out.push({ id: "iv-vazio", documento: "intervencao", nivel: "aviso", texto: "Registre ao menos uma intervenção." });
  linhas.forEach((l, i) => {
    const nome = l.medicamento.trim() || `linha ${i + 1}`;
    for (const [campo, rot] of [["problema", "o problema"], ["causa", "a causa"], ["intervencao", "a intervenção"], ["alvo", "a quem foi dirigida"], ["aceitacao", "se foi aceita"]] as const) {
      if (!String(l[campo]).trim()) out.push({ id: `iv-${campo}-${i}`, documento: "intervencao", nivel: "aviso", texto: `${nome}: falta ${rot}.` });
    }
  });
  if (!out.length) out.push({ id: "ok-iv", documento: "intervencao", nivel: "ok", texto: "Nenhum aviso no registro." });
  return out;
}

export function verificarPlano(p: Plano): AvisoDoc[] {
  const out: AvisoDoc[] = [];
  for (const [campo, rot] of [["metas", "as metas"], ["acoes", "as ações"], ["monitorizacao", "o que será monitorado"], ["retorno", "quando o paciente volta"]] as const) {
    if (!String(p[campo]).trim()) out.push({ id: `plano-${campo}`, documento: "plano", nivel: "aviso", texto: `Falta ${rot}.` });
  }
  if (!out.length) out.push({ id: "ok-plano", documento: "plano", nivel: "ok", texto: "Nenhum aviso no plano." });
  return out;
}

// ---------- legibilidade ----------

/** Sílabas de uma palavra em português, por grupos vocálicos (aproximação: ditongos contam uma). */
export function contarSilabas(palavra: string): number {
  // "ão", "ãe" e "õe" são ditongos nasais (uma sílaba): trocar antes de perder o til
  const p = norm(palavra.toLowerCase().replace(/ão|ãe|õe/g, "a")).replace(/[^a-z]/g, "");
  if (!p) return 0;
  const grupos = p.match(/[aeiou]+/g) || [];
  let n = 0;
  for (const g of grupos) {
    // hiatos comuns: duas vogais abertas/fortes seguidas contam separadas (ex.: "ea", "oa", "ia" em "farmacia" fica 1 aprox.)
    n += /^(ae|ao|ea|eo|oa|oe)$/.test(g) ? 2 : 1;
  }
  return Math.max(1, n);
}

/**
 * Índice de Flesch adaptado ao português (Martins et al., 1996): 248,835 − 1,015·(palavras/frases) − 84,6·(sílabas/palavras).
 * Quanto maior, mais fácil. Devolve null com menos de 15 palavras (amostra pequena demais).
 */
export function indiceFlesch(texto: string): number | null {
  const frases = (texto.match(/[^.!?\n]+[.!?]*/g) || []).filter((f) => /[a-zà-ú]/i.test(f));
  const palavras: string[] = texto.match(/[A-Za-zÀ-ÿ]+/g) || [];
  if (palavras.length < 15 || !frases.length) return null;
  const silabas = palavras.reduce((s, p) => s + contarSilabas(p), 0);
  return 248.835 - 1.015 * (palavras.length / frases.length) - 84.6 * (silabas / palavras.length);
}

/** Termos que o paciente leigo não entende. Lista de partida, o professor pode ampliar depois. */
export const JARGAO = [
  "posologia", "via oral", "via de administração", "biodisponibilidade", "meia-vida", "adesão", "interação medicamentosa", "contraindicado",
  "hipertensão arterial", "dislipidemia", "hiperglicemia", "hipoglicemia", "posológico", "antiagregante", "anticoagulação", "eventos adversos",
  "reação adversa", "farmacoterapia", "iatrogenia", "profilaxia", "sintomático", "refratário", "nefrotóxico", "hepatotóxico", "paciente",
];

export function jargaoEncontrado(texto: string): string[] {
  const t = norm(texto);
  return JARGAO.filter((j) => t.includes(norm(j)));
}

/** Texto do cartão que o paciente vai ler (para legibilidade e jargão). */
export function textoDoCartao(c: Cartao): string {
  const partes = c.linhas.flatMap((l) => [l.para_que, l.como_tomar, l.cuidado]);
  partes.push(...(c.pare || []).map((l) => l.motivo), c.se_esquecer, c.procure_atendimento, c.onde_conseguir);
  return partes.map((x) => String(x || "").trim()).filter(Boolean).map((x) => (/[.!?]$/.test(x) ? x : x + ".")).join("\n");
}

export function verificarLinguagemCartao(c: Cartao): AvisoDoc[] {
  const out: AvisoDoc[] = [];
  const texto = textoDoCartao(c);
  const flesch = indiceFlesch(texto);
  if (flesch !== null && flesch < 50) out.push({ id: "flesch", documento: "cartao", nivel: "aviso", texto: `O texto do cartão está difícil de ler (índice ${Math.round(flesch)}; acima de 50 é o desejável). Use frases mais curtas e palavras do dia a dia.` });
  const j = jargaoEncontrado(texto);
  if (j.length) out.push({ id: "jargao", documento: "cartao", nivel: "aviso", texto: `Termos técnicos que o paciente pode não entender: ${j.join(", ")}.` });
  return out;
}

/** Todos os avisos, na ordem em que a tela mostra. */
export function verificarTudo(r: RespostasV2, referencia: ItemReferencia[]): AvisoDoc[] {
  return [
    ...verificarEncaminhamento(r.encaminhamento),
    ...verificarIntervencao(r.intervencao),
    ...verificarCartao(r.cartao, referencia).filter((a) => a.nivel === "aviso" || !verificarLinguagemCartao(r.cartao).length),
    ...verificarLinguagemCartao(r.cartao),
    ...verificarPlano(r.plano),
  ];
}

/** Os quatro documentos em texto corrido, para o professor ler na correção. */
export function resumoDocumentos(r: RespostasV2): string {
  const t = (v: unknown) => String(v ?? "").trim() || "—";
  const e = r.encaminhamento, c = r.cartao, p = r.plano;
  const l: string[] = [];
  l.push("ENCAMINHAMENTO", `Para: ${t(e.destinatario)} (${t(e.cargo)}, ${t(e.servico)}) · prioridade ${t(e.prioridade)} · prazo ${t(e.prazo)}`);
  l.push(`S: ${t(e.s)}`, `B: ${t(e.b)}`, `A: ${t(e.a)}`, `R: ${t(e.r)}`);
  for (const x of e.problemas) if (x.problema.trim() || x.sugestao.trim()) l.push(`  • [${t(x.prioridade)}] ${t(x.problema)} | evidência: ${t(x.evidencia)} | sugestão: ${t(x.sugestao)}`);
  l.push(`Assinado: ${t(e.farmaceutico)} ${t(e.crf)}, ${t(e.data)}`, "", "REGISTRO DE INTERVENÇÃO");
  for (const x of r.intervencao.linhas) if (Object.values(x).some((v) => String(v).trim())) l.push(`  • ${t(x.medicamento)} | problema: ${t(x.problema)} | causa: ${t(x.causa)} | intervenção: ${t(x.intervencao)} | a quem: ${t(x.alvo)} | aceitação: ${t(x.aceitacao)} | desfecho: ${t(x.desfecho)}`);
  l.push("", "CARTÃO DE MEDICAMENTOS");
  for (const x of c.linhas) if (preenchida(x)) {
    const grade = [x.manha && "manhã", x.tarde && "tarde", x.noite && "noite", x.deitar && "deitar"].filter(Boolean).join(", ") || "sem horário";
    l.push(`  • ${t(x.medicamento)} | ${t(x.para_que)} | ${t(x.como_tomar)} | ${t(x.frequencia)} → ${grade} | mudou: ${t(x.mudou)}${x.cuidado.trim() ? ` | cuidado: ${x.cuidado}` : ""}`);
  }
  l.push(`Pare de usar: ${c.pare.filter((x) => x.medicamento.trim()).map((x) => `${x.medicamento} (${t(x.motivo)})`).join("; ") || "—"}`);
  l.push(`Se esquecer: ${t(c.se_esquecer)}`, `Procure atendimento: ${t(c.procure_atendimento)}`, `Onde conseguir: ${t(c.onde_conseguir)}`);
  l.push("", "PLANO DE CUIDADO", `Metas: ${t(p.metas)}`, `Ações: ${t(p.acoes)}`, `Monitorização: ${t(p.monitorizacao)}`, `Retorno: ${t(p.retorno)}`);
  return l.join("\n");
}
