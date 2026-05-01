export interface LegacyOpenAIClientPlaceholder {
  status: "legacy-placeholder";
  note: string;
}

export function createOpenAIClientPlaceholder(): LegacyOpenAIClientPlaceholder {
  return {
    status: "legacy-placeholder",
    note:
      "MentorOS 当前采用 provider abstraction，DeepSeek 是第一优先真实 provider，OpenAI 未来可作为另一个 provider。"
  };
}
