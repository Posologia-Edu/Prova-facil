// Testes automáticos das funções de acesso por PIN (fase 1 e 3). Chama as funções no ar pela chave pública, sem navegador.
// Uso:   node scripts/testar-funcoes-pin.mjs [--config caminho.json] [--escrever]
// Sem configuração roda só os testes que não precisam de dados (credencial inventada deve ser recusada).
// Com um arquivo de configuração (modelo: scripts/testes-pin.exemplo.json) roda também os testes que precisam de uma sala,
// um júri, uma sessão de paciente virtual etc. de teste. Cada teste cuja configuração falta aparece como PULADO.
// --escrever liga o teste B5 (envio duplicado no Júri), que GRAVA uma resposta no júri informado: use só com júri de teste.
// Nenhum teste chama a IA: todas as recusas acontecem antes dela. Código de saída 1 se algum teste falhar.
import { existsSync, readFileSync } from "node:fs";

const args = process.argv.slice(2);
const escrever = args.includes("--escrever");
const iCfg = args.indexOf("--config");
const cfgPath = iCfg >= 0 ? args[iCfg + 1] : new URL("./testes-pin.local.json", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const cfg = existsSync(decodeURIComponent(cfgPath)) ? JSON.parse(readFileSync(decodeURIComponent(cfgPath), "utf8")) : {};

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }),
);
const url = env.VITE_SUPABASE_URL, key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Faltam VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env");

