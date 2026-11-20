// Júri Simulado, painel do JUIZ (acesso por código do júri + nome do juiz cadastrado pelo professor).
// Ações:
//  - "estado": devolve o júri, os casos, grupos, alunos (só nomes), distribuição, formulários, avaliações e,
//              para o caso escolhido (case_id), a sessão (criada se não existir), as respostas enviadas e as avaliações do juiz.
//              A tela chama de tempos em tempos no lugar do realtime.
//  - "fase": controla a sessão do caso (iniciar fase, finalizar, pausar, retomar).
//  - "avaliar": grava a avaliação do juiz a um grupo de Acusação ou Defesa.
// Substitui as leituras e gravações diretas que a tela do juiz fazia nas tabelas mock_trial_*.
// Nunca devolve: guia do professor, e-mails dos alunos, conteúdo das respostas dos alunos.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const FASES = new Set(["announcement", "prosecution", "defense", "jury_questions", "deliberation", "verdict"]);
const normaliza = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const limita = (n: unknown, max: number) => Math.max(0, Math.min(max, Math.floor(Number(n) || 0)));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { action, access_code, judge_name, case_id } = body;
    if (!["estado", "fase", "avaliar"].includes(action)) return json({ error: "Ação inválida" }, 400);
    if (typeof access_code !== "string" || access_code.trim().length < 4 || typeof judge_name !== "string" || !judge_name.trim()) return json({ error: "Dados incompletos" }, 400);

    const db = adminClient();
    const { data: juris } = await db.from("mock_trials").select("id, title, judge_name").eq("access_code", access_code.trim()).limit(1);
    const juri = juris?.[0];
    if (!juri) return json({ ok: false, motivo: "juri" });
    if (!(juri.judge_name || "").trim()) return json({ ok: false, motivo: "sem_juiz" });
    if (normaliza(juri.judge_name) !== normaliza(judge_name)) return json({ ok: false, motivo: "nome" });

    const { data: casos } = await db.from("mock_trial_cases")
      .select("id, position, case_number, title, process_content").eq("mock_trial_id", juri.id).order("position");
    const casoIds = (casos || []).map((c: any) => c.id);

    // ---------- fase ----------
    if (action === "fase") {
      const { op, phase_key, duration, remaining } = body;
      if (typeof case_id !== "string" || !casoIds.includes(case_id)) return json({ error: "Processo inválido" }, 400);
      const { data: sessoes } = await db.from("mock_trial_sessions").select("*").eq("case_id", case_id).limit(1);
      let sessao = sessoes?.[0];
      if (!sessao) {
        const { data: nova, error } = await db.from("mock_trial_sessions").insert({ case_id }).select().single();
        if (error) return json({ error: error.message }, 500);
        sessao = nova;
      }
      let campos: Record<string, unknown>;
      if (op === "iniciar") {
        if (!FASES.has(phase_key)) return json({ error: "Fase inválida" }, 400);
        campos = {
          status: phase_key, current_phase_started_at: new Date().toISOString(),
          phase_duration_seconds: limita(duration, 7200), is_paused: false, paused_remaining_seconds: null,
        };
      } else if (op === "finalizar") {
        campos = { status: "finished", current_phase_started_at: null, phase_duration_seconds: null, is_paused: false, paused_remaining_seconds: null };
      } else if (op === "pausar") {
        campos = { is_paused: true, paused_remaining_seconds: limita(remaining, 7200) };
      } else if (op === "retomar") {
        const total = sessao.phase_duration_seconds || 0;
        const resta = sessao.paused_remaining_seconds ?? limita(remaining, 7200);
        campos = {
          is_paused: false, paused_remaining_seconds: null,
          current_phase_started_at: new Date(Date.now() - (total - resta) * 1000).toISOString(),
        };
      } else return json({ error: "Operação inválida" }, 400);
      const { data, error } = await db.from("mock_trial_sessions").update(campos).eq("id", sessao.id).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, sessao: data });
    }

    // ---------- avaliar ----------
    if (action === "avaliar") {
      const { group_id, score, criteria_json, feedback } = body;
      if (typeof case_id !== "string" || !casoIds.includes(case_id) || typeof group_id !== "string") return json({ error: "Dados inválidos" }, 400);
      const { data: atrib } = await db.from("mock_trial_assignments").select("role").eq("case_id", case_id).eq("group_id", group_id).limit(1);
      const papel = atrib?.[0]?.role;
      if (papel !== "prosecution" && papel !== "defense") return json({ error: "O juiz só avalia Acusação e Defesa" }, 403);
      const { data: sessoes } = await db.from("mock_trial_sessions").select("id").eq("case_id", case_id).limit(1);
      if (!sessoes?.[0]) return json({ error: "Sessão ainda não criada" }, 409);
      const nota = Number(score);
      if (!Number.isFinite(nota) || nota < 0 || nota > 10) return json({ error: "Nota inválida" }, 400);
      if (!criteria_json || typeof criteria_json !== "object" || JSON.stringify(criteria_json).length > 100_000) return json({ error: "Critérios inválidos" }, 400);
      const { error } = await db.from("mock_trial_evaluations").upsert({
        session_id: sessoes[0].id, case_id, group_id, evaluated_role: papel, evaluator_type: "judge",
        score: nota, max_score: 10, criteria_json,
        feedback: typeof feedback === "string" ? feedback.slice(0, 5000) : null,
        ai_generated: false, evaluator_name: juri.judge_name,
      }, { onConflict: "case_id,group_id,evaluator_type" });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // ---------- estado ----------
    const { data: grupos } = await db.from("mock_trial_groups").select("id, mock_trial_id, group_number, name").eq("mock_trial_id", juri.id).order("group_number");
    const grupoIds = (grupos || []).map((g: any) => g.id);
    const { data: alunos } = grupoIds.length
      ? await db.from("mock_trial_students").select("id, group_id, student_name").in("group_id", grupoIds)
      : { data: [] as any[] };
    const { data: atribs } = casoIds.length
      ? await db.from("mock_trial_assignments").select("id, case_id, group_id, role").in("case_id", casoIds)
      : { data: [] as any[] };
    const { data: formularios } = await db.from("mock_trial_forms").select("id, target_role").eq("mock_trial_id", juri.id);

    // formulários de avaliação (juiz e professor): cria os que faltarem
    const { data: fa } = await db.from("mock_trial_evaluation_forms").select("*").eq("mock_trial_id", juri.id);
    const formsAval = fa || [];
    if (!formsAval.some((f: any) => f.evaluator_type === "judge")) {
      return json({ ok: false, motivo: "sem_formulario_de_avaliacao" });
    }

    let sessao: any = null, respostas: any[] = [], avaliacoes: any[] = [], imagens: any[] = [];
    if (typeof case_id === "string" && casoIds.includes(case_id)) {
      const { data: ss } = await db.from("mock_trial_sessions").select("*").eq("case_id", case_id).limit(1);
      sessao = ss?.[0];
      if (!sessao) {
        const { data: nova } = await db.from("mock_trial_sessions").insert({ case_id }).select().single();
        sessao = nova;
      }
      if (sessao) {
        const { data: rs } = await db.from("mock_trial_responses").select("id, group_id, form_id, session_id").eq("session_id", sessao.id);
        respostas = rs || [];
        const { data: av } = await db.from("mock_trial_evaluations").select("*").eq("session_id", sessao.id).eq("evaluator_type", "judge");
        avaliacoes = av || [];
      }
      const { data: im } = await db.from("mock_trial_case_images").select("id, case_id, slug, status, image_url, title, caption").eq("case_id", case_id);
      imagens = im || [];
    }

    return json({
      ok: true,
      juri: { id: juri.id, title: juri.title },
      casos: casos || [], grupos: grupos || [], alunos: alunos || [], atribuicoes: atribs || [],
      formularios: formularios || [],
      formulariosAvaliacao: formsAval.filter((f: any) => f.evaluator_type === "judge"),
      sessao, respostas, avaliacoes, imagens,
    });
  } catch (e) {
    console.error("juri-juiz error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
