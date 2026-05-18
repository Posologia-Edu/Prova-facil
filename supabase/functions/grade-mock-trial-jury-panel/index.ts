// Edge function: grade-mock-trial-jury-panel
// Avalia, via IA, o desempenho do GRUPO DE JURADOS (júri técnico) em um caso de Júri Simulado.
// Critérios: (1) capacidade de interrogação (esclarecer pontos importantes)
//            (2) capacidade de julgamento justo (ponderar provas, argumentos e contra-argumentos).
// Compara: respostas do júri × argumentos da acusação × argumentos da defesa × processo.
// Persiste em mock_trial_evaluations com evaluator_type='ai_jury_panel', evaluated_role='jury'.

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

    const { data: session, error: sErr } = await sb
      .from("mock_trial_sessions")
      .select("*, mock_trial_cases(*)")
      .eq("id", session_id)
      .single();
    if (sErr || !session) throw new Error("Sessão não encontrada");

    const caseRow: any = session.mock_trial_cases;
    if (!caseRow) throw new Error("Caso não encontrado");

    const { data: assignments } = await sb
      .from("mock_trial_assignments")
      .select("*")
      .eq("case_id", caseRow.id);

    const juryAssign = assignments?.find((a: any) => a.role === "jury");
    if (!juryAssign) throw new Error("Este processo não tem grupo de júri técnico distribuído.");

    const { data: forms } = await sb
      .from("mock_trial_forms")
      .select("*")
      .eq("mock_trial_id", caseRow.mock_trial_id);

    const { data: responses } = await sb
      .from("mock_trial_responses")
      .select("*")
      .eq("session_id", session_id);

    const responsesByRole = (role: string) => {
      const formIds = (forms || []).filter((f: any) => f.target_role === role).map((f: any) => f.id);
      return (responses || []).filter((r: any) => formIds.includes(r.form_id));
    };

    const juryResponses = responsesByRole("jury");
    const prosecutionResponses = responsesByRole("prosecution");
    const defenseResponses = responsesByRole("defense");

    if (juryResponses.length === 0) {
      throw new Error("Nenhum jurado enviou formulário ainda.");
    }

    const summarize = (rows: any[]) =>
      rows.map((r: any) => ({
        aluno: r.student_name || "?",
        respostas: r.response_json,
      }));

    const prompt = `Você é um avaliador imparcial responsável por avaliar o desempenho do JÚRI TÉCNICO em um Júri Simulado clínico-jurídico.

Sua tarefa: atribuir uma nota global 0–10 ao GRUPO DE JURADOS, com base em DOIS critérios:
1. CAPACIDADE DE INTERROGAÇÃO — o júri buscou esclarecer pontos importantes do caso? As perguntas, observações e dúvidas registradas demonstram atenção, profundidade técnica e foco no que importa?
2. CAPACIDADE DE JULGAMENTO JUSTO — o júri ponderou de forma equilibrada as PROVAS do processo, os ARGUMENTOS da acusação e os CONTRA-ARGUMENTOS da defesa (e vice-versa)? A decisão é coerente com o que foi efetivamente apresentado, sem viés indevido?

PRINCÍPIOS:
- Compare CRITICAMENTE as respostas do júri com o que acusação e defesa entregaram em seus formulários e com o processo.
- Um júri que ignora evidências fortes ou despreza contra-argumentos relevantes deve ser pontuado mais baixo em "julgamento justo".
- Um júri que faz observações superficiais, sem buscar esclarecer dúvidas técnicas, deve ser pontuado mais baixo em "capacidade de interrogação".
- Justifique a nota com 3-6 frases em 2ª pessoa do plural ("Vocês..."), em tom de feedback formativo, citando o que sustenta cada critério.

=== CASO ===
Título: ${caseRow.title}
Número: ${caseRow.case_number || "-"}

PROCESSO COMPLETO:
${(caseRow.process_content || "").slice(0, 10000)}

=== RESPOSTAS DO JÚRI TÉCNICO ===
${JSON.stringify(summarize(juryResponses), null, 2).slice(0, 5000)}

=== ARGUMENTAÇÃO DA ACUSAÇÃO ===
${JSON.stringify(summarize(prosecutionResponses), null, 2).slice(0, 4000)}

=== ARGUMENTAÇÃO DA DEFESA ===
${JSON.stringify(summarize(defenseResponses), null, 2).slice(0, 4000)}

Retorne via tool call a avaliação estruturada do júri técnico.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "Você avalia o desempenho do júri técnico de Júri Simulado de forma rigorosa, justa e fundamentada nas evidências apresentadas." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_jury_evaluation",
            description: "Envia avaliação final do grupo de Júri Técnico.",
            parameters: {
              type: "object",
              properties: {
                score: { type: "number", minimum: 0, maximum: 10, description: "Nota global 0-10 (média dos critérios)." },
                criteria: {
                  type: "object",
                  properties: {
                    capacidade_interrogacao: { type: "number", minimum: 0, maximum: 10 },
                    julgamento_justo: { type: "number", minimum: 0, maximum: 10 },
                  },
                  required: ["capacidade_interrogacao", "julgamento_justo"],
                  additionalProperties: false,
                },
                feedback: { type: "string", description: "Feedback formativo em 2ª pessoa do plural." },
              },
              required: ["score", "criteria", "feedback"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_jury_evaluation" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Configurações > Workspace > Uso." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI gateway: ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("IA não retornou avaliação estruturada");
    const evaluation = JSON.parse(toolCall.function.arguments);

    const { error: upErr } = await sb
      .from("mock_trial_evaluations")
      .upsert({
        session_id,
        case_id: caseRow.id,
        group_id: juryAssign.group_id,
        evaluated_role: "jury",
        evaluator_type: "ai_jury_panel",
        score: evaluation.score,
        max_score: 10,
        criteria_json: evaluation.criteria,
        feedback: evaluation.feedback,
        ai_generated: true,
      }, { onConflict: "case_id,group_id,evaluator_type" });

    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ok: true, evaluation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("grade-mock-trial-jury-panel error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
