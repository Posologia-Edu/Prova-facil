import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AiCallOptions {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
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

  return data.map((row: any) => {
    const config = PROVIDER_CONFIGS[row.provider];
    if (!config) return null;
    return {
      provider: row.provider,
      api_key: row.api_key,
      baseUrl: config.baseUrl,
      defaultModel: config.defaultModel,
    };
  }).filter(Boolean) as ProviderConfig[];
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
  const body: any = {
    model: options.model || provider.defaultModel,
    messages: options.messages,
  };
  if (options.stream) body.stream = true;
  if (options.tools) body.tools = options.tools;
  if (options.tool_choice) body.tool_choice = options.tool_choice;

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
        usedModel = options.model || provider.defaultModel;
        break;
      }

      console.warn(`Provider ${provider.provider} returned ${response.status}, trying next...`);
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
        const totalChars = options.messages.reduce((sum, m) => sum + m.content.length, 0);
        const estimatedTokens = Math.ceil(totalChars / 4);
        logAiUsage(usedProvider, usedModel, usageContext.promptType, usageContext.userId, estimatedTokens, 0);
      }
    } else {
      // For streaming: estimate input tokens from prompt, output unknown
      const totalChars = options.messages.reduce((sum, m) => sum + m.content.length, 0);
      const estimatedInputTokens = Math.ceil(totalChars / 4);
      logAiUsage(usedProvider, usedModel, usageContext.promptType, usageContext.userId, estimatedInputTokens, 0);
    }
  }

  return { response, provider: usedProvider };
}
