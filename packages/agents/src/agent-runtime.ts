import type { AgentSlug, CouncilRole, VoiceCalibration } from "./agent-types";
import { getAgentBySlug } from "./agent-registry";

export interface RuntimeAgentProfile {
  slug: AgentSlug;
  displayName: string;
  shortName: string;
  disclaimer: string;
  roleDefinition: string;
  coreTemperament: string[];
  topConcepts: string[];
  thinkingMoves: string[];
  diagnosticQuestions: string[];
  councilVoiceRules: string[];
  forbiddenBehaviors: string[];
  voiceCalibration: VoiceCalibration;
  defaultCouncilRoles: CouncilRole[];
}

export function getRuntimeAgentProfile(slug: AgentSlug): RuntimeAgentProfile {
  const card = getAgentBySlug(slug);
  if (!card) {
    throw new Error(`Unknown agent slug: ${slug}`);
  }

  return {
    slug: card.slug,
    displayName: card.displayName,
    shortName: card.shortName,
    disclaimer: card.disclaimer,
    roleDefinition: card.roleDefinition,
    coreTemperament: card.coreTemperament,
    topConcepts: card.conceptMap.slice(0, 5).map((concept) => concept.concept),
    thinkingMoves: card.thinkingMoves.slice(0, 5).map((move) => move.name),
    diagnosticQuestions: card.diagnosticQuestions.slice(0, 6),
    councilVoiceRules: card.councilVoiceRules,
    forbiddenBehaviors: card.forbiddenBehaviors,
    voiceCalibration: card.voiceCalibration,
    defaultCouncilRoles: card.defaultCouncilRoles
  };
}

export function getRuntimeAgentProfiles(slugs: AgentSlug[]): RuntimeAgentProfile[] {
  return slugs.map((slug) => getRuntimeAgentProfile(slug));
}

export function buildAgentPromptBrief(slug: AgentSlug): string {
  const profile = getRuntimeAgentProfile(slug);

  return [
    `Agent profile: ${profile.displayName} (${profile.slug})`,
    `Disclaimer: ${profile.disclaimer}`,
    "Use this as a cognitive model lens. Do not present it as a real person, representative, endorsement, or quote source.",
    `Role definition: ${profile.roleDefinition}`,
    `Core temperament: ${formatList(profile.coreTemperament)}`,
    `Top concepts: ${formatList(profile.topConcepts)}`,
    `Thinking moves: ${formatList(profile.thinkingMoves)}`,
    `Diagnostic questions: ${formatList(profile.diagnosticQuestions)}`,
    `Council voice rules: ${formatList(profile.councilVoiceRules)}`,
    `Forbidden behaviors: ${formatList(profile.forbiddenBehaviors)}`,
    `Voice calibration: ${formatVoiceCalibration(profile.voiceCalibration)}`,
    `Default council roles: ${formatList(profile.defaultCouncilRoles)}`
  ].join("\n");
}

export function buildCouncilPromptBrief(slugs: AgentSlug[]): string {
  const briefs = slugs.map((slug) => buildAgentPromptBrief(slug));

  return [
    "Council agent prompt brief",
    "Global safety note: use these profiles only as cognitive model lenses. No impersonation, no fake quotes, and no real-person representation.",
    ...briefs
  ].join("\n\n---\n\n");
}

function formatList(items: readonly string[]): string {
  return items.length > 0 ? items.join("; ") : "none";
}

function formatVoiceCalibration(voiceCalibration: VoiceCalibration): string {
  return [
    `directness=${voiceCalibration.directness}`,
    `warmth=${voiceCalibration.warmth}`,
    `abstraction=${voiceCalibration.abstraction}`,
    `skepticism=${voiceCalibration.skepticism}`,
    `poeticDensity=${voiceCalibration.poeticDensity}`,
    `productTaste=${voiceCalibration.productTaste}`,
    `riskSensitivity=${voiceCalibration.riskSensitivity}`
  ].join(", ");
}
