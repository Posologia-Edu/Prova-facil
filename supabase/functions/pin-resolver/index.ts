// Descobre a que tipo de sala um PIN pertence (Anamnese, SOAP, Reconciliação ou Documentação) e se ela já está disponível.
// Devolve só o tipo e o status, nunca dados da sala. Usada pela tela de entrada do aluno, que não pode mais consultar as tabelas de salas.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Mesma ordem em que a tela de entrada testava antes.
const TIPOS: Array<{ tipo: string; tabela: string }> = [
  { tipo: "simulation", tabela: "simulation_rooms" },
  { tipo: "soap", tabela: "soap_rooms" },
  { tipo: "reconciliation", tabela: "reconciliation_rooms" },
  { tipo: "documentation", tabela: "documentation_rooms" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { access_code } = await req.json();
    if (typeof access_code !== "string" || access_code.trim().length < 4) return json({ error: "PIN inválido" }, 400);
    const codigo = access_code.trim().toLowerCase();
    const db = adminClient();
    for (const { tipo, tabela } of TIPOS) {
      const { data } = await db.from(tabela).select("status").eq("access_code", codigo).limit(1).maybeSingle();
      if (data) return json({ tipo, status: data.status });
    }
    return json({ tipo: null });
  } catch (e) {
    console.error("pin-resolver error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
