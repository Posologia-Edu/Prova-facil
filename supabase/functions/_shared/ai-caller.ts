import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AiCallOptions {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
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
  // Anthropic has a different API format
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
 */
export async function callAiWithFallback(options: AiCallOptions): Promise<{ response: Response; provider: string }> {
  const providers = await getActiveProviders();

  // Try each external provider
  for (const provider of providers) {
    try {
      console.log(`Trying external AI provider: ${provider.provider}`);
      let response: Response;

      if (provider.provider === "anthropic") {
        response = await callAnthropicApi(provider, options);
      } else {
        response = await callOpenAiCompatibleApi(provider, options);
      }

      if (response.ok) {
        console.log(`Successfully used provider: ${provider.provider}`);
        return { response, provider: provider.provider };
      }

      console.warn(`Provider ${provider.provider} returned ${response.status}, trying next...`);
    } catch (err) {
      console.warn(`Provider ${provider.provider} failed:`, (err as Error).message);
    }
  }

  // Fallback to Lovable AI
  console.log("Falling back to Lovable AI");
  const response = await callLovableAi(options);
  return { response, provider: "lovable" };
}
