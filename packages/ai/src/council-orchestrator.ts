import {
  getRuntimeAgentProfiles,
  selectAgentsForConversation,
  type AgentSlug
} from "@mentoros/agents";
import type { LLMUsage } from "./providers/llm-provider";
import { createMockProvider } from "./providers/mock-provider";
import { selectModelForPurpose } from "./providers/model-router";
import {
  mapSelectedAgent,
  type ConversationContext,
  type CouncilAgentOutput,
  type CouncilRunResult,
  type RuntimeGenerationOptions
} from "./structured-schemas";

const DEFAULT_MAX_AGENTS = 4;
const ALL_AGENT_SLUGS: AgentSlug[] = [
  "munger",
  "duan",
  "naval",
  "feynman",
  "jobs",
  "taleb"
];

export interface RunCouncilOptions extends RuntimeGenerationOptions {
  maxAgents?: number;
}

export async function runCouncil(
  context: ConversationContext,
  options: RunCouncilOptions = {}
): Promise<CouncilRunResult> {
  const provider = options.provider ?? createMockProvider();
  const model = selectModelForPurpose("agent_analysis", {
    modelPlan: options.modelPlan,
    provider: options.providerName,
    costSensitive: options.costSensitive,
    qualityMode: options.qualityMode
  });
  const selection = selectAgentsForConversation(context.userMessage);
  const selected = selection.selectedAgents.slice(
    0,
    options.maxAgents ?? DEFAULT_MAX_AGENTS
  );
  const profiles = getRuntimeAgentProfiles(selected.map((agent) => agent.slug));
  const runtimeAgents = selected.map((agent, index) =>
    mapSelectedAgent(agent, profiles[index])
  );
  const agentResults = await Promise.all(runtimeAgents.map(async (agent) => {
    const fallbackAnalysis = buildMockAgentAnalysis(agent.slug, context);
    const call = await provider.callText(
      [
        {
          role: "system",
          content:
            "你是 MentorOS 的认知模型分析器。只能把 Agent 当作公开思想抽象出的认知模型，不代表本人观点，不要编造引语。请用中文给出一段自然、具体、有判断的分析。"
        },
        {
          role: "user",
          content: [
            `用户问题：${context.userMessage}`,
            `认知模型：${agent.displayName}`,
            `角色：${agent.roleInCouncil}`,
            "请只输出这一位认知模型的分析，不要写报告标题。"
          ].join("\n")
        }
      ],
      {
        purpose: "agent_analysis",
        model,
        maxTokens: options.agentAnalysisMaxTokens
      }
    );
    const callUsage = {
      ...call.usage,
      model
    };

    return {
      output: {
        agentSlug: agent.slug,
        displayName: agent.displayName,
        roleInCouncil: agent.roleInCouncil,
        analysis: provider.name === "mock"
          ? fallbackAnalysis
          : call.text.trim() || fallbackAnalysis,
        keyPoints: buildAgentKeyPoints(agent.slug),
        suggestedAction: buildAgentSuggestedAction(agent.slug),
        caution: buildAgentCaution(agent.slug),
        usage: callUsage
      } satisfies CouncilAgentOutput,
      usage: callUsage
    };
  }));
  const agentOutputs = agentResults.map((result) => result.output);
  const usage = agentResults.map((result) => result.usage);

  return {
    selection,
    selectedAgents: runtimeAgents,
    agentOutputs,
    agentOutputMap: Object.fromEntries(
      agentOutputs.map((output) => [output.agentSlug, output.analysis])
    ),
    model,
    usage
  };
}

export function buildFullMockAgentOutputMap(
  context: Pick<ConversationContext, "userMessage"> = { userMessage: "" }
): Record<AgentSlug, string> {
  return Object.fromEntries(
    ALL_AGENT_SLUGS.map((slug) => [slug, buildMockAgentAnalysis(slug, context)])
  ) as Record<AgentSlug, string>;
}

export function buildMockAgentAnalysis(
  slug: AgentSlug,
  context: Pick<ConversationContext, "userMessage">
): string {
  const subject = context.userMessage || "这个决定";

  switch (slug) {
    case "munger":
      return `Munger-style cognitive model: 先反向看 ${subject} 的失败路径。真正的机会成本不是少做几个功能，而是把有限时间投进没有激励闭环的东西里。这里要避坑：别用复杂架构证明自己聪明，先避免愚蠢，把最容易破坏长期项目的误判列出来。`;
    case "duan":
      return `Duan-style cognitive model: 这件事要回到用户价值和本分。MentorOS 如果不能让你在真实选择里长期做对的事，商业模式和概念包装都不重要。简单常识是：别先包装宏大叙事，先确认一个人愿意反复使用它。`;
    case "naval":
      return `Naval-style cognitive model: 这里的核心是杠杆、自由和复利。MentorOS 值得做，只要它增加你的 personal energy，而不是把你锁进维护负担。真正的 specific knowledge 是你对人味对话和长期判断的品味；用 accountability 做一个小承诺。`;
    case "feynman":
      return `Feynman-style cognitive model: 先把概念拆干净。你说“太大、时间不够、技术没准备好”，最小事实分别是什么？用一个实验证明：一个输入、一段记忆、两个认知模型，能不能产生让你不自欺的简单解释。`;
    case "jobs":
      return `Jobs-style cognitive model: 第一眼体验比功能清单更残酷。用户打开 MentorOS 时感到的是陪伴判断，还是后台系统？这里的取舍是删除功能，保留端到端体验和产品感；审美不是装饰，是让复杂性消失。`;
    case "taleb":
      return `Taleb-style cognitive model: 先看尾部风险和破产风险。这个项目可以反脆弱，但前提是下行有限、上行开放。用杠铃策略：一边保持极小可运行版本，一边保留长期想象；别让黑天鹅来自你自己的范围失控。`;
  }
}

function buildAgentKeyPoints(slug: AgentSlug): string[] {
  switch (slug) {
    case "munger":
      return ["失败路径", "机会成本", "激励闭环", "避免愚蠢"];
    case "duan":
      return ["用户价值", "本分", "长期做对的事", "不包装概念"];
    case "naval":
      return ["杠杆", "自由", "复利", "个人能量"];
    case "feynman":
      return ["概念澄清", "最小事实", "小实验", "不自欺"];
    case "jobs":
      return ["第一眼体验", "取舍", "产品感", "端到端"];
    case "taleb":
      return ["尾部风险", "反脆弱", "下行有限", "避免破产"];
  }
}

function buildAgentSuggestedAction(slug: AgentSlug): string {
  switch (slug) {
    case "munger":
      return "列出三个会让项目失败的行为，并先删掉其中一个。";
    case "duan":
      return "定义一个真实使用者本周会反复回来用的价值点。";
    case "naval":
      return "只保留能复利积累判断力和表达品味的部分。";
    case "feynman":
      return "把第一版缩到一个可解释、可验证的小实验。";
    case "jobs":
      return "删除会破坏第一眼体验的后台感功能。";
    case "taleb":
      return "把七天投入上限和失败退出条件写清楚。";
  }
}

function buildAgentCaution(slug: AgentSlug): string {
  switch (slug) {
    case "munger":
      return "不要把复杂度误当成进展。";
    case "duan":
      return "不要为了概念漂亮而偏离用户价值。";
    case "naval":
      return "不要让项目吞掉自由和能量。";
    case "feynman":
      return "不要用抽象词跳过事实。";
    case "jobs":
      return "不要让功能清单压过体验。";
    case "taleb":
      return "不要承担会让长期项目归零的下行。";
  }
}
