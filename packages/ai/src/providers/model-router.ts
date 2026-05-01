import type { LLMCallPurpose, LLMProviderName } from "./llm-provider";

export interface ModelPlan {
  agentAnalysisModel: string;
  dialogueDirectorModel: string;
  memoryExtractionModel: string;
  decisionMemoModel: string;
  safetyCheckModel: string;
  costSensitive: boolean;
  qualityMode: boolean;
}

export interface ModelRouterOptions {
  provider?: LLMProviderName;
  modelPlan?: ModelPlan;
  costSensitive?: boolean;
  qualityMode?: boolean;
}

const DEFAULT_FLASH_MODEL = "deepseek-v4-flash";
const DEFAULT_PRO_MODEL = "deepseek-v4-pro";
const MOCK_SAFETY_MODEL = "mock-safety-check";

export function buildModelPlan(options: ModelRouterOptions = {}): ModelPlan {
  const costSensitive = options.costSensitive ?? false;
  const qualityMode = options.qualityMode ?? false;
  const flashModel =
    readEnv("DEEPSEEK_DEFAULT_MODEL") || DEFAULT_FLASH_MODEL;
  const highQualityModel =
    readEnv("DEEPSEEK_HIGH_QUALITY_MODEL") || DEFAULT_PRO_MODEL;
  const dialogueDirectorModel = costSensitive ? flashModel : highQualityModel;
  const safetyCheckModel =
    options.provider === "mock" ? MOCK_SAFETY_MODEL : flashModel;

  return {
    agentAnalysisModel: flashModel,
    dialogueDirectorModel,
    memoryExtractionModel: flashModel,
    decisionMemoModel: flashModel,
    safetyCheckModel,
    costSensitive,
    qualityMode
  };
}

export function selectModelForPurpose(
  purpose: LLMCallPurpose,
  options: ModelRouterOptions = {}
): string {
  const modelPlan = options.modelPlan ?? buildModelPlan(options);

  switch (purpose) {
    case "agent_analysis":
      return modelPlan.agentAnalysisModel;
    case "dialogue_director":
      return modelPlan.dialogueDirectorModel;
    case "memory_extraction":
      return modelPlan.memoryExtractionModel;
    case "decision_memo":
      return modelPlan.decisionMemoModel;
    case "safety_check":
      return modelPlan.safetyCheckModel;
  }
}

function readEnv(key: string): string | undefined {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };
  const env = runtime.process?.env;
  return env?.[key];
}
