import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await authClient.auth.getUser();
    if (!userData.user) return json({ error: "Unauthorized" }, 401);

    const { semesterId, studentIds, regenerate } = await req.json();
    if (!semesterId) return json({ error: "Missing semesterId" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify ownership
    const { data: sem } = await admin
      .from("class_semesters")
      .select("id, classes!inner(user_id, name)")
      .eq("id", semesterId)
      .maybeSingle();
    // deno-lint-ignore no-explicit-any
    const ownerId = (sem as any)?.classes?.user_id;
    if (!sem || ownerId !== userData.user.id) return json({ error: "Forbidden" }, 403);
    // deno-lint-ignore no-explicit-any
    const className = (sem as any)?.classes?.name || "Turma";

    let query = admin.from("class_students").select("id, student_name, student_email, pin_hash").eq("semester_id", semesterId);
    if (studentIds?.length) query = query.in("id", studentIds);
    const { data: students } = await query;
    if (!students?.length) return json({ error: "Sem alunos" }, 400);

    const RESEND = Deno.env.get("RESEND_API_KEY");
    const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
    const canEmail = !!RESEND && !!LOVABLE;

    let sent = 0, generated = 0, skipped = 0;
    const results: { name: string; email: string | null; pin?: string; sent: boolean }[] = [];

    for (const s of students) {
      if (!s.student_email) { skipped++; continue; }
      let pin: string | null = null;
      if (!s.pin_hash || regenerate) {
        pin = randomPin();
        const hash = await bcrypt.hash(pin, 10);
        await admin.from("class_students").update({ pin_hash: hash, pin_last_sent_at: new Date().toISOString() }).eq("id", s.id);
        generated++;
      }

      if (canEmail && pin) {
        try {
          const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${LOVABLE}`,
              "X-Connection-Api-Key": RESEND!,
            },
            body: JSON.stringify({
              from: "ProvaFácil <onboarding@resend.dev>",
              to: [s.student_email],
              subject: `Seu PIN de presença — ${className}`,
              html: `<div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0f172a;color:#fff;border-radius:12px">
                <h2 style="color:#f59e0b;margin:0 0 8px">ProvaFácil</h2>
                <p>Olá, <strong>${s.student_name}</strong>!</p>
                <p>Seu PIN pessoal de presença para <strong>${className}</strong> é:</p>
                <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;background:#1e293b;padding:16px;border-radius:8px;margin:16px 0;color:#f59e0b">${pin}</div>
                <p style="font-size:13px;opacity:0.8">Guarde este código com segurança. Você o usará para fazer check-in nas aulas escaneando o QR code exibido pelo professor.</p>
              </div>`,
            }),
          });
          if (r.ok) sent++;
        } catch (_e) { /* ignore per-user email error */ }
      }
      results.push({ name: s.student_name, email: s.student_email, pin: pin ?? undefined, sent: !!pin && canEmail });
    }

    return json({ success: true, generated, sent, skipped, canEmail, results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
