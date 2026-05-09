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

type GeneratedDialogue = {
  opening?: unknown;
  messages?: unknown;
  summary?: unknown;
  nextQuestion?: unknown;
};

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

  if (provider.name !== "mock") {
    const generated = await provider.callJson<GeneratedDialogue>(
      [
        {
          role: "system",
          content:
            "你是 MentorOS 的圆桌主持。你要把后台认知模型的分析整理成一次自然中文对话，不要写报告，不要冒充真实人物，不要编造引语。输出 JSON object，字段为 opening、messages、summary、nextQuestion。messages 是数组，每项包含 speaker 和 content。"
        },
        {
          role: "user",
          content: buildDirectorPrompt(input, options)
        }
      ],
      {
        purpose: "dialogue_director",
        model,
        temperature: options.modelDepth === "pro" ? 0.62 : 0.5,
        jsonMode: true,
        maxTokens: options.dialogueMaxTokens
      }
    );
    const normalized = normalizeGeneratedDialogue(generated.data, {
      opening,
      messages,
      summary,
      nextQuestion
    });

    return {
      ...normalized,
      fullText: [
        normalized.opening,
        ...normalized.messages.map((message) => message.content),
        normalized.summary,
        normalized.nextQuestion
      ].filter(Boolean).join("\n\n"),
      usage: {
        ...generated.usage,
        model
      }
    };
  }

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

function buildDirectorPrompt(
  input: DialogueDirectorInput,
  options: RuntimeGenerationOptions
): string {
  const memories = input.context.relevantMemories
    .map((memory) => `- ${memory.content}`)
    .join("\n") || "- 暂无相关长期记忆";
  const recentMessages = input.context.recentMessages
    .slice(-8)
    .map((message) => `${message.speaker ?? message.role}: ${message.content}`)
    .join("\n") || "- 这是本会话第一轮";
  const council = input.council.agentOutputs
    .map((output) => [
      `【${output.displayName}】`,
      output.analysis,
      `提醒：${output.caution}`,
      `行动建议：${output.suggestedAction}`
    ].join("\n"))
    .join("\n\n");

  return [
    "运行时事实：这次回复正在由真实 LLM provider 生成，不是本地 mock。若用户询问是否已接入真实模型，请如实说明后端 provider 已进入真实调用。",
    "",
    `用户问题：${input.context.userMessage}`,
    "",
    "相关记忆：",
    memories,
    "",
    "最近会话：",
    recentMessages,
    "",
    "后台圆桌分析：",
    council,
    "",
    "输出要求：",
    "1. opening 像一个人正在接住用户的话，直接进入判断。",
    input.context.recentMessages.length > 0
      ? "2. 必须自然承接最近上下文，不要把每轮都当第一次对话。"
      : "2. 这是本会话的第一轮，可以直接建立判断框架。",
    optionsLine(input, options),
    "4. messages 选择 2 到 4 位认知模型发言，每段自然中文，避免模板化。",
    "5. summary 给出收束判断。",
    "6. nextQuestion 给出一个可以继续聊的问题。",
    "7. 所有 speaker 使用中文，例如“圆桌主持”“芒格式认知模型”。"
  ].join("\n");
}

function optionsLine(
  input: DialogueDirectorInput,
  options: RuntimeGenerationOptions
): string {
  if (options.modelDepth === "pro") {
    return "3. 当前是深度模式：回答要更充分，展开关键理由、反方意见和具体下一步，但仍保持对话感。";
  }

  return input.context.mode === "decision"
    ? "3. 当前是快速模式：给出明确倾向和最关键理由，不要冗长。"
    : "3. 当前是快速模式：保持自然对话，不要写成报告。";
}

function normalizeGeneratedDialogue(
  generated: GeneratedDialogue,
  fallback: Pick<DialogueDirectorOutput, "opening" | "messages" | "summary" | "nextQuestion">
): Pick<DialogueDirectorOutput, "opening" | "messages" | "summary" | "nextQuestion"> {
  const opening = asNonEmptyString(generated.opening) ?? fallback.opening;
  const summary = asNonEmptyString(generated.summary) ?? fallback.summary;
  const nextQuestion = asNonEmptyString(generated.nextQuestion) ?? fallback.nextQuestion;
  const generatedMessages: DialogueMessage[] = [];

  if (Array.isArray(generated.messages)) {
    for (const message of generated.messages) {
      if (!message || typeof message !== "object") continue;

      const record = message as Record<string, unknown>;
      const speaker = asNonEmptyString(record.speaker);
      const content = asNonEmptyString(record.content);

      if (!speaker || !content) continue;

      generatedMessages.push({
        speaker,
        role: "agent",
        content
      });
    }
  }

  return {
    opening,
    messages: generatedMessages.length > 0 ? generatedMessages : fallback.messages,
    summary,
    nextQuestion
  };
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
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
