import { createMockProvider } from "./providers/mock-provider";
import { selectModelForPurpose } from "./providers/model-router";
import type {
  ConversationContext,
  DialogueDirectorOutput,
  ExtractedMemoryCandidate,
  MemoryExtractionResult,
  MemoryType,
  RuntimeGenerationOptions
} from "./structured-schemas";

export interface MemoryExtractorInput {
  context: ConversationContext;
  dialogue: DialogueDirectorOutput;
}

const ALLOWED_TYPES = new Set<MemoryType>([
  "profile",
  "goal",
  "preference",
  "project",
  "decision_history",
  "blind_spot",
  "writing_style",
  "relationship"
]);

const SENSITIVE_PATTERNS = [
  "心理疾病",
  "诊断",
  "医疗",
  "政治立场",
  "宗教",
  "性取向",
  "疾病",
  "medical",
  "political",
  "religion"
];

const TEMPORARY_PATTERNS = [
  "现在有点烦",
  "今天心情",
  "今天晚上",
  "刚才",
  "temporary",
  "tonight"
];

export async function extractMemories(
  input: MemoryExtractorInput,
  options: RuntimeGenerationOptions = {}
): Promise<MemoryExtractionResult> {
  const provider = options.provider ?? createMockProvider();
  const model = selectModelForPurpose("memory_extraction", {
    modelPlan: options.modelPlan,
    provider: options.providerName,
    costSensitive: options.costSensitive,
    qualityMode: options.qualityMode
  });
  const candidates = buildCandidateMemories(input.context).filter(isAllowedCandidate);
  const rejected = buildRejectedReasons(input.context.userMessage);
  const call = await provider.callText(
    [
      {
        role: "system",
        content:
          "Extract only durable MentorOS memories. Do not store temporary moods or sensitive identity inferences."
      },
      {
        role: "user",
        content: input.context.userMessage
      }
    ],
    { purpose: "memory_extraction", model, jsonMode: true }
  );

  return {
    candidates,
    rejected,
    usage: {
      ...call.usage,
      model
    }
  };
}

function buildCandidateMemories(
  context: ConversationContext
): ExtractedMemoryCandidate[] {
  const text = context.userMessage;
  const candidates: ExtractedMemoryCandidate[] = [];

  if (includesAny(text, ["MentorOS", "长期项目", "long-term project"])) {
    candidates.push(createCandidate(
      "project",
      "用户正在把 MentorOS 作为长期项目推进，目标是积累长期判断和自然对话能力。",
      "用户当前消息",
      "这是对未来项目建议和范围控制长期有用的项目记忆。",
      "fact"
    ));
  }

  if (includesAny(text, ["太大", "范围", "时间不够", "技术"])) {
    candidates.push(createCandidate(
      "blind_spot",
      "用户在项目第一版容易把范围设计过大，需要提醒先证明最小判断闭环。",
      "用户当前消息与相关记忆",
      "这是长期有用的 blind spot，可帮助后续对话控制项目范围。",
      "inference"
    ));
  }

  if (context.relevantMemories.some((memory) => memory.content.includes("人味"))) {
    candidates.push(createCandidate(
      "preference",
      "用户偏好有人味、少模板感的 MentorOS 对话风格。",
      "已提供相关记忆",
      "这是长期表达偏好，会影响 Dialogue Director 的输出风格。",
      "fact"
    ));
  }

  return dedupeCandidates(candidates);
}

function createCandidate(
  type: MemoryType,
  content: string,
  source: string,
  reason: string,
  confidence: "fact" | "inference"
): ExtractedMemoryCandidate {
  return {
    type,
    content,
    source,
    reason,
    editable: true,
    deletable: true,
    canDisable: true,
    confidence
  };
}

function isAllowedCandidate(candidate: ExtractedMemoryCandidate): boolean {
  return (
    ALLOWED_TYPES.has(candidate.type) &&
    !includesAny(candidate.content, SENSITIVE_PATTERNS) &&
    !includesAny(candidate.content, TEMPORARY_PATTERNS)
  );
}

function buildRejectedReasons(userMessage: string): string[] {
  const rejected: string[] = [];

  if (includesAny(userMessage, TEMPORARY_PATTERNS)) {
    rejected.push("Skipped temporary mood or one-off context.");
  }
  if (includesAny(userMessage, SENSITIVE_PATTERNS)) {
    rejected.push("Skipped unconfirmed sensitive inference.");
  }

  return rejected;
}

function dedupeCandidates(
  candidates: ExtractedMemoryCandidate[]
): ExtractedMemoryCandidate[] {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const key = `${candidate.type}:${candidate.content}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function includesAny(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) =>
    text.toLowerCase().includes(pattern.toLowerCase())
  );
}
