// Testes automáticos da Documentação v2 (E1 a E7), sem navegador e sem login. Usa só a chave pública.
// Uso:   node scripts/testar-doc-v2.mjs
// O que confere:
//   1) as migrações foram aplicadas (tabelas e colunas novas existem e respondem sem erro);
//   2) as tabelas privadas e as da sala não vazam nada para o anônimo;
//   3) as funções novas estão no ar e recusam credencial inventada, sem devolver dados;
//   4) as funções do professor recusam chamada sem login.
// Nenhum teste chama a IA nem grava dado: todas as recusas acontecem antes. Código de saída 1 se algum teste falhar.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }),
);
const url = env.VITE_SUPABASE_URL, key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Faltam VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env");
const H = { apikey: key, Authorization: `Bearer ${key}` };

async function req(caminho, opcoes = {}) {
  try {
    const r = await fetch(`${url}${caminho}`, { ...opcoes, headers: { ...H, "Content-Type": "application/json", ...(opcoes.headers || {}) }, signal: AbortSignal.timeout(30000) });
    const texto = await r.text();
    let json = null; try { json = JSON.parse(texto); } catch { /* corpo não JSON */ }
    return { status: r.status, json, texto };
  } catch (e) { return { status: 0, json: null, texto: String(e) }; }
}
const fn = (nome, corpo) => req(`/functions/v1/${nome}`, { method: "POST", body: JSON.stringify(corpo) });
const rest = (tabela, colunas) => req(`/rest/v1/${tabela}?select=${encodeURIComponent(colunas)}&limit=1`);

const resultados = [];
async function teste(id, nome, f) {
  try { const erro = await f(); resultados.push({ id, nome, estado: erro ? "FALHOU" : "PASSOU", detalhe: erro || "" }); }
  catch (e) { resultados.push({ id, nome, estado: "FALHOU", detalhe: String(e) }); }
}

// ---------- 1 e 2: tabelas e colunas existem e não vazam ----------
// Com a tabela fechada ao anônimo, o PostgREST responde 200 e lista vazia (ou 401/403/permission denied). Tabela ou coluna inexistente dá 400/404.
const TABELAS = [
  ["documentation_rooms", "schema_version,base_conciliacao,tempo_sugerido_min,usa_paciente,documentos_extra", "E1/E3/E5"],
  ["documentation_clinical_cases", "caso_json", "E1"],
  ["documentation_v2_respostas", "id,aconselhamento_concluido_at", "E1/E3"],
  ["documentation_v2_privado", "case_id,referencia,gabarito", "E1"],
  ["documentation_v2_avaliacoes", "response_id,dados,nota,confirmada,liberada", "E2"],
  ["documentation_v2_paciente", "response_id,dados", "E3"],
  ["documentation_v2_revisoes", "id,reviewer_pair,reviewed_pair,answers_json", "E4"],
];
for (const [tabela, colunas, etapa] of TABELAS) {
  await teste(`T-${tabela}`, `${tabela} existe (${etapa}) e não vaza ao anônimo`, async () => {
    const r = await rest(tabela, colunas);
    if (r.status === 400 || r.status === 404) return `a tabela ou uma coluna não existe (status ${r.status}): falta rodar a migração da ${etapa}. ${r.texto.slice(0, 140)}`;
    if (r.status === 200 && Array.isArray(r.json) && r.json.length > 0) return `VAZOU: o anônimo leu ${r.json.length} linha(s) de ${tabela}`;
    if (![200, 401, 403].includes(r.status)) return `status inesperado ${r.status}: ${r.texto.slice(0, 140)}`;
    return null;
  });
}

// ---------- 3: funções do aluno recusam credencial inventada ----------
const FALSO = { access_code: "zzzz-codigo-inexistente", email: "ninguem.teste@example.invalid" };
const recusaAluno = (r) => {
  if (r.status === 404) return "a função não está no ar (404): falta o deploy";
  if (r.status === 0) return `sem resposta: ${r.texto.slice(0, 120)}`;
  const recusou = r.status === 403 || (r.status === 200 && r.json && r.json.ok === false);
  if (!recusou) return `status ${r.status}, esperado recusa (403 ou 200 com ok:false)`;
  const dados = r.json && Object.keys(r.json).filter((k) => !["ok", "motivo", "error", "liberada"].includes(k));
  if (dados && dados.length) return `a recusa devolveu dados (${dados.join(", ")})`;
  return null;
};
const FUNCOES_ALUNO = [
  ["doc-aluno", { action: "entrar", ...FALSO }, "E1"],
  ["doc-v2-aluno", { action: "estado", ...FALSO }, "E1"],
  ["doc-v2-devolutiva", { ...FALSO }, "E2"],
  ["doc-v2-paciente", { action: "estado", ...FALSO }, "E3"],
  ["doc-v2-revisao", { action: "estado", ...FALSO }, "E4"],
];
for (const [nome, corpo, etapa] of FUNCOES_ALUNO) {
  await teste(`F-${nome}`, `${nome} (${etapa}) está no ar e recusa credencial inventada`, async () => recusaAluno(await fn(nome, corpo)));
}
await teste("F-doc-v2-aluno-enviar", "doc-v2-aluno recusa envio com credencial inventada", async () => recusaAluno(await fn("doc-v2-aluno", { action: "enviar", ...FALSO, respostas: {} })));
await teste("F-doc-v2-paciente-checklist", "doc-v2-paciente recusa checklist com credencial inventada", async () => recusaAluno(await fn("doc-v2-paciente", { action: "checklist", ...FALSO, respostas: {} })));

// ---------- 4: funções do professor recusam chamada sem login ----------
const FUNCOES_PROF = [
  ["grade-doc-v2", { response_id: "00000000-0000-4000-8000-000000000000", criterios: [{ id: "x" }] }, "E2"],
  ["doc-v2-extras", { action: "gerar_ocorrencia", case_id: "00000000-0000-4000-8000-000000000000", extra: "ram" }, "E5"],
  ["doc-v2-paciente", { action: "gerar_persona", case_id: "00000000-0000-4000-8000-000000000000" }, "E3"],
];
for (const [nome, corpo, etapa] of FUNCOES_PROF) {
  await teste(`P-${nome}-${corpo.action || "corrigir"}`, `${nome} (${etapa}) recusa quem não está logado`, async () => {
    const r = await fn(nome, corpo);
    if (r.status === 404) return "a função não está no ar (404): falta o deploy";
    if (r.status !== 401) return `status ${r.status}, esperado 401 (sem login)`;
    return null;
  });
}

// ---------- relatório ----------
const largura = Math.max(...resultados.map((r) => r.nome.length));
for (const r of resultados) console.log(`${r.estado.padEnd(7)} ${r.id.padEnd(34)} ${r.nome.padEnd(largura)}${r.detalhe ? `\n          -> ${r.detalhe}` : ""}`);
const falhas = resultados.filter((r) => r.estado === "FALHOU").length;
console.log(`\n${resultados.length - falhas} de ${resultados.length} passaram${falhas ? `, ${falhas} falharam` : ""}.`);
process.exit(falhas ? 1 : 0);
