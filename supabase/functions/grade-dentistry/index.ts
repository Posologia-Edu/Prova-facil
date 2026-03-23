import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const moduleSystemPrompts: Record<string, string> = {
  anamnese_odontologica: `Você é um avaliador acadêmico de Odontologia especializado em Anamnese Odontológica.
Avalie as respostas considerando: queixa principal, histórico de saúde bucal, medicamentos em uso, antecedentes médicos e familiares, hábitos parafuncionais, última visita ao dentista e expectativas do paciente.`,
  exame_clinico: `Você é um avaliador acadêmico de Odontologia especializado em Exame Clínico Odontológico.
Avalie as respostas considerando: exame extraoral (ATM, linfonodos, simetria facial), exame intraoral (mucosas, tecidos moles, periodonto), odontograma completo, índices periodontais (PSR, IP, ISG), diagnóstico diferencial e exames complementares solicitados.`,
  plano_tratamento: `Você é um avaliador acadêmico de Odontologia especializado em Plano de Tratamento.
Avalie as respostas considerando: priorização por urgência e complexidade, sequenciamento lógico dos procedimentos, adequação do meio bucal, tratamento restaurador, periodontal e protético quando indicado, cronograma realista e prognóstico.`,
  orientacao_higiene: `Você é um avaliador acadêmico de Odontologia especializado em Orientação de Higiene Bucal.
Avalie as respostas considerando: técnica de escovação indicada (Bass, Fones, Stillman), uso correto do fio dental, escovas interdentais, raspadores de língua, enxaguatórios, orientação sobre dieta cariogênica e frequência de retorno.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { room_id, module_type, pair_index, response, answer_key, form_fields } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let comparisonPrompt = "Avalie as respostas do aluno comparando com o espelho de respostas.\n\nA nota total é de 0 a 10,0 pontos.\n\n";
    if (response && answer_key) {
      let keyFields: any[] = [];
      if (answer_key.case_answers) { const caseId = response.clinical_case_id; if (caseId && answer_key.case_answers[caseId]) keyFields = answer_key.case_answers[caseId]; else { const firstKey = Object.keys(answer_key.case_answers)[0]; if (firstKey) keyFields = answer_key.case_answers[firstKey]; } } else if (Array.isArray(answer_key)) { keyFields = answer_key; }
      const fields = Array.isArray(form_fields) ? form_fields : [];
      fields.forEach((field: any, idx: number) => {
        const studentAnswer = response.answers_json?.[field.id] || "(sem resposta)";
        const keyField = keyFields.find((k: any) => k.id === field.id);
        const expectedAnswer = keyField?.options?.join(", ") || keyField?.label || "(sem espelho)";
        comparisonPrompt += `Item ${idx + 1}: "${field.label}" (máx ${field.max_score || 0} pts)\n  Resposta: ${typeof studentAnswer === "object" ? JSON.stringify(studentAnswer) : studentAnswer}\n  Espelho: ${expectedAnswer}\n\n`;
      });
    }

    const systemPrompt = moduleSystemPrompts[module_type] || moduleSystemPrompts.anamnese_odontologica;
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `${systemPrompt}\n\nDê uma nota de 0 a 10,0 e feedback detalhado em português. Retorne usando a função fornecida.` },
          { role: "user", content: comparisonPrompt },
        ],
        tools: [{ type: "function", function: { name: "submit_grading", description: "Submit grading results", parameters: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { field_id: { type: "string" }, score: { type: "number" }, feedback: { type: "string" } }, required: ["field_id", "score", "feedback"] } }, total_score: { type: "number" }, general_feedback: { type: "string" } }, required: ["total_score", "general_feedback"] } } }],
        tool_choice: { type: "function", function: { name: "submit_grading" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResponse.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let grading: any = {};
    if (toolCall?.function?.arguments) grading = JSON.parse(toolCall.function.arguments);
    const totalScore = Math.min(Number(grading.total_score) || 0, 10);

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (response?.id) {
      const feedbackJson: Record<string, any> = {};
      (grading.items || []).forEach((item: any) => { feedbackJson[item.field_id] = { score: item.score, feedback: item.feedback }; });
      await supabaseAdmin.from("dentistry_responses").update({ ai_score: totalScore, ai_feedback_json: { ...feedbackJson, feedback: grading.general_feedback } }).eq("id", response.id);
    }

    return new Response(JSON.stringify({ score: totalScore, feedback: grading.general_feedback || "" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("grade-dentistry error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
