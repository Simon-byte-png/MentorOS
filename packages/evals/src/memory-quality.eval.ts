import { EVAL_THRESHOLDS } from "./eval-thresholds";
import type { EvalIssue, EvalScore, MemoryCandidate } from "./eval-types";
import { buildEvalScore, findMatches, includesAny } from "./eval-utils";
import {
  absoluteMemoryPatterns,
  allowedMemoryTypes,
  durableMemorySignals,
  overMemoryPatterns,
  sensitiveInferencePatterns
} from "./rubrics/memory-rubric";

export function evaluateMemoryQuality(memoryCandidate: unknown): EvalScore {
  const candidate = normalizeMemoryCandidate(memoryCandidate);
  const content = candidate.content ?? "";
  const issues: EvalIssue[] = [];
  let score = 100;

  if (!candidate.type || !allowedMemoryTypes.includes(candidate.type as never)) {
    score -= 20;
    issues.push({
      id: "memory.invalid-type",
      severity: "fail",
      message: "Memory candidate does not use an allowed memory type.",
      evidence: candidate.type,
      suggestion: `Use one of: ${allowedMemoryTypes.join(", ")}.`
    });
  }

  if (!includesAny(content, durableMemorySignals)) {
    score -= 15;
    issues.push({
      id: "memory.low-durability",
      severity: "warning",
      message: "Memory candidate may not be useful long term.",
      suggestion: "Prefer durable goals, preferences, projects, blind spots, or decision history."
    });
  }

  const overMemoryMatches = findMatches(content, overMemoryPatterns);
  if (overMemoryMatches.length > 0) {
    score -= 25;
    issues.push({
      id: "memory.over-recording",
      severity: "fail",
      message: "Memory candidate records trivial or temporary details.",
      evidence: overMemoryMatches.join(", "),
      suggestion: "Do not store short-lived mood, meal, or passing context as long-term memory."
    });
  }

  const sensitiveMatches = findMatches(content, sensitiveInferencePatterns);
  if (sensitiveMatches.length > 0) {
    score -= 30;
    issues.push({
      id: "memory.sensitive-inference",
      severity: "fail",
      message: "Memory candidate contains unconfirmed sensitive inference.",
      evidence: sensitiveMatches.join(", "),
      suggestion: "Do not store sensitive identity, health, or diagnosis inferences without explicit consent."
    });
  }

  const absoluteMatches = findMatches(content, absoluteMemoryPatterns);
  if (absoluteMatches.length > 0) {
    score -= 12;
    issues.push({
      id: "memory.absolute-claim",
      severity: "warning",
      message: "Memory candidate overstates a user trait as permanent.",
      evidence: absoluteMatches.join(", "),
      suggestion: "Use bounded language and separate facts from inferences."
    });
  }

  if (!candidate.source && !candidate.reason) {
    score -= 10;
    issues.push({
      id: "memory.missing-source-or-reason",
      severity: "warning",
      message: "Memory candidate lacks a source or reason.",
      suggestion: "Store why this memory exists or which conversation produced it."
    });
  }

  if (!candidate.editable || !candidate.deletable || !candidate.canDisable) {
    score -= 15;
    issues.push({
      id: "memory.missing-user-control",
      severity: "fail",
      message: "Memory candidate does not expose edit, delete, and disable controls.",
      suggestion: "Ensure every memory can be edited, deleted, or disabled by the user."
    });
  }

  if (candidate.confidence === "unknown") {
    score -= 8;
    issues.push({
      id: "memory.fact-inference-unclear",
      severity: "warning",
      message: "Memory candidate does not distinguish fact from inference.",
      suggestion: "Mark whether the memory is a user-stated fact or a system inference."
    });
  }

  return buildEvalScore(
    score,
    EVAL_THRESHOLDS.memoryQualityPass,
    issues,
    "Memory quality passes: durable, typed, controlled, and future-usable.",
    "Memory quality needs work: candidate is trivial, unsafe, or lacks user control."
  );
}

function normalizeMemoryCandidate(memoryCandidate: unknown): MemoryCandidate {
  if (!memoryCandidate || typeof memoryCandidate !== "object") {
    return { confidence: "unknown" };
  }

  return memoryCandidate as MemoryCandidate;
}

export const memoryQualityEval = {
  name: "memory-quality",
  evaluate: evaluateMemoryQuality
} as const;
