import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { room_id, pair_index, referral_response, referral_answer_key, referral_fields, med_response, med_answer_key, med_columns } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let comparisonPrompt = "Avalie as respostas do aluno comparando com o espelho de respostas.\n\n";

    // Referral comparison
    if (referral_response && referral_answer_key) {
      const fields = Array.isArray(referral_fields) ? referral_fields : [];
      const keyFields = Array.isArray(referral_answer_key) ? referral_answer_key : [];

      comparisonPrompt += "## FICHA DE ENCAMINHAMENTO\n\n";
      fields.forEach((field: any, idx: number) => {
        const studentAnswer = referral_response.answers_json?.[field.id] || "(sem resposta)";
        const keyField = keyFields.find((k: any) => k.id === field.id);
        const expectedAnswer = keyField?.options?.join(", ") || keyField?.label || "(sem espelho)";
        comparisonPrompt += `Item ${idx + 1}: "${field.label}" (máx ${field.max_score || 0} pts)\n`;
        comparisonPrompt += `  Resposta: ${typeof studentAnswer === "object" ? JSON.stringify(studentAnswer) : studentAnswer}\n`;
        comparisonPrompt += `  Espelho: ${expectedAnswer}\n\n`;
      });
    }

    // Medication summary comparison
    if (med_response && med_answer_key) {
      comparisonPrompt += "## QUADRO RESUMO DE MEDICAMENTOS\n\n";
      const columns = Array.isArray(med_columns) ? med_columns : [];
      const studentRows = med_response.answers_json?.rows || [];
      const expectedRows = med_answer_key.answer_rows || [];
      const rowScore = med_answer_key.rows_score || 1;

      comparisonPrompt += `Colunas: ${columns.map((c: any) => c.label).join(", ")}\n`;
      comparisonPrompt += `Pontuação por linha correta: ${rowScore} pts\n\n`;
      comparisonPrompt += `Respostas do aluno (${studentRows.length} linhas):\n`;
      studentRows.forEach((row: any, i: number) => {
        comparisonPrompt += `  Linha ${i + 1}: ${columns.map((c: any) => `${c.label}=${row[c.id] || "vazio"}`).join(", ")}\n`;
      });
      comparisonPrompt += `\nEspelho (${expectedRows.length} linhas):\n`;
      expectedRows.forEach((row: any, i: number) => {
        comparisonPrompt += `  Linha ${i + 1}: ${columns.map((c: any) => `${c.label}=${row[c.id] || "vazio"}`).join(", ")}\n`;
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um avaliador acadêmico de saúde. Avalie as respostas dos alunos comparando com o espelho de respostas.
Para cada item do encaminhamento, dê uma nota (0 até máximo) e feedback em português.
Para o quadro resumo, avalie cada linha comparando com o espelho.
Retorne usando a função fornecida.`,
          },
          { role: "user", content: comparisonPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_grading",
              description: "Submit grading results",
              parameters: {
                type: "object",
                properties: {
                  referral_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        field_id: { type: "string" },
                        score: { type: "number" },
                        feedback: { type: "string" },
                      },
                      required: ["field_id", "score", "feedback"],
                    },
                  },
                  referral_total: { type: "number" },
                  medication_score: { type: "number" },
                  medication_feedback: { type: "string" },
                  general_feedback: { type: "string" },
                  total_score: { type: "number" },
                },
                required: ["total_score", "general_feedback"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_grading" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let grading: any = {};
    if (toolCall?.function?.arguments) grading = JSON.parse(toolCall.function.arguments);

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Update referral response
    if (referral_response?.id) {
      const feedbackJson: Record<string, any> = {};
      (grading.referral_items || []).forEach((item: any) => { feedbackJson[item.field_id] = { score: item.score, feedback: item.feedback }; });
      await supabaseAdmin.from("documentation_responses").update({
        ai_score: grading.referral_total || grading.total_score || 0,
        ai_feedback_json: feedbackJson,
      }).eq("id", referral_response.id);
    }

    // Update medication response
    if (med_response?.id) {
      await supabaseAdmin.from("documentation_responses").update({
        ai_score: grading.medication_score || 0,
        ai_feedback_json: { feedback: grading.medication_feedback || grading.general_feedback || "" },
      }).eq("id", med_response.id);
    }

    return new Response(JSON.stringify({
      ai_score: grading.total_score || 0,
      ai_feedback: grading.general_feedback || "",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("grade-documentation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
