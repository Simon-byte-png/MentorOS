import type {
  ConversationContext,
  MentorOSPipelineInput,
  RelevantMemory
} from "./structured-schemas";

export function buildConversationContext(
  input: MentorOSPipelineInput
): ConversationContext {
  const scoredMemories = (input.memories ?? [])
    .map((memory) => ({
      ...memory,
      score: scoreMemory(input.userMessage, memory)
    }))
    .filter((memory) => (memory.score ?? 0) > 0)
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
    .slice(0, 6);

  return {
    userId: input.userId,
    conversationId: input.conversationId,
    userMessage: input.userMessage,
    recentMessages: input.recentMessages ?? [],
    relevantMemories: scoredMemories,
    mode: input.mode ?? "general"
  };
}

// TODO(Window D + B): replace input-only retrieval with db repository integration
// once Supabase repositories are implemented and user-controlled memory reads are wired.

function scoreMemory(userMessage: string, memory: RelevantMemory): number {
  const messageTokens = extractKeywords(userMessage);
  const memoryText = `${memory.type ?? ""} ${memory.content}`.toLowerCase();
  let score = 0;

  for (const token of messageTokens) {
    if (token.length >= 2 && memoryText.includes(token)) {
      score += token.length >= 4 ? 2 : 1;
    }
  }

  return score;
}

function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  const words = lower.match(/[a-z0-9_]+/g) ?? [];
  const cjkText = lower.replace(/[^\u3400-\u9fff]/g, "");
  const cjkBigrams: string[] = [];

  for (let index = 0; index < cjkText.length - 1; index += 1) {
    cjkBigrams.push(cjkText.slice(index, index + 2));
  }

  return [...new Set([...words, ...cjkBigrams])].filter(
    (token) => !STOP_WORDS.has(token)
  );
}

const STOP_WORDS = new Set([
  "我",
  "想",
  "的",
  "了",
  "但",
  "和",
  "也",
  "它",
  "把",
  "成",
  "to",
  "the",
  "and",
  "or",
  "a",
  "an"
]);
