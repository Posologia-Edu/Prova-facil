import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const hubServiceKey = Deno.env.get("HUB_SERVICE_KEY");
    const hubServiceId = Deno.env.get("HUB_SERVICE_ID");

    if (!hubServiceKey || !hubServiceId) {
      throw new Error("HUB_SERVICE_KEY or HUB_SERVICE_ID not configured");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Total users (profiles)
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    // Active users (updated profile in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: activeUsers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("updated_at", thirtyDaysAgo);

    // Subscribers: count exam_sessions from unique students (proxy for paid activity)
    // Since there's no direct subscriptions table, we send 0
    const subscribers = 0;

    const body = {
      service_id: hubServiceId,
      total_users: totalUsers ?? 0,
      active_users: activeUsers ?? 0,
      subscribers,
      ai_requests: 0,
      ai_tokens_used: 0,
      ai_cost_usd: 0,
      revenue_usd: 0,
      mrr_usd: 0,
    };

    console.log("Sending metrics to hub:", JSON.stringify(body));

    const response = await fetch(
      "https://slmnpcabhjsqithkmkxn.supabase.co/functions/v1/report-metrics",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-service-key": hubServiceKey,
        },
        body: JSON.stringify(body),
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`Hub responded with ${response.status}: ${responseText}`);
      return new Response(
        JSON.stringify({ error: "Hub request failed", status: response.status, detail: responseText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Metrics sent successfully:", responseText);

    return new Response(
      JSON.stringify({ success: true, metrics: body, hub_response: responseText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error sending metrics:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
