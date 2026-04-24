// Creates a mock-trial generation job and triggers the worker.
// Returns { jobId } immediately so the client can subscribe to progress.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    // Authenticate user via the supplied token
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const {
      mockTrialId,
      caseId, // optional: regenerating existing case
      mode, // "create" | "regenerate"
      learningObjectives,
      caseNumber,
      pdfContent,
    } = body;

    if (!mockTrialId) {
      return new Response(JSON.stringify({ error: "mockTrialId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify ownership
    const { data: trial, error: trialErr } = await sb
      .from("mock_trials")
      .select("id, user_id")
      .eq("id", mockTrialId)
      .single();
    if (trialErr || !trial) {
      return new Response(JSON.stringify({ error: "Júri Simulado não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (trial.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If regenerate: mark case as generating
    if (mode === "regenerate" && caseId) {
      await sb.from("mock_trial_cases").update({ generation_status: "generating" }).eq("id", caseId);
    }

    const { data: job, error: jobErr } = await sb
      .from("mock_trial_generation_jobs")
      .insert({
        mock_trial_id: mockTrialId,
        case_id: caseId || null,
        mode: mode || "create",
        status: "queued",
        current_step: "Aguardando início",
        progress: 0,
        learning_objectives: learningObjectives || null,
        case_number: caseNumber || null,
        pdf_content: pdfContent || null,
        user_id: userId,
      })
      .select()
      .single();
    if (jobErr) throw jobErr;

    // Fire worker (don't await — return to client immediately)
    fetch(`${SUPABASE_URL}/functions/v1/mock-trial-worker`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId: job.id }),
    }).catch((e) => console.error("worker invoke failed:", (e as Error).message));

    return new Response(JSON.stringify({ jobId: job.id }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("mock-trial-job error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
