import { createMockProvider } from "./providers/mock-provider";
import { selectModelForPurpose } from "./providers/model-router";
import type {
  ConversationContext,
  CouncilRunResult,
  DecisionMemoOutput,
  DialogueDirectorOutput,
  RuntimeGenerationOptions
} from "./structured-schemas";

export interface DecisionMemoInput {
  context: ConversationContext;
  council: CouncilRunResult;
  dialogue: DialogueDirectorOutput;
}

export async function generateDecisionMemo(
  input: DecisionMemoInput,
  options: RuntimeGenerationOptions = {}
): Promise<DecisionMemoOutput> {
  const provider = options.provider ?? createMockProvider();
  const model = selectModelForPurpose("decision_memo", {
    modelPlan: options.modelPlan,
    provider: options.providerName,
    costSensitive: options.costSensitive,
    qualityMode: options.qualityMode
  });
  const title = "MentorOS 第一版范围决策";
  const questionRestatement =
    "是否继续把 MentorOS 当作长期项目推进，同时把第一版缩到时间和技术都可承受的范围。";
  const confirmedFacts = [
    "用户想把 MentorOS 做成长期项目。",
    "用户担心范围太大、时间不够、技术准备不足。",
    "当前阶段只允许 mock pipeline，不接真实 LLM 或 Supabase。"
  ];
  const assumptions = [
    "第一版的目标是验证对话质量，不是完成完整生产系统。",
    "长期价值来自持续使用和判断复利，而不是一次性功能数量。"
  ];
  const disagreements = input.council.agentOutputs.map(
    (output) => `${output.displayName}: ${output.caution}`
  );
  const risks = [
    "范围继续膨胀会让长期项目过早失去节奏。",
    "如果第一眼体验像后台报告，人味和记忆价值会被削弱。",
    "技术准备不足时接真实 provider 会制造成本和安全风险。"
  ];
  const suggestedActions = [
    "把第一版限制为输入、相关记忆、最多四个认知模型、自然对话、记忆候选、决策备忘录。",
    "保持 DeepSeek-first provider abstraction，但本轮只走 mock。",
    "用 eval 分数作为质量闸门，不把安全失败当作成功。"
  ];
  const sevenDayPlan = [
    "Day 1: 固定 pipeline 类型和 mock provider。",
    "Day 2: 跑通 council、director、memory、memo。",
    "Day 3: 接 eval wrapper 并修 mock 输出质量。",
    "Day 4: 写 smoke test 和 runtime usage summary。",
    "Day 5: 预留 /chat 接入接口形状。",
    "Day 6: 清理边界和 warnings。",
    "Day 7: 用真实对话样本复盘第一版是否过大。"
  ];
  const reviewMetrics = [
    "humanTone score >= eval threshold",
    "safety passed",
    "agentDifference passed",
    "memoryQuality passed for first candidate",
    "runtimeQuality passed with selectedAgentCount <= 4"
  ];
  const markdown = buildMarkdown({
    title,
    questionRestatement,
    confirmedFacts,
    assumptions,
    disagreements,
    risks,
    suggestedActions,
    sevenDayPlan,
    reviewMetrics
  });
  const call = await provider.callText(
    [
      {
        role: "system",
        content: "Generate a concise MentorOS decision memo. Do not call external APIs."
      },
      {
        role: "user",
        content: input.context.userMessage
      }
    ],
    { purpose: "decision_memo", model }
  );

  return {
    title,
    questionRestatement,
    confirmedFacts,
    assumptions,
    disagreements,
    risks,
    suggestedActions,
    sevenDayPlan,
    reviewMetrics,
    markdown,
    usage: {
      ...call.usage,
      model
    }
  };
}

function buildMarkdown(memo: Omit<DecisionMemoOutput, "usage" | "markdown">): string {
  return [
    `# ${memo.title}`,
    "",
    `## Question`,
    memo.questionRestatement,
    "",
    formatList("Confirmed Facts", memo.confirmedFacts),
    formatList("Assumptions", memo.assumptions),
    formatList("Disagreements", memo.disagreements),
    formatList("Risks", memo.risks),
    formatList("Suggested Actions", memo.suggestedActions),
    formatList("Seven Day Plan", memo.sevenDayPlan),
    formatList("Review Metrics", memo.reviewMetrics)
  ].join("\n");
}

function formatList(title: string, items: string[]): string {
  return [`## ${title}`, ...items.map((item) => `- ${item}`), ""].join("\n");
}
