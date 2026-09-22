import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PEER_EVAL_MAX_ADJUST = 1.0;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (d: unknown, s = 200) =>
    new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { class_virtual_patient_id, email } = await req.json();
    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!class_virtual_patient_id || !normalizedEmail) return json({ error: "Missing class_virtual_patient_id or email" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: session } = await supabase
      .from("virtual_patient_sessions")
      .select("group_id")
      .eq("class_virtual_patient_id", class_virtual_patient_id)
      .ilike("student_email", normalizedEmail)
      .maybeSingle();

    if (!session?.group_id) return json({ count: 0, bonus: 0 });

    // Return only the aggregate — never who rated what, so classmates stay anonymous to each other.
    const { data: rows } = await supabase
      .from("virtual_patient_peer_evaluations")
      .select("participacao_score, contribuicao_score, colaboracao_score")
      .eq("group_id", session.group_id)
      .eq("evaluatee_email", normalizedEmail);

    if (!rows || rows.length === 0) return json({ count: 0, bonus: 0 });

    const avg = (key: "participacao_score" | "contribuicao_score" | "colaboracao_score") =>
      rows.reduce((s: number, r: any) => s + r[key], 0) / rows.length;

    const participacao_avg = avg("participacao_score");
    const contribuicao_avg = avg("contribuicao_score");
    const colaboracao_avg = avg("colaboracao_score");
    const mean = (participacao_avg + contribuicao_avg + colaboracao_avg) / 3;
    const bonus = Math.max(-PEER_EVAL_MAX_ADJUST, Math.min(PEER_EVAL_MAX_ADJUST, ((mean - 2.5) / 2.5) * PEER_EVAL_MAX_ADJUST));

    return json({
      count: rows.length,
      participacao_avg,
      contribuicao_avg,
      colaboracao_avg,
      mean,
      bonus,
    });
  } catch (err) {
    console.error("[VP-PEER-EVAL-SUMMARY] ERROR:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
