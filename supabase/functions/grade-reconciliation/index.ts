import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { response_id, room_id, answers_json, answer_key_json, form_fields } = await req.json();

    if (!response_id || !answers_json || !answer_key_json || !form_fields) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build prompt for AI grading
    const fields = Array.isArray(form_fields) ? form_fields : [];
    const answerKeyFields = Array.isArray(answer_key_json) ? answer_key_json : [];

    let comparisonPrompt = "Compare as respostas do aluno com o espelho de respostas e avalie cada item.\n\n";
    
    fields.forEach((field: any, idx: number) => {
      const studentAnswer = answers_json[field.id] || "(sem resposta)";
      const keyField = answerKeyFields.find((k: any) => k.id === field.id);
      const expectedAnswer = keyField?.correct_answer || keyField?.options?.join(", ") || keyField?.label || "(sem espelho)";
      
      comparisonPrompt += `Item ${idx + 1}: "${field.label}" (máx ${field.max_score || 0} pts)\n`;
      comparisonPrompt += `  Resposta do aluno: ${typeof studentAnswer === "object" ? JSON.stringify(studentAnswer) : studentAnswer}\n`;
      comparisonPrompt += `  Espelho: ${expectedAnswer}\n\n`;
    });

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
            content: `Você é um avaliador acadêmico de saúde. Avalie as respostas dos alunos comparando com o espelho de respostas fornecido pelo professor.
Para cada item, forneça uma nota (de 0 até o máximo de pontos) e um feedback construtivo em português.
Retorne o resultado usando a função fornecida.`,
          },
          { role: "user", content: comparisonPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_grading",
              description: "Submit the grading results for each form field",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        field_id: { type: "string", description: "The field ID" },
                        score: { type: "number", description: "Score awarded (0 to max_score)" },
                        feedback: { type: "string", description: "Constructive feedback in Portuguese" },
                      },
                      required: ["field_id", "score", "feedback"],
                    },
                  },
                  total_score: { type: "number", description: "Total score sum" },
                  general_feedback: { type: "string", description: "Overall feedback in Portuguese" },
                },
                required: ["items", "total_score", "general_feedback"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_grading" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    let grading: any = {};
    if (toolCall?.function?.arguments) {
      grading = JSON.parse(toolCall.function.arguments);
    }

    // Build feedback JSON keyed by field_id
    const feedbackJson: Record<string, any> = {};
    (grading.items || []).forEach((item: any) => {
      feedbackJson[item.field_id] = {
        score: item.score,
        feedback: item.feedback,
      };
    });

    // Update the response record
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabaseAdmin.from("reconciliation_responses").update({
      ai_score: grading.total_score || 0,
      ai_feedback_json: feedbackJson,
    }).eq("id", response_id);

    return new Response(JSON.stringify({
      ai_score: grading.total_score || 0,
      ai_feedback: grading.general_feedback || "",
      ai_feedback_json: feedbackJson,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("grade-reconciliation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
