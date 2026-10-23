import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ÚNICO provedor de IA do sistema: Gemini (Google), com a chave paga cadastrada em ai_api_keys (provider = 'google').
// Não há fallback para outro provedor nem para o Lovable AI gateway: se o Google falhar, o erro dele volta ao chamador.
// (Decisão do usuário: ver memória "gemini-only-no-lovable-gateway".)

interface AiCallOptions {
  messages: Array<{ role: string; content: string | any[] }>;
  model?: string;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
  modalities?: string[];
  temperature?: number;
}

interface AiUsageContext {
  userId: string;
  promptType: string;
}

const GOOGLE_OPENAI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GOOGLE_NATIVE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Modelos Gemini em uso, num só lugar. Para trocar o modelo de todo o sistema, altere aqui.
 *  - pro: raciocínio e julgamento (correção, geração de casos, revisões)
 *  - flash: conversa e tarefas leves
 *  - image: geração de imagem (API nativa do Gemini)
 * Os nomes precisam existir para a chave do Google em uso (lista: GET /v1beta/models).
 */
export const GEMINI_MODELS = {
  pro: "gemini-3.1-pro-preview",
  flash: "gemini-3.8-flash",
  image: "gemini-2.5-flash-image",
} as const;

/**
 * Converte o nome pedido pelo código (ex.: "google/gemini-2.5-pro", "google/gemini-3-flash-preview") no modelo
 * Gemini configurado acima. Quem pede "pro" recebe o modelo pro; "image", o de imagem; o resto, o flash.
 */
export function resolveGeminiModel(requested?: string): string {
  const m = (requested || "").replace(/^(google\/|models\/)/, "").toLowerCase();
  if (!m) return GEMINI_MODELS.flash;
  if (m.includes("image")) return GEMINI_MODELS.image;
  if (m.includes("pro")) return GEMINI_MODELS.pro;
  return GEMINI_MODELS.flash;
}

// Custo aproximado por 1M de tokens (USD). Modelo fora da tabela = custo não estimado (0).
const COST_PER_1M_TOKENS: Record<string, { input: number; output: number }> = {
  "gemini-2.5-flash": { input: 0.15, output: 0.60 },
};

function estimateCost(model: string, tokensInput: number, tokensOutput: number): number {
  const costs = COST_PER_1M_TOKENS[model];
  if (!costs) return 0;
  return (tokensInput * costs.input + tokensOutput * costs.output) / 1_000_000;
}

function extractProviderErrorMessage(raw: string | null | undefined): string | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    if (typeof parsed === "string") return parsed;
    if (typeof parsed?.error === "string") return parsed.error;
    if (typeof parsed?.message === "string") return parsed.message;
    if (typeof parsed?.details === "string") return parsed.details;
    if (typeof parsed?.error?.message === "string") return parsed.error.message;
    if (Array.isArray(parsed) && typeof parsed[0]?.error?.message === "string") return parsed[0].error.message;
  } catch {
    // Ignore JSON parse failures and fall back to raw text.
  }

  const trimmed = raw.trim();
  return trimmed ? trimmed.slice(0, 400) : null;
}

async function logAiUsage(
  model: string,
  promptType: string,
  userId: string,
  tokensInput: number,
  tokensOutput: number,
) {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await supabase.from("ai_usage_log").insert({
      user_id: userId,
      provider: "google",
      model,
      prompt_type: promptType,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      estimated_cost_usd: estimateCost(model, tokensInput, tokensOutput),
    });
  } catch (err) {
    console.warn("Failed to log AI usage:", (err as Error).message);
  }
}

/** Chave do Google (Gemini) ativa em ai_api_keys. Só o provedor 'google' é considerado. */
async function getGoogleKey(): Promise<string | null> {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await supabase
    .from("ai_api_keys")
    .select("api_key")
    .eq("provider", "google")
    .eq("is_active", true)
    .neq("api_key", "")
    .limit(1)
    .maybeSingle();
  return (data as any)?.api_key || null;
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), { status, headers: { "Content-Type": "application/json" } });
}

const NO_KEY_MESSAGE =
  "Chave do Google (Gemini) não configurada ou inativa. Cadastre uma chave ativa do provedor Google em Configurações de IA.";

const approxTokens = (messages: AiCallOptions["messages"]) =>
  Math.ceil(messages.reduce((sum, m) => sum + (typeof m.content === "string" ? m.content.length : JSON.stringify(m.content).length), 0) / 4);

