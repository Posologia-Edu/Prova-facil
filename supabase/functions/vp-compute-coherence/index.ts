// Compute semantic coherence for a virtual patient session.
// Extracts Q->R pairs from virtual_patient_messages, finds equivalent
// questions via TF-IDF cosine (>= 0.35) and computes average cosine
// similarity between the paired IA responses. Persists results in
// vp_research_metrics for the caller (evaluator).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// --- text utils ---
const STOP = new Set([
  "a","o","as","os","um","uma","uns","umas","de","do","da","dos","das","em","no","na","nos","nas",
  "para","por","com","sem","se","que","e","ou","mas","é","foi","ser","estar","tem","tinha","como",
  "não","sim","meu","minha","seu","sua","dele","dela","isso","este","essa","esse","esta","aqui",
  "ali","lá","muito","pouco","mais","menos","também","já","ainda","só","apenas","você","voce","o(a)",
]);
function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && w.length > 2 && !STOP.has(w));
}
function tf(tokens: string[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const t of tokens) m[t] = (m[t] || 0) + 1;
  return m;
}
function tfidfVector(tokens: string[], idf: Record<string, number>): Record<string, number> {
  const t = tf(tokens);
  const v: Record<string, number> = {};
  for (const [w, c] of Object.entries(t)) v[w] = c * (idf[w] || 0);
  return v;
}
function cosine(a: Record<string, number>, b: Record<string, number>): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, na = 0, nb = 0;
  for (const k of keys) {
    const x = a[k] || 0, y = b[k] || 0;
    dot += x * y; na += x * x; nb += y * y;
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
function std(nums: number[]): number {
  if (nums.length < 2) return 0;
  const m = nums.reduce((s, n) => s + n, 0) / nums.length;
  const v = nums.reduce((s, n) => s + (n - m) ** 2, 0) / nums.length;
  return Math.sqrt(v);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sessionIds } = await req.json();
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return new Response(JSON.stringify({ error: "sessionIds obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
    const results: Record<string, any> = {};

    for (const sid of sessionIds) {
      const { data: msgs } = await admin
        .from("virtual_patient_messages")
        .select("role, content, encounter, created_at")
        .eq("session_id", sid)
        .order("created_at", { ascending: true });

      if (!msgs || msgs.length < 2) {
        results[sid] = { qr_pairs: 0, comparable_pairs: 0, semantic_similarity_mean: 0 };
        continue;
      }

      // Extract Q->R pairs
      const pairs: { q: string; r: string; stage: number }[] = [];
      for (let i = 0; i < msgs.length - 1; i++) {
        const cur = msgs[i], nxt = msgs[i + 1];
        if (cur.role === "user" && nxt.role === "assistant") {
          pairs.push({ q: cur.content || "", r: nxt.content || "", stage: cur.encounter || 1 });
        }
      }

      // Build IDF over questions
      const docs = pairs.map((p) => tokenize(p.q));
      const df: Record<string, number> = {};
      docs.forEach((d) => new Set(d).forEach((w) => (df[w] = (df[w] || 0) + 1)));
      const N = docs.length || 1;
      const idf: Record<string, number> = {};
      for (const [w, c] of Object.entries(df)) idf[w] = Math.log((N + 1) / (c + 1)) + 1;

      const qVecs = docs.map((d) => tfidfVector(d, idf));

      // Find equivalent question pairs (>= 0.35)
      const respVecs = pairs.map((p) => tfidfVector(tokenize(p.r), idf));
      const sims: number[] = [];
      const sameStage: number[] = [];
      const betweenStages: number[] = [];
      let comparable = 0;
      for (let i = 0; i < pairs.length; i++) {
        for (let j = i + 1; j < pairs.length; j++) {
          if (cosine(qVecs[i], qVecs[j]) >= 0.35) {
            const c = cosine(respVecs[i], respVecs[j]);
            sims.push(c);
            comparable++;
            if (pairs[i].stage === pairs[j].stage) sameStage.push(c);
            else betweenStages.push(c);
          }
        }
      }

      const mean = sims.length ? sims.reduce((s, n) => s + n, 0) / sims.length : 0;
      results[sid] = {
        qr_pairs: pairs.length,
        comparable_pairs: comparable,
        semantic_similarity_mean: Number(mean.toFixed(3)),
        semantic_similarity_std: Number(std(sims).toFixed(3)),
        same_stage_similarity: sameStage.length
          ? Number((sameStage.reduce((s, n) => s + n, 0) / sameStage.length).toFixed(3))
          : null,
        between_stages_similarity: betweenStages.length
          ? Number((betweenStages.reduce((s, n) => s + n, 0) / betweenStages.length).toFixed(3))
          : null,
      };

      // Upsert metrics row (evaluator-scoped)
      await admin
        .from("vp_research_metrics")
        .upsert(
          {
            session_id: sid,
            evaluator_id: userId,
            ...results[sid],
          },
          { onConflict: "session_id,evaluator_id" },
        );
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("vp-compute-coherence error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
