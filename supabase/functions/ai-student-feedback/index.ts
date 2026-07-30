import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { studentEmail, sessionId, sessionIds, feedbackType } = await req.json();
    if (!studentEmail) {
      return new Response(JSON.stringify({ error: "studentEmail required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader || "" } } });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if ((authErr || !user) && !sessionId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // AuthZ: prevent reading another student's results.
    const emailLower = String(studentEmail).trim().toLowerCase();
    const isSelf = !!user?.email && user.email.toLowerCase() === emailLower;
    if (!isSelf) {
      const requestedIds: string[] = sessionId
        ? [sessionId]
        : (Array.isArray(sessionIds) ? sessionIds.filter((x: unknown) => typeof x === "string") : []);
      if (requestedIds.length === 0) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: ownRows } = await supabase
        .from("exam_sessions")
        .select("id, student_email, publication_id")
        .in("id", requestedIds);
      const rows = ownRows || [];
      if (rows.length !== requestedIds.length ||
          rows.some((r: any) => String(r.student_email || "").toLowerCase() !== emailLower)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (user) {
        const pubIds = [...new Set(rows.map((r: any) => r.publication_id).filter(Boolean))];
        const { data: pubs } = await supabase
          .from("exam_publications").select("id, user_id").in("id", pubIds as string[]);
        const owns = (pubs || []).length === pubIds.length && (pubs || []).every((p: any) => p.user_id === user.id);
        if (!owns) {
          return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    const sessionQuery = supabase
      .from("exam_sessions")
      .select("id, total_score, max_score, status, finished_at, publication_id")
      .eq("student_email", studentEmail)
      .in("status", ["submitted", "graded"])
      .order("finished_at", { ascending: false })
      .limit(10);

    if (sessionId) sessionQuery.eq("id", sessionId);
    if (!sessionId && Array.isArray(sessionIds) && sessionIds.length > 0) sessionQuery.in("id", sessionIds);

    const { data: sessions, error: sessionsErr } = await sessionQuery;
    if (sessionsErr) throw sessionsErr;
    if (sessionId && (!sessions || sessions.length === 0)) {
      return new Response(JSON.stringify({ error: "Session not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sessionData = sessions || [];
    let answersInfo: string[] = [];

    for (const sess of sessionData.slice(0, 5)) {
      const { data: answers } = await supabase
        .from("student_answers")
        .select("question_id, answer_text, answer_json, is_correct, points_earned, max_points, ai_feedback, teacher_feedback, question_bank(type, content_json)")
        .eq("session_id", sess.id);

      const answerList = answers || [];
      const wrong = answerList.filter(a => a.is_correct === false);
      const pending = answerList.filter(a => a.is_correct === null);
      answersInfo.push(`Sessão ${sess.id.slice(0, 8)} (${sess.status}): ${wrong.length} erros, ${pending.length} pendentes de correção em ${answerList.length} questões. Nota atual: ${sess.total_score ?? 0}/${sess.max_score ?? "a definir"}. Respostas: ${answerList.slice(0, 6).map((a: any, idx: number) => {
        const content = a.question_bank?.content_json || {};
        const statement = String(content.statement || content.title || `Questão ${idx + 1}`).slice(0, 220);
        const answer = String(a.answer_text || a.answer_json?.selected || "Sem resposta").slice(0, 220);
        return `Q${idx + 1}: ${statement} | resposta: ${answer}`;
      }).join(" || ")}`);
    }

    const prompt = `Você é um tutor educacional especializado em ciências da saúde. Analise o desempenho do aluno e forneça feedback personalizado.

Dados do aluno (email: ${studentEmail}):
- Total de avaliações analisadas: ${sessionData.length}
- Notas recentes: ${sessionData.map(s => `${s.total_score}/${s.max_score}`).join(", ")}
- Erros identificados: ${answersInfo.join("; ") || "Sem dados detalhados"}

Forneça um feedback estruturado em JSON com:
1. "summary": resumo geral do desempenho (2-3 frases)
2. "strengths": lista de pontos fortes (array de strings)
3. "weaknesses": lista de áreas para melhorar (array de strings)  
4. "recommendations": lista de recomendações de estudo (array de strings)
5. "trend": tendência ("improving", "stable", "declining")

Responda APENAS com o JSON, sem markdown.`;

    const { response: aiResponse } = await callAiWithFallback({
      messages: [{ role: "user", content: prompt }],
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "{}";

    let feedbackJson;
    try {
      feedbackJson = JSON.parse(rawContent.replace(/```json\n?/g, "").replace(/```/g, "").trim());
    } catch {
      feedbackJson = { summary: rawContent, strengths: [], weaknesses: [], recommendations: [], trend: "stable" };
    }

    const { data: saved, error: saveErr } = await supabase
      .from("student_ai_feedbacks")
      .insert({
        student_email: studentEmail,
        feedback_type: feedbackType || "general",
        source_type: "exam",
        source_ids: sessionData.map(s => s.id),
        content_json: feedbackJson,
      })
      .select()
      .single();

    if (saveErr) console.error("Save error:", saveErr);

    return new Response(JSON.stringify({ feedback: feedbackJson, id: saved?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-student-feedback error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
