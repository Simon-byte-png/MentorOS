import type { AgentSlug, AgentStyleCard, VoiceCalibration } from "./agent-types";
import { AGENT_REGISTRY } from "./agent-registry";

export interface AgentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DistinctivenessResult {
  distinct: boolean;
  warnings: string[];
  pairwiseNotes: string[];
}

export interface AgentQualityReportCard {
  slug: AgentSlug;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AgentQualityReportDistinctiveness {
  passed: boolean;
  warnings: string[];
}

export interface AgentQualityReportSafety {
  passed: boolean;
  warnings: string[];
}

export interface AgentQualityReport {
  passed: boolean;
  cards: AgentQualityReportCard[];
  distinctiveness: AgentQualityReportDistinctiveness;
  safety: AgentQualityReportSafety;
}

const DISCLAIMER = "基于公开思想抽象出的认知模型，不代表本人观点";

const PERSONA_PATTERNS: RegExp[] = [
  /我是\s*(芒格|乔布斯|费曼|塔勒布|纳瓦尔|段永平)/i,
  /我代表\s*(芒格|乔布斯|费曼|塔勒布|纳瓦尔|段永平)/i,
  /作为\s*(费曼|乔布斯|芒格|塔勒布|纳瓦尔|段永平)\s*本人/i,
  /如果我是\s*(芒格|乔布斯|费曼|塔勒布|纳瓦尔|段永平)/i,
  /乔布斯一定会认为/i,
  /塔勒布会告诉你/i,
  /\bI am Charlie Munger\b/i,
  /\bAs Steve Jobs\b/i,
  /\bI represent Taleb\b/i,
  /\bNaval would definitely say\b/i,
  /\bJobs would definitely think\b/i
];

const FAKE_QUOTE_PATTERNS: RegExp[] = [
  /(芒格|乔布斯|费曼|塔勒布|纳瓦尔|段永平)\s*(说过|曾说|讲过|原话)/i,
  /某某曾说/i,
  /原话是/i,
  /这正是纳瓦尔的观点/i,
  /\bMunger once said\b/i,
  /\bThe exact quote is\b/i,
  /\b(?:Jobs|Taleb|Naval|Feynman|Duan) once said\b/i
];

export function validateAgentCard(card: AgentStyleCard): AgentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const serializableText = JSON.stringify(card);

  if (!card.disclaimer.includes(DISCLAIMER)) {
    errors.push(`${card.slug}: missing required cognitive-model disclaimer.`);
  }
  if (detectForbiddenPersonaClaims(serializableText).length > 0) {
    errors.push(`${card.slug}: contains forbidden persona claim risk.`);
  }
  if (detectFakeQuoteRisk(serializableText).length > 0) {
    errors.push(`${card.slug}: contains fake quote attribution risk.`);
  }
  if (card.sourceBasis.length < 3) {
    errors.push(`${card.slug}: sourceBasis must contain at least 3 sources.`);
  }
  for (const source of card.sourceBasis) {
    if (!source.reliability) errors.push(`${card.slug}: source ${source.id} lacks reliability.`);
    if (!source.verificationStatus) errors.push(`${card.slug}: source ${source.id} lacks verificationStatus.`);
  }
  if (!card.voiceCalibration) errors.push(`${card.slug}: missing voiceCalibration.`);
  if (card.defaultCouncilRoles.length < 1) errors.push(`${card.slug}: missing defaultCouncilRoles.`);
  if (card.failureModeHandling.length < 3) errors.push(`${card.slug}: failureModeHandling must contain at least 3 items.`);
  if (card.conceptMap.length < 10) errors.push(`${card.slug}: conceptMap must contain at least 10 items.`);
  if (card.thinkingMoves.length < 8) errors.push(`${card.slug}: thinkingMoves must contain at least 8 items.`);
  if (card.decisionHeuristics.length < 10) errors.push(`${card.slug}: decisionHeuristics must contain at least 10 items.`);
  if (card.diagnosticQuestions.length < 10) errors.push(`${card.slug}: diagnosticQuestions must contain at least 10 items.`);
  if (card.forbiddenBehaviors.length < 8) errors.push(`${card.slug}: forbiddenBehaviors must contain at least 8 items.`);
  if (card.exampleResponses.length < 3) errors.push(`${card.slug}: exampleResponses must contain at least 3 items.`);
  if (card.qualityChecks.length < 8) errors.push(`${card.slug}: qualityChecks must contain at least 8 items.`);
  if (card.contrastWithOthers.length < 5) errors.push(`${card.slug}: contrastWithOthers must cover the other 5 Agents.`);

  for (const example of card.exampleResponses) {
    const personaHits = detectForbiddenPersonaClaims(example.response);
    const quoteHits = detectFakeQuoteRisk(example.response);
    if (personaHits.length > 0) {
      errors.push(`${card.slug}: example response has persona risk: ${personaHits.join(", ")}`);
    }
    if (quoteHits.length > 0) {
      errors.push(`${card.slug}: example response has fake quote risk: ${quoteHits.join(", ")}`);
    }
  }

