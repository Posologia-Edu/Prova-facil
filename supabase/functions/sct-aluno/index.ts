// SCT (Script Concordance Test), lado do ALUNO e do ESPECIALISTA. A prova é aberta por link (id da prova); não há lista de alunos.
// Aluno:
//  - "exame": título, situação e cenários (a prova só abre para alunos com o exame "ativo" ou "coletando").
//  - "iniciar": cria a sessão do aluno.
//  - "enviar": recebe as respostas (-2 a +2), calcula a nota AQUI com o painel de especialistas (que não sai do servidor), grava e devolve o resultado.
// Especialista:
//  - "especialista_exame": título e cenários.
//  - "especialista_enviar": grava as respostas do especialista no painel. Só enquanto o exame está em rascunho ou "coletando"
//    (com o exame ativo para alunos, o painel fica fechado, para que ninguém altere o gabarito), e uma única vez por e-mail.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const likertOk = (v: unknown) => Number.isInteger(v) && (v as number) >= -2 && (v as number) <= 2;
const ACOES = ["exame", "iniciar", "enviar", "especialista_exame", "especialista_enviar"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const b = await req.json();
    const { action } = b;
    if (!ACOES.includes(action)) return json({ error: "Ação inválida" }, 400);
    const db = adminClient();

    if (action === "enviar") {
      if (typeof b.session_id !== "string" || !UUID.test(b.session_id)) return json({ error: "Dados inválidos" }, 400);
      if (!b.answers || typeof b.answers !== "object" || Array.isArray(b.answers)) return json({ error: "Dados inválidos" }, 400);
      const { data: sessao } = await db.from("sct_student_sessions").select("id, sct_exam_id, status").eq("id", b.session_id).maybeSingle();
      if (!sessao) return json({ ok: false, motivo: "sessao" }, 404);
      if (sessao.status !== "in_progress") return json({ ok: false, motivo: "ja_enviada" });

      const { data: cenarios } = await db.from("sct_scenarios").select("id").eq("sct_exam_id", sessao.sct_exam_id).order("position");
      const ids = (cenarios || []).map((s: any) => s.id);
      if (ids.some((id: string) => !likertOk(b.answers[id]))) return json({ ok: false, motivo: "incompleta" }, 400);
      const { data: esp } = ids.length ? await db.from("sct_expert_responses").select("scenario_id, likert_value").in("scenario_id", ids) : { data: [] as any[] };

      let total = 0;
      const linhas = ids.map((id: string) => {
        const resp = (esp || []).filter((r: any) => r.scenario_id === id);
        let pontos = 0;
        if (resp.length > 0) {
          // crédito parcial: frequência da resposta do aluno entre os especialistas / frequência da resposta mais comum
          const dist: Record<number, number> = {};
          resp.forEach((r: any) => { dist[r.likert_value] = (dist[r.likert_value] || 0) + 1; });
          const maxFreq = Math.max(...Object.values(dist));
          pontos = maxFreq > 0 ? (dist[b.answers[id]] || 0) / maxFreq : 0;
        }
        total += pontos;
        return { session_id: sessao.id, scenario_id: id, likert_value: b.answers[id], score: parseFloat(pontos.toFixed(3)) };
      });
      const max = ids.length;
      if (linhas.length) {
        const { error } = await db.from("sct_student_answers").insert(linhas);
        if (error) return json({ error: error.message }, 500);
      }
      const { error } = await db.from("sct_student_sessions").update({
        status: "submitted", finished_at: new Date().toISOString(), total_score: parseFloat(total.toFixed(3)), max_score: max,
      }).eq("id", sessao.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, total, max });
    }

    if (typeof b.exam_id !== "string" || !UUID.test(b.exam_id)) return json({ error: "Dados inválidos" }, 400);
    const { data: prova } = await db.from("sct_exams").select("id, title, status, deleted_at").eq("id", b.exam_id).maybeSingle();
    if (!prova || prova.deleted_at) return json({ ok: false, motivo: "prova" });
    const COLS = "id, position, clinical_vignette, hypothesis, new_information";

    if (action === "exame") {
      if (prova.status !== "active" && prova.status !== "collecting") return json({ ok: true, titulo: prova.title, status: prova.status, cenarios: [] });
      const { data: cenarios } = await db.from("sct_scenarios").select(COLS).eq("sct_exam_id", prova.id).order("position");
      return json({ ok: true, titulo: prova.title, status: prova.status, cenarios: cenarios || [] });
    }

    if (action === "iniciar") {
      if (prova.status !== "active" && prova.status !== "collecting") return json({ ok: false, motivo: "fechada" });
      const nome = typeof b.name === "string" ? b.name.trim().slice(0, 200) : "";
      const email = typeof b.email === "string" ? b.email.trim().slice(0, 200) : "";
      if (!nome || !email) return json({ error: "Preencha seu nome e e-mail" }, 400);
      const { data: nova, error } = await db.from("sct_student_sessions").insert({ sct_exam_id: prova.id, student_name: nome, student_email: email }).select("id").single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, session_id: nova.id });
    }

    // especialistas
    const { data: cenarios } = await db.from("sct_scenarios").select(COLS).eq("sct_exam_id", prova.id).order("position");
    if (action === "especialista_exame") return json({ ok: true, titulo: prova.title, status: prova.status, cenarios: cenarios || [] });

    if (prova.status === "active") return json({ ok: false, motivo: "painel_fechado" });
    const nome = typeof b.name === "string" ? b.name.trim().slice(0, 200) : "";
    const email = typeof b.email === "string" ? b.email.trim().slice(0, 200) : "";
    if (!nome || !email) return json({ error: "Preencha seu nome e e-mail" }, 400);
    const ids = (cenarios || []).map((s: any) => s.id);
    if (!b.answers || typeof b.answers !== "object" || ids.some((id: string) => !likertOk(b.answers[id]))) return json({ ok: false, motivo: "incompleta" }, 400);
    const { data: ja } = ids.length
      ? await db.from("sct_expert_responses").select("id").in("scenario_id", ids).ilike("expert_email", email.replace(/[%_]/g, "\\$&")).limit(1)
      : { data: [] as any[] };
    if (ja?.length) return json({ ok: false, motivo: "ja_respondeu" });
    const { error } = await db.from("sct_expert_responses").insert(
      ids.map((id: string) => ({ scenario_id: id, expert_email: email, expert_name: nome, likert_value: b.answers[id] })));
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  } catch (e) {
    console.error("sct-aluno error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
