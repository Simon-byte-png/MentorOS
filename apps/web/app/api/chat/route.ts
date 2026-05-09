import { NextResponse } from "next/server";
import {
  DeepSeekAPIError,
  DeepSeekJSONParseError,
  MissingDeepSeekApiKeyError,
  RealLLMNotEnabledError,
  runMentorOSPipeline,
} from "@mentoros/ai";
import type {
  MentorOSPipelineInput,
  ModelDepth,
  RecentMessage,
  RelevantMemory,
} from "@mentoros/ai";
import {
  createConversation,
  createDecisionMemo,
  createMessage,
  getConversationById,
  getDailyUsageCount,
  listActiveMemoriesByUser,
  listMessagesByConversation,
  recordUsageEvent,
  updateConversation,
} from "@mentoros/db";
import {
  getCurrentAccess,
  isDevBypassEnabled,
  isProductionRuntime,
} from "@/lib/auth/access";

const EMPTY_MESSAGE_ERROR = "请先写下你正在纠结的问题。";
const AUTH_ERROR = "请先登录后再使用 MentorOS。";
const INVITE_ERROR = "你的内测权限尚未激活，请先输入邀请码。";
const QUOTA_ERROR = "今天的内测额度已用完，明天再继续。";
const RUNTIME_ERROR =
  "MentorOS 暂时没有组织好这场讨论，请稍后重试。";
const DEEPSEEK_CONFIG_ERROR =
  "DeepSeek 还没有配置完整。请在 .env.local 设置 ENABLE_REAL_LLM=true 和 DEEPSEEK_API_KEY，然后重启开发服务。";

type ChatPayload = {
  userMessage: string;
  conversationId?: string;
  modelDepth: ModelDepth;
  recentMessages: RecentMessage[];
};

const mockMemories: RelevantMemory[] = [
  {
    type: "preference",
    content: "用户在意 AI 对话的人味表达。",
    score: 0.9,
    source: "mock",
  },
  {
    type: "preference",
    content: "用户希望系统默认召集高级 Agent，而不是让用户手动选择。",
    score: 0.85,
    source: "mock",
  },
  {
    type: "blind_spot",
    content: "用户容易把第一版项目设计得过大，需要优先验证最小体验。",
    score: 0.8,
    source: "mock",
  },
  {
    type: "project",
    content:
      "用户正在构思 MentorOS，一个有长期记忆和多 Agent 圆桌能力的智识对话系统。",
    score: 0.9,
    source: "mock",
  },
];

