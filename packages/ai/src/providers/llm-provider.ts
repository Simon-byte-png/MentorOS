export type LLMProviderName = "mock" | "deepseek" | "openai";

export type LLMCallPurpose =
  | "agent_analysis"
  | "dialogue_director"
  | "memory_extraction"
  | "decision_memo"
  | "safety_check";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  stream?: boolean;
  purpose?: LLMCallPurpose;
}

export interface LLMUsage {
  provider: LLMProviderName;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
}

export interface LLMTextResult {
  text: string;
  usage: LLMUsage;
  raw?: unknown;
}

export interface LLMJsonResult<T = unknown> {
  data: T;
  usage: LLMUsage;
  raw?: unknown;
}

export interface LLMProvider {
  name: LLMProviderName;
  callText(messages: LLMMessage[], options?: LLMCallOptions): Promise<LLMTextResult>;
  callJson<T = unknown>(
    messages: LLMMessage[],
    options?: LLMCallOptions
  ): Promise<LLMJsonResult<T>>;
}
