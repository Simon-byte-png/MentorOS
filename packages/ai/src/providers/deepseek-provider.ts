import type {
  LLMCallOptions,
  LLMJsonResult,
  LLMMessage,
  LLMProvider,
  LLMUsage,
  LLMTextResult
} from "./llm-provider";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_FLASH_MODEL = "deepseek-v4-flash";
const DEFAULT_PRO_MODEL = "deepseek-v4-pro";
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.3;

export interface DeepSeekProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel: string;
  highQualityModel: string;
  enableRealLLM: boolean;
}

export interface DeepSeekEnvironmentStatus {
  baseUrl: string;
  defaultModel: string;
  highQualityModel: string;
  enableRealLLM: boolean;
  hasApiKey: boolean;
}

export class RealLLMNotEnabledError extends Error {
  constructor() {
    super("Real LLM calls are disabled. Set ENABLE_REAL_LLM=true to enable DeepSeek.");
    this.name = "RealLLMNotEnabledError";
  }
}

export class MissingDeepSeekApiKeyError extends Error {
  constructor() {
    super("DeepSeek API key is missing. Set DEEPSEEK_API_KEY before using the real DeepSeek provider.");
    this.name = "MissingDeepSeekApiKeyError";
  }
}

export class DeepSeekAPIError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, details: { status?: number; code?: string } = {}) {
    super(message);
    this.name = "DeepSeekAPIError";
    this.status = details.status;
    this.code = details.code;
  }
}

export class DeepSeekJSONParseError extends Error {
  constructor() {
    super("DeepSeek returned text that could not be parsed as a JSON object.");
    this.name = "DeepSeekJSONParseError";
  }
}

export class DeepSeekProvider implements LLMProvider {
  readonly name = "deepseek" as const;
  readonly config: DeepSeekProviderConfig;

  constructor(config: Partial<DeepSeekProviderConfig> = {}) {
    this.config = {
      apiKey: config.apiKey ?? readEnv("DEEPSEEK_API_KEY"),
      baseUrl: config.baseUrl ?? readEnv("DEEPSEEK_BASE_URL") ?? DEFAULT_BASE_URL,
      defaultModel:
        config.defaultModel ??
        readEnv("DEEPSEEK_DEFAULT_MODEL") ??
        DEFAULT_FLASH_MODEL,
      highQualityModel:
        config.highQualityModel ??
        readEnv("DEEPSEEK_HIGH_QUALITY_MODEL") ??
        DEFAULT_PRO_MODEL,
      enableRealLLM:
        config.enableRealLLM ?? readEnv("ENABLE_REAL_LLM") === "true"
    };
  }

  async callText(
    messages: LLMMessage[],
    options: LLMCallOptions = {}
  ): Promise<LLMTextResult> {
    const response = await this.callChatCompletions(
      options.jsonMode ? withJsonInstruction(messages) : messages,
      options
    );
    const choice = response.choices?.[0];
    const text = choice?.message?.content;

    if (typeof text !== "string" || !text.trim()) {
      throw new DeepSeekAPIError("DeepSeek response did not include a text completion.");
    }

    return {
      text,
      usage: this.mapUsage(response, options),
      raw: buildSafeRawSummary(response)
    };
  }

  async callJson<T = unknown>(
    messages: LLMMessage[],
    options: LLMCallOptions = {}
  ): Promise<LLMJsonResult<T>> {
    const textResult = await this.callText(withJsonInstruction(messages), {
      ...options,
      jsonMode: true
    });

    try {
      return {
        data: JSON.parse(textResult.text) as T,
        usage: textResult.usage,
        raw: textResult.raw
      };
    } catch {
      throw new DeepSeekJSONParseError();
    }
  }

  getEnvironmentStatus(): DeepSeekEnvironmentStatus {
    return {
      baseUrl: this.config.baseUrl ?? DEFAULT_BASE_URL,
      defaultModel: this.config.defaultModel,
      highQualityModel: this.config.highQualityModel,
      enableRealLLM: this.config.enableRealLLM,
      hasApiKey: Boolean(this.config.apiKey)
    };
  }

