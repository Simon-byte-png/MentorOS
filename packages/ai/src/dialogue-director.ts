import { createMockProvider } from "./providers/mock-provider";
import { selectModelForPurpose } from "./providers/model-router";
import type {
  ConversationContext,
  CouncilRunResult,
  DialogueDirectorOutput,
  DialogueMessage,
  RuntimeGenerationOptions
} from "./structured-schemas";

export interface DialogueDirectorInput {
  context: ConversationContext;
  council: CouncilRunResult;
}

export async function runDialogueDirector(
  input: DialogueDirectorInput,
  options: RuntimeGenerationOptions = {}
): Promise<DialogueDirectorOutput> {
  const provider = options.provider ?? createMockProvider();
  const model = selectModelForPurpose("dialogue_director", {
    modelPlan: options.modelPlan,
    provider: options.providerName,
    costSensitive: options.costSensitive,
    qualityMode: options.qualityMode
  });
  const memoryLine = buildNaturalMemoryLine(input.context);
  const opening = buildOpening(input, memoryLine);
  const messages = buildDialogueMessages(input);
  const summary =
    "我的判断是：MentorOS 可以继续，但第一版不应该追求完整系统。应该先证明一件事：一段输入加少量长期记忆，能不能产出比普通聊天更像“陪你判断”的回应。";
  const nextQuestion =
    "你要回答我一个很小的问题：未来 7 天，你愿意只做一个可反复演示的 /chat mock runtime，还是仍想把记忆、备忘录、Agent 圆桌一次做全？";
  const fullText = [opening, ...messages.map((message) => message.content), summary, nextQuestion].join(
    "\n\n"
  );
  const call = await provider.callText(
    [
      {
        role: "system",
        content:
          "You are a Dialogue Director for MentorOS. Make the frontstage feel like a thoughtful conversation, not a report."
      },
      {
        role: "user",
        content: fullText
      }
    ],
    { purpose: "dialogue_director", model, temperature: 0.5 }
  );

  return {
    opening,
    messages,
    summary,
    nextQuestion,
    fullText,
    usage: {
      ...call.usage,
      model
    }
  };
}

function buildOpening(
  input: DialogueDirectorInput,
  memoryLine: string
): string {
  const selected = input.council.selectedAgents
    .map((agent) => agent.shortName)
    .join(" / ");

  return [
    `其实你这句话里有三个压力叠在一起：MentorOS 是长期项目，范围太大，时间不够。`,
    `再加上你担心技术没完全准备好，这不是单纯的执行力问题，是取舍问题。`,
    memoryLine,
    `我会先让 ${selected} 这些认知模型在后台吵一小会儿，但前台只给你一个清楚判断。`
  ]
    .filter(Boolean)
    .join(" ");
}

function buildDialogueMessages(input: DialogueDirectorInput): DialogueMessage[] {
  const topOutputs = input.council.agentOutputs.slice(0, 3);

  return topOutputs.map((output) => ({
    speaker: output.displayName,
    role: "agent",
    content: `${output.displayName} 这个认知模型会把重点放在：${output.keyPoints
      .slice(0, 2)
      .join("、")}。${output.caution} ${output.suggestedAction}`
  }));
}

function buildNaturalMemoryLine(context: ConversationContext): string {
  const memoryContents = context.relevantMemories.map((memory) => memory.content).join(" ");

  if (!memoryContents) {
    return "这里先别把它做成宏大系统。";
  }

  const mentionsHumanTone = memoryContents.includes("人味");
  const mentionsOverscope =
    memoryContents.includes("过大") || memoryContents.includes("太大");
  const mentionsAdvancedAgents =
    memoryContents.includes("高级 Agent") || memoryContents.includes("Agent");
  const parts: string[] = [];

  if (mentionsHumanTone) {
    parts.push("你之前一直在意人味，不想要模板化回答");
  }
  if (mentionsAdvancedAgents) {
    parts.push("也希望默认就是有分量的认知模型");
  }
  if (mentionsOverscope) {
    parts.push("而且前面说的第一版容易做太大，这次也冒出来了");
  }

  return parts.length > 0
    ? `${parts.join("；")}。`
    : "这和你之前担心的点连在一起：项目要长期，但第一版不能过重。";
}
