import type { EvalIssue, EvalScore } from "./eval-types";

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function buildEvalScore(
  score: number,
  passThreshold: number,
  issues: EvalIssue[],
  passedSummary: string,
  failedSummary: string
): EvalScore {
  const normalized = clampScore(score);
  const hasFailIssue = issues.some((issue) => issue.severity === "fail");

  return {
    score: normalized,
    passed: normalized >= passThreshold && !hasFailIssue,
    issues,
    summary:
      normalized >= passThreshold && !hasFailIssue
        ? passedSummary
        : failedSummary
  };
}

export function includesAny(text: string, patterns: readonly string[]): boolean {
  const normalized = text.toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern.toLowerCase()));
}

export function findMatches(text: string, patterns: readonly string[]): string[] {
  const normalized = text.toLowerCase();
  return patterns.filter((pattern) => normalized.includes(pattern.toLowerCase()));
}

export function countMatches(text: string, patterns: readonly string[]): number {
  return findMatches(text, patterns).length;
}

export function countPresentGroups(
  text: string,
  groups: readonly (readonly string[])[]
): number {
  return groups.filter((group) => includesAny(text, group)).length;
}

export function extractText(input: string | { output: string }): string {
  return typeof input === "string" ? input : input.output;
}

export function uniqueValues(values: readonly string[]): string[] {
  return [...new Set(values)];
}
