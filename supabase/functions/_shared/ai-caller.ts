import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AiCallOptions {
  messages: Array<{ role: string; content: string | any[] }>;
  model?: string;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
  modalities?: string[];
}

interface AiUsageContext {
  userId: string;
  promptType: string;
}

interface ProviderConfig {
  provider: string;
  api_key: string;
  baseUrl: string;
  defaultModel: string;
}

function resolveModelForProvider(provider: ProviderConfig, requestedModel?: string): string {
  if (!requestedModel) return provider.defaultModel;

  const normalizedModel = requestedModel.replace(/^(google|openai)\//, "");

  if (provider.provider === "groq") {
    return normalizedModel.includes("llama") || normalizedModel.includes("mixtral")
      ? normalizedModel
      : provider.defaultModel;
  }

  if (provider.provider === "openai") {
    return normalizedModel.startsWith("gpt-") || normalizedModel.startsWith("o")
      ? normalizedModel
      : provider.defaultModel;
  }

  if (provider.provider === "anthropic") {
    return normalizedModel.startsWith("claude") ? normalizedModel : provider.defaultModel;
  }

  if (provider.provider === "openrouter") {
    return requestedModel;
  }

  if (provider.provider !== "google") {
    return provider.defaultModel;
  }

  if (normalizedModel.includes("flash-image")) {
    return "gemini-2.5-flash-image";
  }

  if (
    normalizedModel.includes("3.1-pro-preview") ||
    normalizedModel.includes("2.5-pro")
  ) {
    return "gemini-2.5-pro";
  }

  if (
    normalizedModel.includes("3-flash-preview") ||
    normalizedModel.includes("3.1-flash") ||
    normalizedModel.includes("2.5-flash-lite") ||
    normalizedModel.includes("2.5-flash")
  ) {
    return "gemini-2.5-flash";
  }

  return normalizedModel.startsWith("gemini-")
    ? normalizedModel
    : provider.defaultModel;
}

const PROVIDER_CONFIGS: Record<string, { baseUrl: string; defaultModel: string }> = {
  groq: {
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "llama-3.3-70b-versatile",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o-mini",
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1/messages",
    defaultModel: "claude-sonnet-4-20250514",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    defaultModel: "google/gemini-2.5-flash",
  },
  google: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    defaultModel: "gemini-2.5-flash",
  },
};

// Cost per 1M tokens (input/output) in USD - approximate
const COST_PER_1M_TOKENS: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4o": { input: 2.50, output: 10.00 },
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "claude-sonnet-4-20250514": { input: 3.00, output: 15.00 },
  "gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "google/gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "google/gemini-3-flash-preview": { input: 0.15, output: 0.60 },
  "google/gemini-2.5-pro": { input: 1.25, output: 5.00 },
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
  } catch {
    // Ignore JSON parse failures and fall back to raw text.
  }

  const trimmed = raw.trim();
  return trimmed ? trimmed.slice(0, 400) : null;
}

async function logAiUsage(
  provider: string,
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

    const cost = estimateCost(model, tokensInput, tokensOutput);

    await supabase.from("ai_usage_log").insert({
      user_id: userId,
      provider,
      model,
      prompt_type: promptType,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      estimated_cost_usd: cost,
    });
  } catch (err) {
    console.warn("Failed to log AI usage:", (err as Error).message);
  }
}

// Priority order: Google first, then remaining providers alphabetically
const PROVIDER_PRIORITY = ["google", "openai", "openrouter", "groq", "anthropic"];

