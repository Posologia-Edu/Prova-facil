import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOKEN_TTL_HOURS = 3;

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

  try {
    const { group_id, class_virtual_patient_id } = await req.json();
    if (!group_id || !class_virtual_patient_id) {
      return new Response(JSON.stringify({ error: "Missing group_id or class_virtual_patient_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Roster = every session row sharing this group_id (source of truth for
    // group membership — see VirtualPatientRoom.tsx group-join logic).
    const { data: sessions, error: sessErr } = await supabase
      .from("virtual_patient_sessions")
      .select("student_email, student_name")
      .eq("group_id", group_id)
      .eq("class_virtual_patient_id", class_virtual_patient_id);

    if (sessErr) throw sessErr;

    const seen = new Set<string>();
    const roster = (sessions || [])
      .filter((s: any) => {
        const email = (s.student_email || "").trim().toLowerCase();
        if (!email || seen.has(email)) return false;
        seen.add(email);
        return true;
      })
      .map((s: any) => ({ email: (s.student_email as string).trim().toLowerCase(), name: s.student_name || "" }));

    if (roster.length < 2) {
      // Individual session — no peer to evaluate, nothing to do.
      return new Response(JSON.stringify({ success: true, sent: 0, reason: "not_a_group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: if invites for this group were already sent and haven't
    // expired, don't resend (handleMAIComplete could fire more than once).
    const { data: existingTokens } = await supabase
      .from("virtual_patient_peer_eval_tokens")
      .select("token")
      .eq("group_id", group_id)
      .gt("expires_at", new Date().toISOString())
      .limit(1);

    if (existingTokens && existingTokens.length > 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, reason: "already_sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY não configurada");
    const resend = new Resend(resendApiKey);

    const { data: cvp } = await supabase
      .from("class_virtual_patients")
      .select("patient_id")
      .eq("id", class_virtual_patient_id)
      .maybeSingle();
    const patientLabel = cvp ? (PATIENT_LABELS[cvp.patient_id] || cvp.patient_id) : "seu paciente virtual";

    const origin = req.headers.get("origin") || "https://examcraft-studio-45.lovable.app";
    const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();

    let sent = 0;
    const errors: string[] = [];

    for (const member of roster) {
      const teammates = roster.filter((r) => r.email !== member.email);

      const { data: tokenRow, error: tokenErr } = await supabase
        .from("virtual_patient_peer_eval_tokens")
        .insert({
          group_id,
          class_virtual_patient_id,
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

      const link = `${origin}/virtual-patients/peer-eval/${tokenRow.token}`;

      try {
        const { error: emailError } = await resend.emails.send({
          from: "ProvaFácil <noreply@tbl.posologia.app>",
          to: [member.email],
          subject: `Avalie seus colegas de grupo — ${patientLabel}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #1a1a2e; font-size: 22px;">Avaliação entre pares</h1>
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                Olá, <strong>${member.name || member.email}</strong>! Seu grupo concluiu o atendimento ao
                paciente virtual <strong>${patientLabel}</strong>.
              </p>
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                Agora avalie a participação de ${teammates.length === 1 ? "seu colega" : "seus colegas"} de grupo
                (<strong>${teammates.map((t) => t.name || t.email).join(", ")}</strong>) durante a atividade.
                Isso é parte da sua nota individual.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${link}"
                   style="background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
                  Avaliar meus colegas
                </a>
              </div>
              <p style="color: #888; font-size: 14px;">
                Este link é pessoal e expira em ${TOKEN_TTL_HOURS} horas.
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

    return new Response(JSON.stringify({ success: true, sent, total: roster.length, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[SEND-VP-PEER-EVAL-INVITES] ERROR:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
