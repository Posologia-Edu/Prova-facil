// Cria (e apaga) os dados de teste que o scripts/testar-funcoes-pin.mjs precisa, entrando com a SUA conta de professor.
// Tudo é criado com o prefixo "[TESTE-AUTO]" no nome e com e-mails @example.invalid, e cada id fica anotado em
// scripts/testes-pin.dados.json para o comando "apagar" remover exatamente o que foi criado.
//
// Uso (PowerShell):
//   $env:PROVA_EMAIL="seu@email"; $env:PROVA_SENHA="sua senha"
//   node scripts/dados-teste-pin.mjs criar    # cria tudo e grava scripts/testes-pin.local.json
//   node scripts/testar-funcoes-pin.mjs --escrever
//   node scripts/dados-teste-pin.mjs apagar   # remove o que "criar" fez
// A senha só é lida da variável de ambiente; nada dela é gravado em arquivo.
// Cada item é criado de forma independente: se um falhar (política de acesso, coluna nova), o script avisa e segue,
// e o teste correspondente continua aparecendo como PULADO.
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";

const acao = process.argv[2];
if (!["criar", "apagar"].includes(acao)) { console.log("Uso: node scripts/dados-teste-pin.mjs criar|apagar"); process.exit(1); }

const caminho = (nome) => decodeURIComponent(new URL(`./${nome}`, import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
const ARQ_DADOS = caminho("testes-pin.dados.json");
const ARQ_CFG = caminho("testes-pin.local.json");

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }),
);
const url = env.VITE_SUPABASE_URL, chave = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !chave) throw new Error("Faltam VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env");
if (!process.env.PROVA_EMAIL || !process.env.PROVA_SENHA) {
  console.error("Defina PROVA_EMAIL e PROVA_SENHA (conta de professor) nas variáveis de ambiente.");
  process.exit(1);
}

// ---------- login ----------
const lg = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST", headers: { apikey: chave, "Content-Type": "application/json" },
  body: JSON.stringify({ email: process.env.PROVA_EMAIL, password: process.env.PROVA_SENHA }),
});
const sessao = await lg.json();
if (!lg.ok || !sessao.access_token) { console.error("Login recusado:", sessao.error_description || sessao.msg || lg.status); process.exit(1); }
const eu = sessao.user.id;
const H = { apikey: chave, Authorization: `Bearer ${sessao.access_token}`, "Content-Type": "application/json" };

