import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email } = await req.json();
    if (!email) throw new Error("Email é obrigatório");

    // Check if already invited
    const { data: existing } = await adminClient
      .from("admin_invitations")
      .select("id, status")
      .eq("email", email)
      .maybeSingle();

    if (existing && existing.status === "completed") {
      return new Response(JSON.stringify({ error: "Este usuário já completou o cadastro" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let createdUserId: string;

    // Check if user already exists in auth
    const { data: { users: existingUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1 });
    // Search by email specifically
    const { data: userByEmail } = await adminClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    
    // Try to find user by email
    const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = allUsers?.find((u: any) => u.email === email);

    if (existingUser) {
      createdUserId = existingUser.id;
    } else {
      // Create user without password, auto-confirm email
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: "", invited: true },
      });

      if (createError) throw new Error(`Erro ao criar usuário: ${createError.message}`);
      createdUserId = newUser.user.id;

      // Approve the profile automatically
      await adminClient
        .from("profiles")
        .update({ is_approved: true })
        .eq("user_id", createdUserId);
    }

    // Generate recovery link (acts as "set password" link)
    const origin = req.headers.get("origin") || "https://examcraft-studio-45.lovable.app";
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${origin}/reset-password`,
      },
    });

    if (linkError) throw new Error(`Erro ao gerar link: ${linkError.message}`);

    // Build the recovery URL
    const recoveryUrl = `${supabaseUrl}/auth/v1/verify?token=${linkData.properties.hashed_token}&type=recovery&redirect_to=${encodeURIComponent(origin + "/reset-password")}`;

    // Send email via Resend
    const resend = new Resend(resendApiKey);
    const { error: emailError } = await resend.emails.send({
      from: "ProvaFácil <noreply@tbl.posologia.app>",
      to: [email],
      subject: "Você foi convidado para o ProvaFácil!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a2e; font-size: 24px;">Bem-vindo ao ProvaFácil! 🎓</h1>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Você foi convidado para utilizar o <strong>ProvaFácil</strong> com acesso <strong>Premium vitalício</strong>.
          </p>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Para completar seu cadastro, clique no botão abaixo e defina sua senha:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${recoveryUrl}" 
               style="background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
              Definir minha senha
            </a>
          </div>
          <p style="color: #888; font-size: 14px;">
            Se você não reconhece este convite, pode ignorar este e-mail.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #aaa; font-size: 12px; text-align: center;">
            ProvaFácil — Plataforma de criação e gestão de provas
          </p>
        </div>
      `,
    });

    if (emailError) throw new Error(`Erro ao enviar e-mail: ${JSON.stringify(emailError)}`);

    // Upsert invitation record
    if (existing) {
      await adminClient
        .from("admin_invitations")
        .update({ invited_at: new Date().toISOString(), created_user_id: createdUserId })
        .eq("id", existing.id);
    } else {
      await adminClient
        .from("admin_invitations")
        .insert({
          email,
          invited_by: user.id,
          created_user_id: createdUserId,
          status: "pending",
        });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[SEND-INVITE] ERROR:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
