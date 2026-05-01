import type {
  LLMCallOptions,
  LLMJsonResult,
  LLMMessage,
  LLMProvider,
  LLMTextResult
} from "./llm-provider";
import { estimateUsage } from "./usage-types";

export class MockProvider implements LLMProvider {
  readonly name = "mock" as const;

  async callText(
    messages: LLMMessage[],
    options: LLMCallOptions = {}
  ): Promise<LLMTextResult> {
    const text = buildMockText(options);
    const input = messages.map((message) => message.content).join("\n");
    const estimate = estimateUsage(input, text);

    return {
      text,
      usage: {
        provider: this.name,
        model: options.model ?? `mock-${options.purpose ?? "general"}`,
        ...estimate
      },
      raw: { mock: true, purpose: options.purpose ?? "general" }
    };
  }

  async callJson<T = unknown>(
    messages: LLMMessage[],
    options: LLMCallOptions = {}
  ): Promise<LLMJsonResult<T>> {
    const textResult = await this.callText(messages, options);
    const data = buildMockJson(options) as T;

    return {
      data,
      usage: textResult.usage,
      raw: { mock: true, purpose: options.purpose ?? "general" }
    };
  }
}

export function createMockProvider(): MockProvider {
  return new MockProvider();
}

function buildMockText(options: LLMCallOptions): string {
  switch (options.purpose) {
    case "agent_analysis":
      return "Mock agent analysis: inspect failure modes, user value, leverage, clarity, product experience, and tail risk.";
    case "dialogue_director":
      return "Mock dialogue director: turn the council notes into a direct, warm conversation with one useful question.";
    case "memory_extraction":
      return "Mock memory extraction: keep durable goals, preferences, projects, decision history, blind spots, writing style, and relationships only.";
    case "decision_memo":
      return "Mock decision memo: restate the decision, name assumptions, risks, actions, seven-day plan, and review metrics.";
    case "safety_check":
      return "Mock safety check: no impersonation, no fake quotes, no unsupported private facts.";
    default:
      return "Mock provider response.";
  }
}

function buildMockJson(options: LLMCallOptions): Record<string, unknown> {
  return {
    provider: "mock",
    purpose: options.purpose ?? "general",
    model: options.model ?? `mock-${options.purpose ?? "general"}`,
    result: buildMockText(options)
  };
}
