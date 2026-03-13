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
    const { stationId, messages } = await req.json();

    if (!stationId || !messages?.length) {
      return new Response(JSON.stringify({ error: "stationId and messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: station, error: stationError } = await adminSupabase
      .from("osce_stations")
      .select("virtual_patient_enabled, virtual_patient_system_prompt, patient_script, title, student_instructions")
      .eq("id", stationId)
      .single();

    if (stationError || !station) {
      return new Response(JSON.stringify({ error: "Station not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!station.virtual_patient_enabled) {
      return new Response(JSON.stringify({ error: "Virtual patient not enabled for this station" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = station.virtual_patient_system_prompt ||
      `Você é um paciente simulado em uma avaliação OSCE. Estação: ${station.title}.
Siga estritamente este roteiro: ${station.patient_script}
Responda como o paciente descrito. Não saia do personagem. Responda de forma natural e realista.
Só revele informações quando perguntado diretamente. Mantenha a consistência das respostas.`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    const { response } = await callAiWithFallback({
      messages: aiMessages,
      stream: true,
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("osce-virtual-patient error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