  if (new Set(card.selectionTags.map(normalize)).size < Math.min(6, card.selectionTags.length)) {
    warnings.push(`${card.slug}: repeated or near-repeated selection tags.`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function compareAgentDistinctiveness(cards: AgentStyleCard[]): DistinctivenessResult {
  const warnings: string[] = [];
  const pairwiseNotes: string[] = [];

  for (let leftIndex = 0; leftIndex < cards.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < cards.length; rightIndex += 1) {
      const left = cards[leftIndex];
      const right = cards[rightIndex];
      const voiceDistance = voiceCalibrationDistance(left.voiceCalibration, right.voiceCalibration);
      const conceptOverlap = overlapRatio(
        left.conceptMap.map((item) => item.concept),
        right.conceptMap.map((item) => item.concept)
      );
      const questionOverlap = overlapRatio(left.diagnosticQuestions, right.diagnosticQuestions);
      const tagOverlap = overlapRatio(left.selectionTags, right.selectionTags);

      pairwiseNotes.push(
        `${left.slug}/${right.slug}: voiceDistance=${voiceDistance.toFixed(2)}, conceptOverlap=${conceptOverlap.toFixed(2)}, questionOverlap=${questionOverlap.toFixed(2)}, tagOverlap=${tagOverlap.toFixed(2)}`
      );

      if (voiceDistance < 4) warnings.push(`${left.slug}/${right.slug}: voice calibration is too similar.`);
      if (conceptOverlap > 0.35) warnings.push(`${left.slug}/${right.slug}: conceptMap overlap is too high.`);
      if (questionOverlap > 0.25) warnings.push(`${left.slug}/${right.slug}: diagnosticQuestions repeat too much.`);
      if (tagOverlap > 0.5) warnings.push(`${left.slug}/${right.slug}: selectionTags overlap too much.`);
    }
  }

  return { distinct: warnings.length === 0, warnings, pairwiseNotes };
}

export function validateAllAgentCards(): AgentQualityReport {
  return getAgentQualityReport();
}

export function getAgentQualityReport(): AgentQualityReport {
  const cards = AGENT_REGISTRY.map((card) => {
    const validation = validateAgentCard(card);
    return {
      slug: card.slug,
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings
    };
  });
  const distinctiveness = compareAgentDistinctiveness([...AGENT_REGISTRY]);
  const safetyWarnings = collectSafetyWarnings([...AGENT_REGISTRY]);

  return {
    passed: cards.every((card) => card.valid) && distinctiveness.warnings.length === 0 && safetyWarnings.length === 0,
    cards,
    distinctiveness: {
      passed: distinctiveness.warnings.length === 0,
      warnings: distinctiveness.warnings
    },
    safety: {
      passed: safetyWarnings.length === 0,
      warnings: safetyWarnings
    }
  };
}

export function detectForbiddenPersonaClaims(text: string): string[] {
  return collectPatternHits(text, PERSONA_PATTERNS);
}

export function detectFakeQuoteRisk(text: string): string[] {
  return collectPatternHits(text, FAKE_QUOTE_PATTERNS);
}

function collectPatternHits(text: string, patterns: RegExp[]): string[] {
  return patterns
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
}

function collectSafetyWarnings(cards: AgentStyleCard[]): string[] {
  const warnings: string[] = [];

  for (const card of cards) {
    const textsToCheck = [
      card.disclaimer,
      card.roleDefinition,
      ...card.coreTemperament,
      ...card.conceptMap.map((concept) => concept.concept),
      ...card.thinkingMoves.map((move) => move.name),
      ...card.diagnosticQuestions,
      ...card.councilVoiceRules,
      ...card.forbiddenBehaviors,
      ...card.promptRules,
      ...card.exampleResponses.map((example) => example.response)
    ];

    for (const text of textsToCheck) {
      const personaHits = detectForbiddenPersonaClaims(text);
      const quoteHits = detectFakeQuoteRisk(text);
      if (personaHits.length > 0) {
        warnings.push(`${card.slug}: persona claim risk in runtime/eval text: ${personaHits.join(", ")}`);
      }
      if (quoteHits.length > 0) {
        warnings.push(`${card.slug}: fake quote risk in runtime/eval text: ${quoteHits.join(", ")}`);
      }
    }
  }

  return warnings;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function overlapRatio(leftValues: string[], rightValues: string[]): number {
  const left = new Set(leftValues.map(normalize));
  const right = new Set(rightValues.map(normalize));
  const intersection = [...left].filter((item) => right.has(item)).length;
  const denominator = Math.min(left.size, right.size) || 1;
  return intersection / denominator;
}

function voiceCalibrationDistance(left: VoiceCalibration, right: VoiceCalibration): number {
  const keys = Object.keys(left) as Array<keyof VoiceCalibration>;
  return keys.reduce((sum, key) => sum + Math.abs(left[key] - right[key]), 0);
}
