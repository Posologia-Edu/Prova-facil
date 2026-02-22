import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { answerId, messages, action } = await req.json();
    if (!answerId) throw new Error("answerId is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get the answer with question context
    const { data: answer, error: ansError } = await supabase
      .from("student_answers")
      .select("*, question_bank(type, content_json)")
      .eq("id", answerId)
      .single();

    if (ansError || !answer) throw new Error("Answer not found");

    const content = (answer.question_bank as any)?.content_json || {};
    const statement = content.statement || content.title || "Questão";
    const questionType = (answer.question_bank as any)?.type || "unknown";
    const maxPoints = Number(answer.max_points) || 1;
    const studentAnswer = answer.answer_text || JSON.stringify(answer.answer_json) || "Sem resposta";

    // Build context for the AI tutor
    let expectedAnswer = "";
    if (questionType === "multiple_choice") {
      const options = content.options || [];
      const correct = options.find((o: any) => o.isCorrect || o.correct);
      expectedAnswer = correct ? `Resposta correta: ${correct.text || correct.label}` : "";
    } else if (questionType === "true_false") {
      expectedAnswer = `Resposta correta: ${content.correctAnswer === true ? "Verdadeiro" : "Falso"}`;
    } else if (questionType === "open_ended") {
      expectedAnswer = content.expectedAnswer ? `Resposta esperada/gabarito: ${content.expectedAnswer}` : "";
    } else if (questionType === "matching") {
      const pairs = content.pairs || content.columns || [];
      expectedAnswer = `Pares corretos: ${JSON.stringify(pairs)}`;
    }

    const systemPrompt = `Você é um Tutor de IA especializado em avaliação acadêmica. Seu papel é auxiliar o professor na correção de provas, dando feedback detalhado e discutindo critérios de avaliação.

CONTEXTO DA QUESTÃO:
- Tipo: ${questionType}
- Enunciado: "${statement}"
- Pontuação máxima: ${maxPoints} pontos
${expectedAnswer ? `- ${expectedAnswer}` : ""}

RESPOSTA DO ALUNO:
"${studentAnswer}"

AVALIAÇÃO ATUAL:
- Nota da IA: ${answer.ai_score ?? "Não avaliada"}
- Feedback da IA: ${answer.ai_feedback ?? "Nenhum"}
- Nota do professor: ${answer.teacher_score ?? "Não definida"}
- Feedback do professor: ${answer.teacher_feedback ?? "Nenhum"}
- Status: ${answer.grading_status}

INSTRUÇÕES:
${action === "grade" ? `
Avalie a resposta do aluno de forma justa e construtiva. Forneça:
1. Uma nota sugerida de 0 a ${maxPoints}
2. Justificativa pedagógica detalhada
3. Pontos positivos e negativos da resposta
4. Sugestão de feedback construtivo para o aluno
` : `
Você está em modo de discussão com o professor. Responda de forma construtiva e fundamentada:
- Se o professor questionar a nota, argumente com base nos critérios pedagógicos
- Se o professor pedir para reconsiderar, analise novamente e sugira ajustes
- Seja receptivo a diferentes critérios de avaliação
- Sugira notas e feedbacks quando solicitado
- Mantenha um tom colaborativo e profissional
`}`;

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || []),
    ];

    // If action is "grade" and no user messages, add initial grading request
    if (action === "grade" && (!messages || messages.length === 0)) {
      chatMessages.push({
        role: "user",
        content: "Por favor, avalie esta resposta do aluno e forneça uma nota sugerida com justificativa detalhada.",
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: chatMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("ai-tutor-chat error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
