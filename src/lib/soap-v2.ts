import type { FormField } from "@/components/forms/types";
import { formatAnswerText } from "@/components/forms/FormAnswersView";
import {
  SOAP_V2,
  SOAP_V2_ALERTA,
  SOAP_V2_LINHAS_PLANO,
  SOAP_V2_LINHAS_PROBLEMAS,
} from "@/lib/form-templates/pharmacy-soap-v2";

// Lógica do SOAP v2 (sem rede): pré-montagem de S e O a partir do registro da anamnese e verificador de coerência.

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").replace(/[\s:.?]+$/g, "").trim();

type Registro = { fields: FormField[]; answers: Record<string, any> };

/** Acesso ao registro por rótulo do campo (o rótulo é estável; os ids podem mudar se o professor editar o modelo). */
function leitor({ fields, answers }: Registro) {
  const porRotulo = new Map<string, FormField[]>();
  for (const f of fields) {
    if (f.type === "section_header") continue;
    const k = norm(f.label);
    porRotulo.set(k, [...(porRotulo.get(k) || []), f]);
  }
  const achar = (rotulo: string, tipo?: string): FormField | undefined => {
    const lista = porRotulo.get(norm(rotulo)) || [];
    return tipo ? lista.find((f) => f.type === tipo) : lista[0];
  };
  const texto = (rotulo: string, tipo?: string): string => {
    const f = achar(rotulo, tipo);
    if (!f) return "";
    const v = formatAnswerText(f, answers[f.id]);
    return v === "—" ? "" : v.trim();
  };
  const matriz = (rotulo: string): string[][] => {
    const f = achar(rotulo, "table");
    const v = f ? answers[f.id] : null;
    return Array.isArray(v) ? v : [];
  };
  /** Linhas "Rótulo: valor" para os campos preenchidos. Cada item é o rótulo do registro ou [rótulo do registro, rótulo curto]. */
  const linhas = (itens: Array<string | [string, string]>): string =>
    itens
      .map((it) => {
        const [rot, curto] = Array.isArray(it) ? it : [it, it];
        const v = texto(rot);
        return v ? `${curto}: ${v}` : "";
      })
      .filter(Boolean)
      .join("\n");
  return { texto, matriz, linhas };
}

const vazio = (m: string[][] | undefined) => !m || m.every((l) => (l || []).every((c) => !String(c ?? "").trim()));

/**
 * Monta as respostas iniciais do SOAP v2 (S, O e partes de A e P) com o que o aluno registrou na anamnese.
 * Só reorganiza texto que já existe: não interpreta nada e nada vem do roteiro do paciente.
 */
