export type AgentSlug = "munger" | "duan" | "naval" | "feynman" | "jobs" | "taleb";

export type SourceReliability = "A" | "B" | "C";

export type SourceType =
  | "official"
  | "speech"
  | "interview"
  | "book_page"
  | "publisher_page"
  | "media"
  | "secondary_summary"
  | "notes";

export type VerificationStatus = "verified" | "needs_verification" | "draft";

export interface AgentSource {
  id: string;
  title: string;
  authorOrPublisher: string;
  url?: string;
  reliability: SourceReliability;
  sourceType: SourceType;
  usedFor: string[];
  verificationStatus: VerificationStatus;
}

export interface VoiceCalibration {
  directness: 1 | 2 | 3 | 4 | 5;
  warmth: 1 | 2 | 3 | 4 | 5;
  abstraction: 1 | 2 | 3 | 4 | 5;
  skepticism: 1 | 2 | 3 | 4 | 5;
  poeticDensity: 1 | 2 | 3 | 4 | 5;
  productTaste: 1 | 2 | 3 | 4 | 5;
  riskSensitivity: 1 | 2 | 3 | 4 | 5;
}

export type CouncilRole =
  | "primary_judge"
  | "skeptic"
  | "clarifier"
  | "product_editor"
  | "long_term_strategist"
  | "risk_guardian"
  | "value_checker";

export interface SelectedAgent {
  slug: AgentSlug;
  reason: string;
  priority: number;
  roleInCouncil: CouncilRole;
}

export interface AgentSelectionResult {
  selectedAgents: SelectedAgent[];
  primaryAgent: AgentSlug;
  skepticalAgent: AgentSlug;
  missingPerspective: string[];
  selectionReason: string;
  councilMode: "quiet" | "debate" | "diagnostic" | "review";
  shouldEscalateToFullCouncil: boolean;
}

export interface ConceptMapEntry {
  concept: string;
  meaning: string;
  decisionUse: string;
  warning: string;
}

export interface ThinkingMove {
  name: string;
  trigger: string;
  typicalQuestions: string[];
  outputTendency: string;
}

export interface LanguageStyle {
  sentenceLength: string;
  toneIntensity: string;
  directness: string;
  sarcasm: string;
  analogy: string;
  abstraction: string;
  shortSentences: string;
  explicitJudgment: string;
  expressesDoubt: string;
  givesAdvice: string;
}

export interface AgentContrast {
  slug: AgentSlug;
  difference: string;
}

export interface ExampleResponse {
  scenario: string;
  response: string;
}

export interface AgentStyleCard {
  slug: AgentSlug;
  displayName: string;
  shortName: string;
  disclaimer: string;
  publicDescription: string;
  roleDefinition: string;
  sourceBasis: AgentSource[];
  coreTemperament: string[];
  conceptMap: ConceptMapEntry[];
  thinkingMoves: ThinkingMove[];
  decisionHeuristics: string[];
  diagnosticQuestions: string[];
  languageStyle: LanguageStyle;
  voiceCalibration: VoiceCalibration;
  councilVoiceRules: string[];
  defaultCouncilRoles: CouncilRole[];
  defaultStance: string;
  strengths: string[];
  blindspots: string[];
  forbiddenBehaviors: string[];
  contrastWithOthers: AgentContrast[];
  promptRules: string[];
  selectionTags: string[];
  exampleResponses: ExampleResponse[];
  qualityChecks: string[];
  failureModeHandling: string[];
}
