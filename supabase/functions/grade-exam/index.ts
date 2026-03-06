import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- AUTH CHECK ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;
    // --- END AUTH CHECK ---

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("sessionId is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check teacher's subscription before AI grading
    const { data: session } = await supabase
      .from("exam_sessions")
      .select("publication_id, exam_publications(user_id)")
      .eq("id", sessionId)
      .single();

    if (!session) throw new Error("Session not found");
    const teacherUserId = (session.exam_publications as any)?.user_id;

    // --- OWNERSHIP CHECK: only the teacher who owns the exam can grade ---
    if (teacherUserId !== userId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // --- END OWNERSHIP CHECK ---

    let teacherIsPremium = false;
    // Check invitation
    const { data: invitation } = await supabase
      .from("admin_invitations")
      .select("id")
      .eq("created_user_id", teacherUserId)
      .eq("status", "completed")
      .maybeSingle();

    if (invitation) {
      teacherIsPremium = true;
    } else {
      // Check Stripe
      try {
        const Stripe = (await import("https://esm.sh/stripe@18.5.0")).default;
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (stripeKey) {
          const { data: teacherAuth } = await supabase.auth.admin.getUserById(teacherUserId);
          if (teacherAuth?.user?.email) {
            const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
            const customers = await stripe.customers.list({ email: teacherAuth.user.email, limit: 1 });
            if (customers.data.length > 0) {
              const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: "active", limit: 1 });
              if (subs.data.length > 0) teacherIsPremium = true;
            }
          }
        }
      } catch (e) { console.warn("Stripe check failed:", e); }
    }

    if (!teacherIsPremium) {
      return new Response(JSON.stringify({ error: "AI grading requires a Premium plan.", blocked: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

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
        const { response: aiResponse, provider } = await callAiWithFallback({
          messages: [
            { role: "system", content: "Você é um avaliador acadêmico justo e construtivo. Sempre responda em JSON válido." },
            { role: "user", content: prompt },
          ],
        }, { userId: userId as string, promptType: "grade_exam" });

        console.log(`grade-exam answer ${answer.id} using provider: ${provider}`);

        if (!aiResponse.ok) {
          console.error("AI error:", aiResponse.status);
          continue;
        }

        const aiData = await aiResponse.json();
        const responseText = aiData.choices?.[0]?.message?.content || "";

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
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
