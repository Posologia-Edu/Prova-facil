import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { response_id, soap_answers, anamnesis_answers, soap_form_fields, student_name, patient_name } = await req.json();

    if (!response_id || !soap_answers) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build the SOAP answers display
    const fields = Array.isArray(soap_form_fields) ? soap_form_fields : [];
    let soapSection = "## Respostas do SOAP do aluno:\n\n";
    fields.forEach((field: any) => {
      const answer = soap_answers[field.id] || "(sem resposta)";
      soapSection += `**${field.label}** (${field.max_score || 0} pts):\n${typeof answer === "object" ? JSON.stringify(answer) : answer}\n\n`;
    });

    // Build the anamnesis data section
    let anamnesisSection = "";
    if (anamnesis_answers && Object.keys(anamnesis_answers).length > 0) {
      anamnesisSection = "## Dados coletados na Anamnese (quando este aluno era o profissional):\n\n";
      for (const [key, value] of Object.entries(anamnesis_answers)) {
        anamnesisSection += `**${key}**: ${typeof value === "object" ? JSON.stringify(value) : value}\n\n`;
      }
    }

    const systemPrompt = `Você é um avaliador acadêmico de saúde especializado em avaliação formativa.
Sua tarefa é comparar as respostas do aluno no formulário SOAP com os dados que ele mesmo coletou durante a anamnese (quando era o profissional simulado).

Critérios de avaliação:
1. **Consistência dos dados**: As informações da anamnese foram corretamente transpostas para o SOAP?
2. **Interpretação clínica**: O aluno interpretou adequadamente os dados coletados?
3. **Completude**: Informações relevantes da anamnese foram omitidas no SOAP?
4. **Organização**: Os dados estão organizados nas seções corretas do SOAP (Subjetivo, Objetivo, Avaliação, Plano)?
5. **Qualidade da análise**: O plano de ação é coerente com os problemas identificados?

${!anamnesisSection ? "NOTA: Não foram encontrados dados de anamnese para comparação. Avalie apenas a qualidade intrínseca do SOAP." : ""}

Retorne o resultado usando a função fornecida com nota de 0 a 10 e feedback estruturado em português.`;

    const userPrompt = `Aluno: ${student_name || "Não informado"}
Paciente simulado: ${patient_name || "Não informado"}

${anamnesisSection}
${soapSection}

Avalie a qualidade do SOAP considerando a consistência com os dados coletados na anamnese.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_soap_grading",
              description: "Submit the SOAP grading results",
              parameters: {
                type: "object",
                properties: {
                  score: { type: "number", description: "Overall score from 0 to 10" },
                  feedback: { type: "string", description: "Structured feedback in Portuguese with sections for each criterion" },
                  consistency_score: { type: "number", description: "Score for data consistency (0-2)" },
                  interpretation_score: { type: "number", description: "Score for clinical interpretation (0-2)" },
                  completeness_score: { type: "number", description: "Score for completeness (0-2)" },
                  organization_score: { type: "number", description: "Score for organization (0-2)" },
                  analysis_score: { type: "number", description: "Score for analysis quality (0-2)" },
                },
                required: ["score", "feedback"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_soap_grading" } },
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
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes. Adicione créditos em Configurações > Workspace > Uso." }), {
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

    // Update the SOAP response record
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabaseAdmin.from("soap_responses").update({
      ai_score: grading.score || 0,
      ai_feedback_json: {
        feedback: grading.feedback || "",
        consistency_score: grading.consistency_score,
        interpretation_score: grading.interpretation_score,
        completeness_score: grading.completeness_score,
        organization_score: grading.organization_score,
        analysis_score: grading.analysis_score,
      },
    }).eq("id", response_id);

    return new Response(JSON.stringify({
      score: grading.score || 0,
      feedback: grading.feedback || "",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("grade-soap error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
