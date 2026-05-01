import type {
  AgentSelectionResult,
  AgentSlug,
  CouncilRole,
  SelectedAgent
} from "./agent-types";
import { getAgentBySlug } from "./agent-registry";

type TopicPreset = {
  name: string;
  keywords: string[];
  agents: AgentSlug[];
  reason: string;
};

const DEFAULT_AGENTS: AgentSlug[] = ["munger", "feynman", "naval", "taleb"];

const TOPIC_PRESETS: TopicPreset[] = [
  {
    name: "product",
    keywords: ["产品", "体验", "ux", "frontend", "前端", "审美", "product", "design", "界面", "第一感觉"],
    agents: ["jobs", "feynman", "munger", "taleb"],
    reason: "产品体验问题需要 Jobs 编辑体验、Feynman 澄清机制、Munger 检查取舍、Taleb 审视脆弱性。"
  },
  {
    name: "business",
    keywords: ["商业", "创业", "公司", "长期项目", "business", "startup", "增长", "商业模式"],
    agents: ["munger", "duan", "naval", "taleb"],
    reason: "商业和长期项目需要机会成本、用户价值、杠杆复利和尾部风险四个角度。"
  },
  {
    name: "career",
    keywords: ["职业", "人生方向", "选择", "自由", "career", "life", "工作", "长期人生"],
    agents: ["naval", "munger", "feynman", "taleb"],
    reason: "人生选择需要自由和复利视角，同时用事实澄清与风险边界约束冲动。"
  },
  {
    name: "writing",
    keywords: ["写作", "表达", "内容", "文章", "叙事", "writing", "content", "传播"],
    agents: ["jobs", "feynman", "naval", "munger"],
    reason: "表达问题需要体验感、清晰解释、可复利传播和现实判断。"
  },
  {
    name: "research",
    keywords: ["研究", "学术", "概念", "原理", "证明", "实验", "research", "academic", "theory"],
    agents: ["feynman", "munger", "taleb", "naval"],
    reason: "研究和概念理解需要先澄清事实，再检查模型、风险和长期可积累知识。"
  },
  {
    name: "emotional",
    keywords: ["纠结", "焦虑", "冲动", "情绪", "担心", "害怕", "犹豫", "不知道怎么办"],
    agents: ["munger", "taleb", "feynman", "naval"],
    reason: "情绪化决策需要先降噪、看下行风险、澄清事实，再回到长期自由。"
  }
];

const MANDATORY_RULES: Array<{
  slug: AgentSlug;
  keywords: string[];
  reason: string;
}> = [
  { slug: "duan", keywords: ["用户价值", "本分", "商业模式"], reason: "命中用户价值/本分/商业模式，需要 Duan 做价值检查。" },
  { slug: "jobs", keywords: ["体验", "审美", "第一感觉", "产品感"], reason: "命中体验/审美/产品感，需要 Jobs 做产品编辑。" },
  { slug: "taleb", keywords: ["不确定性", "风险", "失败", "黑天鹅"], reason: "命中不确定性/风险/失败，需要 Taleb 做风险守门。" },
  { slug: "naval", keywords: ["自由", "杠杆", "复利", "长期人生"], reason: "命中自由/杠杆/复利，需要 Naval 做长期策略判断。" },
  { slug: "feynman", keywords: ["概念", "原理", "实验", "证明"], reason: "命中概念/原理/实验/证明，需要 Feynman 做澄清。" },
  { slug: "munger", keywords: ["机会成本", "激励", "避坑", "长期判断"], reason: "命中机会成本/激励/避坑，需要 Munger 做现实判断。" }
];

const ROLE_FALLBACK: Record<AgentSlug, CouncilRole> = {
  munger: "primary_judge",
  duan: "value_checker",
  naval: "long_term_strategist",
  feynman: "clarifier",
  jobs: "product_editor",
  taleb: "risk_guardian"
};

const SKEPTICAL_PRIORITY: AgentSlug[] = ["taleb", "munger", "feynman", "duan", "jobs", "naval"];

