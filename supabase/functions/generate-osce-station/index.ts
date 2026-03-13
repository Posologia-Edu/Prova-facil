import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    const { examId, context, area, objectives, level } = await req.json();

    if (!examId || !context) {
      return new Response(JSON.stringify({ error: "examId and context are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify exam ownership
    const adminSupabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: exam } = await adminSupabase.from("osce_exams").select("user_id").eq("id", examId).single();
    if (!exam || exam.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Exam not found or access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const systemPrompt = `Você é um especialista em avaliações OSCE (Objective Structured Clinical Examination) na área de ${area}. Nível: ${level}.
Gere uma estação OSCE completa com base no contexto e objetivos fornecidos.
O cenário deve ser realista, detalhado e adequado para avaliação prática.
O roteiro do paciente simulado deve incluir: personalidade, sintomas, informações que só revela se perguntado, e dados biográficos relevantes.
O prompt do paciente virtual deve ser instruções claras para um chatbot de IA agir como o paciente.
O checklist deve cobrir as categorias: Comunicação, Raciocínio Clínico, Domínio Técnico e Empatia.
Inclua itens críticos que reprovam se não realizados.`;

    const userPrompt = `Contexto: ${context}
Objetivos de Aprendizagem: ${objectives || "Não especificados"}
Gere a estação OSCE completa.`;

    const tools = [{
      type: "function" as const,
      function: {
        name: "create_osce_station",
        description: "Creates a complete OSCE station with all components",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Station title" },
            student_instructions: { type: "string", description: "Door instructions for the student (scenario, task, time)" },
            case_summary: { type: "string", description: "Detailed clinical case for the evaluator" },
            patient_script: { type: "string", description: "Script for the simulated patient actor" },
            virtual_patient_system_prompt: { type: "string", description: "System prompt for the AI virtual patient chatbot" },
            learning_objectives: { type: "array", items: { type: "string" }, description: "Learning objectives" },
            checklist_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  type: { type: "string", enum: ["binary", "likert", "score"] },
                  likert_max: { type: "integer" },
                  weight: { type: "number" },
                  is_critical: { type: "boolean" },
                  category: { type: "string", enum: ["Comunicação", "Raciocínio Clínico", "Domínio Técnico", "Empatia", "Ética", "Geral"] },
                },
                required: ["description", "type", "category", "is_critical", "weight"],
                additionalProperties: false,
              },
            },
          },
          required: ["title", "student_instructions", "case_summary", "patient_script", "virtual_patient_system_prompt", "learning_objectives", "checklist_items"],
          additionalProperties: false,
        },
      },
    }];

    const { response } = await callAiWithFallback({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "create_osce_station" } },
    }, { userId, promptType: "osce-station-generation" });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI generation failed");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const generated = JSON.parse(toolCall.function.arguments);

    // Get next position
    const { data: existingStations } = await adminSupabase
      .from("osce_stations")
      .select("position")
      .eq("osce_exam_id", examId)
      .order("position", { ascending: false })
      .limit(1);

    const nextPos = (existingStations?.[0]?.position || 0) + 1;

    // Insert station
    const { data: newStation, error: stationError } = await adminSupabase
      .from("osce_stations")
      .insert({
        osce_exam_id: examId,
        position: nextPos,
        title: generated.title,
        student_instructions: generated.student_instructions,
        case_summary: generated.case_summary,
        patient_script: generated.patient_script,
        learning_objectives: generated.learning_objectives || [],
        virtual_patient_enabled: true,
        virtual_patient_system_prompt: generated.virtual_patient_system_prompt,
      })
      .select()
      .single();

    if (stationError) throw stationError;

    // Insert checklist items
    if (generated.checklist_items?.length > 0) {
      const checklistRows = generated.checklist_items.map((item: any, idx: number) => ({
        station_id: newStation.id,
        position: idx + 1,
        description: item.description,
        type: item.type || "binary",
        likert_max: item.likert_max || 5,
        weight: item.weight || 1,
        is_critical: item.is_critical || false,
        category: item.category || "Geral",
      }));

      const { error: checklistError } = await adminSupabase.from("osce_checklist_items").insert(checklistRows);
      if (checklistError) console.error("Checklist insert error:", checklistError);
    }

    return new Response(JSON.stringify({ success: true, stationId: newStation.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-osce-station error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
