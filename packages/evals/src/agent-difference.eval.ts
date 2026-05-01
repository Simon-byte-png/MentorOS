import { EVAL_THRESHOLDS } from "./eval-thresholds";
import type { AgentOutputMap, EvalIssue, EvalScore } from "./eval-types";
import {
  buildEvalScore,
  countPresentGroups,
  findMatches,
  uniqueValues
} from "./eval-utils";
import {
  agentDifferenceRubric,
  homogeneousAgentPhrases,
  type AgentId
} from "./rubrics/agent-difference-rubric";

const agentIds = ["munger", "duan", "naval", "feynman", "jobs", "taleb"] as const;

export function evaluateAgentDifference(outputs: AgentOutputMap): EvalScore {
  const issues: EvalIssue[] = [];
  let score = 100;
  const providedOutputs = agentIds.filter((agentId) => Boolean(outputs[agentId]?.trim()));

  for (const agentId of agentIds) {
    const output = outputs[agentId];

    if (!output?.trim()) {
      score -= 12;
      issues.push({
        id: `agent-difference.${agentId}.missing-output`,
        severity: "fail",
        message: `${agentDifferenceRubric[agentId].label} output is missing.`,
        suggestion: "Provide one output for every required Agent."
      });
      continue;
    }

    const signalCount = countPresentGroups(
      output,
      agentDifferenceRubric[agentId].signalGroups
    );

    if (signalCount < 2) {
      score -= 12;
      issues.push({
        id: `agent-difference.${agentId}.weak-signature`,
        severity: "fail",
        message: `${agentDifferenceRubric[agentId].label} lacks its own reasoning signature.`,
        evidence: output,
        suggestion: `Add clearer ${agentDifferenceRubric[agentId].label}-specific signals.`
      });
    } else if (signalCount < 3) {
      score -= 6;
      issues.push({
        id: `agent-difference.${agentId}.thin-signature`,
        severity: "warning",
        message: `${agentDifferenceRubric[agentId].label} has only a thin signature.`,
        suggestion: "Strengthen this Agent with one or two more distinctive reasoning moves."
      });
    }
  }

  const homogeneousAgents = providedOutputs.filter((agentId) =>
    findMatches(outputs[agentId] ?? "", homogeneousAgentPhrases).length >= 2
  );

  if (homogeneousAgents.length >= 4) {
    score -= 18;
    issues.push({
      id: "agent-difference.mvp-homogeneity",
      severity: "fail",
      message: "Too many Agents collapse into generic MVP/demo advice.",
      evidence: homogeneousAgents.join(", "),
      suggestion: "Force each Agent to reason from its own model before giving implementation advice."
    });
  } else if (homogeneousAgents.length >= 3) {
    score -= 10;
    issues.push({
      id: "agent-difference.mvp-homogeneity",
      severity: "warning",
      message: "Several Agents share generic MVP/demo language.",
      evidence: homogeneousAgents.join(", "),
      suggestion: "Reduce shared delivery phrasing and increase model-specific reasoning."
    });
  }

  const sharedSignals = findOverSharedSignals(outputs);
  if (sharedSignals.length > 0) {
    score -= sharedSignals.length * 4;
    issues.push({
      id: "agent-difference.shared-keywords",
      severity: sharedSignals.length >= 3 ? "fail" : "warning",
      message: "Three or more Agents share too many keywords.",
      evidence: sharedSignals.join(", "),
      suggestion: "Make each Agent's language and reasoning moves more distinct."
    });
  }

  return buildEvalScore(
    score,
    EVAL_THRESHOLDS.agentDifferencePass,
    issues,
    "Agent difference passes: outputs show distinct reasoning signatures.",
    "Agent difference needs work: outputs are missing, thin, or too homogeneous."
  );
}

function findOverSharedSignals(outputs: AgentOutputMap): string[] {
  const signalOwners = new Map<string, AgentId[]>();

  for (const agentId of agentIds) {
    const output = outputs[agentId] ?? "";
    const signals = uniqueValues(
      Object.values(agentDifferenceRubric)
        .flatMap((rubric) => rubric.signalGroups)
        .flatMap((group) => findMatches(output, group))
    );

    for (const signal of signals) {
      const current = signalOwners.get(signal) ?? [];
      signalOwners.set(signal, [...current, agentId]);
    }
  }

  return [...signalOwners.entries()]
    .filter(([, owners]) => owners.length >= 3)
    .map(([signal]) => signal);
}

export const agentDifferenceEval = {
  name: "agent-difference",
  evaluate: evaluateAgentDifference
} as const;
