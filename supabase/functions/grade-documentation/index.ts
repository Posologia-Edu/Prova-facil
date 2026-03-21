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
    comparisonPrompt += "IMPORTANTE: A nota total é dividida em duas partes:\n";
    comparisonPrompt += "- Encaminhamento: máximo 5,0 pontos\n";
    comparisonPrompt += "- Quadro Resumo de Medicamentos: máximo 5,0 pontos\n";
    comparisonPrompt += "- Total: máximo 10,0 pontos\n\n";

    // Referral comparison
    if (referral_response && referral_answer_key) {
      // Support per-case answer keys
      let keyFields: any[] = [];
      if (referral_answer_key.case_answers) {
        // Per-case structure: find the right case
        const caseId = referral_response.clinical_case_id;
        if (caseId && referral_answer_key.case_answers[caseId]) {
          keyFields = referral_answer_key.case_answers[caseId];
        } else {
          // Fallback: use first case
          const firstKey = Object.keys(referral_answer_key.case_answers)[0];
          if (firstKey) keyFields = referral_answer_key.case_answers[firstKey];
        }
      } else if (Array.isArray(referral_answer_key)) {
        keyFields = referral_answer_key;
      }

      const fields = Array.isArray(referral_fields) ? referral_fields : [];

      comparisonPrompt += "## FICHA DE ENCAMINHAMENTO (máximo 5,0 pontos)\n\n";
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
      comparisonPrompt += "## QUADRO RESUMO DE MEDICAMENTOS (máximo 5,0 pontos)\n\n";

      // Support per-case answer keys
      let columns: any[] = [];
      let expectedRows: any[] = [];
      let rowScore = 1;

      if (med_answer_key.case_answers) {
        const caseId = med_response.clinical_case_id;
        let caseData: any = null;
        if (caseId && med_answer_key.case_answers[caseId]) {
          caseData = med_answer_key.case_answers[caseId];
        } else {
          const firstKey = Object.keys(med_answer_key.case_answers)[0];
          if (firstKey) caseData = med_answer_key.case_answers[firstKey];
        }
        if (caseData) {
          columns = caseData.columns || [];
          expectedRows = caseData.answer_rows || [];
          rowScore = caseData.rows_score || 1;
        }
      } else {
        columns = Array.isArray(med_columns) ? med_columns : (med_answer_key.columns || []);
        expectedRows = med_answer_key.answer_rows || [];
        rowScore = med_answer_key.rows_score || 1;
      }

      const studentRows = med_response.answers_json?.rows || [];

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
A nota do módulo de Documentação é dividida em duas partes:
- Ficha de Encaminhamento: nota de 0 a 5,0 pontos
- Quadro Resumo de Medicamentos: nota de 0 a 5,0 pontos
- Nota total: soma das duas, máximo 10,0 pontos

Para cada item do encaminhamento, dê uma nota proporcional e feedback em português.
Para o quadro resumo, avalie cada linha comparando com o espelho.
Retorne usando a função fornecida. Garanta que referral_total <= 5.0 e medication_score <= 5.0.`,
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
                  referral_total: { type: "number", description: "Nota do encaminhamento (0-5)" },
                  medication_score: { type: "number", description: "Nota do quadro resumo (0-5)" },
                  medication_feedback: { type: "string" },
                  general_feedback: { type: "string" },
                  total_score: { type: "number", description: "Soma de referral_total + medication_score (0-10)" },
                },
                required: ["referral_total", "medication_score", "total_score", "general_feedback"],
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

    // Clamp scores to 5.0 max each
    const referralScore = Math.min(Number(grading.referral_total) || 0, 5);
    const medicationScore = Math.min(Number(grading.medication_score) || 0, 5);

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Update referral response
    if (referral_response?.id) {
      const feedbackJson: Record<string, any> = {};
      (grading.referral_items || []).forEach((item: any) => { feedbackJson[item.field_id] = { score: item.score, feedback: item.feedback }; });
      await supabaseAdmin.from("documentation_responses").update({
        ai_score: referralScore,
        ai_feedback_json: feedbackJson,
      }).eq("id", referral_response.id);
    }

    // Update medication response
    if (med_response?.id) {
      await supabaseAdmin.from("documentation_responses").update({
        ai_score: medicationScore,
        ai_feedback_json: { feedback: grading.medication_feedback || grading.general_feedback || "" },
      }).eq("id", med_response.id);
    }

    return new Response(JSON.stringify({
      referral_score: referralScore,
      medication_score: medicationScore,
      total_score: referralScore + medicationScore,
      general_feedback: grading.general_feedback || "",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("grade-documentation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
