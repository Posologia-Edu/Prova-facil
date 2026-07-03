import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rubric: 4 dimensions × 2.5 points = 10.0 total
const RUBRIC = [
  {
    key: "subjective_objective",
    title: "I. Análise do Subjetivo e Objetivo (Dados)",
    max: 2.5,
    questions: [
      "O relato do paciente está contextualizado? (A história da doença atual inclui os principais sintomas, gatilhos, automedicação e o impacto na rotina do paciente?)",
      "Os dados objetivos são rastreáveis? (Existe suporte no exame físico ou em medidas para as afirmações feitas? O leitor encontra os dados vitais ou índices necessários para validar a queixa?)",
    ],
  },
  {
    key: "assessment",
    title: "II. Análise da Avaliação (Raciocínio Clínico)",
    max: 2.5,
    questions: [
      "Existe um \"fio condutor\" evidente? (O problema identificado na Avaliação justifica-se plenamente pelos achados do S e do O? Ex: A dor relatada no S gera um achado físico no O e uma intervenção específica no P.)",
      "A análise é técnico-científica? (A interpretação evita achismos e utiliza terminologia farmacológica/clínica correta, mantendo o foco no manejo do cuidado?)",
    ],
  },
  {
    key: "plan",
    title: "III. Análise do Plano (Intervenção)",
    max: 2.5,
    questions: [
      "O plano contempla ações para todas as hipóteses listadas na Avaliação? (Existe uma conduta clara para cada problema identificado ou meta terapêutica estabelecida?)",
      "As condutas são exequíveis? (O plano considera a realidade socioeconômica do paciente, rede de apoio e a viabilidade de adesão ao tratamento proposto?)",
    ],
  },
  {
    key: "overall_quality",
    title: "IV. Qualidade Geral",
    max: 2.5,
    questions: [
      "A anotação está concisa e organizada? (O texto permite uma leitura fluida sem informações redundantes ou confusas?)",
      "Há coerência sistêmica? (A conduta proposta no P não contradiz as informações levantadas no S ou os achados no O?)",
    ],
  },
];

function buildRubricPrompt(): string {
  let s = "## CHECKLIST DE AUDITORIA PARA PRONTUÁRIO SOAP\n\nAvalie o SOAP do aluno EXCLUSIVAMENTE segundo as 4 dimensões abaixo. Cada dimensão vale 2,5 pontos (nota total do SOAP = 10,0). Para cada dimensão, considere as perguntas-guia listadas e atribua uma nota entre 0 e 2,5 (uma casa decimal), justificando com pontos positivos e pontos de melhoria.\n\n";
  RUBRIC.forEach((d) => {
    s += `### ${d.title} (0 a ${d.max.toString().replace(".", ",")} pontos)\n`;
    d.questions.forEach((q, i) => {
      s += `${i + 1}. ${q}\n`;
    });
    s += "\n";
  });
  return s;
}

