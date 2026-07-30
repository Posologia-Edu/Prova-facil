import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getUserId, unauthorized } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FROM_EMAIL = "ProvaFácil <noreply@tbl.posologia.app>";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const userId = await getUserId(req);
    if (!userId) return unauthorized(corsHeaders);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("Serviço de email não configurado");
    }
    const resend = new Resend(RESEND_API_KEY);

    const { emails, pdfBase64, fileName, roomTitle, stageName, studentNames } = await req.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(JSON.stringify({ error: "No emails provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pdfBase64) {
      return new Response(JSON.stringify({ error: "No PDF provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const namesText = Array.isArray(studentNames) && studentNames.length > 0 ? studentNames.join(" e ") : "Aluno(a)";
    const safeStageName = escapeHtml(stageName || "Simulação");
    const safeRoomTitle = escapeHtml(roomTitle || "Sala");
    const subject = `Relatório ${stageName || "Simulação"} — ${roomTitle || "Sala"}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #2563eb; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Relatório de Simulação</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0;">ProvaFácil</p>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
          <p>Olá, <strong>${escapeHtml(namesText)}</strong>,</p>
          <p>Segue em anexo o relatório detalhado da etapa <strong>${safeStageName}</strong> da sala <strong>${safeRoomTitle}</strong>.</p>
          <p>O relatório inclui suas notas, feedback do professor e feedback da IA (quando disponível).</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #6b7280;">Este email foi enviado automaticamente pelo ProvaFácil.</p>
        </div>
      </div>
    `;

    const results = [];
    for (const email of emails) {
      try {
        const { data, error } = await resend.emails.send({
          from: FROM_EMAIL,
          to: [email],
          subject,
          html,
          attachments: [
            {
              filename: fileName || `relatorio-${String(stageName || "simulacao").toLowerCase()}.pdf`,
              content: pdfBase64,
            },
          ],
        });
        if (error) {
          console.error("Email send error for", email, error);
        }
        const errorMsg = error ? (error.message || JSON.stringify(error)) : undefined;
        results.push({ email, success: !error, data, error: errorMsg });
      } catch (err) {
        console.error("Fetch error for", email, err);
        results.push({ email, success: false, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-simulation-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
