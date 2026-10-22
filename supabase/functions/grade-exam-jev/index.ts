// PoC: correção de questões abertas por critério com Jev (TypeSafe).
// MODO SOMBRA: não grava nada no banco. Devolve o resultado para comparar com grade-exam
// e com a nota do professor. Para persistir, ver o TODO no fim do loop.
//
// Requer o secret TYPESAFE_API_KEY (opcional: TYPESAFE_MODEL para fixar a versão).
// Rubrica esperada em question_bank.content_json.rubric_items: [{ id, description, points }].
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, forbidden, getUserId, unauthorized } from "../_shared/auth-guard.ts";
import { callAiWithFallback } from "../_shared/ai-caller.ts";
import { feedbackPrompt, gradeAnswer, type RubricItem } from "../_shared/jev-grader.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const userId = await getUserId(req);
    if (!userId) return unauthorized(corsHeaders);

    const apiKey = Deno.env.get("TYPESAFE_API_KEY");
    if (!apiKey) return json({ error: "TYPESAFE_API_KEY not configured" }, 500);

    const { sessionId, withFeedback = false } = await req.json();
    if (!sessionId) return json({ error: "sessionId is required" }, 400);

    const supabase = adminClient();
    const { data: session } = await supabase
      .from("exam_sessions")
      .select("publication_id, exam_publications(user_id)")
      .eq("id", sessionId)
      .single();
    if (!session) return json({ error: "Session not found" }, 404);
    if ((session.exam_publications as any)?.user_id !== userId) return forbidden(corsHeaders, "Access denied");

    // TODO: reaplicar a checagem de plano Premium de grade-exam antes de liberar para produção.

    const { data: answers, error } = await supabase
      .from("student_answers")
      .select("id, answer_text, max_points, teacher_score, ai_score, question_bank(type, content_json)")
      .eq("session_id", sessionId)
      .not("answer_text", "eq", "");
    if (error) throw error;

    const results: unknown[] = [];
    for (const a of answers ?? []) {
      const q = (a as any).question_bank;
      if (q?.type !== "open_ended") continue;

      const content = (q.content_json ?? {}) as Record<string, any>;
      const rubric = content.rubric_items as RubricItem[] | undefined;
      if (!Array.isArray(rubric) || rubric.length === 0) {
        results.push({ answerId: a.id, skipped: "no_rubric_items" });
        continue;
      }

      const input = {
        statement: String(content.statement || content.title || content.question_text || ""),
        answer: String(a.answer_text),
        referenceAnswer: content.expected_answer ? String(content.expected_answer) : undefined,
        maxPoints: Number(a.max_points) || 1,
      };

      try {
        // O state enviado ao Jev não contém nome, e-mail nem matrícula do aluno.
        const result = await gradeAnswer({ apiKey, model: Deno.env.get("TYPESAFE_MODEL") ?? undefined }, input, rubric);

        let feedback: string | undefined;
        if (withFeedback) {
          const { response } = await callAiWithFallback(
            { messages: [{ role: "user", content: feedbackPrompt(input, result) }] },
            { userId, promptType: "grade_exam_jev_feedback" },
          );
          feedback = (await response.json()).choices?.[0]?.message?.content;
        }

        results.push({
          answerId: a.id,
          maxPoints: input.maxPoints,
          result,
          feedback,
          // Para comparação lado a lado no piloto:
          current: { teacher_score: a.teacher_score, ai_score: a.ai_score },
        });
        // TODO (fase 2): persistir result.score/criteria em colunas novas; score null => grading_status "needs_review".
      } catch (e) {
        console.error("grade-exam-jev answer failed:", a.id, e);
        results.push({ answerId: a.id, error: (e as Error).message });
      }
    }

    return json({ dryRun: true, results });
  } catch (error) {
    console.error("grade-exam-jev error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