function formatFeedbackText(grading: any): string {
  const lines: string[] = [];
  lines.push("# Avaliação SOAP — Checklist de Auditoria\n");
  let total = 0;
  for (const dim of RUBRIC) {
    const d = grading?.[dim.key] || {};
    const score = typeof d.score === "number" ? d.score : 0;
    total += score;
    lines.push(`## ${dim.title}`);
    lines.push(`**Nota: ${score.toFixed(1).replace(".", ",")} / ${dim.max.toString().replace(".", ",")}**\n`);
    const qArr = Array.isArray(d.questions) ? d.questions : [];
    dim.questions.forEach((qText, i) => {
      const q = qArr[i] || {};
      lines.push(`**Pergunta ${i + 1}:** ${qText}`);
      if (q.positives) lines.push(`- ✅ Pontos positivos: ${q.positives}`);
      if (q.improvements) lines.push(`- ⚠️ Pontos de melhoria: ${q.improvements}`);
      lines.push("");
    });
    if (d.summary) {
      lines.push(`_Justificativa da dimensão:_ ${d.summary}\n`);
    }
  }
  lines.push(`---\n## Nota Final: ${total.toFixed(1).replace(".", ",")} / 10,0`);
  if (grading?.final_comment) {
    lines.push(`\n${grading.final_comment}`);
  }
  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { response_id, soap_answers, anamnesis_answers, soap_form_fields, student_name, patient_name } = await req.json();

    if (!response_id || !soap_answers) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fields = Array.isArray(soap_form_fields) ? soap_form_fields : [];
    let soapSection = "## Respostas do SOAP do aluno:\n\n";
    fields.forEach((field: any) => {
      const answer = soap_answers[field.id] || "(sem resposta)";
      soapSection += `**${field.label}**:\n${typeof answer === "object" ? JSON.stringify(answer) : answer}\n\n`;
    });

    let anamnesisSection = "";
    if (anamnesis_answers && Object.keys(anamnesis_answers).length > 0) {
      anamnesisSection = "## Dados coletados na Anamnese (quando este aluno era o profissional):\n\n";
      for (const [key, value] of Object.entries(anamnesis_answers)) {
        anamnesisSection += `**${key}**: ${typeof value === "object" ? JSON.stringify(value) : value}\n\n`;
      }
    }

    const systemPrompt = `Você é um avaliador acadêmico de saúde. Sua tarefa é avaliar o prontuário SOAP do aluno seguindo ESTRITAMENTE o checklist de auditoria abaixo, mantendo os mesmos critérios para TODOS os alunos.

${buildRubricPrompt()}

Instruções:
- Use tom mentor, em 2ª pessoa ("Você...") e em português.
- Para CADA pergunta-guia (2 por dimensão, 8 no total), forneça pontos positivos e pontos de melhoria específicos, citando trechos da resposta quando possível.
- Atribua uma nota de 0 a 2,5 para cada dimensão (uma casa decimal), coerente com a análise das perguntas.
- Se houver dados de anamnese, verifique a consistência entre o que foi coletado e o que foi transcrito no SOAP.
- Retorne o resultado APENAS chamando a função fornecida.`;

    const userPrompt = `Aluno: ${student_name || "Não informado"}
Paciente simulado: ${patient_name || "Não informado"}

${anamnesisSection}
${soapSection}

Avalie o SOAP acima seguindo o checklist de auditoria (4 dimensões × 2,5 pontos).`;

    const dimensionSchema = (questions: string[]) => ({
      type: "object",
      properties: {
        score: { type: "number", description: "Nota da dimensão (0 a 2,5)" },
        summary: { type: "string", description: "Justificativa geral da dimensão" },
        questions: {
          type: "array",
          description: `Análise das ${questions.length} perguntas-guia, na ordem`,
          items: {
            type: "object",
            properties: {
              positives: { type: "string", description: "Pontos positivos identificados" },
              improvements: { type: "string", description: "Pontos de melhoria" },
            },
            required: ["positives", "improvements"],
          },
        },
      },
      required: ["score", "summary", "questions"],
    });

    const { response } = await callAiWithFallback({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_soap_grading",
            description: "Submete a avaliação do SOAP segundo o checklist de auditoria (4 dimensões × 2,5 pts).",
            parameters: {
              type: "object",
              properties: {
                subjective_objective: dimensionSchema(RUBRIC[0].questions),
                assessment: dimensionSchema(RUBRIC[1].questions),
                plan: dimensionSchema(RUBRIC[2].questions),
                overall_quality: dimensionSchema(RUBRIC[3].questions),
                final_comment: { type: "string", description: "Comentário final de fechamento em 2ª pessoa" },
              },
              required: ["subjective_objective", "assessment", "plan", "overall_quality"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_soap_grading" } },
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes. Adicione créditos em Configurações > Workspace > Uso." }), {
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
      try {
        grading = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool args:", e);
      }
    }

    // Compute total score (sum of dimensions, capped at 10)
    let total = 0;
    for (const dim of RUBRIC) {
      const s = grading?.[dim.key]?.score;
      if (typeof s === "number") total += Math.max(0, Math.min(dim.max, s));
    }
    total = Math.round(total * 10) / 10;

    const feedbackText = formatFeedbackText(grading);

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    await supabaseAdmin.from("soap_responses").update({
      ai_score: total,
      ai_feedback_json: {
        feedback: feedbackText,
        rubric_version: "audit_checklist_v1",
        dimensions: {
          subjective_objective: grading?.subjective_objective || null,
          assessment: grading?.assessment || null,
          plan: grading?.plan || null,
          overall_quality: grading?.overall_quality || null,
        },
        final_comment: grading?.final_comment || null,
        total_score: total,
      },
    }).eq("id", response_id);

    return new Response(JSON.stringify({
      score: total,
      feedback: feedbackText,
      dimensions: grading,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("grade-soap error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
