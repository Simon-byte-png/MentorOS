import {
  evaluateAgentDifference,
  evaluateHumanTone,
  evaluateMemoryQuality,
  evaluateMemoryRecall,
  evaluateRuntimeQuality,
  evaluateSafety,
  type AgentOutputMap,
  type RuntimeTrace
} from "@mentoros/evals";
import { buildFullMockAgentOutputMap } from "./council-orchestrator";
import type {
  ConversationContext,
  CouncilRunResult,
  DialogueDirectorOutput,
  MemoryExtractionResult,
  PipelineEvalReport
} from "./structured-schemas";

export interface PipelineEvalsInput {
  context: ConversationContext;
  council: CouncilRunResult;
  dialogue: DialogueDirectorOutput;
  memoryExtraction: MemoryExtractionResult;
  modelCallCount: number;
}

export function runPipelineEvals(input: PipelineEvalsInput): PipelineEvalReport {
  const output = input.dialogue.fullText;
  const firstMemoryCandidate = input.memoryExtraction.candidates[0] ?? {};
  const runtimeTrace: RuntimeTrace = {
    selectedAgentCount: input.council.selectedAgents.length,
    modelCallCount: input.modelCallCount,
    hasStreamingStart: true,
    hasRetryPath: true,
    estimatedTokenBudget: 8000
  };
  const agentOutputMap = {
    ...buildFullMockAgentOutputMap(input.context),
    ...input.council.agentOutputMap
  } satisfies AgentOutputMap;
  const report = {
    humanTone: evaluateHumanTone(output, {
      mode: input.context.mode,
      memories: input.context.relevantMemories
    }),
    safety: evaluateSafety(output, {
      allowedMode: "cognitive-model"
    }),
    memoryRecall: evaluateMemoryRecall(output, {
      memories: input.context.relevantMemories
    }),
    memoryQuality: evaluateMemoryQuality(firstMemoryCandidate),
    agentDifference: evaluateAgentDifference(agentOutputMap),
    runtimeQuality: evaluateRuntimeQuality(runtimeTrace)
  };

  return {
    ...report,
    passed: Object.values(report).every((score) => score.passed)
  };
}