export function montarSoapV2(registro: Registro): Record<string, any> {
  const r = leitor(registro);
  const out: Record<string, any> = {};
  const set = (id: string, v: any) => {
    if (Array.isArray(v) ? !vazio(v as string[][]) : v) out[id] = v;
  };

  // S
  set(SOAP_V2.queixa, r.texto("Motivo principal da consulta nas palavras do paciente"));
  set(SOAP_V2.historia, r.linhas([
    "Queixa/sintoma",
    "Início e evolução",
    "Duração/frequência e quando ocorre",
    "Localização e intensidade, quando aplicável",
    "O que desencadeia/piora",
    "O que melhora e medidas já tentadas",
    "Sintomas associados",
    "Impacto nas atividades diárias",
    "Já ocorreu antes?",
    "Se já ocorreu, quando",
    "Eventos relacionados",
    "Detalhes/outros eventos",
  ]));
  set(SOAP_V2.adesao, r.linhas([
    ["Muitas pessoas às vezes esquecem ou deixam de tomar algum medicamento. Isso acontece com você?", "Esquece ou deixa de tomar"],
    "Período referido",
    "Medicamento(s) e situações em que não usa",
    "Motivos",
    "Outro motivo (qual?)",
    "Modificou dose ou interrompeu por conta própria?",
    "Qual medicamento, quando e por quê",
    "Quem organiza/administra os medicamentos?",
  ]));
  const desconf = [r.texto("Desconfortos relacionados a medicamentos", "radio"), r.texto("Desconfortos relacionados a medicamentos", "table")].filter(Boolean);
  set(SOAP_V2.desconfortos, desconf.join("\n"));
  set(SOAP_V2.perspectiva, r.linhas([
    ["O que mais preocupa você em relação ao seu problema de saúde?", "Preocupação"],
    ["O que você acha que pode estar causando esse problema?", "O que acha que causa"],
    ["O que você espera deste atendimento?", "Expectativa"],
  ]));
  set(SOAP_V2.contexto, r.linhas([
    "Tabagismo",
    "Tabagismo: quantidade e tempo",
    "Álcool",
    "Álcool: quantidade e frequência",
    "Café/cafeína",
    "Ingestão de água",
    "Alimentação",
    "Sono",
    "Atividade física",
    "Mobilidade, dor e limitações",
    "Mora",
    "Mora com outros (quem?)",
    "Rede de apoio/cuidador",
    ["Obtém os medicamentos regularmente?", "Obtém os medicamentos regularmente"],
    "Barreiras",
    "Outra barreira (qual?)",
  ]));

  // O
  set(SOAP_V2.parametros, r.matriz("Parâmetros clínicos"));
  const alerta = r.texto("Sinais de alerta");
  if (SOAP_V2_ALERTA.includes(alerta)) out[SOAP_V2.alerta] = alerta;
  set(SOAP_V2.alertaDesc, r.linhas([
    ["Descrição dos sinais e conduta adotada", "Sinais e conduta"],
    "Encaminhamento imediato",
    "Motivo/destino do encaminhamento imediato",
  ]));
  // Medicamentos em uso: [medicamento, dose e via, horário/frequência, indicação, como realmente usa] -> [medicamento, prescrito, uso real, discrepância]
  const meds = r.matriz("Medicamentos em uso")
    .map((l) => [
      String(l?.[0] ?? "").trim(),
      [l?.[1], l?.[2]].map((x) => String(x ?? "").trim()).filter(Boolean).join(", "),
      String(l?.[4] ?? "").trim(),
      "",
    ])
    .filter((l) => l[0] || l[1] || l[2]);
  set(SOAP_V2.farmaco, meds.slice(0, 6));
  set(SOAP_V2.fonte, r.linhas([
    "Fonte de confirmação",
    "Outra fonte de confirmação (qual?)",
    "Mudanças recentes",
    "Produto, dose, data e motivo da mudança",
    "Medicamentos pendentes de confirmação e como serão confirmados",
  ]));
  const outros = r.linhas(["Outros produtos", "Outros produtos (quais?)"]);
  const outrosTab = r.texto("Produtos sem prescrição, chás, fitoterápicos e suplementos", "table");
  set(SOAP_V2.outros, [outros, outrosTab].filter(Boolean).join("\n"));
  set(SOAP_V2.clinico, [
    r.linhas([
      "Alergias",
      "Substância",
      "Reação e quando ocorreu",
    ]),
    r.texto("Condições e problemas de saúde", "table"),
    r.linhas([
      "Internações",
      "Internações: motivo e data",
      "Cirurgias",
      "Cirurgias: quais e quando",
      "Antecedentes familiares relevantes",
      "Outros antecedentes, gestação ou lactação quando pertinente",
      "Exames relevantes com resultado e data",
    ]),
  ].filter(Boolean).join("\n"));

  // A (só o que o aluno já escreveu no registro; o restante ele faz aqui)
  set(SOAP_V2.sintese, r.texto("Síntese clínica e farmacoterapêutica validada com o paciente"));
  const problemas = [r.texto("Problema prioritário 1"), r.texto("Problema prioritário 2"), r.texto("Problema prioritário 3")]
    .filter(Boolean)
    .map((p) => [p, "", "", "", ""]);
  set(SOAP_V2.problemas, problemas);
  set(SOAP_V2.lacunas, r.linhas([
    ["Possíveis problemas identificados pelo aluno/profissional", "Categorias assinaladas no registro"],
    ["Hipóteses clínicas e farmacoterapêuticas", "Hipóteses"],
    "Informações que ainda preciso obter",
    "Sinais de alerta que preciso excluir",
  ]));

  // P
  const plano = r.matriz("Plano pactuado")
    .map((l) => ["", String(l?.[0] ?? "").trim(), "", String(l?.[1] ?? "").trim(), String(l?.[2] ?? "").trim()])
    .filter((l) => l[1] || l[3] || l[4]);
  set(SOAP_V2.plano, plano.slice(0, SOAP_V2_LINHAS_PLANO));
  set(SOAP_V2.orientacoes, r.linhas([
    "Orientações de segurança e quando procurar atendimento",
    ["Resposta do paciente", "Resposta do paciente à verificação"],
    "Compreensão do paciente",
  ]));
  set(SOAP_V2.seguimento, r.linhas([
    "Intervenções",
    "Outra intervenção (qual?)",
    ["Encaminhamento", "Encaminhamento"],
    "Encaminhamento: para quem, motivo e prazo",
    "Seguimento",
    "Retorno em (dias/semanas) e data",
  ]));
  return out;
}

export type AvisoSoap = { id: string; nivel: "aviso" | "ok"; parte: "S" | "O" | "A" | "P"; texto: string };