export async function POST(request: Request) {
  const devBypass = isDevBypassEnabled();
  const warnings: string[] = [];

  // --- Auth check ---
  let userId: string | null = null;

  if (!devBypass) {
    const access = await getCurrentAccess();

    if (!access.user) {
      return NextResponse.json(
        { ok: false, error: AUTH_ERROR },
        { status: 401 },
      );
    }

    if (access.profile?.access_status !== "active") {
      return NextResponse.json(
        { ok: false, error: INVITE_ERROR },
        { status: 403 },
      );
    }

    userId = access.user.id;
  } else {
    userId = "dev-bypass-user";
    warnings.push("devBypass: 跳过登录和邀请码检查。");
  }

  // --- Parse message ---
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return invalidMessageResponse();
  }

  const chatPayload = readChatPayload(payload);

  if (!chatPayload) {
    return invalidMessageResponse();
  }

  const {
    userMessage,
    conversationId: requestedConversationId,
    modelDepth,
    recentMessages: clientRecentMessages,
  } = chatPayload;

  // --- Quota check ---
  if (!devBypass && userId) {
    const dailyLimit = readEnvInt("MENTOROS_DAILY_MESSAGE_LIMIT", 20);

    try {
      const today = new Date().toISOString().slice(0, 10);
      const usedCount = await getDailyUsageCount(userId, today);

      if (usedCount >= dailyLimit) {
        return NextResponse.json(
          { ok: false, error: QUOTA_ERROR },
          { status: 429 },
        );
      }
    } catch (error) {
      if (devBypass) {
        warnings.push("devBypass: quota 查询失败，跳过额度检查。");
        console.warn("[chat] quota check failed in dev bypass:", error);
      } else {
        console.error("[chat] quota check failed:", error);
        return NextResponse.json(
          { ok: false, error: RUNTIME_ERROR },
          { status: 500 },
        );
      }
    }
  }

  // --- Conversation management ---
  let conversationId: string | null = null;

  if (!devBypass && userId) {
    if (requestedConversationId) {
      // 复用现有 conversation
      try {
        const existingConversation = await getConversationById(requestedConversationId);

        if (!existingConversation) {
          return NextResponse.json(
            { ok: false, error: "对话不存在。" },
            { status: 404 },
          );
        }

        if (existingConversation.user_id !== userId) {
          return NextResponse.json(
            { ok: false, error: "你没有权限访问这个对话。" },
            { status: 403 },
          );
        }

        conversationId = existingConversation.id;
      } catch (error) {
        console.error("[chat] getConversationById failed:", error);
        return NextResponse.json(
          { ok: false, error: RUNTIME_ERROR },
          { status: 500 },
        );
      }
    } else {
      // 创建新 conversation
      try {
        const newConversation = await createConversation({
          user_id: userId,
          title: userMessage.slice(0, 100),
          mode: "decision",
          status: "active",
        });
        conversationId = newConversation.id;
      } catch (error) {
        console.error("[chat] createConversation failed:", error);
        return NextResponse.json(
          { ok: false, error: RUNTIME_ERROR },
          { status: 500 },
        );
      }
    }
  } else if (devBypass) {
    // devBypass 模式：使用本地 demo conversationId
    conversationId = requestedConversationId ?? `demo-${Date.now()}`;
    warnings.push("devBypass: 使用本地 demo conversation，不会持久化。");
  }

  // --- Load recent messages ---
  let recentMessages: RecentMessage[] = [];

  if (devBypass) {
    recentMessages = clientRecentMessages;
  } else if (conversationId) {
    try {
      const messages = await listMessagesByConversation(conversationId);
      // 取最近 10 条，转换为 pipeline 格式
      recentMessages = messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
        speaker: msg.speaker ?? undefined,
      }));
    } catch (error) {
      console.warn("[chat] listMessagesByConversation failed:", error);
      // 不阻断流程，使用空数组
      warnings.push("加载历史消息失败，将使用空上下文。");
    }
  }

  // --- Load user memories ---
  let memories: RelevantMemory[] = mockMemories;

  if (!devBypass && userId) {
    try {
      const userMemories = await listActiveMemoriesByUser(userId);
      memories = userMemories.map((mem) => ({
        id: mem.id,
        type: mem.memory_type,
        content: mem.content,
        score: mem.confidence ?? undefined,
        source: "user_memory",
      }));
    } catch (error) {
      console.warn("[chat] listActiveMemoriesByUser failed:", error);
      // 不阻断流程，使用 mock memories
      memories = mockMemories;
      warnings.push("加载用户记忆失败，将使用默认记忆。");
    }
  }

  // --- Save user message ---
  let userMessageId: string | null = null;

  if (!devBypass && conversationId) {
    try {
      const savedMessage = await createMessage({
        conversation_id: conversationId,
        role: "user",
        speaker: "user",
        content: userMessage,
        metadata: {},
      });
      userMessageId = savedMessage.id;
    } catch (error) {
      console.error("[chat] createMessage (user) failed:", error);
      return NextResponse.json(
        { ok: false, error: RUNTIME_ERROR },
        { status: 500 },
      );
    }
  }

  // --- Resolve provider config ---
  const providerConfig = resolveChatProviderConfig();

  if (!providerConfig.ok) {
    return NextResponse.json(
      { ok: false, error: providerConfig.error },
      { status: 500 },
    );
  }

  const provider = providerConfig.provider;
  warnings.push(...providerConfig.warnings);
  const costSensitive = modelDepth === "flash";
  const qualityMode = modelDepth === "pro";

  // --- Run pipeline ---
  try {
    const input: MentorOSPipelineInput = {
      userId: userId ?? undefined,
      conversationId: conversationId ?? undefined,
      userMessage,
      recentMessages,
      memories,
      provider,
      mock: provider === "mock",
      mode: "decision",
      modelDepth,
      costSensitive,
      qualityMode,
    };
    const result = await runMentorOSPipeline(input);

    // Propagate pipeline warnings
    if (result.metadata.warnings.length > 0) {
      warnings.push(...result.metadata.warnings);
    }

    // --- Save assistant message ---
    let assistantMessageId: string | null = null;

    if (!devBypass && conversationId) {
      try {
        // 生成可读 content
        const dialogueContent = [
          result.dialogue.opening,
          ...result.dialogue.messages.map((msg) => `${msg.speaker}: ${msg.content}`),
          result.dialogue.summary,
          result.dialogue.nextQuestion,
        ].filter(Boolean).join("\n\n");

        // 保存轻量 metadata
        const assistantMetadata = {
          selectedAgents: result.council.selectedAgents.map((a) => a.slug),
          memoryCandidates: result.memoryExtraction.candidates.length,
          evalStatus: result.evalReport.passed ? "passed" : "failed",
          decisionMemoTitle: result.decisionMemo.title,
          requiresReview: result.metadata.requiresReview,
          warnings: result.metadata.warnings,
          provider: result.metadata.provider,
          modelDepth: result.metadata.modelDepth,
        };

        const savedMessage = await createMessage({
          conversation_id: conversationId,
          role: "assistant",
          speaker: "director",
          content: dialogueContent,
          metadata: assistantMetadata,
        });
        assistantMessageId = savedMessage.id;
        await updateConversation(conversationId, {
          updated_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error("[chat] createMessage (assistant) failed:", error);
        // 不阻断返回，但记录警告
        warnings.push("保存助手消息失败。");
      }
    }

    // --- Save decision memo ---
    let decisionMemoId: string | null = null;

    if (!devBypass && conversationId && result.decisionMemo) {
      try {
        const savedMemo = await createDecisionMemo({
          conversation_id: conversationId,
          title: result.decisionMemo.title,
          memo: {
            questionRestatement: result.decisionMemo.questionRestatement,
            confirmedFacts: result.decisionMemo.confirmedFacts,
            assumptions: result.decisionMemo.assumptions,
            disagreements: result.decisionMemo.disagreements,
            risks: result.decisionMemo.risks,
            suggestedActions: result.decisionMemo.suggestedActions,
            sevenDayPlan: result.decisionMemo.sevenDayPlan,
            reviewMetrics: result.decisionMemo.reviewMetrics,
          },
          markdown: result.decisionMemo.markdown,
        });
        decisionMemoId = savedMemo.id;
      } catch (error) {
        console.error("[chat] createDecisionMemo failed:", error);
        // 不阻断返回，但记录警告
        warnings.push("保存决策备忘录失败。");
      }
    }

    // --- Record usage event (fire-and-forget) ---
    if (!devBypass && userId) {
      const usageSummary = result.metadata.usageSummary;
      const primaryCall = usageSummary.calls[0];

      recordUsageEvent({
        user_id: userId,
        conversation_id: conversationId,
        provider: usageSummary.provider,
        model: primaryCall?.model ?? "unknown",
        purpose: "chat_pipeline",
        input_tokens: primaryCall?.inputTokens ?? null,
        output_tokens: primaryCall?.outputTokens ?? null,
        estimated_cost: usageSummary.totalEstimatedCost ?? null,
        metadata: {
          callCount: usageSummary.calls.length,
          requiresReview: result.metadata.requiresReview,
          modelDepth: result.metadata.modelDepth,
        },
      }).catch((err: unknown) => {
        console.warn("[chat] recordUsageEvent failed:", err);
        warnings.push("usage event 记录失败。");
      });
    }

    // 生产环境下过滤掉 dev bypass 相关 warnings，不暴露给用户
    const safeWarnings = isProductionRuntime()
      ? warnings.filter((w) => !w.startsWith("devBypass:"))
      : warnings;

    return NextResponse.json({
      ok: true,
      result,
      conversationId,
      persisted: {
        conversationId,
        userMessageId,
        assistantMessageId,
        decisionMemoId,
      },
      ...(safeWarnings.length > 0 ? { warnings: safeWarnings } : {}),
    });
  } catch (error) {
    console.error("[chat] pipeline error:", error);
    return NextResponse.json(
      { ok: false, error: getPipelineErrorMessage(error) },
      { status: getPipelineErrorStatus(error) },
    );
  }
}

// --- Helpers ---

function readChatPayload(payload: unknown): ChatPayload | null {
  if (!payload || typeof payload !== "object") return null;

  const obj = payload as Record<string, unknown>;
  const userMessage = obj.userMessage;

  if (typeof userMessage !== "string") return null;
  const trimmed = userMessage.trim();
  if (trimmed.length === 0) return null;

  const conversationId = typeof obj.conversationId === "string" ? obj.conversationId : undefined;
  const modelDepth: ModelDepth = obj.modelDepth === "pro" ? "pro" : "flash";
  const recentMessages = Array.isArray(obj.recentMessages)
    ? obj.recentMessages
        .map(readRecentMessage)
        .filter((message): message is RecentMessage => Boolean(message))
        .slice(-10)
    : [];

  return { userMessage: trimmed, conversationId, modelDepth, recentMessages };
}

function readRecentMessage(value: unknown): RecentMessage | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const role = typeof record.role === "string" ? record.role : null;
  const content = typeof record.content === "string" ? record.content.trim() : "";

  if (!role || content.length === 0) return null;

  return {
    role,
    content,
    speaker: typeof record.speaker === "string" ? record.speaker : undefined,
  };
}

