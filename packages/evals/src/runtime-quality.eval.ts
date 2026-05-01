import type { EvalIssue, EvalScore, RuntimeTrace } from "./eval-types";
import { buildEvalScore, findMatches } from "./eval-utils";

const runtimeQualityPass = 80;
const unsafeErrorSignals = [
  "api key",
  "sk-",
  "stack trace",
  "at ",
  "node_modules",
  "OPENAI_API_KEY",
  "postgres://",
  "supabase service role",
  "internal server stack"
] as const;

export function evaluateRuntimeQuality(runtimeTrace: RuntimeTrace): EvalScore {
  const issues: EvalIssue[] = [];
  let score = 100;

  if (runtimeTrace.selectedAgentCount > 4) {
    score -= 18;
    issues.push({
      id: "runtime.too-many-agents",
      severity: "warning",
      message: "Default selected Agent count is above the recommended cap of 4.",
      evidence: String(runtimeTrace.selectedAgentCount),
      suggestion: "Limit default council size and let users explicitly expand it later."
    });
  }

  if (runtimeTrace.modelCallCount > 8) {
    score -= 25;
    issues.push({
      id: "runtime.unbounded-model-calls",
      severity: "fail",
      message: "Model call count is too high for a bounded mock council session.",
      evidence: String(runtimeTrace.modelCallCount),
      suggestion: "Set explicit model call limits per turn and per council session."
    });
  } else if (runtimeTrace.modelCallCount > 4) {
    score -= 10;
    issues.push({
      id: "runtime.high-model-calls",
      severity: "warning",
      message: "Model call count is high for the default experience.",
      evidence: String(runtimeTrace.modelCallCount),
      suggestion: "Prefer a smaller default Agent set and clear orchestration budget."
    });
  }

  if (!runtimeTrace.hasStreamingStart) {
    score -= 15;
    issues.push({
      id: "runtime.no-streaming-start",
      severity: "warning",
      message: "Runtime trace lacks streaming start or thinking state.",
      suggestion: "Show an immediate thinking state before longer generation."
    });
  }

  if (!runtimeTrace.hasRetryPath) {
    score -= 15;
    issues.push({
      id: "runtime.no-retry-path",
      severity: "warning",
      message: "Runtime trace lacks a retry path after failure.",
      suggestion: "Expose a clear retry entry for interruption or generation failure."
    });
  }

  if (
    runtimeTrace.estimatedTokenBudget === undefined ||
    runtimeTrace.estimatedTokenBudget > 12000
  ) {
    score -= 12;
    issues.push({
      id: "runtime.uncontrolled-token-budget",
      severity: "warning",
      message: "Runtime trace lacks a controlled token budget.",
      evidence:
        runtimeTrace.estimatedTokenBudget === undefined
          ? "undefined"
          : String(runtimeTrace.estimatedTokenBudget),
      suggestion: "Set maximum context and output limits for each council session."
    });
  }

  if (runtimeTrace.errorMessage) {
    const unsafeMatches = findMatches(runtimeTrace.errorMessage, unsafeErrorSignals);
    if (unsafeMatches.length > 0) {
      score -= 30;
      issues.push({
        id: "runtime.unsafe-error-message",
        severity: "fail",
        message: "Error message exposes internal or sensitive implementation details.",
        evidence: unsafeMatches.join(", "),
        suggestion:
          "Use a user-facing failure state without API keys, stack traces, or internal service names."
      });
    }
  }

  return buildEvalScore(
    score,
    runtimeQualityPass,
    issues,
    "Runtime quality passes: bounded calls, visible progress, retry path, and safe errors.",
    "Runtime quality needs work: cost, latency, retry, or error-safety issues detected."
  );
}

export const runtimeQualityEval = {
  name: "runtime-quality",
  evaluate: evaluateRuntimeQuality
} as const;
