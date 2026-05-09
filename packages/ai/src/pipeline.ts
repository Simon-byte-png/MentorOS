import { runCouncil } from "./council-orchestrator";
import { generateDecisionMemo } from "./decision-memo";
import { runDialogueDirector } from "./dialogue-director";
import { extractMemories } from "./memory-extractor";
import { buildConversationContext } from "./memory-retriever";
import { runPipelineEvals } from "./pipeline-evals";
import { createDeepSeekProvider } from "./providers/deepseek-provider";
import type { LLMProvider, LLMProviderName } from "./providers/llm-provider";
import { buildModelPlan } from "./providers/model-router";
import { createMockProvider } from "./providers/mock-provider";
import {
  buildRuntimeUsageSummary,
  type RuntimeUsageCall
} from "./providers/usage-types";
import type {
  MentorOSPipelineInput,
  MentorOSPipelineResult,
  ModelDepth,
  RuntimeGenerationOptions
} from "./structured-schemas";

export async function runMentorOSPipeline(
  input: MentorOSPipelineInput
): Promise<MentorOSPipelineResult> {
  const requestedProvider = input.provider ?? "mock";
  const modelDepth = resolveModelDepth(input);
  const warnings: string[] = [];
  const provider = resolveRuntimeProvider(requestedProvider, input.mock, warnings);
  const modelPlan = buildModelPlan({
    provider: requestedProvider,
    costSensitive: modelDepth === "flash",
    qualityMode: modelDepth === "pro"
  });
  const options: RuntimeGenerationOptions = {
    provider,
    providerName: provider.name,
    modelPlan,
    qualityMode: modelDepth === "pro",
    costSensitive: modelDepth === "flash",
    modelDepth,
    agentAnalysisMaxTokens: modelDepth === "pro" ? 900 : 520,
    dialogueMaxTokens: modelDepth === "pro" ? 2000 : 1100
  };
  const context = buildConversationContext(input);
  const council = await runCouncil(context, options);
  const dialogue = await runDialogueDirector({ context, council }, options);
  const backgroundOptions = provider.name === "deepseek"
    ? {
        ...options,
        provider: createMockProvider(),
        providerName: "mock" as const
      }
    : options;
  const memoryExtraction = await extractMemories(
    { context, dialogue },
    backgroundOptions
  );
  const decisionMemo = await generateDecisionMemo(
    { context, council, dialogue },
    backgroundOptions
  );
  const usageCalls = buildUsageCalls([
    ...council.usage.map((usage) => ({
      purpose: "agent_analysis" as const,
      usage
    })),
    dialogue.usage
      ? { purpose: "dialogue_director" as const, usage: dialogue.usage }
      : undefined,
    memoryExtraction.usage
      ? { purpose: "memory_extraction" as const, usage: memoryExtraction.usage }
      : undefined,
    decisionMemo.usage
      ? { purpose: "decision_memo" as const, usage: decisionMemo.usage }
      : undefined
  ]);
  const evalReport = runPipelineEvals({
    context,
    council,
    dialogue,
    memoryExtraction,
    modelCallCount: usageCalls.length
  });
  const requiresReview = !evalReport.safety.passed;

  if (requiresReview) {
    warnings.push("Safety eval failed; result requires review before user-facing use.");
  }

  return {
    input,
    context,
    council,
    dialogue,
    memoryExtraction,
    decisionMemo,
    evalReport,
    metadata: {
      provider: provider.name,
      requestedProvider,
      modelDepth,
      modelPlan,
      usageSummary: buildRuntimeUsageSummary(provider.name, usageCalls),
      requiresReview,
      warnings
    }
  };
}

function resolveModelDepth(input: MentorOSPipelineInput): ModelDepth {
  if (input.modelDepth === "pro" || input.qualityMode === true || input.costSensitive === false) {
    return "pro";
  }

  return "flash";
}

function resolveRuntimeProvider(
  requestedProvider: LLMProviderName,
  forceMock: boolean | undefined,
  warnings: string[]
): LLMProvider {
  if (forceMock || requestedProvider === "mock") {
    return createMockProvider();
  }

  if (requestedProvider === "deepseek") {
    const deepseek = createDeepSeekProvider();
    const env = deepseek.getEnvironmentStatus();

    if (env.enableRealLLM && env.hasApiKey) {
      return deepseek;
    }

    warnings.push("DeepSeek 未启用，已回退到 mock provider。");
    return createMockProvider();
  }

  warnings.push("OpenAI provider is a future provider; using mock provider.");
  return createMockProvider();
}

function buildUsageCalls(
  entries: Array<
    | {
        purpose: RuntimeUsageCall["purpose"];
        usage: Omit<RuntimeUsageCall, "purpose">;
      }
    | undefined
  >
): RuntimeUsageCall[] {
  return entries
    .filter((entry): entry is Exclude<typeof entry, undefined> => Boolean(entry))
    .map((entry) => ({
      purpose: entry.purpose,
      ...entry.usage
    }));
}
