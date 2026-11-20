// Gamificação e Portfólio do ALUNO. A credencial é a sessão de prova que o servidor entregou depois de conferir PIN e e-mail
// (função student-exam-access): o aluno manda o id da sessão e o e-mail, e a função confere que a sessão é dele.
// Ações:
//  - "gamificacao": pontos e conquistas do próprio aluno e o ranking (top 10, com nomes mascarados; só o próprio aluno aparece por inteiro).
//  - "portfolio": entradas do portfólio (criado se não existir), últimos feedbacks de IA e conquistas do próprio aluno.
// O aluno nunca recebe dados de outros alunos além da posição e da pontuação no ranking.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const norm = (s: unknown) => (typeof s === "string" ? s.trim().toLowerCase() : "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// "maria.silva@x.com" -> "mar***"
const mascara = (email: string) => {
  const local = email.replace(/@.*/, "");
  return local.slice(0, 3) + "***";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { action, email, session_id } = await req.json();
    if (!["gamificacao", "portfolio"].includes(action)) return json({ error: "Ação inválida" }, 400);
    if (!norm(email) || typeof session_id !== "string" || !UUID.test(session_id)) return json({ error: "Dados incompletos" }, 400);
    const alvo = norm(email);

    const db = adminClient();
    const { data: sessao } = await db.from("exam_sessions").select("id, student_email").eq("id", session_id).maybeSingle();
    if (!sessao || norm(sessao.student_email) !== alvo) return json({ ok: false, motivo: "sessao" });

    const { data: conquistas } = await db.from("student_achievements").select("*, achievement_definitions(*)").eq("student_email", sessao.student_email);

    if (action === "gamificacao") {
      const { data: pontos } = await db.from("student_points").select("id, points, source, created_at")
        .eq("student_email", sessao.student_email).order("created_at", { ascending: false });
      const { data: todos } = await db.from("student_points").select("student_email, points");
      const soma = new Map<string, number>();
      (todos || []).forEach((r: any) => soma.set(norm(r.student_email), (soma.get(norm(r.student_email)) || 0) + (Number(r.points) || 0)));
      const ranking = [...soma.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([em, total]) => ({ eu: em === alvo, rotulo: em === alvo ? "Você" : mascara(em), total_points: total }));
      return json({ ok: true, pontos: pontos || [], conquistas: conquistas || [], ranking });
    }

    // portfolio
    let { data: pf } = await db.from("student_portfolios").select("id").eq("student_email", sessao.student_email).maybeSingle();
    if (!pf) {
      const { data: novo } = await db.from("student_portfolios").insert({ student_email: sessao.student_email, student_name: sessao.student_email }).select("id").single();
      pf = novo;
    }
    const { data: entradas } = pf
      ? await db.from("portfolio_entries").select("*").eq("portfolio_id", pf.id).order("entry_date", { ascending: false })
      : { data: [] as any[] };
    const { data: feedbacks } = await db.from("student_ai_feedbacks").select("*")
      .eq("student_email", sessao.student_email).order("created_at", { ascending: false }).limit(5);
    return json({ ok: true, entradas: entradas || [], feedbacks: feedbacks || [], conquistas: conquistas || [] });
  } catch (e) {
    console.error("gamificacao-aluno error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
