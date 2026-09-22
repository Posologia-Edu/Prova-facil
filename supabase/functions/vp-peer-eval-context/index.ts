import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PATIENT_LABELS: Record<string, string> = {
  pain_helena: "Dona Helena", pain_luciana: "Luciana", pain_rogerio: "Rogério",
  pain_pedro: "Pedro", pain_ana: "Ana", inflammation_maria: "Dona Maria",
  inflammation_antonio: "Seu Antônio", inflammation_renata: "Renata",
  inflammation_wilson: "Seu Wilson", inflammation_jose: "José",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (d: unknown, s = 200) =>
    new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") return json({ error: "Missing token" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tokenRow } = await supabase
      .from("virtual_patient_peer_eval_tokens")
      .select("group_id, class_virtual_patient_id, evaluator_email, evaluator_name, expires_at, used_at")
      .eq("token", token)
      .maybeSingle();

    if (!tokenRow) return json({ status: "not_found" });
    if (tokenRow.used_at) return json({ status: "used", evaluator_name: tokenRow.evaluator_name });
    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return json({ status: "expired", evaluator_name: tokenRow.evaluator_name });
    }

    const { data: sessions } = await supabase
      .from("virtual_patient_sessions")
      .select("student_email, student_name")
      .eq("group_id", tokenRow.group_id)
      .eq("class_virtual_patient_id", tokenRow.class_virtual_patient_id);

    const seen = new Set<string>([tokenRow.evaluator_email]);
    const teammates = (sessions || [])
      .filter((s: any) => {
        const email = (s.student_email || "").trim().toLowerCase();
        if (!email || seen.has(email)) return false;
        seen.add(email);
        return true;
      })
      .map((s: any) => ({ email: (s.student_email as string).trim().toLowerCase(), name: s.student_name || "" }));

    const { data: cvp } = await supabase
      .from("class_virtual_patients")
      .select("patient_id")
      .eq("id", tokenRow.class_virtual_patient_id)
      .maybeSingle();
    const patientLabel = cvp ? (PATIENT_LABELS[cvp.patient_id] || cvp.patient_id) : "";

    return json({
      status: "pending",
      evaluator_email: tokenRow.evaluator_email,
      evaluator_name: tokenRow.evaluator_name,
      patient_label: patientLabel,
      teammates,
    });
  } catch (err) {
    console.error("[VP-PEER-EVAL-CONTEXT] ERROR:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
