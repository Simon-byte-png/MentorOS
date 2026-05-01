import type {
  AgentSelectionResult,
  AgentSlug,
  CouncilRole,
  RuntimeAgentProfile,
  SelectedAgent
} from "@mentoros/agents";
import type { LLMProvider, LLMProviderName, LLMUsage } from "./providers/llm-provider";
import type { ModelPlan } from "./providers/model-router";
import type { RuntimeUsageSummary } from "./providers/usage-types";

export type ConversationMode = "decision" | "writing" | "review" | "general";

export type MemoryType =
  | "profile"
  | "goal"
  | "preference"
  | "project"
  | "decision_history"
  | "blind_spot"
  | "writing_style"
  | "relationship";

export interface RecentMessage {
  role: string;
  content: string;
  speaker?: string;
}

export interface RelevantMemory {
  id?: string;
  type?: MemoryType;
  content: string;
  score?: number;
  source?: string;
}

export interface MentorOSPipelineInput {
  provider?: LLMProviderName;
  qualityMode?: boolean;
  costSensitive?: boolean;
  userId?: string;
  conversationId?: string;
  userMessage: string;
  recentMessages?: RecentMessage[];
  memories?: RelevantMemory[];
  mode?: ConversationMode;
  mock?: boolean;
}

export interface ConversationContext {
  userId?: string;
  conversationId?: string;
  userMessage: string;
  recentMessages: RecentMessage[];
  relevantMemories: RelevantMemory[];
  mode: ConversationMode;
}

export interface RuntimeSelectedAgent {
  slug: AgentSlug;
  displayName: string;
  shortName: string;
  roleInCouncil: CouncilRole;
  reason: string;
  priority: number;
  profile: RuntimeAgentProfile;
}

export interface CouncilAgentOutput {
  agentSlug: AgentSlug;
  displayName: string;
  roleInCouncil: CouncilRole;
  analysis: string;
  keyPoints: string[];
  suggestedAction: string;
  caution: string;
  usage?: LLMUsage;
}

export interface CouncilRunResult {
  selection: AgentSelectionResult;
  selectedAgents: RuntimeSelectedAgent[];
  agentOutputs: CouncilAgentOutput[];
  agentOutputMap: Partial<Record<AgentSlug, string>>;
  model: string;
  usage: LLMUsage[];
}

export interface DialogueMessage {
  speaker: string;
  role: "director" | "agent";
  content: string;
}

export interface DialogueDirectorOutput {
  opening: string;
  messages: DialogueMessage[];
  summary: string;
  nextQuestion: string;
  fullText: string;
  usage?: LLMUsage;
}

export interface ExtractedMemoryCandidate {
  type: MemoryType;
  content: string;
  source: string;
  reason: string;
  editable: boolean;
  deletable: boolean;
  canDisable: boolean;
  confidence: "fact" | "inference";
}

export interface MemoryExtractionResult {
  candidates: ExtractedMemoryCandidate[];
  rejected: string[];
  usage?: LLMUsage;
}

export interface DecisionMemoOutput {
  title: string;
  questionRestatement: string;
  confirmedFacts: string[];
  assumptions: string[];
  disagreements: string[];
  risks: string[];
  suggestedActions: string[];
  sevenDayPlan: string[];
  reviewMetrics: string[];
  markdown: string;
  usage?: LLMUsage;
}

export interface PipelineEvalScore {
  score: number;
  passed: boolean;
  summary: string;
  issues: Array<{
    id: string;
    severity: "pass" | "warning" | "fail";
    message: string;
    evidence?: string;
    suggestion?: string;
  }>;
}

export interface PipelineEvalReport {
  passed: boolean;
  humanTone: PipelineEvalScore;
  safety: PipelineEvalScore;
  memoryRecall: PipelineEvalScore;
  memoryQuality: PipelineEvalScore;
  agentDifference: PipelineEvalScore;
  runtimeQuality: PipelineEvalScore;
}

export interface MentorOSPipelineResult {
  input: MentorOSPipelineInput;
  context: ConversationContext;
  council: CouncilRunResult;
  dialogue: DialogueDirectorOutput;
  memoryExtraction: MemoryExtractionResult;
  decisionMemo: DecisionMemoOutput;
  evalReport: PipelineEvalReport;
  metadata: {
    provider: LLMProviderName;
    requestedProvider: LLMProviderName;
    modelPlan: ModelPlan;
    usageSummary: RuntimeUsageSummary;
    requiresReview: boolean;
    warnings: string[];
  };
}

export interface RuntimeGenerationOptions {
  provider?: LLMProvider;
  providerName?: LLMProviderName;
  modelPlan?: ModelPlan;
  qualityMode?: boolean;
  costSensitive?: boolean;
}

export function mapSelectedAgent(
  selectedAgent: SelectedAgent,
  profile: RuntimeAgentProfile
): RuntimeSelectedAgent {
  return {
    slug: selectedAgent.slug,
    displayName: profile.displayName,
    shortName: profile.shortName,
    roleInCouncil: selectedAgent.roleInCouncil,
    reason: selectedAgent.reason,
    priority: selectedAgent.priority,
    profile
  };
}
