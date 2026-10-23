import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GEMINI_MODELS, callAiWithFallback } from "../_shared/ai-caller.ts";
import { getUserId, unauthorized } from "../_shared/auth-guard.ts";

// Autoteste do provedor de IA: confirma que a chave do Google em uso aceita cada modelo configurado em GEMINI_MODELS,
// inclusive com chamada de ferramenta forçada e temperatura baixa (o que a correção usa). Não grava nada.
// Responde, para cada modelo: ok, status HTTP, tempo e a mensagem de erro do Google quando falha. Nunca devolve a chave.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOOL = {
  type: "function",
  function: {
    name: "ping",
    description: "Responde que está funcionando.",
    parameters: { type: "object", properties: { resposta: { type: "string" } }, required: ["resposta"] },
  },
};

async function testar(papel: "pro" | "flash") {
  const modelo = GEMINI_MODELS[papel];
  const t0 = Date.now();
  try {
    const { response } = await callAiWithFallback({
      model: modelo,
      temperature: 0.2,
      messages: [{ role: "user", content: "Chame a função ping com resposta 'ok'." }],
      tools: [TOOL],
      tool_choice: { type: "function", function: { name: "ping" } },
    });
    const ms = Date.now() - t0;
    if (!response.ok) {
      const txt = await response.text().catch(() => "");
      let msg = txt.slice(0, 300);
      try { const p = JSON.parse(txt); msg = p?.error?.message || p?.error || p?.[0]?.error?.message || msg; } catch { /* texto cru */ }
      return { papel, modelo, ok: false, status: response.status, ms, erro: String(msg) };
    }
    const data = await response.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    return { papel, modelo, ok: true, status: 200, ms, chamou_ferramenta: !!args };
  } catch (e) {
    return { papel, modelo, ok: false, status: 0, ms: Date.now() - t0, erro: (e as Error).message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const userId = await getUserId(req);
  if (!userId) return unauthorized(corsHeaders);

  const resultados = await Promise.all([testar("pro"), testar("flash")]);
  return new Response(JSON.stringify({ provedor: "google", resultados, imagem: GEMINI_MODELS.image }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