async function chamar(fn, corpo) {
  try {
    const r = await fetch(`${url}/functions/v1/${fn}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(30000),
    });
    const texto = await r.text();
    let json = null; try { json = JSON.parse(texto); } catch { /* corpo não JSON */ }
    return { status: r.status, json, texto };
  } catch (e) {
    return { status: 0, json: null, texto: String(e) };
  }
}

const CODIGO_FALSO = "zzzz-codigo-inexistente";
const EMAIL_FALSO = "ninguem.teste@example.invalid";
const UUID_FALSO = "00000000-0000-4000-8000-000000000000";
const PERMITIDAS_NA_RECUSA = new Set(["ok", "motivo", "fora", "grupo", "error"]);

const resultados = [];
const registrar = (id, nome, estado, detalhe = "") => resultados.push({ id, nome, estado, detalhe });
const pular = (id, nome, falta) => registrar(id, nome, "PULADO", `falta ${falta}`);

/** Recusa por regra de negócio: 200 com ok:false, o motivo esperado e nenhum dado além dos campos de recusa. */
function recusa(r, motivo) {
  if (r.status !== 200 || !r.json) return `status ${r.status}, esperado 200 com ok:false`;
  if (r.json.ok !== false) return `ok=${r.json.ok}, esperado false`;
  if (motivo && r.json.motivo !== motivo) return `motivo "${r.json.motivo}", esperado "${motivo}"`;
  const extra = Object.keys(r.json).filter((k) => !PERMITIDAS_NA_RECUSA.has(k));
  if (extra.length) return `a recusa devolveu dados (${extra.join(", ")})`;
  return null;
}
const statusEsperado = (r, st) => (r.status === st ? null : `status ${r.status}, esperado ${st}`);

async function teste(id, nome, fn) {
  try {
    const erro = await fn();
    registrar(id, nome, erro ? "FALHOU" : "OK", erro || "");
  } catch (e) {
    registrar(id, nome, "FALHOU", String(e));
  }
}
/** Executa várias verificações e junta os erros. */
async function todas(...verificacoes) {
  const erros = [];
  for (const [rotulo, v] of verificacoes) { const e = await v(); if (e) erros.push(`${rotulo}: ${e}`); }
  return erros.length ? erros.join(" | ") : null;
}

// ---------- A5: Documentação, módulos de saúde e Reconciliação ----------
await teste("A5a", "doc-aluno recusa sala inexistente e dados incompletos", () => todas(
  ["sala falsa", async () => recusa(await chamar("doc-aluno", { action: "entrar", access_code: CODIGO_FALSO, email: EMAIL_FALSO }), "sala")],
  ["código curto", async () => statusEsperado(await chamar("doc-aluno", { action: "entrar", access_code: "a", email: EMAIL_FALSO }), 400)],
  ["envio sem sala", async () => recusa(await chamar("doc-aluno", { action: "enviar", access_code: CODIGO_FALSO, email: EMAIL_FALSO, referral_answers: {}, med_rows: [] }), "sala")],
));
await teste("A5b", "area-aluno recusa sala inexistente nos 6 módulos e módulo inválido", () => todas(
  ...["nursing", "nutrition", "dentistry", "medicine", "physiotherapy", "biomedicine"].map((m) =>
    [m, async () => recusa(await chamar("area-aluno", { modulo: m, action: "entrar", access_code: CODIGO_FALSO, email: EMAIL_FALSO }), "sala")]),
  ["módulo inválido", async () => statusEsperado(await chamar("area-aluno", { modulo: "x", action: "entrar", access_code: CODIGO_FALSO, email: EMAIL_FALSO }), 400)],
));
await teste("A5c", "recon-aluno recusa sala inexistente", async () =>
  recusa(await chamar("recon-aluno", { action: "entrar", access_code: CODIGO_FALSO, email: EMAIL_FALSO }), "sala"));

if (cfg.documentacao?.codigo) await teste("A5d", "doc-aluno recusa e-mail que não é da sala (sala real)", async () =>
  recusa(await chamar("doc-aluno", { action: "entrar", access_code: cfg.documentacao.codigo, email: EMAIL_FALSO }), "email"));
else pular("A5d", "doc-aluno recusa e-mail que não é da sala", "documentacao.codigo");

if (cfg.area?.codigo && cfg.area?.modulo) await teste("A5e", "area-aluno recusa e-mail que não é da sala (sala real)", async () =>
  recusa(await chamar("area-aluno", { modulo: cfg.area.modulo, action: "entrar", access_code: cfg.area.codigo, email: EMAIL_FALSO }), "email"));
else pular("A5e", "area-aluno recusa e-mail que não é da sala", "area.codigo e area.modulo");

if (cfg.reconciliacao?.codigo) await teste("A5f", "recon-aluno recusa e-mail que não é da sala (sala real)", async () =>
  recusa(await chamar("recon-aluno", { action: "entrar", access_code: cfg.reconciliacao.codigo, email: EMAIL_FALSO }), "email"));
else pular("A5f", "recon-aluno recusa e-mail que não é da sala", "reconciliacao.codigo");

// ---------- B1 e B5: Júri ----------
await teste("B1a", "juri-aluno recusa código de júri inexistente", async () =>
  recusa(await chamar("juri-aluno", { action: "entrar", access_code: CODIGO_FALSO, email: EMAIL_FALSO }), "juri"));

const j = cfg.juri || {};
if (j.codigo) await teste("B1b", "juri-aluno recusa e-mail que não está em nenhum grupo", async () =>
  recusa(await chamar("juri-aluno", { action: "entrar", access_code: j.codigo, email: EMAIL_FALSO }), "email"));
else pular("B1b", "juri-aluno recusa e-mail fora dos grupos", "juri.codigo");

if (j.codigo && j.emailGrupoA && j.emailGrupoB) await teste("B1c", "juri-aluno bloqueia e-mail de outro grupo (verificar no modo grupo)", async () =>
  recusa(await chamar("juri-aluno", { action: "verificar", access_code: j.codigo, modo: "group", emails: [j.emailGrupoA, j.emailGrupoB] }), "fora_do_grupo"));
else pular("B1c", "juri-aluno bloqueia e-mail de outro grupo", "juri.codigo, juri.emailGrupoA e juri.emailGrupoB (grupos diferentes)");

if (!escrever) pular("B5", "juri-aluno recusa o 2º envio do mesmo formulário", "a opção --escrever (grava uma resposta no júri)");
else if (!(j.codigo && j.emailGrupoA && j.formId && j.sessionId)) pular("B5", "juri-aluno recusa o 2º envio do mesmo formulário", "juri.codigo, juri.emailGrupoA, juri.formId e juri.sessionId");
else await teste("B5", "juri-aluno recusa o 2º envio do mesmo formulário", async () => {
  const corpo = { action: "enviar", access_code: j.codigo, email: j.emailGrupoA, form_id: j.formId, session_id: j.sessionId, answers: { teste_automatico: true } };
  const um = await chamar("juri-aluno", corpo);
  const dois = await chamar("juri-aluno", corpo);
  if (um.status !== 200 || !um.json) return `1º envio: status ${um.status} ${um.json?.error || ""} (a sessão precisa estar aberta e o formulário ser do papel do grupo)`;
  return recusa(dois, "ja_enviado") && `2º envio: ${recusa(dois, "ja_enviado")}`;
});

// ---------- C8: IA do paciente virtual ----------
const msgs = [{ role: "user", content: "teste" }];
await teste("C8a", "virtual-patient-chat recusa chamada anônima sem sessão ou com sessão inexistente", () => todas(
  ["sem sessão", async () => statusEsperado(await chamar("virtual-patient-chat", { patientId: "pain_helena", messages: msgs }), 401)],
  ["sessão inexistente", async () => statusEsperado(await chamar("virtual-patient-chat", { patientId: "pain_helena", messages: msgs, sessionId: UUID_FALSO }), 401)],
));
await teste("C8b", "measure-virtual-patient-vitals recusa chamada anônima sem sessão ou com sessão inexistente", () => todas(
  ["sem sessão", async () => statusEsperado(await chamar("measure-virtual-patient-vitals", { patientId: "pain_helena", encounter: 1, transcript: [] }), 401)],
  ["sessão inexistente", async () => statusEsperado(await chamar("measure-virtual-patient-vitals", { patientId: "pain_helena", encounter: 1, transcript: [], sessionId: UUID_FALSO }), 401)],
));
const v = cfg.pacienteVirtual || {};
if (v.sessaoAbertaId && v.pacienteDaSessao) await teste("C8c", "IA recusa sessão de OUTRO paciente (chat e sinais vitais)", () => todas(
  ["chat", async () => statusEsperado(await chamar("virtual-patient-chat", { patientId: v.pacienteDaSessao + "_outro", messages: msgs, sessionId: v.sessaoAbertaId }), 403)],
  ["sinais vitais", async () => statusEsperado(await chamar("measure-virtual-patient-vitals", { patientId: v.pacienteDaSessao + "_outro", encounter: 1, transcript: [], sessionId: v.sessaoAbertaId }), 403)],
));
else pular("C8c", "IA recusa sessão de outro paciente", "pacienteVirtual.sessaoAbertaId e pacienteVirtual.pacienteDaSessao");
if (v.sessaoConcluidaId && v.pacienteDaSessaoConcluida) await teste("C8d", "IA recusa sessão já concluída (chat e sinais vitais)", () => todas(
  ["chat", async () => statusEsperado(await chamar("virtual-patient-chat", { patientId: v.pacienteDaSessaoConcluida, messages: msgs, sessionId: v.sessaoConcluidaId }), 403)],
  ["sinais vitais", async () => statusEsperado(await chamar("measure-virtual-patient-vitals", { patientId: v.pacienteDaSessaoConcluida, encounter: 1, transcript: [], sessionId: v.sessaoConcluidaId }), 403)],
));
else pular("C8d", "IA recusa sessão concluída", "pacienteVirtual.sessaoConcluidaId e pacienteVirtual.pacienteDaSessaoConcluida");

// ---------- D4: OSCE ----------
if (cfg.osce?.estacaoId) await teste("D4", "osce-virtual-patient exige o código do circuito", () => todas(
  ["sem código", async () => statusEsperado(await chamar("osce-virtual-patient", { stationId: cfg.osce.estacaoId, messages: msgs }), 401)],
  ["código errado", async () => statusEsperado(await chamar("osce-virtual-patient", { stationId: cfg.osce.estacaoId, messages: msgs, accessCode: CODIGO_FALSO }), 401)],
));
else pular("D4", "osce-virtual-patient exige o código do circuito", "osce.estacaoId (estação com circuito em andamento)");

// ---------- F5: Gamificação e Portfólio ----------
await teste("F5a", "gamificacao-aluno recusa sessão inexistente e dados malformados", () => todas(
  ["sessão falsa (gamificação)", async () => recusa(await chamar("gamificacao-aluno", { action: "gamificacao", email: EMAIL_FALSO, session_id: UUID_FALSO }), "sessao")],
  ["sessão falsa (portfólio)", async () => recusa(await chamar("gamificacao-aluno", { action: "portfolio", email: EMAIL_FALSO, session_id: UUID_FALSO }), "sessao")],
  ["id que não é UUID", async () => statusEsperado(await chamar("gamificacao-aluno", { action: "gamificacao", email: EMAIL_FALSO, session_id: "abc" }), 400)],
));
const g = cfg.gamificacao || {};
if (g.sessionId && g.email) {
  await teste("F5b", "gamificacao-aluno recusa e-mail que não é o dono da sessão", () => todas(
    ["gamificação", async () => recusa(await chamar("gamificacao-aluno", { action: "gamificacao", email: EMAIL_FALSO, session_id: g.sessionId }), "sessao")],
    ["portfólio", async () => recusa(await chamar("gamificacao-aluno", { action: "portfolio", email: EMAIL_FALSO, session_id: g.sessionId }), "sessao")],
  ));
  await teste("F5c", "gamificacao-aluno com a credencial certa mascara os outros alunos no ranking", async () => {
    const r = await chamar("gamificacao-aluno", { action: "gamificacao", email: g.email, session_id: g.sessionId });
    if (r.status !== 200 || r.json?.ok !== true) return `status ${r.status}, ok=${r.json?.ok}, motivo=${r.json?.motivo}`;
    const ranking = r.json.ranking;
    if (!Array.isArray(ranking)) return "resposta sem ranking";
    const vazados = ranking.filter((x) => !x.eu && !String(x.rotulo).endsWith("***"));
    if (vazados.length) return `${vazados.length} colega(s) sem máscara no ranking`;
    if (ranking.some((x) => !x.eu && String(x.rotulo).includes("@"))) return "e-mail de colega no ranking";
    return null;
  });
} else {
  pular("F5b", "gamificacao-aluno recusa e-mail que não é o dono da sessão", "gamificacao.sessionId e gamificacao.email");
  pular("F5c", "gamificacao-aluno mascara os outros alunos no ranking", "gamificacao.sessionId e gamificacao.email");
}

// ---------- relatório ----------
const largura = Math.max(...resultados.map((r) => r.id.length));
for (const r of resultados) {
  const marca = r.estado === "OK" ? "OK     " : r.estado === "FALHOU" ? "FALHOU " : "PULADO ";
  console.log(`${marca} ${r.id.padEnd(largura)}  ${r.nome}${r.detalhe ? `\n        ${r.detalhe}` : ""}`);
}
const n = (e) => resultados.filter((r) => r.estado === e).length;
console.log(`\n${n("OK")} ok, ${n("FALHOU")} falharam, ${n("PULADO")} pulados (total ${resultados.length}).`);
if (n("PULADO")) console.log("Pulados precisam de dados de teste: veja scripts/testes-pin.exemplo.json.");
process.exit(n("FALHOU") ? 1 : 0);
