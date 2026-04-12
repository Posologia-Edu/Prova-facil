import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { testId, course, subjects, questionsPerYear, difficulty } = await req.json();

    if (!testId || !course || !subjects || !questionsPerYear) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: testId, course, subjects, questionsPerYear" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt for question generation
    const yearEntries = Object.entries(questionsPerYear as Record<string, number>)
      .filter(([_, count]) => count > 0)
      .map(([year, count]) => `  - ${year}º ano: ${count} questões`)
      .join("\n");

    const totalQuestions = Object.values(questionsPerYear as Record<string, number>).reduce((s: number, n: number) => s + n, 0);

    const subjectsList = Array.isArray(subjects) ? subjects.join(", ") : subjects;

    const systemPrompt = `Você é um especialista em avaliação educacional em saúde. Crie questões de múltipla escolha para um Teste de Progresso.

REGRAS:
- Cada questão deve ter exatamente 5 alternativas (A, B, C, D, E)
- Apenas UMA alternativa correta por questão
- O enunciado deve ser claro e objetivo
- As alternativas devem ser plausíveis e homogêneas
- Inclua uma breve explicação/justificativa para a resposta correta
- Distribua as questões pelas áreas temáticas de forma equilibrada
- A dificuldade deve ser compatível com o ano esperado do aluno
- Questões de anos iniciais devem focar em conceitos básicos
- Questões de anos avançados devem focar em aplicação clínica e raciocínio

Use a tool "generate_questions" para retornar as questões em formato estruturado.`;

    const userPrompt = `Gere ${totalQuestions} questões de múltipla escolha para um Teste de Progresso do curso de ${course}.

Áreas temáticas: ${subjectsList}
Dificuldade geral: ${difficulty || "variada"}

Distribuição por ano:
${yearEntries}

Crie questões variadas cobrindo as áreas temáticas solicitadas, com dificuldade crescente conforme o ano.`;

    const { response, provider } = await callAiWithFallback(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_questions",
              description: "Generate progress test questions",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        expected_year: { type: "number", description: "Ano esperado (1-6)" },
                        stem: { type: "string", description: "Enunciado da questão" },
                        options: {
                          type: "object",
                          properties: {
                            a: { type: "string" },
                            b: { type: "string" },
                            c: { type: "string" },
                            d: { type: "string" },
                            e: { type: "string" },
                          },
                          required: ["a", "b", "c", "d", "e"],
                        },
                        correct_answer: { type: "string", enum: ["a", "b", "c", "d", "e"] },
                        explanation: { type: "string" },
                        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                        bloom_level: { type: "string" },
                        tags: { type: "array", items: { type: "string" } },
                      },
                      required: ["expected_year", "stem", "options", "correct_answer", "difficulty", "tags"],
                    },
                  },
                },
                required: ["questions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_questions" } },
      },
      {
        userId: user.id,
        promptType: "generate-progress-test",
      },
    );

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes. Adicione créditos nas configurações do workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI progress test error:", status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao gerar teste de progresso" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    // Extract questions from tool call
    let questions: any[] = [];
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
        questions = args.questions || [];
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    if (questions.length === 0) {
      return new Response(JSON.stringify({ error: "A IA não gerou questões. Tente novamente." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current max position
    const { data: existingQs } = await supabase
      .from("progress_test_questions")
      .select("position")
      .eq("test_id", testId)
      .order("position", { ascending: false })
      .limit(1);

    let nextPosition = (existingQs?.[0]?.position ?? -1) + 1;

    // Insert questions into question_bank and link to progress test
    let insertedCount = 0;
    for (const q of questions) {
      const contentJson = {
        question_text: q.stem,
        stem: q.stem,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation || "",
      };

      const { data: inserted, error: insertError } = await supabase
        .from("question_bank")
        .insert({
          user_id: user.id,
          type: "multiple_choice",
          difficulty: q.difficulty || "medium",
          bloom_level: q.bloom_level || "understanding",
          tags: q.tags || [],
          content_json: contentJson,
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        console.error("Failed to insert question:", insertError);
        continue;
      }

      const { error: linkError } = await supabase
        .from("progress_test_questions")
        .insert({
          test_id: testId,
          question_id: inserted.id,
          position: nextPosition,
          expected_year: q.expected_year || 1,
        });

      if (linkError) {
        console.error("Failed to link question:", linkError);
        continue;
      }

      nextPosition++;
      insertedCount++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalGenerated: questions.length,
        totalInserted: insertedCount,
        provider,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("generate-progress-test error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
