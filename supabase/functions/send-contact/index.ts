import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(resendKey);
    const { name, email, institution, message, category, subject } = await req.json();

    if (!name || !email || !message || !category) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: nome, email, mensagem e categoria." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error } = await resend.emails.send({
      from: "ProvaFácil <onboarding@resend.dev>",
      to: ["contato@provafacil.com"],
      reply_to: email,
      subject: `[ProvaFácil Contato] ${category}${subject ? ` - ${subject}` : ""} — ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">Nova mensagem de contato — ProvaFácil</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold; color: #555;">Nome:</td><td style="padding: 8px;">${name}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #555;">Email:</td><td style="padding: 8px;">${email}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #555;">Instituição:</td><td style="padding: 8px;">${institution || "—"}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #555;">Categoria:</td><td style="padding: 8px;">${category}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #555;">Assunto:</td><td style="padding: 8px;">${subject || "—"}</td></tr>
          </table>
          <div style="margin-top: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
            <p style="font-weight: bold; color: #555; margin-bottom: 8px;">Mensagem:</p>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error(error.message);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-contact function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
