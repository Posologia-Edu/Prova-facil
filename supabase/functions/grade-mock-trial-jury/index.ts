// Edge function: grade-mock-trial-jury
// Avalia, via IA, a argumentação de Acusação e Defesa de um caso de Júri Simulado,
// comparando: respostas dos jurados × respostas dos próprios grupos × processo + evidências.
// Persiste resultados em mock_trial_evaluations (evaluator_type='ai_jury').

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Sessão + caso
    const { data: session, error: sErr } = await sb
      .from("mock_trial_sessions")
      .select("*, mock_trial_cases(*)")
      .eq("id", session_id)
      .single();
    if (sErr || !session) throw new Error("Sessão não encontrada");

    const caseRow: any = session.mock_trial_cases;
    if (!caseRow) throw new Error("Caso não encontrado");

    // Atribuições e grupos
    const { data: assignments } = await sb
      .from("mock_trial_assignments")
      .select("*")
      .eq("case_id", caseRow.id);

    const { data: groups } = await sb
      .from("mock_trial_groups")
      .select("*")
      .eq("mock_trial_id", caseRow.mock_trial_id);

    const findGroupByRole = (role: string) =>
      assignments?.find((a: any) => a.role === role);

    const prosecutionAssign = findGroupByRole("prosecution");
    const defenseAssign = findGroupByRole("defense");
    if (!prosecutionAssign || !defenseAssign) {
      throw new Error("Caso sem distribuição completa (acusação/defesa)");
    }

    // Forms + respostas dessa sessão
    const { data: forms } = await sb
      .from("mock_trial_forms")
      .select("*")
      .eq("mock_trial_id", caseRow.mock_trial_id);

    const { data: responses } = await sb
      .from("mock_trial_responses")
      .select("*")
      .eq("session_id", session_id);

    const responsesByRole = (role: string) => {
      const formIds = (forms || [])
        .filter((f: any) => f.target_role === role)
        .map((f: any) => f.id);
      return (responses || []).filter((r: any) => formIds.includes(r.form_id));
    };

    const juryResponses = responsesByRole("jury");
    const prosecutionResponses = responsesByRole("prosecution");
    const defenseResponses = responsesByRole("defense");

    const summarizeResponses = (rows: any[]) =>
      rows.map((r: any) => ({
        grupo: r.group_id,
        aluno: r.student_name || "?",
        respostas: r.response_json,
      }));

    const prompt = `Você é um avaliador imparcial de um Júri Simulado clínico-jurídico.
Sua tarefa: atribuir uma nota 0–10 para a ACUSAÇÃO e outra 0–10 para a DEFESA, com base em:
1. O CONTEÚDO DO PROCESSO (prontuário, exames, depoimentos, evidências);
2. As respostas dos próprios grupos (suas argumentações via formulário);
3. As respostas dos JURADOS (que assistiram à sessão e marcaram suas impressões);
4. As EVIDÊNCIAS CIENTÍFICAS e diretrizes clínicas relevantes ao caso.

PRINCÍPIOS:
- Nem sempre o júri tem razão. Se os jurados favoreceram um lado mas as evidências apontam o contrário, isso deve ser pesado.
- Argumentos clinicamente sólidos e bem fundamentados em evidência valem mais.
- Coerência com o processo é essencial.
- Justifique cada nota com 2-4 frases citando o que sustenta a pontuação.

=== CASO ===
Título: ${caseRow.title}
Número: ${caseRow.case_number}

PROCESSO COMPLETO:
${(caseRow.process_content || "").slice(0, 12000)}

=== RESPOSTAS DOS JURADOS ===
${JSON.stringify(summarizeResponses(juryResponses), null, 2).slice(0, 4000)}

=== ARGUMENTAÇÃO DA ACUSAÇÃO ===
${JSON.stringify(summarizeResponses(prosecutionResponses), null, 2).slice(0, 4000)}

=== ARGUMENTAÇÃO DA DEFESA ===
${JSON.stringify(summarizeResponses(defenseResponses), null, 2).slice(0, 4000)}

Retorne via tool call sua avaliação estruturada.`;

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            {
              role: "system",
              content:
                "Você avalia desempenhos de Júri Simulado clínico de forma rigorosa, justa e baseada em evidências.",
            },
            { role: "user", content: prompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "submit_evaluation",
                description: "Envia avaliação final de Acusação e Defesa.",
                parameters: {
                  type: "object",
                  properties: {
                    prosecution: {
                      type: "object",
                      properties: {
                        score: { type: "number", minimum: 0, maximum: 10 },
                        criteria: {
                          type: "object",
                          properties: {
                            coerencia_processo: { type: "number", minimum: 0, maximum: 10 },
                            uso_evidencia: { type: "number", minimum: 0, maximum: 10 },
                            forca_argumentativa: { type: "number", minimum: 0, maximum: 10 },
                            alinhamento_juri: { type: "number", minimum: 0, maximum: 10 },
                          },
                          required: ["coerencia_processo", "uso_evidencia", "forca_argumentativa", "alinhamento_juri"],
                          additionalProperties: false,
                        },
                        feedback: { type: "string" },
                      },
                      required: ["score", "criteria", "feedback"],
                      additionalProperties: false,
                    },
                    defense: {
                      type: "object",
                      properties: {
                        score: { type: "number", minimum: 0, maximum: 10 },
                        criteria: {
                          type: "object",
                          properties: {
                            coerencia_processo: { type: "number", minimum: 0, maximum: 10 },
                            uso_evidencia: { type: "number", minimum: 0, maximum: 10 },
                            forca_argumentativa: { type: "number", minimum: 0, maximum: 10 },
                            alinhamento_juri: { type: "number", minimum: 0, maximum: 10 },
                          },
                          required: ["coerencia_processo", "uso_evidencia", "forca_argumentativa", "alinhamento_juri"],
                          additionalProperties: false,
                        },
                        feedback: { type: "string" },
                      },
                      required: ["score", "criteria", "feedback"],
                      additionalProperties: false,
                    },
                  },
                  required: ["prosecution", "defense"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "submit_evaluation" } },
        }),
      }
    );

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Configurações > Workspace > Uso." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway: ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("IA não retornou avaliação estruturada");

    const evaluation = JSON.parse(toolCall.function.arguments);

    // Persistir
    const upserts = [
      {
        session_id,
        case_id: caseRow.id,
        group_id: prosecutionAssign.group_id,
        evaluated_role: "prosecution",
        evaluator_type: "ai_jury",
        score: evaluation.prosecution.score,
        max_score: 10,
        criteria_json: evaluation.prosecution.criteria,
        feedback: evaluation.prosecution.feedback,
        ai_generated: true,
      },
      {
        session_id,
        case_id: caseRow.id,
        group_id: defenseAssign.group_id,
        evaluated_role: "defense",
        evaluator_type: "ai_jury",
        score: evaluation.defense.score,
        max_score: 10,
        criteria_json: evaluation.defense.criteria,
        feedback: evaluation.defense.feedback,
        ai_generated: true,
      },
    ];

    const { error: upErr } = await sb
      .from("mock_trial_evaluations")
      .upsert(upserts, { onConflict: "case_id,group_id,evaluator_type" });

    if (upErr) throw upErr;

    return new Response(
      JSON.stringify({ ok: true, evaluation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("grade-mock-trial-jury error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
