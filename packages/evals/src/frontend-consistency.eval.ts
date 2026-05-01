import { EVAL_THRESHOLDS } from "./eval-thresholds";
import type { EvalIssue, EvalScore, TextEvalInput } from "./eval-types";
import { buildEvalScore, extractText, findMatches } from "./eval-utils";

const quietStudyPositiveSignals = [
  "black",
  "white",
  "gray",
  "grey",
  "whitespace",
  "quiet",
  "reading",
  "restrained",
  "sidebar",
  "conversation column",
  "memory hint rail",
  "minimal",
  "private intellectual space",
  "黑",
  "白",
  "灰",
  "留白",
  "安静",
  "阅读",
  "克制",
  "侧边栏",
  "对话列",
  "记忆提示",
  "极简",
  "私人思想空间"
] as const;

const quietStudyNegativeSignals = [
  "blue",
  "purple",
  "gradient",
  "dashboard",
  "colorful",
  "card wall",
  "gamification",
  "customer support bubble",
  "neon",
  "flashy",
  "cyber",
  "SaaS dashboard",
  "蓝紫渐变",
  "科技感",
  "仪表盘",
  "卡片堆叠",
  "客服气泡",
  "游戏化",
  "大面积彩色"
] as const;

export function evaluateFrontendConsistency(
  input: string | TextEvalInput
): EvalScore {
  const text = extractText(input);
  const issues: EvalIssue[] = [];
  const positiveMatches = findMatches(text, quietStudyPositiveSignals);
  const negativeMatches = findMatches(text, quietStudyNegativeSignals);
  let score = 55 + Math.min(35, positiveMatches.length * 5);

  if (negativeMatches.length > 0) {
    score -= negativeMatches.length * 12;
    issues.push({
      id: "frontend.quiet-study-violation",
      severity: negativeMatches.length >= 3 ? "fail" : "warning",
      message: "Design notes contain elements that conflict with A. Quiet Study.",
      evidence: negativeMatches.join(", "),
      suggestion:
        "Keep the interface black-white-gray, quiet, spacious, reading-oriented, and non-dashboard-like."
    });
  }

  if (positiveMatches.length < 4) {
    score -= 15;
    issues.push({
      id: "frontend.quiet-study-under-specified",
      severity: "warning",
      message: "Design notes do not strongly express the A. Quiet Study direction.",
      evidence: positiveMatches.join(", "),
      suggestion:
        "Mention core constraints such as grayscale palette, whitespace, reading feel, sidebar, and conversation column."
    });
  }

  return buildEvalScore(
    score,
    EVAL_THRESHOLDS.frontendConsistencyPass,
    issues,
    "Frontend consistency passes: design language aligns with A. Quiet Study.",
    "Frontend consistency needs work: design language drifts from A. Quiet Study."
  );
}

export const frontendConsistencyEval = {
  name: "frontend-consistency",
  evaluate: evaluateFrontendConsistency
} as const;
