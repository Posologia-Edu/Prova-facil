import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Verify caller
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

    const { templateId, email } = await req.json();
    if (!templateId || !email) {
      return new Response(JSON.stringify({ error: "templateId e email são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify template ownership
    const { data: template, error: tplErr } = await adminClient
      .from("form_templates")
      .select("id, owner_id")
      .eq("id", templateId)
      .single();

    if (tplErr || !template) {
      return new Response(JSON.stringify({ error: "Template não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (template.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "Você não é dono deste template" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find target user by email
    const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const targetUser = allUsers?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

    if (!targetUser) {
      return new Response(JSON.stringify({ error: "Nenhum professor encontrado com este e-mail" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetUser.id === user.id) {
      return new Response(JSON.stringify({ error: "Você não pode compartilhar consigo mesmo" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check target has teacher or admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUser.id)
      .in("role", ["teacher", "admin"])
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Este e-mail não pertence a um professor cadastrado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create share
    const { error: shareErr } = await adminClient
      .from("form_template_shares")
      .upsert({
        template_id: templateId,
        shared_by: user.id,
        shared_with: targetUser.id,
      }, { onConflict: "template_id,shared_with" });

    if (shareErr) {
      return new Response(JSON.stringify({ error: shareErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[SHARE-TEMPLATE] ERROR:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
