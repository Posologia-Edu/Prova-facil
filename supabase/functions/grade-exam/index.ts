import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("sessionId is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get subjective answers for this session
    const { data: answers, error: ansError } = await supabase
      .from("student_answers")
      .select("id, question_id, answer_text, max_points, question_bank(type, content_json)")
      .eq("session_id", sessionId)
      .in("grading_status", ["pending"])
      .not("answer_text", "eq", "");

    if (ansError) throw ansError;
    if (!answers || answers.length === 0) {
      return new Response(JSON.stringify({ message: "No answers to grade" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter only subjective questions
    const subjectiveAnswers = answers.filter((a: any) => {
      const type = a.question_bank?.type;
      return type === "open_ended" || type === "matching";
    });

    for (const answer of subjectiveAnswers) {
      const content = (answer as any).question_bank?.content_json as Record<string, any> || {};
      const statement = content.statement || content.title || "Question";
      const maxPoints = Number(answer.max_points) || 1;

      const prompt = `Você é um professor universitário avaliando a resposta de um aluno.

Questão (vale ${maxPoints} pontos):
"${statement}"

Resposta do aluno:
"${answer.answer_text}"

Avalie a resposta do aluno e forneça:
1. Uma nota de 0 a ${maxPoints} (pode usar decimais com uma casa, ex: 3.5)
2. Uma justificativa breve (2-3 frases) explicando a nota

Responda APENAS no formato JSON:
{"score": <número>, "feedback": "<justificativa>"}`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "Você é um avaliador acadêmico justo e construtivo. Sempre responda em JSON válido." },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (!aiResponse.ok) {
          console.error("AI gateway error:", aiResponse.status);
          continue;
        }

        const aiData = await aiResponse.json();
        const responseText = aiData.choices?.[0]?.message?.content || "";

        // Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const score = Math.min(Math.max(0, Number(parsed.score) || 0), maxPoints);
          const feedback = String(parsed.feedback || "Avaliação automática.");

          await supabase
            .from("student_answers")
            .update({
              ai_score: score,
              ai_feedback: feedback,
              points_earned: score,
              grading_status: "ai_graded",
            })
            .eq("id", answer.id);
        }
      } catch (aiErr) {
        console.error("Error grading answer:", answer.id, aiErr);
      }
    }

    // Recalculate total score
    const { data: allAnswers } = await supabase
      .from("student_answers")
      .select("points_earned, ai_score, teacher_score")
      .eq("session_id", sessionId);

    if (allAnswers) {
      const totalScore = allAnswers.reduce((sum: number, a: any) => {
        return sum + (Number(a.teacher_score ?? a.ai_score ?? a.points_earned) || 0);
      }, 0);

      await supabase
        .from("exam_sessions")
        .update({ total_score: totalScore, status: "graded" })
        .eq("id", sessionId);
    }

    return new Response(JSON.stringify({ success: true, graded: subjectiveAnswers.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("grade-exam error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
