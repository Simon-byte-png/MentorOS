import sampleAgentCardSnapshot from "./fixtures/sample-agent-card-snapshot.json";
import sampleAgentOutputs from "./fixtures/sample-agent-outputs.json";
import sampleConversation from "./fixtures/sample-conversation.json";
import samplePrompts from "./fixtures/sample-prompts.json";
import sampleRuntimeTraces from "./fixtures/sample-runtime-traces.json";
import { evaluateAgentCardQuality } from "./agent-card-quality.eval";
import { evaluateAgentDifference } from "./agent-difference.eval";
import { evaluateFrontendConsistency } from "./frontend-consistency.eval";
import { evaluateHumanTone } from "./human-tone.eval";
import { evaluateMemoryQuality } from "./memory-quality.eval";
import { evaluateMemoryRecall } from "./memory-recall.eval";
import { evaluateRuntimeQuality } from "./runtime-quality.eval";
import { evaluateSafety } from "./safety.eval";
import type { AgentOutputMap, EvalScore, RuntimeTrace } from "./eval-types";

export * from "./eval-types";
export * from "./eval-thresholds";
export * from "./agent-card-quality.eval";
export * from "./run-agent-card-eval";
export * from "./human-tone.eval";
export * from "./agent-difference.eval";
export * from "./memory-recall.eval";
export * from "./memory-quality.eval";
export * from "./safety.eval";
export * from "./frontend-consistency.eval";
export * from "./runtime-quality.eval";
export * from "./rubrics/human-tone-rubric";
export * from "./rubrics/agent-difference-rubric";
export * from "./rubrics/memory-rubric";

export interface MockEvalRun {
  passed: boolean;
  results: {
    humanTone: EvalScore;
    agentDifference: EvalScore;
    memoryRecall: EvalScore;
    memoryQuality: EvalScore;
    safety: EvalScore;
    frontendConsistency: EvalScore;
    runtimeQuality: EvalScore;
    agentCardQuality: EvalScore;
  };
}

export function runMockEvals(): MockEvalRun {
  const memoryRecallOutput = sampleConversation.messages[2]?.content ?? "";
  const memoryCandidate = sampleConversation.extractedMemories[0];
  const safeOutput = sampleAgentOutputs.outputs.munger;

  const results = {
    humanTone: evaluateHumanTone(samplePrompts.mockOutputs.humanToneGood, {
      prompt: samplePrompts.projectDecision[0]
    }),
    agentDifference: evaluateAgentDifference(
      sampleAgentOutputs.outputs as AgentOutputMap
    ),
    memoryRecall: evaluateMemoryRecall(memoryRecallOutput, {
      conversation: sampleConversation.messages
    }),
    memoryQuality: evaluateMemoryQuality(memoryCandidate),
    safety: evaluateSafety(safeOutput, {
      allowedMode: "cognitive-model"
    }),
    frontendConsistency: evaluateFrontendConsistency(
      samplePrompts.mockOutputs.frontendGood
    ),
    runtimeQuality: evaluateRuntimeQuality(
      sampleRuntimeTraces.good as RuntimeTrace
    ),
    agentCardQuality: evaluateAgentCardQuality(sampleAgentCardSnapshot)
  };

  return {
    passed: Object.values(results).every((result) => result.passed),
    results
  };
}
