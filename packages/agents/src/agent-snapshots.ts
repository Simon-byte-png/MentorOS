import type {
  AgentSlug,
  CouncilRole,
  SourceReliability,
  VerificationStatus,
  VoiceCalibration
} from "./agent-types";
import { AGENT_REGISTRY } from "./agent-registry";
import { validateAgentCard } from "./agent-quality-checks";

export interface AgentQualitySnapshotEntry {
  slug: AgentSlug;
  displayName: string;
  conceptCount: number;
  thinkingMoveCount: number;
  diagnosticQuestionCount: number;
  sourceCount: number;
  forbiddenBehaviorCount: number;
  qualityCheckCount: number;
  hasDisclaimer: boolean;
  hasVoiceCalibration: boolean;
  defaultCouncilRoles: CouncilRole[];
  failureModeHandlingCount: number;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AgentSourceSnapshotEntry {
  slug: AgentSlug;
  sources: Array<{
    id: string;
    title: string;
    authorOrPublisher: string;
    reliability: SourceReliability;
    sourceType: string;
    verificationStatus: VerificationStatus;
    usedFor: string[];
    url?: string;
  }>;
  reliabilityCounts: Record<SourceReliability, number>;
  verificationStatusCounts: Record<VerificationStatus, number>;
  draftSourceIds: string[];
  needsVerificationSourceIds: string[];
}

export interface AgentVoiceCalibrationMatrixEntry {
  slug: AgentSlug;
  displayName: string;
  shortName: string;
  voiceCalibration: VoiceCalibration;
  defaultCouncilRoles: CouncilRole[];
}

export function getAgentQualitySnapshot(): AgentQualitySnapshotEntry[] {
  return AGENT_REGISTRY.map((card) => {
    const validation = validateAgentCard(card);
    return {
      slug: card.slug,
      displayName: card.displayName,
      conceptCount: card.conceptMap.length,
      thinkingMoveCount: card.thinkingMoves.length,
      diagnosticQuestionCount: card.diagnosticQuestions.length,
      sourceCount: card.sourceBasis.length,
      forbiddenBehaviorCount: card.forbiddenBehaviors.length,
      qualityCheckCount: card.qualityChecks.length,
      hasDisclaimer: card.disclaimer.length > 0,
      hasVoiceCalibration: Boolean(card.voiceCalibration),
      defaultCouncilRoles: card.defaultCouncilRoles,
      failureModeHandlingCount: card.failureModeHandling.length,
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings
    };
  });
}

export function getAgentSourceSnapshot(): AgentSourceSnapshotEntry[] {
  return AGENT_REGISTRY.map((card) => {
    const reliabilityCounts = createReliabilityCounts();
    const verificationStatusCounts = createVerificationStatusCounts();

    for (const source of card.sourceBasis) {
      reliabilityCounts[source.reliability] += 1;
      verificationStatusCounts[source.verificationStatus] += 1;
    }

    return {
      slug: card.slug,
      sources: card.sourceBasis.map((source) => ({
        id: source.id,
        title: source.title,
        authorOrPublisher: source.authorOrPublisher,
        reliability: source.reliability,
        sourceType: source.sourceType,
        verificationStatus: source.verificationStatus,
        usedFor: source.usedFor,
        url: source.url
      })),
      reliabilityCounts,
      verificationStatusCounts,
      draftSourceIds: card.sourceBasis
        .filter((source) => source.verificationStatus === "draft")
        .map((source) => source.id),
      needsVerificationSourceIds: card.sourceBasis
        .filter((source) => source.verificationStatus === "needs_verification")
        .map((source) => source.id)
    };
  });
}

export function getAgentVoiceCalibrationMatrix(): AgentVoiceCalibrationMatrixEntry[] {
  return AGENT_REGISTRY.map((card) => ({
    slug: card.slug,
    displayName: card.displayName,
    shortName: card.shortName,
    voiceCalibration: card.voiceCalibration,
    defaultCouncilRoles: card.defaultCouncilRoles
  }));
}

function createReliabilityCounts(): Record<SourceReliability, number> {
  return { A: 0, B: 0, C: 0 };
}

function createVerificationStatusCounts(): Record<VerificationStatus, number> {
  return { verified: 0, needs_verification: 0, draft: 0 };
}
