import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RatingInput {
  evaluatee_email: string;
  participacao_score: number;
  contribuicao_score: number;
  colaboracao_score: number;
  comentario?: string;
}

function isValidScore(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 5;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (d: unknown, s = 200) =>
    new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { token, ratings } = await req.json();
    if (!token || typeof token !== "string") return json({ error: "Missing token" }, 400);
    if (!Array.isArray(ratings) || ratings.length === 0) return json({ error: "Missing ratings" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tokenRow } = await supabase
      .from("virtual_patient_peer_eval_tokens")
      .select("group_id, class_virtual_patient_id, evaluator_email, evaluator_name, expires_at, used_at")
      .eq("token", token)
      .maybeSingle();

    if (!tokenRow) return json({ error: "invalid_token" }, 404);
    if (tokenRow.used_at) return json({ error: "already_used" }, 400);
    if (new Date(tokenRow.expires_at).getTime() < Date.now()) return json({ error: "expired" }, 400);

    const { data: sessions } = await supabase
      .from("virtual_patient_sessions")
      .select("student_email, student_name")
      .eq("group_id", tokenRow.group_id)
      .eq("class_virtual_patient_id", tokenRow.class_virtual_patient_id);

    const rosterByEmail = new Map<string, string>();
    (sessions || []).forEach((s: any) => {
      const email = (s.student_email || "").trim().toLowerCase();
      if (email) rosterByEmail.set(email, s.student_name || "");
    });

    const rows: Record<string, unknown>[] = [];
    for (const r of ratings as RatingInput[]) {
      const evaluateeEmail = (r?.evaluatee_email || "").trim().toLowerCase();
      if (!evaluateeEmail || evaluateeEmail === tokenRow.evaluator_email) continue;
      if (!rosterByEmail.has(evaluateeEmail)) continue;
      if (!isValidScore(r.participacao_score) || !isValidScore(r.contribuicao_score) || !isValidScore(r.colaboracao_score)) {
        return json({ error: `invalid_score_for:${evaluateeEmail}` }, 400);
      }
      rows.push({
        group_id: tokenRow.group_id,
        class_virtual_patient_id: tokenRow.class_virtual_patient_id,
        evaluator_email: tokenRow.evaluator_email,
        evaluator_name: tokenRow.evaluator_name,
        evaluatee_email: evaluateeEmail,
        evaluatee_name: rosterByEmail.get(evaluateeEmail),
        participacao_score: r.participacao_score,
        contribuicao_score: r.contribuicao_score,
        colaboracao_score: r.colaboracao_score,
        comentario: typeof r.comentario === "string" ? r.comentario.slice(0, 2000) : null,
      });
    }

    if (rows.length === 0) return json({ error: "no_valid_ratings" }, 400);

    const { error: upsertErr } = await supabase
      .from("virtual_patient_peer_evaluations")
      .upsert(rows, { onConflict: "group_id,evaluator_email,evaluatee_email" });
    if (upsertErr) throw upsertErr;

    await supabase
      .from("virtual_patient_peer_eval_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token", token);

    return json({ success: true, rated: rows.length });
  } catch (err) {
    console.error("[SUBMIT-VP-PEER-EVALUATION] ERROR:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
