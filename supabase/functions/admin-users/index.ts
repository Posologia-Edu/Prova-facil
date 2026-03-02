import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

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

    // Check if user is admin
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    // mark_invite_completed doesn't require admin
    const body = await req.json();
    const { action, userId } = body;

    if (action === "mark_invite_completed") {
      if (!user.email) {
        return new Response(JSON.stringify({ error: "Email não encontrado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await adminClient
        .from("admin_invitations")
        .update({ status: "completed", completed_at: new Date().toISOString(), created_user_id: user.id })
        .eq("email", user.email);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other actions require admin
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (action) {
      case "list_users": {
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        
        const enriched = (profiles || []).map((p: any) => {
          const authUser = authUsers?.find((u: any) => u.id === p.user_id);
          return { ...p, email: authUser?.email || "N/A" };
        });

        const { data: roles } = await adminClient.from("user_roles").select("*");
        const rolesMap: Record<string, string[]> = {};
        (roles || []).forEach((r: any) => {
          if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
          rolesMap[r.user_id].push(r.role);
        });

        const result = enriched.map((u: any) => ({
          ...u,
          roles: rolesMap[u.user_id] || [],
        }));

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list_subscribers": {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

        // Fetch all active subscriptions from Stripe
        const allSubscriptions: any[] = [];
        let hasMore = true;
        let startingAfter: string | undefined;

        while (hasMore) {
          const params: any = { status: "active", limit: 100, expand: ["data.customer"] };
          if (startingAfter) params.starting_after = startingAfter;
          const batch = await stripe.subscriptions.list(params);
          allSubscriptions.push(...batch.data);
          hasMore = batch.has_more;
          if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id;
        }

        const subscribers = allSubscriptions.map((sub: any) => {
          const customer = sub.customer as any;
          return {
            subscription_id: sub.id,
            customer_email: customer?.email || "N/A",
            customer_name: customer?.name || "",
            status: sub.status,
            product_id: sub.items.data[0]?.price?.product || null,
            price_id: sub.items.data[0]?.price?.id || null,
            amount: sub.items.data[0]?.price?.unit_amount || 0,
            currency: sub.items.data[0]?.price?.currency || "brl",
            interval: sub.items.data[0]?.price?.recurring?.interval || "month",
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            created: new Date(sub.created * 1000).toISOString(),
          };
        });

        // Also fetch invited users with their plan info
        const { data: invitations } = await adminClient
          .from("admin_invitations")
          .select("*")
          .order("invited_at", { ascending: false });

        return new Response(JSON.stringify({ subscribers, invitations: invitations || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "approve_user": {
        await adminClient.from("profiles").update({ is_approved: true }).eq("user_id", userId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reject_user": {
        await adminClient.from("profiles").update({ is_approved: false }).eq("user_id", userId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_user": {
        await adminClient.auth.admin.deleteUser(userId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_stats": {
        const { count: totalUsers } = await adminClient.from("profiles").select("*", { count: "exact", head: true });
        const { count: pendingUsers } = await adminClient.from("profiles").select("*", { count: "exact", head: true }).eq("is_approved", false);
        const { count: totalQuestions } = await adminClient.from("question_bank").select("*", { count: "exact", head: true });
        const { count: totalExams } = await adminClient.from("exams").select("*", { count: "exact", head: true });

        return new Response(
          JSON.stringify({
            totalUsers: totalUsers || 0,
            pendingUsers: pendingUsers || 0,
            totalQuestions: totalQuestions || 0,
            totalExams: totalExams || 0,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list_invitations": {
        const { data: invitations } = await adminClient
          .from("admin_invitations")
          .select("*")
          .order("invited_at", { ascending: false });

        return new Response(JSON.stringify(invitations || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Ação inválida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
