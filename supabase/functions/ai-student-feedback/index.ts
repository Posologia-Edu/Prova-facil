import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Verify JWT
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader || "" } } });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { studentEmail, sessionIds, feedbackType } = await req.json();
    if (!studentEmail) {
      return new Response(JSON.stringify({ error: "studentEmail required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Gather student performance data
    const { data: sessions } = await supabase
      .from("exam_sessions")
      .select("id, total_score, max_score, status, finished_at, publication_id")
      .eq("student_email", studentEmail)
      .eq("status", "graded")
      .order("finished_at", { ascending: false })
      .limit(10);

    const sessionData = sessions || [];
    let answersInfo: string[] = [];

    for (const sess of sessionData.slice(0, 5)) {
      const { data: answers } = await supabase
        .from("session_answers")
        .select("question_id, is_correct, points_earned, max_points, ai_feedback")
        .eq("session_id", sess.id);

      const wrong = (answers || []).filter(a => a.is_correct === false);
      if (wrong.length > 0) {
        answersInfo.push(`Sessão ${sess.id.slice(0, 8)}: ${wrong.length} erros de ${(answers || []).length} questões. Nota: ${sess.total_score}/${sess.max_score}`);
      }
    }

    // Build AI prompt
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
      }),
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

    // Store feedback
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