/**
 * Chamada de IA (Gemini). Mantém o nome histórico `callAiWithFallback`, mas NÃO há fallback: uma única tentativa
 * no Google. Se falhar, devolve a resposta de erro do próprio Google (status e mensagem) para o chamador tratar.
 *
 * Com `usageContext`, registra o uso em ai_usage_log (não-streaming: tokens reais; streaming: estimativa de entrada).
 */
export async function callAiWithFallback(
  options: AiCallOptions,
  usageContext?: AiUsageContext,
): Promise<{ response: Response; provider: string }> {
  const apiKey = await getGoogleKey();
  if (!apiKey) return { response: jsonError(503, NO_KEY_MESSAGE), provider: "google" };

  const model = resolveGeminiModel(options.model);
  const body: any = { model, messages: options.messages };
  if (options.stream) body.stream = true;
  if (options.tools) body.tools = options.tools;
  if (options.tool_choice) body.tool_choice = options.tool_choice;
  if (options.modalities) body.modalities = options.modalities;
  if (options.temperature !== undefined) body.temperature = options.temperature;

  let response: Response;
  try {
    response = await fetch(GOOGLE_OPENAI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error(`Gemini (${model}) request failed:`, (err as Error).message);
    return { response: jsonError(502, `Falha de rede ao chamar o Gemini: ${(err as Error).message}`), provider: "google" };
  }

  if (!response.ok) {
    const errBody = await response.clone().text().catch(() => "");
    console.error(`Gemini (${model}) returned ${response.status}: ${errBody.slice(0, 500)}`);
    return { response, provider: "google" };
  }

  if (usageContext) {
    if (!options.stream) {
      try {
        const data = await response.clone().json();
        logAiUsage(model, usageContext.promptType, usageContext.userId, data?.usage?.prompt_tokens ?? 0, data?.usage?.completion_tokens ?? 0);
      } catch {
        logAiUsage(model, usageContext.promptType, usageContext.userId, approxTokens(options.messages), 0);
      }
    } else {
      logAiUsage(model, usageContext.promptType, usageContext.userId, approxTokens(options.messages), 0);
    }
  }

  return { response, provider: "google" };
}

/**
 * Geração de imagem pela API NATIVA do Gemini (o endpoint compatível com OpenAI não gera imagem).
 * A resposta é adaptada ao formato que os chamadores já leem: choices[0].message.images[0].image_url.url (data URL).
 * Sem fallback: erro do Google volta como veio.
 */
export async function callAiImageWithFallback(
  options: AiCallOptions,
  usageContext?: AiUsageContext,
): Promise<{ response: Response; provider: string }> {
  const apiKey = await getGoogleKey();
  if (!apiKey) return { response: jsonError(503, NO_KEY_MESSAGE), provider: "google" };

  const model = GEMINI_MODELS.image;
  const prompt = options.messages
    .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
    .join("\n\n");

  let res: Response;
  try {
    res = await fetch(`${GOOGLE_NATIVE_URL}/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      }),
    });
  } catch (err) {
    console.error("Gemini image request failed:", (err as Error).message);
    return { response: jsonError(502, `Falha de rede ao gerar imagem: ${(err as Error).message}`), provider: "google" };
  }

  if (!res.ok) {
    const errText = await res.clone().text().catch(() => "");
    console.error(`Gemini image (${model}) returned ${res.status}: ${errText.slice(0, 500)}`);
    // Normaliza a mensagem para os chamadores que leem { error }
    return { response: jsonError(res.status, extractProviderErrorMessage(errText) || `Erro ${res.status} ao gerar imagem`), provider: "google" };
  }

  const data = await res.json();
  const parts: any[] = data?.candidates?.[0]?.content?.parts || [];
  const images = parts
    .map((p) => p?.inlineData || p?.inline_data)
    .filter((d) => d?.data)
    .map((d) => ({ type: "image_url", image_url: { url: `data:${d.mimeType || d.mime_type || "image/png"};base64,${d.data}` } }));
  const text = parts.filter((p) => typeof p?.text === "string").map((p) => p.text).join("\n");

  if (usageContext) {
    logAiUsage(model, usageContext.promptType, usageContext.userId, approxTokens(options.messages), 0);
  }

  const adapted = {
    choices: [{ message: { role: "assistant", content: text, images } }],
    usage: data?.usageMetadata
      ? { prompt_tokens: data.usageMetadata.promptTokenCount ?? 0, completion_tokens: data.usageMetadata.candidatesTokenCount ?? 0 }
      : undefined,
  };
  return {
    response: new Response(JSON.stringify(adapted), { status: 200, headers: { "Content-Type": "application/json" } }),
    provider: "google",
  };
}