async function rest(metodo, caminhoRest, corpo) {
  const r = await fetch(`${url}/rest/v1/${caminhoRest}`, {
    method: metodo, headers: { ...H, Prefer: "return=representation" }, body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* sem corpo */ }
  if (!r.ok) throw new Error(`${metodo} ${caminhoRest.split("?")[0]}: ${j?.message || t || r.status}`);
  return j;
}

// ---------- apagar ----------
if (acao === "apagar") {
  if (!existsSync(ARQ_DADOS)) { console.log("Nada para apagar: scripts/testes-pin.dados.json não existe."); process.exit(0); }
  const dados = JSON.parse(readFileSync(ARQ_DADOS, "utf8"));
  const ordem = [...dados.criados].reverse(); // filhos antes dos pais
  let falhas = 0;
  // respostas gravadas pelo teste B5 não passam pelo "criar": apaga pelas sessões do júri de teste
  for (const c of dados.criados.filter((x) => x.tabela === "mock_trial_sessions")) {
    try { await rest("DELETE", `mock_trial_responses?session_id=eq.${c.id}`); } catch (e) { console.warn("  aviso:", e.message); }
  }
  for (const c of ordem) {
    try { await rest("DELETE", `${c.tabela}?${c.coluna || "id"}=eq.${encodeURIComponent(c.id)}`); console.log(`apagado  ${c.tabela} ${c.id}`); }
    catch (e) { falhas++; console.warn(`FALHOU   ${e.message}`); }
  }
  if (!falhas) { unlinkSync(ARQ_DADOS); if (existsSync(ARQ_CFG)) unlinkSync(ARQ_CFG); console.log("Dados de teste removidos."); }
  else console.log(`${falhas} item(ns) não apagado(s); o arquivo de ids foi mantido. Rode "apagar" de novo ou remova pelo painel.`);
  process.exit(falhas ? 1 : 0);
}

// ---------- criar ----------
if (existsSync(ARQ_DADOS)) { console.error("Já existem dados de teste (scripts/testes-pin.dados.json). Rode 'apagar' antes de criar de novo."); process.exit(1); }
const NOME = "[TESTE-AUTO]";
const criados = [];
const cfg = {};
const aviso = [];

async function criarLinha(tabela, linha) {
  const [r] = await rest("POST", tabela, linha);
  criados.push({ tabela, id: r.id });
  return r;
}
async function bloco(rotulo, fn) {
  try { await fn(); console.log(`criado   ${rotulo}`); }
  catch (e) { aviso.push(`${rotulo}: ${e.message}`); console.warn(`FALHOU   ${rotulo}: ${e.message}`); }
}
const salvar = () => writeFileSync(ARQ_DADOS, JSON.stringify({ criados }, null, 2));

await bloco("Documentação (sala ativa)", async () => {
  const s = await criarLinha("documentation_rooms", { user_id: eu, title: `${NOME} Documentação`, status: "active" });
  cfg.documentacao = { codigo: s.access_code };
});
await bloco("Módulo de saúde: Enfermagem (sala ativa)", async () => {
  const s = await criarLinha("nursing_rooms", { user_id: eu, title: `${NOME} Enfermagem`, status: "active" });
  cfg.area = { modulo: "nursing", codigo: s.access_code };
});
await bloco("Reconciliação (sala ativa)", async () => {
  const s = await criarLinha("reconciliation_rooms", { user_id: eu, title: `${NOME} Reconciliação`, status: "active" });
  cfg.reconciliacao = { codigo: s.access_code };
});

await bloco("Júri (2 grupos, 1 caso, sessão aberta, 1 formulário)", async () => {
  const jr = await criarLinha("mock_trials", { user_id: eu, title: `${NOME} Júri`, status: "active" });
  const ga = await criarLinha("mock_trial_groups", { mock_trial_id: jr.id, name: "Grupo A (teste)", group_number: 1 });
  const gb = await criarLinha("mock_trial_groups", { mock_trial_id: jr.id, name: "Grupo B (teste)", group_number: 2 });
  const emailA = "aluno.a.teste-auto@example.invalid", emailB = "aluno.b.teste-auto@example.invalid";
  await criarLinha("mock_trial_students", { mock_trial_id: jr.id, group_id: ga.id, student_name: "Aluno A (teste)", student_email: emailA });
  await criarLinha("mock_trial_students", { mock_trial_id: jr.id, group_id: gb.id, student_name: "Aluno B (teste)", student_email: emailB });
  const caso = await criarLinha("mock_trial_cases", { mock_trial_id: jr.id, position: 1, case_number: 1, title: `${NOME} Caso`, process_content: "Processo de teste.", generation_status: "done" });
  await criarLinha("mock_trial_assignments", { case_id: caso.id, group_id: ga.id, role: "prosecution" });
  const ses = await criarLinha("mock_trial_sessions", { case_id: caso.id, status: "prosecution", phase_duration_seconds: 600, current_phase_started_at: new Date().toISOString() });
  const form = await criarLinha("mock_trial_forms", { mock_trial_id: jr.id, target_role: "prosecution", title: `${NOME} Formulário`, fields_json: [] });
  cfg.juri = { codigo: jr.access_code, emailGrupoA: emailA, emailGrupoB: emailB, formId: form.id, sessionId: ses.id };
});

await bloco("Paciente virtual (uma sessão aberta e uma concluída)", async () => {
  const aberta = await criarLinha("virtual_patient_sessions", { patient_id: "pain_helena", user_id: eu, student_name: `${NOME} aluno`, status: "active" });
  const concl = await criarLinha("virtual_patient_sessions", { patient_id: "pain_helena", user_id: eu, student_name: `${NOME} aluno`, status: "completed" });
  cfg.pacienteVirtual = { sessaoAbertaId: aberta.id, pacienteDaSessao: "pain_helena", sessaoConcluidaId: concl.id, pacienteDaSessaoConcluida: "pain_helena" };
});

await bloco("OSCE (prova, estação com paciente virtual, circuito em andamento)", async () => {
  const ex = await criarLinha("osce_exams", { user_id: eu, title: `${NOME} OSCE` });
  const est = await criarLinha("osce_stations", { osce_exam_id: ex.id, title: `${NOME} Estação`, position: 1, virtual_patient_enabled: true, patient_script: "Paciente de teste." });
  await criarLinha("osce_circuits", { osce_exam_id: ex.id, user_id: eu, status: "running" });
  cfg.osce = { estacaoId: est.id };
});

await bloco("Gamificação (prova, publicação, sessão de aluno e pontos)", async () => {
  const ex = await criarLinha("exams", { user_id: eu, title: `${NOME} Prova` });
  const pub = await criarLinha("exam_publications", { exam_id: ex.id, user_id: eu });
  const emailG = "aluno.gami.teste-auto@example.invalid";
  const ss = await criarLinha("exam_sessions", { publication_id: pub.id, student_email: emailG, student_name: `${NOME} aluno` });
  cfg.gamificacao = { sessionId: ss.id, email: emailG };
  // pontos do aluno e de um colega, para o ranking ter alguém a mascarar; se a tabela recusar, só o teste do ranking fica fraco
  try {
    await criarLinha("student_points", { student_email: emailG, source: "teste-auto", points: 10 });
    await criarLinha("student_points", { student_email: "colega.teste-auto@example.invalid", source: "teste-auto", points: 20 });
  } catch (e) { aviso.push(`pontos para o ranking: ${e.message}`); }
});

salvar();
writeFileSync(ARQ_CFG, JSON.stringify(cfg, null, 2));
console.log(`\n${criados.length} registros criados. Configuração gravada em scripts/testes-pin.local.json.`);
if (aviso.length) console.log(`\nAvisos (${aviso.length}):\n  - ${aviso.join("\n  - ")}\nO que falhou fica PULADO no script de testes. Dados parciais já criados serão removidos por "apagar".`);
console.log("\nPróximo passo: node scripts/testar-funcoes-pin.mjs --escrever   e depois   node scripts/dados-teste-pin.mjs apagar");
