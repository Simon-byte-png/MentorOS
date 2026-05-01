import { createDeepSeekProvider } from "./providers/deepseek-provider";
import { runMentorOSPipeline } from "./pipeline";
import type { MentorOSPipelineInput } from "./structured-schemas";

const sampleInput: MentorOSPipelineInput = {
  provider: "mock",
  qualityMode: true,
  costSensitive: false,
  userId: "mock-user",
  conversationId: "mock-conversation",
  mode: "decision",
  userMessage:
    "我想把 MentorOS 做成长期项目，但担心它太大、时间不够、技术也没完全准备好。",
  recentMessages: [
    {
      role: "user",
      content: "我希望 MentorOS 的回答有人味，不要像报告。"
    }
  ],
  memories: [
    {
      id: "memory-human-tone",
      type: "preference",
      content: "用户在意人味表达，偏好自然、少模板的长期对话风格。"
    },
    {
      id: "memory-agents",
      type: "preference",
      content: "用户希望 MentorOS 默认使用高级 Agent 认知模型。"
    },
    {
      id: "memory-overscope",
      type: "blind_spot",
      content: "用户容易把第一版项目设计得过大，需要提醒控制范围。"
    }
  ]
};

async function main(): Promise<void> {
  const result = await runMentorOSPipeline(sampleInput);

  console.log("selected agents:", result.council.selectedAgents.map((agent) => agent.slug).join(", "));
  console.log("provider:", result.metadata.provider);
  console.log("modelPlan:", JSON.stringify(result.metadata.modelPlan, null, 2));
  console.log("dialogue opening:", result.dialogue.opening);
  console.log("humanTone score:", result.evalReport.humanTone.score);
  console.log("safety score:", result.evalReport.safety.score);
  console.log("agentDifference score:", result.evalReport.agentDifference.score);
  console.log("memoryQuality score:", result.evalReport.memoryQuality.score);
  console.log("runtimeQuality score:", result.evalReport.runtimeQuality.score);
  console.log(
    "memory candidates:",
    result.memoryExtraction.candidates.map((candidate) => `${candidate.type}: ${candidate.content}`)
  );
  console.log("decision memo title:", result.decisionMemo.title);
  console.log("requiresReview:", result.metadata.requiresReview);
  console.log("warnings:", result.metadata.warnings);

  await runDeepSeekDryRun();
}

async function runDeepSeekDryRun(): Promise<void> {
  const provider = createDeepSeekProvider();
  const env = provider.getEnvironmentStatus();

  if (!env.enableRealLLM || !env.hasApiKey) {
    console.log("deepseek dry-run: skipped (set ENABLE_REAL_LLM=true and DEEPSEEK_API_KEY to call real DeepSeek)");
    return;
  }

  const result = await provider.callText(
    [
      {
        role: "system",
        content: "You are a concise MentorOS smoke-test assistant."
      },
      {
        role: "user",
        content: "Reply with one short sentence confirming DeepSeek is reachable."
      }
    ],
    {
      model: env.defaultModel,
      temperature: 0,
      maxTokens: 64,
      purpose: "safety_check"
    }
  );

  console.log("deepseek dry-run model:", result.usage.model);
  console.log("deepseek dry-run text:", result.text.slice(0, 160));
  console.log("deepseek dry-run usage:", result.usage);
}

void main().catch((error: unknown) => {
  console.error("smoke test failed:", error);
  throw error;
});
