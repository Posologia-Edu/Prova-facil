import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLE_LABELS: Record<string, string> = {
  prosecution: "Acusação",
  defense: "Defesa",
  jury: "Júri Técnico",
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
      .from("mock_trial_peer_eval_tokens")
      .select("case_id, group_id, role, evaluator_email, evaluator_name, expires_at, used_at")
      .eq("token", token)
      .maybeSingle();

    if (!tokenRow) return json({ status: "not_found" });
    if (tokenRow.used_at) return json({ status: "used", evaluator_name: tokenRow.evaluator_name });
    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return json({ status: "expired", evaluator_name: tokenRow.evaluator_name });
    }

    const { data: caseRow } = await supabase
      .from("mock_trial_cases")
      .select("title, case_number, mock_trial_id")
      .eq("id", tokenRow.case_id)
      .maybeSingle();
    const caseLabel = caseRow?.title || caseRow?.case_number || "Processo";

    const { data: trial } = caseRow
      ? await supabase.from("mock_trials").select("title").eq("id", caseRow.mock_trial_id).maybeSingle()
      : { data: null };

    const { data: studentsData } = await supabase
      .from("mock_trial_students")
      .select("student_email, student_name")
      .eq("group_id", tokenRow.group_id);

    const seen = new Set<string>([tokenRow.evaluator_email]);
    const teammates = (studentsData || [])
      .filter((s: any) => {
        const email = (s.student_email || "").trim().toLowerCase();
        if (!email || seen.has(email)) return false;
        seen.add(email);
        return true;
      })
      .map((s: any) => ({ email: (s.student_email as string).trim().toLowerCase(), name: s.student_name || "" }));

    return json({
      status: "pending",
      evaluator_email: tokenRow.evaluator_email,
      evaluator_name: tokenRow.evaluator_name,
      role: tokenRow.role,
      role_label: ROLE_LABELS[tokenRow.role] || tokenRow.role,
      case_label: caseLabel,
      trial_label: trial?.title || "Júri Simulado",
      teammates,
    });
  } catch (err) {
    console.error("[MT-PEER-EVAL-CONTEXT] ERROR:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
