import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

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

    const fields = Array.isArray(form_fields) ? form_fields : [];
    const answerKeyFields = Array.isArray(answer_key_json) ? answer_key_json : [];

    // Build a normalized label map from the answer key for robust matching
    const normalizeLabel = (l: string) => (l || "").trim().toLowerCase().replace(/\s+/g, " ");
    const answerKeyByLabel: Record<string, any> = {};
    answerKeyFields.forEach((k: any) => {
      if (k.label) answerKeyByLabel[normalizeLabel(k.label)] = k;
    });

    let comparisonPrompt = "Compare as respostas do aluno com o espelho de respostas (gabarito do professor) e avalie cada item.\n\n";
    
    // Filter only scorable fields (max_score > 0 and not section_header)
    const scorableFields = fields.filter((f: any) => f.type !== "section_header" && (f.max_score || 0) > 0);
    
    scorableFields.forEach((field: any, idx: number) => {
      const studentAnswer = answers_json[field.id] || "(sem resposta)";
      // Match by ID first, then by normalized label
      const keyField = answerKeyFields.find((k: any) => k.id === field.id) 
        || answerKeyByLabel[normalizeLabel(field.label)];
      const expectedAnswer = keyField?.correct_answer || keyField?.options?.join(", ") || "(sem espelho)";
      
      comparisonPrompt += `Item ${idx + 1}: "${field.label}" (máx ${field.max_score || 0} pts)\n`;
      comparisonPrompt += `  Resposta do aluno: ${typeof studentAnswer === "object" ? JSON.stringify(studentAnswer) : studentAnswer}\n`;
      comparisonPrompt += `  Espelho (gabarito): ${expectedAnswer}\n\n`;
    });

    const { response } = await callAiWithFallback({
      messages: [
        {
          role: "system",
          content: `Você é um avaliador acadêmico RIGOROSO e EXIGENTE, especializado em ciências da saúde, com foco em reconciliação medicamentosa e segurança do paciente.

Sua tarefa é comparar as respostas do aluno com o espelho de respostas (gabarito) fornecido pelo professor e produzir uma avaliação CRITERIOSA e DETALHADA.

CRITÉRIOS DE RIGOR:
- Seja criterioso na atribuição de notas: somente atribua nota máxima quando a resposta estiver COMPLETA, PRECISA e CLINICAMENTE CORRETA em todos os aspectos.
- Penalize respostas vagas, genéricas ou superficiais que não demonstrem raciocínio clínico aprofundado.
- Penalize omissões importantes: se o aluno deixou de mencionar informações críticas presentes no espelho, isso deve reduzir significativamente a nota.
- Penalize erros conceituais com rigor: confusões entre classes farmacológicas, mecanismos de ação, interações medicamentosas ou classificação de discrepâncias devem ter impacto relevante na nota.
- Respostas parcialmente corretas devem receber notas proporcionais — não arredonde para cima por generosidade.
- Compare CADA DETALHE da resposta do aluno com o espelho, incluindo: nomes de medicamentos, doses, vias de administração, frequência, classificação de discrepâncias, condutas propostas e justificativas clínicas.

Para cada item, atribua uma nota de 0 até o máximo de pontos e forneça feedback específico explicando EXATAMENTE o que faltou ou o que estava errado.

IMPORTANTE: Todo o feedback deve ser direcionado DIRETAMENTE AO ALUNO, usando linguagem em segunda pessoa ("você demonstrou...", "você precisa melhorar...", "recomendamos que você..."). Nunca escreva feedback direcionado ao professor. O aluno é quem lerá este feedback.

TOM: Crítico-construtivo e formativo. Seja honesto e direto sobre os erros, mas sempre com o objetivo de ensinar e orientar o aluno a melhorar. Não amenize falhas graves. Aponte cada erro com clareza, explique POR QUE está errado e indique O QUE o aluno deveria ter respondido com base no espelho.

Além da avaliação por item, produza um feedback geral estruturado contendo:
- **Resumo**: síntese honesta e direta do desempenho geral do aluno (2-3 frases). Se o desempenho foi insuficiente, diga claramente.
- **Pontos Positivos**: aspectos que o aluno acertou ou demonstrou domínio (ex: "Você identificou corretamente..."). Se houver poucos pontos positivos, seja breve nesta seção.
- **Pontos de Melhoria**: liste CADA aspecto que o aluno errou ou deixou incompleto, com explicações detalhadas sobre O QUE errou, POR QUE está errado e QUAL seria a resposta correta segundo o espelho. Seja específico e detalhado. (ex: "Você classificou a discrepância X como intencional, porém segundo o espelho trata-se de uma discrepância não-intencional porque...")
- **Recomendações**: sugestões concretas e específicas de estudo, com indicação de temas, conceitos e habilidades que o aluno precisa revisar urgentemente. Priorize as lacunas mais críticas para a segurança do paciente.

O feedback deve ser rigoroso, formativo e profissional, sempre em português e sempre dirigido ao aluno.
Retorne o resultado usando a função fornecida.`,
        },
        { role: "user", content: comparisonPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_grading",
            description: "Submit the grading results for each form field with structured feedback",
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
                general_feedback: { type: "string", description: "Structured overall feedback in Portuguese with sections: Resumo, Pontos Positivos, Pontos de Melhoria, Recomendações" },
              },
              required: ["items", "total_score", "general_feedback"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_grading" } },
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes. Adicione créditos nas configurações do workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    let grading: any = {};
    if (toolCall?.function?.arguments) {
      grading = JSON.parse(toolCall.function.arguments);
    }

    const feedbackJson: Record<string, any> = {};
    (grading.items || []).forEach((item: any) => {
      feedbackJson[item.field_id] = { score: item.score, feedback: item.feedback };
    });

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
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