async function getActiveProviders(): Promise<ProviderConfig[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data } = await supabase
    .from("ai_api_keys")
    .select("provider, api_key")
    .eq("is_active", true)
    .neq("api_key", "");

  if (!data || data.length === 0) return [];

  const providers = data.map((row: any) => {
    const config = PROVIDER_CONFIGS[row.provider];
    if (!config) return null;
    return {
      provider: row.provider,
      api_key: row.api_key,
      baseUrl: config.baseUrl,
      defaultModel: config.defaultModel,
    };
  }).filter(Boolean) as ProviderConfig[];

  // Sort by priority: Google first, then by PROVIDER_PRIORITY order
  providers.sort((a, b) => {
    const aIdx = PROVIDER_PRIORITY.indexOf(a.provider);
    const bIdx = PROVIDER_PRIORITY.indexOf(b.provider);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  return providers;
}

async function callAnthropicApi(provider: ProviderConfig, options: AiCallOptions): Promise<Response> {
  const systemMsg = options.messages.find((m) => m.role === "system");
  const userMessages = options.messages.filter((m) => m.role !== "system");

  const body: any = {
    model: provider.defaultModel,
    max_tokens: 4096,
    messages: userMessages,
  };
  if (systemMsg) body.system = systemMsg.content;
  if (options.stream) body.stream = true;

  return await fetch(provider.baseUrl, {
    method: "POST",
    headers: {
      "x-api-key": provider.api_key,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
}

async function callOpenAiCompatibleApi(provider: ProviderConfig, options: AiCallOptions): Promise<Response> {
  const model = resolveModelForProvider(provider, options.model);

  const body: any = {
    model,
    messages: options.messages,
  };
  if (options.stream) body.stream = true;
  if (options.tools) body.tools = options.tools;
  if (options.tool_choice) body.tool_choice = options.tool_choice;
  if (options.modalities) body.modalities = options.modalities;

  return await fetch(provider.baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function callLovableAi(options: AiCallOptions): Promise<Response> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const body: any = {
    model: options.model || "google/gemini-3-flash-preview",
    messages: options.messages,
  };
  if (options.stream) body.stream = true;
  if (options.tools) body.tools = options.tools;
  if (options.tool_choice) body.tool_choice = options.tool_choice;
  if (options.modalities) body.modalities = options.modalities;

  return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/**
 * Calls AI with fallback: tries external provider keys first, falls back to Lovable AI.
 * Returns the raw Response object.
 * 
 * If `usageContext` is provided, logs usage to ai_usage_log table.
 * For non-streaming responses, token counts are extracted from the response.
 * For streaming responses, logs with estimated tokens based on message length.
 */
export async function callAiWithFallback(
  options: AiCallOptions,
  usageContext?: AiUsageContext,
): Promise<{ response: Response; provider: string }> {
  const providers = await getActiveProviders();

  let usedProvider = "lovable";
  let usedModel = options.model || "google/gemini-3-flash-preview";
  let response: Response | null = null;

  // Try each external provider
  for (const provider of providers) {
    try {
      console.log(`Trying external AI provider: ${provider.provider}`);

      if (provider.provider === "anthropic") {
        response = await callAnthropicApi(provider, options);
      } else {
        response = await callOpenAiCompatibleApi(provider, options);
      }

      if (response.ok) {
        console.log(`Successfully used provider: ${provider.provider}`);
        usedProvider = provider.provider;
        usedModel = resolveModelForProvider(provider, options.model);
        break;
      }

      const errBody = await response.text().catch(() => "");
      console.warn(`Provider ${provider.provider} returned ${response.status}: ${errBody.slice(0, 500)}`);
      response = null;
    } catch (err) {
      console.warn(`Provider ${provider.provider} failed:`, (err as Error).message);
    }
  }

  // Fallback to Lovable AI
  if (!response) {
    console.log("Falling back to Lovable AI");
    response = await callLovableAi(options);
    usedProvider = "lovable";
    usedModel = options.model || "google/gemini-3-flash-preview";
  }

  // Log usage if context provided and response is OK
  if (usageContext && response.ok) {
    if (!options.stream) {
      // For non-streaming: clone response, extract usage, then log
      const cloned = response.clone();
      try {
        const data = await cloned.json();
        const usage = data.usage;
        const tokensIn = usage?.prompt_tokens ?? 0;
        const tokensOut = usage?.completion_tokens ?? 0;
        // Fire and forget
        logAiUsage(usedProvider, usedModel, usageContext.promptType, usageContext.userId, tokensIn, tokensOut);
      } catch {
        // Estimate from message length if parsing fails
        const totalChars = options.messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0);
        const estimatedTokens = Math.ceil(totalChars / 4);
        logAiUsage(usedProvider, usedModel, usageContext.promptType, usageContext.userId, estimatedTokens, 0);
      }
    } else {
      // For streaming: estimate input tokens from prompt, output unknown
      const totalChars = options.messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0);
      const estimatedInputTokens = Math.ceil(totalChars / 4);
      logAiUsage(usedProvider, usedModel, usageContext.promptType, usageContext.userId, estimatedInputTokens, 0);
    }
  }

  return { response, provider: usedProvider };
}

/**
 * Calls AI for image generation with fallback.
 * Tries Google provider first (supports native image generation), then Lovable AI Gateway.
 */
export async function callAiImageWithFallback(
  options: AiCallOptions,
  usageContext?: AiUsageContext,
): Promise<{ response: Response; provider: string }> {
  const imageOptions: AiCallOptions = {
    ...options,
    model: options.model || "google/gemini-2.5-flash-image",
    modalities: ["image", "text"],
  };

  // Try Google provider first (native image support)
  const providers = await getActiveProviders();
  const googleProvider = providers.find(p => p.provider === "google");
  let googleFailure: { status: number; message: string | null } | null = null;

  if (googleProvider) {
    try {
      console.log("Trying Google provider for image generation");
      const response = await callOpenAiCompatibleApi(
        { ...googleProvider, defaultModel: "gemini-2.5-flash-image" },
        { ...imageOptions, model: "gemini-2.5-flash-image" },
      );
      if (response.ok) {
        console.log("Successfully used Google for image generation");
        if (usageContext) {
          const totalChars = options.messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0);
          logAiUsage("google", "gemini-2.5-flash-image", usageContext.promptType, usageContext.userId, Math.ceil(totalChars / 4), 0);
        }
        return { response, provider: "google" };
      }
      const errorText = await response.text();
      googleFailure = {
        status: response.status,
        message: extractProviderErrorMessage(errorText),
      };
      console.warn(`Google image generation returned ${response.status}, falling back`, googleFailure.message ?? "");
    } catch (err) {
      googleFailure = {
        status: 500,
        message: (err as Error).message,
      };
      console.warn("Google image generation failed:", (err as Error).message);
    }
  }

  // Fallback to Lovable AI Gateway
  console.log("Using Lovable AI Gateway for image generation");
  const response = await callLovableAi(imageOptions);

  if (!response.ok && googleFailure) {
    const fallbackText = await response.text();
    const fallbackMessage = extractProviderErrorMessage(fallbackText);
    const googleRateLimited = googleFailure.status === 429;
    const fallbackCreditsExhausted = response.status === 402;

    const error = googleRateLimited && fallbackCreditsExhausted
      ? "O provedor Google retornou limite/cota excedida (429) e o fallback do workspace também ficou indisponível por créditos insuficientes. Verifique a cota ou o faturamento da chave Google e tente novamente em alguns minutos."
      : `Falha ao gerar imagem com o provedor Google (${googleFailure.status}${googleFailure.message ? `: ${googleFailure.message}` : ""}) e também no fallback (${response.status}${fallbackMessage ? `: ${fallbackMessage}` : ""}).`;

    return {
      response: new Response(JSON.stringify({ error }), {
        status: googleRateLimited ? 429 : response.status,
        headers: { "Content-Type": "application/json" },
      }),
      provider: "lovable",
    };
  }

  if (usageContext) {
    const totalChars = options.messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0);
    logAiUsage("lovable", imageOptions.model || "google/gemini-2.5-flash-image", usageContext.promptType, usageContext.userId, Math.ceil(totalChars / 4), 0);
  }
  return { response, provider: "lovable" };
}