const celula = (m: any, r: number, c: number): string => String(Array.isArray(m) ? m[r]?.[c] ?? "" : "").trim();

/**
 * Verificador de coerência do SOAP v2. Regras fixas, sem IA: só avisa, nunca bloqueia o envio.
 * Lê a lista de problemas (A) e o plano (P) e confere se um sustenta o outro.
 */
export function verificarCoerencia(answers: Record<string, any>): AvisoSoap[] {
  const avisos: AvisoSoap[] = [];
  const aviso = (id: string, parte: AvisoSoap["parte"], texto: string) => avisos.push({ id, nivel: "aviso", parte, texto });
  const txt = (id: string) => String(answers[id] ?? "").trim();

  if (!txt(SOAP_V2.queixa)) aviso("s-queixa", "S", "A queixa principal está em branco.");

  if (answers[SOAP_V2.alerta] === "Presentes" && !txt(SOAP_V2.alertaDesc)) {
    aviso("o-alerta", "O", "Você marcou sinais de alerta presentes, mas não descreveu os sinais nem a conduta.");
  }
  if (answers[SOAP_V2.alerta] === "Presentes" && !txt(SOAP_V2.seguimento)) {
    aviso("p-alerta", "P", "Há sinais de alerta e o encaminhamento e seguimento estão em branco.");
  }

  const prob = answers[SOAP_V2.problemas];
  const plano = answers[SOAP_V2.plano];
  const problemas: number[] = [];
  for (let r = 0; r < SOAP_V2_LINHAS_PROBLEMAS; r++) if (celula(prob, r, 0)) problemas.push(r);
  const acoes: number[] = [];
  for (let r = 0; r < SOAP_V2_LINHAS_PLANO; r++) if ([1, 2, 3, 4].some((c) => celula(plano, r, c))) acoes.push(r);

  if (!txt(SOAP_V2.sintese)) aviso("a-sintese", "A", "A síntese clínica está em branco.");
  if (problemas.length === 0) aviso("a-vazia", "A", "A lista de problemas está vazia.");

  for (const r of problemas) {
    const p = `P${r + 1}`;
    if (!celula(prob, r, 2)) aviso(`a-ev-${p}`, "A", `${p} não tem evidência do S ou do O.`);
    if (!celula(prob, r, 1)) aviso(`a-cat-${p}`, "A", `${p} não tem categoria.`);
    if (!celula(prob, r, 3)) aviso(`a-pri-${p}`, "A", `${p} não tem prioridade.`);
    const dele = acoes.filter((a) => celula(plano, a, 0) === p);
    if (dele.length === 0) {
      aviso(`p-sem-${p}`, "P", `${p} não tem ação no plano.`);
    } else if (celula(prob, r, 3) === "Alta" && dele.every((a) => !celula(plano, a, 2))) {
      aviso(`p-meta-${p}`, "P", `${p} é de prioridade alta e nenhuma ação dele tem meta.`);
    }
  }

  const existentes = new Set(problemas.map((r) => `P${r + 1}`));
  for (const a of acoes) {
    const ref = celula(plano, a, 0);
    if (!ref) aviso(`p-orf-${a}`, "P", `A ação da linha ${a + 1} não está ligada a um problema.`);
    else if (!existentes.has(ref)) aviso(`p-inex-${a}`, "P", `A ação da linha ${a + 1} aponta para ${ref}, que não está na lista de problemas.`);
    else if (!celula(plano, a, 1)) aviso(`p-vaz-${a}`, "P", `A linha ${a + 1} do plano liga ${ref} a uma ação, mas a ação está em branco.`);
  }

  if (avisos.length === 0) avisos.push({ id: "ok", nivel: "ok", parte: "P", texto: "Todos os problemas têm evidência e ação, e as ações de prioridade alta têm meta." });
  return avisos;
}

/** Quantos campos do SOAP o aluno já tocou, por parte (S, O, A, P), para a barra de progresso. */
export function progressoPorParte(fields: FormField[], answers: Record<string, any>): Array<{ titulo: string; feitos: number; total: number }> {
  const partes: Array<{ titulo: string; feitos: number; total: number }> = [];
  for (const f of fields) {
    if (f.type === "section_header") { partes.push({ titulo: f.label, feitos: 0, total: 0 }); continue; }
    const atual = partes[partes.length - 1];
    if (!atual) continue;
    atual.total++;
    const v = answers[f.id];
    const preenchido = f.type === "table"
      ? Array.isArray(v) && v.some((l: any) => (l || []).some((c: any) => String(c ?? "").trim()))
      : Array.isArray(v) ? v.length > 0 : String(v ?? "").trim() !== "";
    if (preenchido) atual.feitos++;
  }
  return partes;
}
