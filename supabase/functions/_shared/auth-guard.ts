// Shared authentication / authorization helpers for edge functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY);
}

/** Returns the authenticated user id, or null when the caller is anonymous. */
export async function getUserId(req: Request): Promise<string | null> {
  const header = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  // The publishable/anon key is not a user token.
  if (token === ANON_KEY || token === Deno.env.get("SUPABASE_PUBLISHABLE_KEY")) return null;
  try {
    const client = createClient(SUPABASE_URL, ANON_KEY);
    const { data, error } = await client.auth.getClaims(token);
    const sub = (data as any)?.claims?.sub as string | undefined;
    if (error || !sub) return null;
    return sub;
  } catch {
    return null;
  }
}

export function unauthorized(corsHeaders: Record<string, string>, message = "Unauthorized") {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function forbidden(corsHeaders: Record<string, string>, message = "Forbidden") {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** True when the given user owns the room row of `table`. */
export async function ownsRoom(table: string, roomId: string, userId: string): Promise<boolean> {
  if (!roomId || !userId) return false;
  const { data } = await adminClient().from(table).select("user_id").eq("id", roomId).maybeSingle();
  return !!data && (data as any).user_id === userId;
}

/** True when the supplied access code matches the room's access code. */
export async function roomCodeMatches(table: string, roomId: string, code: unknown): Promise<boolean> {
  if (!roomId || typeof code !== "string" || code.trim().length < 4) return false;
  const { data } = await adminClient().from(table).select("access_code").eq("id", roomId).maybeSingle();
  return !!data && String((data as any).access_code || "").trim() === code.trim();
}

/** True when a row with the given id exists in `table` (used to bind anonymous callers to a real session). */
export async function rowExists(table: string, id: unknown): Promise<boolean> {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return false;
  const { data } = await adminClient().from(table).select("id").eq("id", id).maybeSingle();
  return !!data;
}
