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
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      console.error("[SHARE-TEMPLATE] auth error:", claimsError);
      return new Response(JSON.stringify({ error: "Sessão inválida. Faça login novamente." }), {
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

    if (template.owner_id !== userId) {
      return new Response(JSON.stringify({ error: "Você não é dono deste template" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find target user by email
    let targetUser: any = null;
    let page = 1;
    while (!targetUser) {
      const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers({ page, perPage: 500 });
      if (listErr) {
        console.error("[SHARE-TEMPLATE] listUsers error:", listErr);
        throw new Error("Erro ao buscar usuários");
      }
      const users = listData?.users || [];
      if (users.length === 0) break;
      targetUser = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      page++;
      if (page > 20) break; // safety limit
    }

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
        shared_by: userId,
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