export function selectAgentsForConversation(input: string): AgentSelectionResult {
  const text = input.toLowerCase();
  const matchedPresets = TOPIC_PRESETS.filter((preset) => hasAnyKeyword(text, preset.keywords));
  const preset = matchedPresets[0];
  const baseAgents = preset?.agents ?? DEFAULT_AGENTS;
  const reasons = new Map<AgentSlug, string>();

  for (const slug of baseAgents) {
    reasons.set(slug, preset?.reason ?? "默认圆桌组合覆盖判断、澄清、长期策略和风险守门。");
  }

  const mandatoryHits = MANDATORY_RULES.filter((rule) => hasAnyKeyword(text, rule.keywords));
  for (const hit of mandatoryHits) {
    reasons.set(hit.slug, hit.reason);
  }

  const shouldEscalateToFullCouncil =
    hasAnyKeyword(text, ["全员", "六个", "完整圆桌", "full council", "所有 agent"]) ||
    matchedPresets.length >= 3 ||
    (mandatoryHits.length >= 4 && hasAnyKeyword(text, ["高风险", "重大", "不可逆", "融资", "离职", "all in"]));

  const ranked = rankAgents([...reasons.keys()], baseAgents, mandatoryHits.map((hit) => hit.slug));
  const selectedSlugs = ranked.slice(0, 4);
  const missingPerspective = ranked
    .slice(4)
    .map((slug) => `${slug}: ${reasons.get(slug) ?? "该视角被命中，但默认上限为四个 Agent。"}`);

  const primaryAgent = selectedSlugs[0] ?? "munger";
  const skepticalAgent = pickSkepticalAgent(selectedSlugs);
  const councilMode = inferCouncilMode(text, matchedPresets.map((item) => item.name));

  // If shouldEscalateToFullCouncil is true, downstream orchestration may expand beyond selectedAgents.
  // We still return a concrete capped frontstage set so the caller can render a stable default.
  const selectedAgents: SelectedAgent[] = selectedSlugs.map((slug, index) => {
    const card = getAgentBySlug(slug);
    const roleInCouncil = card?.defaultCouncilRoles[0] ?? ROLE_FALLBACK[slug];
    return {
      slug,
      reason: reasons.get(slug) ?? "默认入选，用于补足圆桌的认知覆盖。",
      priority: index + 1,
      roleInCouncil
    };
  });

  return {
    selectedAgents,
    primaryAgent,
    skepticalAgent,
    missingPerspective,
    selectionReason: buildSelectionReason(preset, mandatoryHits.length, shouldEscalateToFullCouncil),
    councilMode,
    shouldEscalateToFullCouncil
  };
}

export function selectAgentsForPrototype() {
  return selectAgentsForConversation("").selectedAgents.map((agent) => agent.slug);
}

function hasAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function rankAgents(slugs: AgentSlug[], baseAgents: AgentSlug[], mandatorySlugs: AgentSlug[]): AgentSlug[] {
  const unique = [...new Set(slugs)];
  return unique.sort((left, right) => {
    const leftMandatory = mandatorySlugs.includes(left) ? 0 : 1;
    const rightMandatory = mandatorySlugs.includes(right) ? 0 : 1;
    if (leftMandatory !== rightMandatory) return leftMandatory - rightMandatory;

    const leftBase = baseAgents.indexOf(left);
    const rightBase = baseAgents.indexOf(right);
    const normalizedLeftBase = leftBase === -1 ? 99 : leftBase;
    const normalizedRightBase = rightBase === -1 ? 99 : rightBase;
    if (normalizedLeftBase !== normalizedRightBase) return normalizedLeftBase - normalizedRightBase;

    return DEFAULT_AGENTS.indexOf(left) - DEFAULT_AGENTS.indexOf(right);
  });
}

function pickSkepticalAgent(selectedSlugs: AgentSlug[]): AgentSlug {
  return SKEPTICAL_PRIORITY.find((slug) => selectedSlugs.includes(slug)) ?? selectedSlugs[0] ?? "munger";
}

function inferCouncilMode(
  text: string,
  presetNames: string[]
): AgentSelectionResult["councilMode"] {
  if (hasAnyKeyword(text, ["概念", "原理", "证明", "实验", "为什么", "学术"]) || presetNames.includes("research")) {
    return "diagnostic";
  }
  if (hasAnyKeyword(text, ["评审", "review", "计划", "方案", "决策", "风险", "是否应该"])) {
    return "review";
  }
  if (hasAnyKeyword(text, ["还是", "取舍", "冲突", "辩论", "tradeoff", "一方面"])) {
    return "debate";
  }
  if (presetNames.includes("emotional")) {
    return "quiet";
  }
  return "review";
}

function buildSelectionReason(
  preset: TopicPreset | undefined,
  mandatoryHitCount: number,
  shouldEscalateToFullCouncil: boolean
): string {
  const base = preset?.reason ?? "未命中特定主题，使用默认四人圆桌覆盖判断、澄清、长期策略和风险守门。";
  const mandatory = mandatoryHitCount > 0 ? ` 另有 ${mandatoryHitCount} 个强制关键词视角被加入或记录。` : "";
  const escalation = shouldEscalateToFullCouncil ? " 问题复杂度较高，可由下游编排升级为完整六人圆桌。" : "";
  return `${base}${mandatory}${escalation}`;
}
