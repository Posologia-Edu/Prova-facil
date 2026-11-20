// Observação clínica (Mini-CEX / DOPS), ficha preenchida pelo AVALIADOR por link (id da observação); não há lista de pessoas.
// Ações:
//  - "exame": título, tipo e domínios de competência da observação (só se estiver ativa; nunca user_id, turma nem código).
//  - "enviar": grava a ficha de observação (notas por domínio de 1 a 9, nota global, comentário, complexidade, cenário e duração).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const nota = (v: unknown) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 9;
const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const b = await req.json();
    if (!["exame", "enviar"].includes(b.action)) return json({ error: "Ação inválida" }, 400);
    if (typeof b.obs_id !== "string" || !UUID.test(b.obs_id)) return json({ error: "Dados inválidos" }, 400);
    const db = adminClient();
    const { data: obs } = await db.from("clinical_observations").select("id, title, type, status, competency_domains_json, deleted_at").eq("id", b.obs_id).maybeSingle();
    if (!obs || obs.deleted_at) return json({ ok: false, motivo: "observacao" });
    if (obs.status !== "active") return json({ ok: false, motivo: "inativa" });

    if (b.action === "exame") {
      return json({ ok: true, observacao: { id: obs.id, title: obs.title, type: obs.type, status: obs.status, competency_domains_json: obs.competency_domains_json } });
    }

    const nomeAvaliador = texto(b.evaluator_name, 200), nomeAluno = texto(b.student_name, 200);
    if (!nomeAvaliador || !nomeAluno) return json({ error: "Preencha os dados do avaliador e do aluno" }, 400);
    if (!nota(b.global_score)) return json({ error: "Nota global inválida" }, 400);
    const dominios: { id: string }[] = Array.isArray(obs.competency_domains_json) ? obs.competency_domains_json : [];
    const scores: Record<string, number> = {};
    for (const d of dominios) {
      const v = b.scores?.[d.id];
      if (!nota(v)) return json({ error: "Notas por domínio inválidas" }, 400);
      scores[d.id] = v;
    }
    const complexidade = ["low", "medium", "high"].includes(b.complexity) ? b.complexity : "medium";
    const duracao = Number.isInteger(b.duration) && b.duration >= 0 && b.duration <= 600 ? b.duration : 15;
    const { error } = await db.from("clinical_observation_sessions").insert({
      observation_id: obs.id,
      evaluator_name: nomeAvaliador, evaluator_email: texto(b.evaluator_email, 200),
      student_name: nomeAluno, student_email: texto(b.student_email, 200),
      scores_json: scores, global_score: b.global_score, feedback: texto(b.feedback, 10000),
      complexity: complexidade, setting: texto(b.setting, 500), duration_minutes: duracao,
    });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  } catch (e) {
    console.error("obs-clinica error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
