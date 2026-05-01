import { EVAL_THRESHOLDS } from "./eval-thresholds";
import type { EvalIssue, EvalScore } from "./eval-types";
import {
  buildEvalScore,
  countPresentGroups,
  findMatches,
  includesAny
} from "./eval-utils";
import {
  followUpSignals,
  humanToneDimensions,
  humanToneTemplatePhrases,
  judgmentSignals,
  naturalLanguageSignals,
  oilyEncouragementPhrases,
  realTensionSignalGroups,
  userContextSignals
} from "./rubrics/human-tone-rubric";

export function evaluateHumanTone(
  output: string,
  context: Record<string, unknown> = {}
): EvalScore {
  const issues: EvalIssue[] = [];
  let score = 0;

  const templateMatches = findMatches(output, humanToneTemplatePhrases);
  const oilyMatches = findMatches(output, oilyEncouragementPhrases);
  const tensionGroups = countPresentGroups(output, realTensionSignalGroups);
  const hasFollowUp = includesAny(output, followUpSignals);
  const hasJudgment = includesAny(output, judgmentSignals);
  const hasNaturalLanguage = includesAny(output, naturalLanguageSignals);
  const hasUserContext =
    includesAny(output, userContextSignals) || Object.keys(context).length > 0;

  score += hasNaturalLanguage
    ? humanToneDimensions.naturalLanguage.weight
    : humanToneDimensions.naturalLanguage.weight * 0.4;

  score +=
    (tensionGroups / realTensionSignalGroups.length) *
    humanToneDimensions.realTensionRecognition.weight;

  score += hasJudgment ? humanToneDimensions.judgment.weight : 0;
  score += hasFollowUp ? humanToneDimensions.followUpQuestion.weight : 0;
  score += hasUserContext ? humanToneDimensions.userContextRelevance.weight : 0;
  score +=
    templateMatches.length === 0
      ? humanToneDimensions.antiTemplate.weight
      : Math.max(0, humanToneDimensions.antiTemplate.weight - templateMatches.length * 5);
  score +=
    oilyMatches.length === 0
      ? humanToneDimensions.antiOilyEncouragement.weight
      : Math.max(
          0,
          humanToneDimensions.antiOilyEncouragement.weight - oilyMatches.length * 5
        );

  if (templateMatches.length >= 3) {
    issues.push({
      id: "human-tone.template-cadence",
      severity: "fail",
      message: "Output uses too many report-template phrases.",
      evidence: templateMatches.join(", "),
      suggestion: "Use a more conversational structure with fewer list/report markers."
    });
  } else if (templateMatches.length > 0) {
    issues.push({
      id: "human-tone.template-cadence",
      severity: "warning",
      message: "Output contains report-template phrasing.",
      evidence: templateMatches.join(", "),
      suggestion: "Replace formulaic sequencing with direct conversational judgment."
    });
  }

  if (!hasFollowUp) {
    issues.push({
      id: "human-tone.missing-follow-up",
      severity: "warning",
      message: "Output does not ask a useful follow-up question.",
      suggestion: "Ask one sharp question that helps decide the next step."
    });
  }

  if (tensionGroups < 3) {
    issues.push({
      id: "human-tone.shallow-tension",
      severity: "warning",
      message:
        "Output does not fully recognize the user's combined project, time, transfer, coursework, and long-term-work tension.",
      suggestion:
        "Name the tension between scope, time, academic pressure, and desire for a durable project."
    });
  }

  if (!hasJudgment) {
    issues.push({
      id: "human-tone.no-judgment",
      severity: "warning",
      message: "Output lacks a clear judgment or tradeoff.",
      suggestion: "Make one concrete call about what to cut, prove, or avoid."
    });
  }

  if (oilyMatches.length > 0) {
    issues.push({
      id: "human-tone.oily-encouragement",
      severity: oilyMatches.length >= 2 ? "fail" : "warning",
      message: "Output uses hollow motivational encouragement.",
      evidence: oilyMatches.join(", "),
      suggestion: "Replace generic encouragement with specific, grounded support."
    });
  }

  return buildEvalScore(
    score,
    EVAL_THRESHOLDS.humanTonePass,
    issues,
    "Human tone passes: conversational, grounded, and judgment-bearing.",
    "Human tone needs work: output is too generic, templated, or under-contextualized."
  );
}

export const humanToneEval = {
  name: "human-tone",
  evaluate: evaluateHumanTone
} as const;
