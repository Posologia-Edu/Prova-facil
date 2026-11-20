// Teste de Progresso, lado do ALUNO. A prova é aberta por link (id do teste); não há lista de alunos.
// Ações:
//  - "exame": título, descrição, anos-alvo e questões SEM a resposta certa nem explicações (só enunciado, alternativas e área).
//  - "iniciar": cria a sessão do aluno (só com o teste publicado).
//  - "enviar": recebe as respostas, corrige AQUI (o gabarito não sai do servidor), grava e devolve o resultado.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseConteudo(raw: unknown): any {
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return null; } }
  return raw && typeof raw === "object" ? raw : null;
}

// O aluno só recebe o que a tela usa. Alternativas em lista perdem qualquer marca de "correta".
function conteudoDoAluno(c: any) {
  if (!c) return null;
  const opts = c.options;
  const options = Array.isArray(opts)
    ? opts.map((o: any, i: number) => (typeof o === "string" ? o : { ...(o?.id !== undefined ? { id: o.id } : {}), text: o?.text ?? "" }))
    : opts && typeof opts === "object" ? opts : undefined;
  const saida: Record<string, unknown> = { options };
  for (const k of ["stem", "question_text", "statement", "subject_area"]) if (c[k] !== undefined) saida[k] = c[k];
  return saida;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const b = await req.json();
    const { action } = b;
    if (!["exame", "iniciar", "enviar"].includes(action)) return json({ error: "Ação inválida" }, 400);
    const db = adminClient();

    if (action === "enviar") {
      if (typeof b.session_id !== "string" || !UUID.test(b.session_id)) return json({ error: "Dados inválidos" }, 400);
      const respostas = b.answers && typeof b.answers === "object" && !Array.isArray(b.answers) ? b.answers : {};
      const { data: sessao } = await db.from("progress_test_sessions").select("id, test_id, status").eq("id", b.session_id).maybeSingle();
      if (!sessao) return json({ ok: false, motivo: "sessao" }, 404);
      if (sessao.status !== "in_progress") return json({ ok: false, motivo: "ja_enviada" });

      const { data: ptqs } = await db.from("progress_test_questions").select("id, question_id").eq("test_id", sessao.test_id).order("position");
      const ids = (ptqs || []).map((q: any) => q.question_id);
      const { data: banco } = ids.length ? await db.from("question_bank").select("id, content_json").in("id", ids) : { data: [] as any[] };
      const porId = new Map<string, any>((banco || []).map((q: any) => [q.id, q]));

      let certas = 0, erradas = 0;
      const linhas = (ptqs || []).map((q: any) => {
        const r = respostas[q.id] || {};
        const tipo = r.responseType === "annulled" ? "annulled" : r.responseType === "answered" && typeof r.answer === "string" && r.answer ? "answered" : "blank";
        let correta = false;
        if (tipo === "answered") {
          const c = parseConteudo(porId.get(q.question_id)?.content_json);
          const chave = c?.correct_answer ?? c?.correctAnswer;
          if (chave !== undefined) correta = String(r.answer).toLowerCase() === String(chave).toLowerCase();
        }
        if (tipo === "answered") { if (correta) certas++; else erradas++; }
        return {
          session_id: sessao.id, question_id: q.id,
          answer_json: { answer: tipo === "answered" ? String(r.answer).slice(0, 200) : null },
          is_correct: correta, response_type: tipo,
        };
      });
      if (linhas.length) {
        const { error } = await db.from("progress_test_answers").insert(linhas);
        if (error) return json({ error: error.message }, 500);
      }
      const total = Math.max(0, certas - erradas);
      const max = (ptqs || []).length;
      const { error } = await db.from("progress_test_sessions").update({
        status: "finished", total_score: total, max_score: max, finished_at: new Date().toISOString(),
      }).eq("id", sessao.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, total, max });
    }

    if (typeof b.test_id !== "string" || !UUID.test(b.test_id)) return json({ error: "Dados inválidos" }, 400);
    const { data: teste } = await db.from("progress_tests").select("id, title, description, target_years_json, status, deleted_at").eq("id", b.test_id).maybeSingle();
    if (!teste || teste.deleted_at) return json({ ok: false, motivo: "teste" });

    if (action === "exame") {
      const { title, description, target_years_json, status } = teste;
      const base = { ok: true, teste: { id: teste.id, title, description, target_years_json, status } };
      if (status !== "published") return json({ ...base, questoes: [] });
      const { data: ptqs } = await db.from("progress_test_questions").select("id, question_id, position, expected_year").eq("test_id", teste.id).order("position");
      const ids = (ptqs || []).map((q: any) => q.question_id);
      const { data: banco } = ids.length ? await db.from("question_bank").select("id, type, content_json").in("id", ids) : { data: [] as any[] };
      const porId = new Map<string, any>((banco || []).map((q: any) => [q.id, q]));
      const questoes = (ptqs || []).map((q: any) => {
        const qb = porId.get(q.question_id);
        return { ...q, questionData: qb ? { id: qb.id, type: qb.type, content_json: conteudoDoAluno(parseConteudo(qb.content_json)) } : undefined };
      });
      return json({ ...base, questoes });
    }

    // iniciar
    if (teste.status !== "published") return json({ ok: false, motivo: "fechado" });
    const nome = typeof b.name === "string" ? b.name.trim().slice(0, 200) : "";
    if (!nome) return json({ error: "Informe seu nome" }, 400);
    const email = typeof b.email === "string" && b.email.trim() ? b.email.trim().slice(0, 200) : null;
    const ano = Number(b.year);
    const { data: nova, error } = await db.from("progress_test_sessions").insert({
      test_id: teste.id, student_name: nome, student_email: email, student_year: Number.isInteger(ano) && ano >= 1 && ano <= 12 ? ano : 1,
    }).select("id").single();
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, session_id: nova.id });
  } catch (e) {
    console.error("progress-aluno error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
