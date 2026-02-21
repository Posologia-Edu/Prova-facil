import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { topic, context, difficulty, questionType, count, language } = await req.json();

    if (!topic || !difficulty || !questionType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: topic, difficulty, questionType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const numQuestions = Math.min(count || 3, 10);

    const typeInstructions: Record<string, string> = {
      multiple_choice: `Each question must have exactly 4 options (a, b, c, d) and a "correct_answer" field with the letter of the correct option. Include an "explanation" for the correct answer.`,
      true_false: `Each question must have a "correct_answer" field with either "true" or "false". Include an "explanation" for why.`,
      open_ended: `Each question must have an "expected_answer" field with a model answer (2-3 sentences). Include "grading_criteria" as a brief rubric.`,
      matching: `Each question must have a "column_a" array and a "column_b" array (each with 4-5 items), and a "correct_matches" object mapping column_a indices to column_b indices.`,
    };

    const langMap: Record<string, string> = { pt: "Brazilian Portuguese", en: "English", es: "Spanish" };
    const targetLang = langMap[language] || "Brazilian Portuguese";

    const systemPrompt = `You are an expert academic question generator for university-level exams.
You generate high-quality, pedagogically sound questions.
You MUST respond using the "generate_questions" tool call. Do NOT respond with plain text.
You MUST generate ALL questions in ${targetLang}. Every question text, option, explanation, and answer MUST be in ${targetLang}.`;

    const userPrompt = `Generate ${numQuestions} ${questionType.replace("_", " ")} questions about the topic: "${topic}".
Difficulty level: ${difficulty}.
${context ? `Additional context/material to base questions on:\n${context}` : ""}

${typeInstructions[questionType] || typeInstructions.multiple_choice}

For each question, also provide:
- "bloom_level": one of "Remembering", "Understanding", "Applying", "Analyzing", "Evaluating", "Creating"
- "tags": an array of 1-3 relevant topic tags`;

    const questionProperties: Record<string, any> = {
      multiple_choice: {
        question_text: { type: "string", description: "The question text" },
        options: {
          type: "object",
          properties: {
            a: { type: "string" },
            b: { type: "string" },
            c: { type: "string" },
            d: { type: "string" },
          },
          required: ["a", "b", "c", "d"],
          additionalProperties: false,
        },
        correct_answer: { type: "string", enum: ["a", "b", "c", "d"] },
        explanation: { type: "string" },
        bloom_level: { type: "string", enum: ["Remembering", "Understanding", "Applying", "Analyzing", "Evaluating", "Creating"] },
        tags: { type: "array", items: { type: "string" } },
      },
      true_false: {
        question_text: { type: "string" },
        correct_answer: { type: "string", enum: ["true", "false"] },
        explanation: { type: "string" },
        bloom_level: { type: "string", enum: ["Remembering", "Understanding", "Applying", "Analyzing", "Evaluating", "Creating"] },
        tags: { type: "array", items: { type: "string" } },
      },
      open_ended: {
        question_text: { type: "string" },
        expected_answer: { type: "string" },
        grading_criteria: { type: "string" },
        bloom_level: { type: "string", enum: ["Remembering", "Understanding", "Applying", "Analyzing", "Evaluating", "Creating"] },
        tags: { type: "array", items: { type: "string" } },
      },
      matching: {
        question_text: { type: "string" },
        column_a: { type: "array", items: { type: "string" } },
        column_b: { type: "array", items: { type: "string" } },
        correct_matches: { type: "object", additionalProperties: { type: "integer" } },
        bloom_level: { type: "string", enum: ["Remembering", "Understanding", "Applying", "Analyzing", "Evaluating", "Creating"] },
        tags: { type: "array", items: { type: "string" } },
      },
    };

    const props = questionProperties[questionType] || questionProperties.multiple_choice;
    const requiredFields = Object.keys(props);

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
              name: "generate_questions",
              description: "Return an array of generated exam questions.",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: props,
                      required: requiredFields,
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_questions" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate questions. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "AI did not return structured questions. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        questions: parsed.questions,
        metadata: { topic, difficulty, questionType, count: parsed.questions.length },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-questions error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