function invalidMessageResponse() {
  return NextResponse.json(
    { ok: false, error: EMPTY_MESSAGE_ERROR },
    { status: 400 },
  );
}

function readEnvBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  return raw === "true";
}

function readEnvInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readEnvChoice<T extends string>(
  key: string,
  choices: readonly T[],
  fallback: T,
): T {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  return (choices as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

type ChatProviderConfig =
  | {
      ok: true;
      provider: "mock" | "deepseek";
      warnings: string[];
    }
  | {
      ok: false;
      error: string;
    };

function resolveChatProviderConfig(): ChatProviderConfig {
  const requested = readEnvChoice(
    "MENTOROS_CHAT_PROVIDER",
    ["auto", "mock", "deepseek"],
    "auto",
  );
  const hasDeepSeekKey = Boolean(process.env.DEEPSEEK_API_KEY?.trim());
  const realLlmEnabled = readEnvBool("ENABLE_REAL_LLM", false);

  if (requested === "mock") {
    return { ok: true, provider: "mock", warnings: [] };
  }

  if (requested === "deepseek") {
    if (!realLlmEnabled || !hasDeepSeekKey) {
      return { ok: false, error: DEEPSEEK_CONFIG_ERROR };
    }

    return { ok: true, provider: "deepseek", warnings: [] };
  }

  if (realLlmEnabled && hasDeepSeekKey) {
    return { ok: true, provider: "deepseek", warnings: [] };
  }

  return {
    ok: true,
    provider: "mock",
    warnings: ["DeepSeek 未配置完整，当前使用本地 mock provider。"],
  };
}

function getPipelineErrorStatus(error: unknown): number {
  return error instanceof DeepSeekAPIError ||
    error instanceof DeepSeekJSONParseError ||
    error instanceof MissingDeepSeekApiKeyError ||
    error instanceof RealLLMNotEnabledError
    ? 502
    : 500;
}

function getPipelineErrorMessage(error: unknown): string {
  if (
    error instanceof MissingDeepSeekApiKeyError ||
    error instanceof RealLLMNotEnabledError
  ) {
    return DEEPSEEK_CONFIG_ERROR;
  }

  if (error instanceof DeepSeekJSONParseError) {
    return "DeepSeek 已返回内容，但这次没有按圆桌结构输出。请重试一次。";
  }

  if (error instanceof DeepSeekAPIError) {
    return `DeepSeek 调用失败：${error.message}`;
  }

  return RUNTIME_ERROR;
}