  private async callChatCompletions(
    messages: LLMMessage[],
    options: LLMCallOptions
  ): Promise<DeepSeekChatCompletionResponse> {
    this.assertCanCallRealProvider();

    const apiKey = this.config.apiKey;

    if (!apiKey) {
      throw new MissingDeepSeekApiKeyError();
    }

    const response = await safeFetch(this.buildChatCompletionsUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: options.model ?? this.config.defaultModel,
        messages,
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        stream: false,
        ...(options.jsonMode ? { response_format: { type: "json_object" } } : {})
      })
    });
    const responseText = await response.text();

    if (!response.ok) {
      const apiError = parseDeepSeekError(responseText);

      throw new DeepSeekAPIError(
        apiError.message ?? `DeepSeek API request failed with status ${response.status}.`,
        { status: response.status, code: apiError.code }
      );
    }

    const parsed = parseJsonObject(responseText, "DeepSeek API returned a non-JSON response.");

    if (!isDeepSeekChatCompletionResponse(parsed)) {
      throw new DeepSeekAPIError("DeepSeek API returned an unexpected response shape.");
    }

    return parsed;
  }

  private assertCanCallRealProvider(): void {
    if (!this.config.enableRealLLM) {
      throw new RealLLMNotEnabledError();
    }
    if (!this.config.apiKey) {
      throw new MissingDeepSeekApiKeyError();
    }
  }

  private buildChatCompletionsUrl(): string {
    const baseUrl = (this.config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");

    return `${baseUrl}/chat/completions`;
  }

  private mapUsage(
    response: DeepSeekChatCompletionResponse,
    options: LLMCallOptions
  ): LLMUsage {
    const usage = response.usage;

    return {
      provider: this.name,
      model: typeof response.model === "string"
        ? response.model
        : options.model ?? this.config.defaultModel,
      inputTokens: asNumber(usage?.prompt_tokens),
      outputTokens: asNumber(usage?.completion_tokens),
      totalTokens: asNumber(usage?.total_tokens),
      estimatedCost: undefined
    };
  }
}

export function createDeepSeekProvider(
  config: Partial<DeepSeekProviderConfig> = {}
): DeepSeekProvider {
  return new DeepSeekProvider(config);
}

// Real DeepSeek calls are opt-in only. Set ENABLE_REAL_LLM=true and
// DEEPSEEK_API_KEY to call the OpenAI-compatible /chat/completions endpoint.
// JSON mode requires prompts to explicitly ask for a valid JSON object; the
// provider reinforces that instruction before sending response_format.

interface DeepSeekChatCompletionResponse {
  id?: unknown;
  model?: unknown;
  choices?: Array<{
    message?: {
      content?: unknown;
    };
    finish_reason?: unknown;
  }>;
  usage?: {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    total_tokens?: unknown;
  };
}

interface SafeRawSummary {
  id?: string;
  model?: string;
  finishReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

function withJsonInstruction(messages: LLMMessage[]): LLMMessage[] {
  const jsonInstruction =
    "Return only a valid JSON object. Do not wrap it in markdown, prose, or code fences.";

  if (messages.some((message) => message.content.includes(jsonInstruction))) {
    return messages;
  }

  return [
    {
      role: "system",
      content: jsonInstruction
    },
    ...messages
  ];
}

async function safeFetch(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1]
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new DeepSeekAPIError("DeepSeek API request failed before a response was received.");
  }
}

function parseDeepSeekError(responseText: string): { message?: string; code?: string } {
  const parsed = tryParseJson(responseText);

  if (!parsed || typeof parsed !== "object") {
    return {};
  }

  const error = (parsed as { error?: unknown }).error;

  if (!error || typeof error !== "object") {
    return {};
  }

  const message = (error as { message?: unknown }).message;
  const code = (error as { code?: unknown }).code;

  return {
    message: typeof message === "string" ? `DeepSeek API error: ${message}` : undefined,
    code: typeof code === "string" ? code : undefined
  };
}

function parseJsonObject(text: string, errorMessage: string): unknown {
  const parsed = tryParseJson(text);

  if (!parsed || typeof parsed !== "object") {
    throw new DeepSeekAPIError(errorMessage);
  }

  return parsed;
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function isDeepSeekChatCompletionResponse(
  value: unknown
): value is DeepSeekChatCompletionResponse {
  if (!value || typeof value !== "object") return false;

  const choices = (value as DeepSeekChatCompletionResponse).choices;

  return Array.isArray(choices);
}

function buildSafeRawSummary(response: DeepSeekChatCompletionResponse): SafeRawSummary {
  const usage = response.usage;

  return {
    id: typeof response.id === "string" ? response.id : undefined,
    model: typeof response.model === "string" ? response.model : undefined,
    finishReason: typeof response.choices?.[0]?.finish_reason === "string"
      ? response.choices[0].finish_reason
      : undefined,
    usage: usage
      ? {
          promptTokens: asNumber(usage.prompt_tokens),
          completionTokens: asNumber(usage.completion_tokens),
          totalTokens: asNumber(usage.total_tokens)
        }
      : undefined
  };
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readEnv(key: string): string | undefined {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };
  const env = runtime.process?.env;
  return env?.[key];
}
