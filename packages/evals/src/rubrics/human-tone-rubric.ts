export const humanToneDimensions = {
  naturalLanguage: {
    weight: 15,
    description: "Natural language with pauses and conversational texture."
  },
  realTensionRecognition: {
    weight: 20,
    description:
      "Recognizes the real tension behind project scope, time, transfer-major pressure, coursework, and a desire to build something durable."
  },
  judgment: {
    weight: 15,
    description: "Offers a clear judgment instead of only neutral analysis."
  },
  followUpQuestion: {
    weight: 10,
    description: "Asks one useful question that can move the next turn forward."
  },
  userContextRelevance: {
    weight: 15,
    description: "Uses known user background, goals, or preferences without feeling forced."
  },
  antiTemplate: {
    weight: 15,
    description: "Avoids report-like cadence and generic consulting structure."
  },
  antiOilyEncouragement: {
    weight: 10,
    description: "Avoids hollow encouragement and motivational filler."
  }
} as const;

export const humanToneTemplatePhrases = [
  "首先",
  "其次",
  "最后",
  "以下是详细分析",
  "综上所述",
  "我将从以下几个方面",
  "表格如下",
  "建议你制定计划并坚持执行"
] as const;

export const oilyEncouragementPhrases = [
  "你一定可以",
  "加油",
  "相信自己",
  "只要努力就会成功",
  "这是一个非常棒的想法"
] as const;

export const realTensionSignalGroups = [
  ["项目太大", "做太大", "范围太大", "scope", "overscope", "过大"],
  ["时间不够", "时间有限", "有限时间", "time"],
  ["转专业", "transfer"],
  ["课程", "课业", "coursework"],
  ["长期作品", "长期", "长期主义", "durable", "compound", "作品"]
] as const;

export const judgmentSignals = [
  "不应该",
  "应该",
  "我会",
  "更重要",
  "真正",
  "风险",
  "盲区",
  "取舍",
  "先砍",
  "先证明",
  "不要"
] as const;

export const followUpSignals = ["？", "?", "我想先问", "你要回答"] as const;

export const userContextSignals = [
  "浙大",
  "浙江大学",
  "MentorOS",
  "AI 产品",
  "工业设计",
  "长期判断力",
  "人味",
  "记忆",
  "模板"
] as const;

export const naturalLanguageSignals = [
  "其实",
  "我会先",
  "这里",
  "这不是",
  "先别",
  "有点",
  "我担心",
  "换句话说"
] as const;
