import type { AgentOutputMap } from "../eval-types";

export type AgentId = keyof AgentOutputMap;

export const agentDifferenceRubric: Record<
  AgentId,
  {
    label: string;
    signalGroups: readonly (readonly string[])[];
  }
> = {
  munger: {
    label: "Munger",
    signalGroups: [
      ["失败", "fail", "failure"],
      ["机会成本", "opportunity cost"],
      ["激励", "incentive"],
      ["避坑", "坑", "avoid"],
      ["反向", "inversion", "invert"],
      ["心理误判", "误判", "misjudgment"]
    ]
  },
  duan: {
    label: "Duan",
    signalGroups: [
      ["用户价值", "user value"],
      ["本分"],
      ["商业模式", "business model"],
      ["长期做对的事", "做对的事"],
      ["简单常识", "常识"],
      ["不包装概念", "不包装"]
    ]
  },
  naval: {
    label: "Naval",
    signalGroups: [
      ["杠杆", "leverage"],
      ["自由", "freedom"],
      ["复利", "compounding", "compound"],
      ["specific knowledge"],
      ["accountability", "责任"],
      ["个人能量", "energy"]
    ]
  },
  feynman: {
    label: "Feynman",
    signalGroups: [
      ["概念", "concept"],
      ["最小事实", "minimum fact"],
      ["实验", "experiment"],
      ["证明", "prove", "proof"],
      ["简单解释", "explain simply"],
      ["不自欺", "self-deception"]
    ]
  },
  jobs: {
    label: "Jobs",
    signalGroups: [
      ["第一眼", "first impression"],
      ["体验", "experience"],
      ["审美", "taste"],
      ["取舍", "tradeoff"],
      ["删除功能", "delete features", "删功能"],
      ["产品感"],
      ["端到端", "end-to-end"]
    ]
  },
  taleb: {
    label: "Taleb",
    signalGroups: [
      ["尾部风险", "tail risk"],
      ["黑天鹅", "black swan"],
      ["反脆弱", "antifragile"],
      ["下行有限", "limited downside"],
      ["上行开放", "open upside"],
      ["杠铃", "barbell"],
      ["破产风险", "ruin risk"]
    ]
  }
} as const;

export const homogeneousAgentPhrases = [
  "先做 MVP",
  "做 MVP",
  "最小可行产品",
  "先做 demo",
  "用户反馈",
  "快速迭代",
  "建议先"
] as const;
