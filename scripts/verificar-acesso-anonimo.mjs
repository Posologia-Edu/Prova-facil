// Verifica o que o banco entrega a quem só tem a chave pública (sem login). Só leitura: conta linhas, nunca imprime dados.
// Uso: node scripts/verificar-acesso-anonimo.mjs
// Saída: tabelas que ainda devolvem linhas ao anônimo e colunas sensíveis legíveis. A lista deve encolher a cada fase.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }),
);
const url = env.VITE_SUPABASE_URL, key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Faltam VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env");

// Tabelas lidas do arquivo de tipos gerado.
const tipos = readFileSync(new URL("../src/integrations/supabase/types.ts", import.meta.url), "utf8");
const ini = tipos.indexOf("    Tables: {"), fim = tipos.indexOf("    Views: {");
const tabelas = [...tipos.slice(ini, fim).matchAll(/^      ([a-z_0-9]+): \{/gm)].map((m) => m[1]);

// Colunas que nunca podem ser legíveis ao anônimo, mesmo que a tabela seja.
const SENSIVEIS = { class_students: ["pin_hash"] };

// Tabelas abertas DE PROPÓSITO (conteúdo compartilhado em vitrine). Ajuste conforme as decisões.
const PUBLICAS_DE_PROPOSITO = new Set(["marketplace_exams", "marketplace_ratings", "marketplace_comments"]);

const h = { apikey: key, Authorization: `Bearer ${key}` };
const abertas = [], sensiveis = [];
for (const t of tabelas) {
  const r = await fetch(`${url}/rest/v1/${t}?select=*&limit=1000`, { headers: h });
  if (!r.ok) continue;
  const j = await r.json().catch(() => null);
  if (Array.isArray(j) && j.length) abertas.push([t, j.length, j[0] ? Object.keys(j[0]) : []]);
}
for (const [t, cols] of Object.entries(SENSIVEIS)) {
  for (const c of cols) {
    const r = await fetch(`${url}/rest/v1/${t}?select=${c}&limit=1`, { headers: h });
    if (r.ok) { const j = await r.json(); if (Array.isArray(j) && j.length && c in j[0]) sensiveis.push(`${t}.${c}`); }
  }
}
const alvo = abertas.filter(([t]) => !PUBLICAS_DE_PROPOSITO.has(t)).sort((a, b) => b[1] - a[1]);
console.log(`Tabelas consultadas: ${tabelas.length}`);
console.log(`Tabelas que ainda devolvem linhas ao anônimo (fora as públicas de propósito): ${alvo.length}`);
for (const [t, n] of alvo) console.log(`  ${t.padEnd(38)} ${n >= 1000 ? "1000+" : n}`);
console.log(sensiveis.length ? `\nCOLUNAS SENSÍVEIS LEGÍVEIS: ${sensiveis.join(", ")}` : "\nColunas sensíveis: nenhuma legível.");
