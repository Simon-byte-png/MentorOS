export type CouncilMessage = {
  id: string;
  speaker: string;
  role: "director" | "mentor" | "user";
  text: string;
};

export type MemoryItem = {
  id: string;
  category: "长期目标" | "偏好" | "项目" | "盲区";
  text: string;
  source: string;
};

export type MemoSection = {
  title: string;
  body: string;
};

export type MemoryHint = {
  id: string;
  text: string;
};

export type EmptyStateCopy = {
  title: string;
  subtitle: string;
  railText: string;
};

export type RoundtableThinker = {
  id: string;
  name: string;
  status: string;
};

export const complianceNote =
  "基于公开思想抽象出的认知模型，不代表本人观点。";

export const thinkingStatuses = [
  "正在整理上下文……",
  "正在召集认知模型……",
  "圆桌主持正在组织讨论……"
];

export const roundtableThinkers: RoundtableThinker[] = [
  {
    id: "director",
    name: "圆桌主持",
    status: "先把问题放慢"
  },
  {
    id: "munger",
    name: "芒格式认知模型",
    status: "检查代价与反面"
  },
  {
    id: "feynman",
    name: "费曼式认知模型",
    status: "寻找最小事实"
  },
  {
    id: "naval",
    name: "Naval 式认知模型",
    status: "判断长期复利"
  },
  {
    id: "taleb",
    name: "塔勒布式认知模型",
    status: "寻找脆弱点"
  },
  {
    id: "jobs",
    name: "乔布斯式认知模型",
    status: "收紧体验判断"
  }
];

export const emptyStateCopy: EmptyStateCopy = {
  title: "你现在真正纠结的问题是什么？",
  subtitle:
    "可以写得混乱一点。MentorOS 会先帮你把问题放慢，再召集合适的认知模型。",
  railText: "开始对话后，相关记忆会出现在这里"
};

export const memoryHints: MemoryHint[] = [
  {
    id: "human-tone",
    text: "你在意人味表达"
  },
  {
    id: "advanced-agent",
    text: "你希望默认高级 Agent"
  },
  {
    id: "scope-risk",
    text: "你容易把第一版项目设计得过大"
  }
];

export const demoChatMessages: CouncilMessage[] = [
  {
    id: "user-1",
    speaker: "你",
    role: "user",
    text:
      "我想把 MentorOS 做出来，但又怕它变成一个过大的系统。现在到底应该先打磨体验，还是先把 AI 和记忆底座接上？"
  },
  {
    id: "director-1",
    speaker: "圆桌主持",
    role: "director",
    text:
      "我先把这个问题放慢一点。你现在真正要判断的，不只是这个项目能不能做出来，而是它会不会把你带向一个更长期的身份：一个能把想法、产品和判断力连接起来的人。"
  },
  {
    id: "munger-1",
    speaker: "Munger-style Mentor",
    role: "mentor",
    text:
      "我会先泼一点冷水。这个项目最大的风险，可能不是技术难，而是你太喜欢“宏大系统”这个概念本身。喜欢一个概念，会让人高估用户需求，也会低估第一版的粗糙。"
  },
  {
    id: "feynman-1",
    speaker: "Feynman-style Mentor",
    role: "mentor",
    text:
      "先定义最小事实。第一版只需要证明一件事：用户输入一个混乱问题后，是否能感觉这场对话明显不同于普通 AI。如果这个都证明不了，后面的记忆、圆桌和小程序都还太早。"
  },
  {
    id: "naval-1",
    speaker: "Naval-style Mentor",
    role: "mentor",
    text:
      "这件事有复利的前提，是它能沉淀你的判断档案。每一次对话都应该让未来的系统更懂你。否则它只是一次漂亮回答。"
  },
  {
    id: "taleb-1",
    speaker: "Taleb-style Mentor",
    role: "mentor",
    text:
      "我会看它的脆弱点。你现在的计划很大，任何一个模块拖慢，都会让整个项目停下来。第一版要做成杠铃结构：核心体验极小，但保留未来扩展空间。"
  },
  {
    id: "director-2",
    speaker: "圆桌主持",
    role: "director",
    text:
      "所以这一轮先不要追求完整。先做一个 20 分钟能演示的版本：输入一个真实问题，系统召集几个视角，输出一段明显有差异的对话，并在下一轮自然记得你最在意“人味”和“记忆”。"
  }
];

export const memoryItems: MemoryItem[] = [
  {
    id: "goal-1",
    category: "长期目标",
    text:
      "用户希望把 AI 产品、工业设计和个人判断力训练结合起来，形成长期作品集。",
    source: "来自多次项目规划对话"
  },
  {
    id: "preference-1",
    category: "偏好",
    text: "用户不喜欢模板化回答，希望语言自然、有判断、有真实对话感。",
    source: "来自前端视觉方向确认"
  },
  {
    id: "project-1",
    category: "项目",
    text:
      "用户正在构思 MentorOS，核心关注多 Agent 圆桌、长期记忆和人味表达。",
    source: "来自 MentorOS 项目 brief"
  },
  {
    id: "blind-spot-1",
    category: "盲区",
    text: "用户容易把第一版项目设计得过大，需要优先验证最小体验。",
    source: "来自最近一次 roundtable 复盘"
  }
];

export const memoSections: MemoSection[] = [
  {
    title: "这次真正的问题",
    body:
      "MentorOS 第一版不是要证明完整系统能跑通，而是要证明一场有记忆、有分歧、有判断的对话，是否明显不同于普通 AI 回答。"
  },
  {
    title: "已确认事实",
    body:
      "视觉方向选择 A. Quiet Study。当前阶段只做静态前端原型，所有内容来自 mock data，不接 OpenAI、Supabase、登录或真实后端。"
  },
  {
    title: "主要分歧",
    body:
      "一个方向强调先搭完整架构，另一个方向强调先证明核心体验。当前选择后者：把体验做窄、做深、做可确认。"
  },
  {
    title: "最大风险",
    body:
      "项目概念过大，容易把第一版拖成一套工程系统，而不是一个用户能立刻感到差异的对话体验。"
  },
  {
    title: "未来 7 天行动",
    body:
      "确认静态视觉效果；用一条真实复杂问题测试对话节奏；再决定是否接入 AI 编排、记忆提取和 Supabase 持久化。"
  },
  {
    title: "复盘指标",
    body:
      "用户是否愿意继续对话；是否感到不同视角真的有分歧；是否能清楚看到系统记住了什么，并且能编辑或删除。"
  }
];
