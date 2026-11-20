// SJT (Situational Judgment Test), lado do ALUNO. A prova é aberta por link (id da prova); não há lista de alunos.
// Ações:
//  - "exame": título, situação e cenários SEM o ranking ideal.
//  - "iniciar": cria a sessão do aluno (só com a prova aberta).
//  - "enviar": recebe o ranking do aluno em cada cenário, calcula a nota AQUI (o gabarito não sai do servidor), grava e devolve o resultado.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_POR_CENARIO = 4; // pontos máximos por cenário

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const b = await req.json();
    const { action } = b;
    if (!["exame", "iniciar", "enviar"].includes(action)) return json({ error: "Ação inválida" }, 400);
    const db = adminClient();

    if (action === "enviar") {
      if (typeof b.session_id !== "string" || !UUID.test(b.session_id)) return json({ error: "Dados inválidos" }, 400);
      if (!b.rankings || typeof b.rankings !== "object" || Array.isArray(b.rankings)) return json({ error: "Dados inválidos" }, 400);
      const { data: sessao } = await db.from("sjt_sessions").select("id, sjt_exam_id, status").eq("id", b.session_id).maybeSingle();
      if (!sessao) return json({ ok: false, motivo: "sessao" }, 404);
      if (sessao.status !== "in_progress") return json({ ok: false, motivo: "ja_enviada" }, 409);

      const { data: cenarios } = await db.from("sjt_scenarios").select("id, actions_json, correct_ranking_json")
        .eq("sjt_exam_id", sessao.sjt_exam_id).order("position");
      let total = 0;
      const linhas = (cenarios || []).map((s: any) => {
        const ids = new Set<string>((Array.isArray(s.actions_json) ? s.actions_json : []).map((a: any) => a.id));
        const enviado = Array.isArray(b.rankings[s.id]) ? (b.rankings[s.id] as unknown[]).filter((x) => typeof x === "string" && ids.has(x as string)) as string[] : [];
        // sem repetição: cada ação conta uma vez
        const ranking = [...new Set(enviado)];
        const correto: string[] = Array.isArray(s.correct_ranking_json) ? s.correct_ranking_json : [];
        const n = correto.length;
        const maxDist = n - 1;
        let pontos = 0;
        ranking.forEach((acaoId, posAluno) => {
          const posCerta = correto.indexOf(acaoId);
          if (posCerta !== -1) pontos += maxDist - Math.abs(posAluno - posCerta);
        });
        const maxPossivel = n * maxDist;
        const norm = maxPossivel > 0 ? (pontos / maxPossivel) * MAX_POR_CENARIO : 0;
        total += norm;
        return { session_id: sessao.id, scenario_id: s.id, student_ranking_json: ranking, score: parseFloat(norm.toFixed(2)) };
      });
      const max = (cenarios || []).length * MAX_POR_CENARIO;
      if (linhas.length) {
        const { error } = await db.from("sjt_answers").insert(linhas);
        if (error) return json({ error: error.message }, 500);
      }
      const { error } = await db.from("sjt_sessions").update({
        status: "submitted", finished_at: new Date().toISOString(), total_score: parseFloat(total.toFixed(2)), max_score: max,
      }).eq("id", sessao.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, total, max });
    }

    // exame / iniciar: precisam da prova
    if (typeof b.exam_id !== "string" || !UUID.test(b.exam_id)) return json({ error: "Dados inválidos" }, 400);
    const { data: prova } = await db.from("sjt_exams").select("id, title, status, deleted_at").eq("id", b.exam_id).maybeSingle();
    if (!prova || prova.deleted_at) return json({ ok: false, motivo: "prova" });

    if (action === "exame") {
      if (prova.status !== "active") return json({ ok: true, titulo: prova.title, status: prova.status, cenarios: [] });
      const { data: cenarios } = await db.from("sjt_scenarios").select("id, position, scenario_text, actions_json")
        .eq("sjt_exam_id", prova.id).order("position");
      return json({ ok: true, titulo: prova.title, status: prova.status, cenarios: cenarios || [] });
    }

    // iniciar
    if (prova.status !== "active") return json({ ok: false, motivo: "fechada" }, 409);
    const nome = typeof b.name === "string" ? b.name.trim().slice(0, 200) : "";
    const email = typeof b.email === "string" ? b.email.trim().slice(0, 200) : "";
    if (!nome || !email) return json({ error: "Preencha nome e e-mail" }, 400);
    const { data: nova, error } = await db.from("sjt_sessions").insert({ sjt_exam_id: prova.id, student_name: nome, student_email: email }).select("id").single();
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, session_id: nova.id });
  } catch (e) {
    console.error("sjt-aluno error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
