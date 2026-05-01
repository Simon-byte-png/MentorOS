import { EVAL_THRESHOLDS } from "./eval-thresholds";
import type { EvalIssue, EvalScore } from "./eval-types";
import { buildEvalScore, findMatches, includesAny } from "./eval-utils";

const naturalRecallSignals = [
  "你前面一直强调",
  "这和你之前担心的点连在一起",
  "你上次对 MentorOS 的要求",
  "你之前提到",
  "前面说的",
  "一直在意"
] as const;

const forbiddenRecallPhrases = [
  "根据你的记忆",
  "系统记录显示",
  "你的用户画像表明",
  "数据库中显示你喜欢",
  "根据历史上下文，我知道你"
] as const;

const fixtureAllowedFacts = [
  "浙江大学",
  "浙大",
  "AI 产品",
  "工业设计",
  "长期判断力",
  "MentorOS",
  "自然",
  "判断",
  "真实对话感",
  "模板化",
  "第一版",
  "项目设计过大",
  "人味",
  "长期记忆",
  "默认高级 Agent",
  "记忆"
] as const;

const suspiciousInventedFacts = [
  "实习",
  "家庭",
  "创业公司",
  "融资",
  "心理疾病",
  "收入",
  "年龄",
  "导师",
  "绩点",
  "GPA",
  "女朋友",
  "男朋友"
] as const;

const certaintyFromInference = [
  "我知道你一定",
  "你必然",
  "你肯定",
  "你永远",
  "显然你",
  "毫无疑问你"
] as const;

export function evaluateMemoryRecall(
  output: string,
  context: Record<string, unknown> = {}
): EvalScore {
  const issues: EvalIssue[] = [];
  let score = 100;

  const naturalMatches = findMatches(output, naturalRecallSignals);
  const forbiddenMatches = findMatches(output, forbiddenRecallPhrases);
  const inventedMatches = findMatches(output, suspiciousInventedFacts);
  const certaintyMatches = findMatches(output, certaintyFromInference);
  const hasAllowedFact = includesAny(output, fixtureAllowedFacts);

  if (naturalMatches.length === 0) {
    score -= 25;
    issues.push({
      id: "memory-recall.no-natural-recall",
      severity: "warning",
      message: "Output does not naturally refer back to prior preferences.",
      suggestion: "Recall prior preferences conversationally, without exposing memory machinery."
    });
  } else {
    score += Math.min(5, naturalMatches.length * 2);
  }

  if (forbiddenMatches.length > 0) {
    score -= forbiddenMatches.length * 18;
    issues.push({
      id: "memory-recall.database-flavored",
      severity: forbiddenMatches.length >= 2 ? "fail" : "warning",
      message: "Output exposes memory as database/user-profile machinery.",
      evidence: forbiddenMatches.join(", "),
      suggestion: "Use natural phrasing like a thoughtful conversation partner."
    });
  }

  if (!hasAllowedFact && Object.keys(context).length === 0) {
    score -= 15;
    issues.push({
      id: "memory-recall.no-fixture-fact",
      severity: "warning",
      message: "Output does not recall any known fixture fact.",
      suggestion: "Refer only to known preferences such as human tone, memory, or overscoped v1."
    });
  }

  if (inventedMatches.length > 0) {
    score -= inventedMatches.length * 20;
    issues.push({
      id: "memory-recall.invented-user-fact",
      severity: "fail",
      message: "Output appears to introduce user facts not present in the fixture.",
      evidence: inventedMatches.join(", "),
      suggestion: "Only reference facts present in the current conversation or approved memory."
    });
  }

  if (certaintyMatches.length > 0) {
    score -= certaintyMatches.length * 15;
    issues.push({
      id: "memory-recall.inference-as-fact",
      severity: "fail",
      message: "Output states a guess about the user as a certainty.",
      evidence: certaintyMatches.join(", "),
      suggestion: "Phrase uncertain claims as hypotheses or ask a clarifying question."
    });
  }

  return buildEvalScore(
    score,
    EVAL_THRESHOLDS.memoryRecallPass,
    issues,
    "Memory recall passes: prior preferences are recalled naturally and safely.",
    "Memory recall needs work: recall is stiff, database-like, or unsupported."
  );
}

export const memoryRecallEval = {
  name: "memory-recall",
  evaluate: evaluateMemoryRecall
} as const;
