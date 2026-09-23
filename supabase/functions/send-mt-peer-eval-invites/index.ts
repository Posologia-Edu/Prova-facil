import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOKEN_TTL_HOURS = 6;

const ROLE_LABELS: Record<string, string> = {
  prosecution: "Acusação",
  defense: "Defesa",
  jury: "Júri Técnico",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { case_id } = await req.json();
    if (!case_id) {
      return new Response(JSON.stringify({ error: "Missing case_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Idempotency: if invites for this case were already sent and haven't
    // expired, don't resend (finishSession could fire more than once).
    const { data: existingTokens } = await supabase
      .from("mock_trial_peer_eval_tokens")
      .select("token")
      .eq("case_id", case_id)
      .gt("expires_at", new Date().toISOString())
      .limit(1);

    if (existingTokens && existingTokens.length > 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, reason: "already_sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: caseRow, error: caseErr } = await supabase
      .from("mock_trial_cases")
      .select("id, title, case_number, mock_trial_id")
      .eq("id", case_id)
      .maybeSingle();
    if (caseErr || !caseRow) {
      return new Response(JSON.stringify({ error: "Case not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const caseLabel = caseRow.title || caseRow.case_number || "Processo";

    const { data: trial } = await supabase
      .from("mock_trials")
      .select("title")
      .eq("id", caseRow.mock_trial_id)
      .maybeSingle();
    const trialLabel = trial?.title || "Júri Simulado";

    const { data: assignments } = await supabase
      .from("mock_trial_assignments")
      .select("group_id, role")
      .eq("case_id", case_id);

    if (!assignments || assignments.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, reason: "no_assignments" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY não configurada");
    const resend = new Resend(resendApiKey);

    const origin = req.headers.get("origin") || "https://examcraft-studio-45.lovable.app";
    const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();

    let sent = 0;
    const errors: string[] = [];

    for (const assign of assignments) {
      const role = assign.role as string;
      if (!ROLE_LABELS[role]) continue;

      const { data: studentsData } = await supabase
        .from("mock_trial_students")
        .select("student_email, student_name")
        .eq("group_id", assign.group_id);

      const seen = new Set<string>();
      const roster = (studentsData || [])
        .filter((s: any) => {
          const email = (s.student_email || "").trim().toLowerCase();
          if (!email || seen.has(email)) return false;
          seen.add(email);
          return true;
        })
        .map((s: any) => ({ email: (s.student_email as string).trim().toLowerCase(), name: s.student_name || "" }));

      if (roster.length < 2) continue; // no peers to rate

      const roleLabel = ROLE_LABELS[role];

      for (const member of roster) {
        const teammates = roster.filter((r) => r.email !== member.email);

        const { data: tokenRow, error: tokenErr } = await supabase
          .from("mock_trial_peer_eval_tokens")
          .insert({
            case_id,
            group_id: assign.group_id,
            role,
            evaluator_email: member.email,
            evaluator_name: member.name,
            expires_at: expiresAt,
          })
          .select("token")
          .single();

        if (tokenErr || !tokenRow) {
          errors.push(`token:${member.email}:${tokenErr?.message}`);
          continue;
        }

        const link = `${origin}/mock-trial/peer-eval/${tokenRow.token}`;

        try {
          const { error: emailError } = await resend.emails.send({
            from: "ProvaFácil <noreply@tbl.posologia.app>",
            to: [member.email],
            subject: `Avalie seus colegas — ${caseLabel} (${roleLabel})`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #1a1a2e; font-size: 22px;">Avaliação entre pares</h1>
                <p style="color: #555; font-size: 16px; line-height: 1.6;">
                  Olá, <strong>${member.name || member.email}</strong>! O julgamento do processo
                  <strong>${caseLabel}</strong> (${trialLabel}) foi encerrado. Nele, seu grupo atuou como
                  <strong>${roleLabel}</strong>.
                </p>
                <p style="color: #555; font-size: 16px; line-height: 1.6;">
                  Agora avalie a participação de ${teammates.length === 1 ? "seu colega" : "seus colegas"} de grupo
                  (<strong>${teammates.map((t) => t.name || t.email).join(", ")}</strong>) na preparação e na
                  atuação neste processo específico. Isso é parte da nota individual de cada um.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${link}"
                     style="background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
                    Avaliar meus colegas
                  </a>
                </div>
                <p style="color: #888; font-size: 14px;">
                  Este link é pessoal, refere-se apenas a este processo (${caseLabel} — ${roleLabel}), e expira em ${TOKEN_TTL_HOURS} horas.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="color: #aaa; font-size: 12px; text-align: center;">
                  ProvaFácil — Plataforma de criação e gestão de provas
                </p>
              </div>
            `,
          });
          if (emailError) {
            errors.push(`email:${member.email}:${JSON.stringify(emailError)}`);
          } else {
            sent++;
          }
        } catch (e) {
          errors.push(`email:${member.email}:${(e as Error).message}`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[SEND-MT-PEER-EVAL-INVITES] ERROR:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
