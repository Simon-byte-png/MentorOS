import type { LLMCallPurpose, LLMProviderName, LLMUsage } from "./llm-provider";

export interface TokenBudget {
  maxInputTokens: number;
  maxOutputTokens: number;
  maxTotalTokens: number;
}

export interface UsageEstimate {
  inputTokens?: number;
  outputTokens?: number;
  estimatedCost?: number;
}

export interface CostControlConfig {
  tokenBudget: TokenBudget;
  maxEstimatedCost?: number;
  costSensitive: boolean;
}

export interface RuntimeUsageCall extends LLMUsage {
  purpose: LLMCallPurpose;
}

export interface RuntimeUsageSummary {
  provider: LLMProviderName;
  totalEstimatedCost: number;
  calls: RuntimeUsageCall[];
}

export const DEFAULT_TOKEN_BUDGET: TokenBudget = {
  maxInputTokens: 6000,
  maxOutputTokens: 2000,
  maxTotalTokens: 8000
};

export function estimateTokenCount(text: string): number {
  const normalized = text.trim();
  if (!normalized) return 0;

  const latinWords = normalized.match(/[a-zA-Z0-9_]+/g)?.length ?? 0;
  const cjkChars = normalized.match(/[\u3400-\u9fff]/g)?.length ?? 0;

  return Math.max(1, Math.ceil(latinWords * 1.3 + cjkChars * 0.75));
}

export function estimateUsage(input: string, output: string): UsageEstimate {
  const inputTokens = estimateTokenCount(input);
  const outputTokens = estimateTokenCount(output);

  return {
    inputTokens,
    outputTokens,
    estimatedCost: Number(((inputTokens + outputTokens) * 0.0000002).toFixed(6))
  };
}

export function buildRuntimeUsageSummary(
  provider: LLMProviderName,
  calls: RuntimeUsageCall[]
): RuntimeUsageSummary {
  const totalEstimatedCost = calls.reduce(
    (sum, call) => sum + (call.estimatedCost ?? 0),
    0
  );

  return {
    provider,
    totalEstimatedCost: Number(totalEstimatedCost.toFixed(6)),
    calls
  };
}
