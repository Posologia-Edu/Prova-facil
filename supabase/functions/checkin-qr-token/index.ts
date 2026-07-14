import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function b64url(bytes: Uint8Array | string) {
  const s = typeof bytes === "string" ? bytes : String.fromCharCode(...bytes);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: object, secret: string, ttlSec: number) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec, nonce: crypto.randomUUID() };
  const p = b64url(JSON.stringify(body));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(p)));
  return `${p}.${b64url(sig)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await authClient.auth.getUser();
    if (!userData.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { lessonId } = await req.json();
    if (!lessonId) return new Response(JSON.stringify({ error: "Missing lessonId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: lesson } = await admin
      .from("class_schedule_items")
      .select("id, semester_id, checkin_open, class_semesters!inner(class_id, classes!inner(user_id))")
      .eq("id", lessonId)
      .maybeSingle();

    // deno-lint-ignore no-explicit-any
    const ownerId = (lesson as any)?.class_semesters?.classes?.user_id;
    if (!lesson || ownerId !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!lesson.checkin_open) {
      return new Response(JSON.stringify({ error: "Check-in not open" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const secret = Deno.env.get("CHECKIN_JWT_SECRET")!;
    const token = await sign({ lid: lessonId }, secret, 30);
    return new Response(JSON.stringify({ token, ttl: 30 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
