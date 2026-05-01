import { EVAL_THRESHOLDS } from "./eval-thresholds";
import type { EvalIssue, EvalScore } from "./eval-types";
import { buildEvalScore, findMatches } from "./eval-utils";

const expectedAgentSlugs = [
  "munger",
  "duan",
  "naval",
  "feynman",
  "jobs",
  "taleb"
] as const;

type ExpectedAgentSlug = (typeof expectedAgentSlugs)[number];

interface AgentCardSnapshot {
  slug?: string;
  disclaimer?: string;
  hasDisclaimer?: boolean;
  sourceBasis?: unknown[];
  sourceCount?: number;
  voiceCalibration?: Record<string, unknown>;
  hasVoiceCalibration?: boolean;
  defaultCouncilRoles?: unknown[];
  failureModeHandling?: unknown[];
  failureModeHandlingCount?: number;
  conceptMap?: unknown[];
  diagnosticQuestions?: unknown[];
  exampleResponses?: unknown[];
  valid?: boolean;
  errors?: string[];
  warnings?: string[];
}

const requiredDisclaimer = "基于公开思想抽象出的认知模型，不代表本人观点";

const personaClaimPatterns = [
  "我是芒格",
  "我是乔布斯",
  "我是费曼",
  "我是塔勒布",
  "我是纳瓦尔",
  "我是段永平",
  "我代表塔勒布",
  "作为费曼本人",
  "作为乔布斯本人",
  "作为芒格本人",
  "作为段永平本人",
  "I am Charlie Munger",
  "I am Steve Jobs",
  "As Steve Jobs",
  "As Charlie Munger",
  "I represent Taleb"
] as const;

const fakeQuotePatterns = [
  "芒格说过",
  "乔布斯曾说",
  "费曼说过",
  "塔勒布曾经说",
  "纳瓦尔原话是",
  "段永平亲口说过",
  "这是某某的原话",
  "Munger once said",
  "The exact quote is",
  "Naval would definitely say",
  "Jobs would definitely think"
] as const;

export function evaluateAgentCardQuality(cardsOrSnapshot: unknown): EvalScore {
  const issues: EvalIssue[] = [];
  let score = 100;
  const cards = normalizeCards(cardsOrSnapshot);
  const cardsBySlug = new Map<string, AgentCardSnapshot>();
  const seenSlugs = new Set<string>();

  for (const card of cards) {
    const slug = typeof card.slug === "string" ? card.slug : "";

    if (!slug) {
      score -= 8;
      issues.push({
        id: "agent-card.missing-slug",
        severity: "fail",
        message: "Agent card is missing a slug.",
        suggestion: "Each card snapshot must include a stable Agent slug."
      });
      continue;
    }

    if (!expectedAgentSlugs.includes(slug as ExpectedAgentSlug)) {
      score -= 8;
      issues.push({
        id: "agent-card.unknown-agent",
        severity: "fail",
        message: "Agent card snapshot contains an unknown Agent slug.",
        evidence: slug,
        suggestion: `Use only: ${expectedAgentSlugs.join(", ")}.`
      });
    }

    if (seenSlugs.has(slug)) {
      score -= 10;
      issues.push({
        id: "agent-card.duplicate-agent",
        severity: "fail",
        message: "Agent card snapshot contains a duplicate Agent.",
        evidence: slug,
        suggestion: "Provide exactly one card per Agent."
      });
    }

    seenSlugs.add(slug);
    cardsBySlug.set(slug, card);
  }

  for (const slug of expectedAgentSlugs) {
    const card = cardsBySlug.get(slug);

    if (!card) {
      score -= 14;
      issues.push({
        id: "agent-card.missing-agent",
        severity: "fail",
        message: "Agent card snapshot is missing a required Agent.",
        evidence: slug,
        suggestion: "Provide all six Agent cards in the snapshot."
      });
      continue;
    }

    score += evaluateSingleCard(slug, card, issues);
  }

  const availableCards = expectedAgentSlugs
    .map((slug) => cardsBySlug.get(slug))
    .filter((card): card is AgentCardSnapshot => Boolean(card));

  score += evaluateVoiceDistinctiveness(availableCards, issues);
  score += evaluateTextDistinctiveness(availableCards, issues);

  return buildEvalScore(
    score,
    EVAL_THRESHOLDS.agentCardQualityPass,
    issues,
    "Agent card quality passes: complete, safe, sourced, and differentiated.",
    "Agent card quality needs work: missing metadata, safety risk, or homogeneity detected."
  );
}

function normalizeCards(cardsOrSnapshot: unknown): AgentCardSnapshot[] {
  if (Array.isArray(cardsOrSnapshot)) {
    return cardsOrSnapshot.filter(isRecord).map((card) => card as AgentCardSnapshot);
  }

  if (!isRecord(cardsOrSnapshot)) {
    return [];
  }

  if (Array.isArray(cardsOrSnapshot.cards)) {
    return cardsOrSnapshot.cards.filter(isRecord).map((card) => card as AgentCardSnapshot);
  }

  if (Array.isArray(cardsOrSnapshot.agents)) {
    return cardsOrSnapshot.agents.filter(isRecord).map((card) => card as AgentCardSnapshot);
  }

  return Object.entries(cardsOrSnapshot)
    .filter(([, value]) => isRecord(value))
    .map(([key, value]) => {
      const card = value as AgentCardSnapshot;
      return { slug: card.slug ?? key, ...card };
    });
}

function evaluateSingleCard(
  slug: ExpectedAgentSlug,
  card: AgentCardSnapshot,
  issues: EvalIssue[]
): number {
  if (isCompressedQualitySnapshot(card)) {
    return evaluateCompressedQualityCard(slug, card, issues);
  }

  let delta = 0;

  if (!card.disclaimer?.includes(requiredDisclaimer)) {
    delta -= 14;
    issues.push({
      id: "agent-card.bad-disclaimer",
      severity: "fail",
      message: "Agent card is missing the required cognitive-model disclaimer.",
      evidence: slug,
      suggestion: `Include: ${requiredDisclaimer}.`
    });
  }

  if (!Array.isArray(card.sourceBasis) || card.sourceBasis.length === 0) {
    delta -= 12;
    issues.push({
      id: "agent-card.missing-source-basis",
      severity: "fail",
      message: "Agent card is missing sourceBasis.",
      evidence: slug,
      suggestion: "Include sourceBasis entries with reliability and verificationStatus."
    });
  } else {
    const missingMetadata = card.sourceBasis.filter(
      (source) =>
        !isRecord(source) ||
        typeof source.reliability !== "string" ||
        typeof source.verificationStatus !== "string"
    );

    if (missingMetadata.length > 0) {
      delta -= 10;
      issues.push({
        id: "agent-card.missing-source-metadata",
        severity: "fail",
        message: "One or more sourceBasis entries lack reliability or verificationStatus.",
        evidence: slug,
        suggestion: "Every sourceBasis entry must include reliability and verificationStatus."
      });
    }

    if (slug === "duan" && hasDuanDraftMismatch(card.sourceBasis, card)) {
      delta -= 6;
      issues.push({
        id: "agent-card.duan-draft-misrepresented",
        severity: "warning",
        message: "Duan draft material appears to be presented as fully verified.",
        evidence: slug,
        suggestion:
          "Duan may include draft sources, but the card must not imply all material is fully verified."
      });
    }
  }

  if (!isRecord(card.voiceCalibration)) {
    delta -= 10;
    issues.push({
      id: "agent-card.missing-voice-calibration",
      severity: "fail",
      message: "Agent card is missing voiceCalibration.",
      evidence: slug,
      suggestion: "Include numeric voiceCalibration dimensions."
    });
  }

  if (!Array.isArray(card.defaultCouncilRoles) || card.defaultCouncilRoles.length === 0) {
    delta -= 8;
    issues.push({
      id: "agent-card.missing-council-roles",
      severity: "fail",
      message: "Agent card is missing defaultCouncilRoles.",
      evidence: slug,
      suggestion: "Include at least one default council role."
    });
  }

  if (!Array.isArray(card.failureModeHandling) || card.failureModeHandling.length === 0) {
    delta -= 8;
    issues.push({
      id: "agent-card.missing-failure-mode-handling",
      severity: "fail",
      message: "Agent card is missing failureModeHandling.",
      evidence: slug,
      suggestion: "Include failure mode handling guidance for Dialogue Director."
    });
  }

  const exampleText = stringifyExamples(card.exampleResponses);
  const personaMatches = findMatches(exampleText, personaClaimPatterns);
  if (personaMatches.length > 0) {
    delta -= 18;
    issues.push({
      id: "agent-card.persona-claim",
      severity: "fail",
      message: "Agent exampleResponses contain persona claim risk.",
      evidence: `${slug}: ${personaMatches.join(", ")}`,
      suggestion: "Frame examples as cognitive-model output, never as the real person."
    });
  }

  const quoteMatches = findMatches(exampleText, fakeQuotePatterns);
  if (quoteMatches.length > 0) {
    delta -= 18;
    issues.push({
      id: "agent-card.fake-quote-risk",
      severity: "fail",
      message: "Agent exampleResponses contain fake quote risk.",
      evidence: `${slug}: ${quoteMatches.join(", ")}`,
      suggestion: "Do not attribute exact quotes without a verifiable citation system."
    });
  }

  return delta;
}

function evaluateCompressedQualityCard(
  slug: ExpectedAgentSlug,
  card: AgentCardSnapshot,
  issues: EvalIssue[]
): number {
  let delta = 0;

  if (card.hasDisclaimer !== true) {
    delta -= 14;
    issues.push({
      id: "agent-card.bad-disclaimer",
      severity: "fail",
      message: "Compressed Agent quality snapshot reports a missing disclaimer.",
      evidence: slug,
      suggestion: `C-window cards must include: ${requiredDisclaimer}.`
    });
  }

  if (typeof card.sourceCount !== "number" || card.sourceCount < 1) {
    delta -= 12;
    issues.push({
      id: "agent-card.missing-source-basis",
      severity: "fail",
      message: "Compressed Agent quality snapshot reports missing sources.",
      evidence: slug,
      suggestion: "C-window snapshot must report at least one source per Agent."
    });
  }

  if (card.hasVoiceCalibration !== true) {
    delta -= 10;
    issues.push({
      id: "agent-card.missing-voice-calibration",
      severity: "fail",
      message: "Compressed Agent quality snapshot reports missing voiceCalibration.",
      evidence: slug,
      suggestion: "C-window cards must include voiceCalibration."
    });
  }

  if (!Array.isArray(card.defaultCouncilRoles) || card.defaultCouncilRoles.length === 0) {
    delta -= 8;
    issues.push({
      id: "agent-card.missing-council-roles",
      severity: "fail",
      message: "Compressed Agent quality snapshot reports missing defaultCouncilRoles.",
      evidence: slug,
      suggestion: "C-window cards must expose at least one default council role."
    });
  }

  if (
    typeof card.failureModeHandlingCount !== "number" ||
    card.failureModeHandlingCount < 1
  ) {
    delta -= 8;
    issues.push({
      id: "agent-card.missing-failure-mode-handling",
      severity: "fail",
      message: "Compressed Agent quality snapshot reports missing failureModeHandling.",
      evidence: slug,
      suggestion: "C-window cards must include failure mode handling guidance."
    });
  }

  const errors = Array.isArray(card.errors) ? card.errors : [];
  const warnings = Array.isArray(card.warnings) ? card.warnings : [];

  if (card.valid === false || errors.length > 0) {
    delta -= 16;
    issues.push({
      id: "agent-card.c-window-validation-error",
      severity: "fail",
      message: "C-window Agent quality check reports validation errors.",
      evidence: `${slug}: ${errors.join("; ")}`,
      suggestion: "Fix C-window card validation errors before using the runtime adapter."
    });
  }

  const personaRisk = findMatches(errors.join("\n"), personaClaimPatterns);
  if (personaRisk.length > 0) {
    delta -= 18;
    issues.push({
      id: "agent-card.persona-claim",
      severity: "fail",
      message: "C-window Agent quality errors include persona claim risk.",
      evidence: `${slug}: ${personaRisk.join(", ")}`,
      suggestion: "Remove any text that can be read as the real person speaking."
    });
  }

  const quoteRisk = findMatches(errors.join("\n"), fakeQuotePatterns);
  if (quoteRisk.length > 0) {
    delta -= 18;
    issues.push({
      id: "agent-card.fake-quote-risk",
      severity: "fail",
      message: "C-window Agent quality errors include fake quote risk.",
      evidence: `${slug}: ${quoteRisk.join(", ")}`,
      suggestion: "Remove unsupported quote attribution."
    });
  }

  if (warnings.length > 0) {
    delta -= Math.min(6, warnings.length * 2);
    issues.push({
      id: "agent-card.c-window-validation-warning",
      severity: "warning",
      message: "C-window Agent quality check reports warnings.",
      evidence: `${slug}: ${warnings.join("; ")}`,
      suggestion: "Review C-window warnings before treating the card set as production-ready."
    });
  }

  return delta;
}

function evaluateVoiceDistinctiveness(
  cards: AgentCardSnapshot[],
  issues: EvalIssue[]
): number {
  let delta = 0;
  const tooSimilarPairs: string[] = [];

  forEachPair(cards, (left, right) => {
    if (!left.slug || !right.slug || !isRecord(left.voiceCalibration) || !isRecord(right.voiceCalibration)) {
      return;
    }

    const distance = voiceCalibrationDistance(left.voiceCalibration, right.voiceCalibration);
    if (distance < 4) {
      tooSimilarPairs.push(`${left.slug}/${right.slug}:${distance}`);
    }
  });

  if (tooSimilarPairs.length > 0) {
    delta -= tooSimilarPairs.length >= 3 ? 14 : 7;
    issues.push({
      id: "agent-card.voice-too-similar",
      severity: tooSimilarPairs.length >= 3 ? "fail" : "warning",
      message: "Several Agent voiceCalibration vectors are too similar.",
      evidence: tooSimilarPairs.join(", "),
      suggestion: "Increase numeric voice differences across directness, warmth, abstraction, skepticism, taste, and risk."
    });
  }

  return delta;
}

function evaluateTextDistinctiveness(
  cards: AgentCardSnapshot[],
  issues: EvalIssue[]
): number {
  let delta = 0;
  const conceptPairs: string[] = [];
  const questionPairs: string[] = [];

  forEachPair(cards, (left, right) => {
    if (!left.slug || !right.slug) return;

    const conceptOverlap = overlapRatio(
      extractConceptValues(left.conceptMap),
      extractConceptValues(right.conceptMap)
    );
    const questionOverlap = overlapRatio(
      extractStringArray(right.diagnosticQuestions),
      extractStringArray(left.diagnosticQuestions)
    );

    if (conceptOverlap > 0.4) {
      conceptPairs.push(`${left.slug}/${right.slug}:${conceptOverlap.toFixed(2)}`);
    }
    if (questionOverlap > 0.3) {
      questionPairs.push(`${left.slug}/${right.slug}:${questionOverlap.toFixed(2)}`);
    }
  });

  if (conceptPairs.length > 0) {
    delta -= conceptPairs.length >= 3 ? 12 : 6;
    issues.push({
      id: "agent-card.concept-homogeneity",
      severity: conceptPairs.length >= 3 ? "fail" : "warning",
      message: "Agent conceptMap entries are too homogeneous across cards.",
      evidence: conceptPairs.join(", "),
      suggestion: "Give each Agent a more distinct concept vocabulary."
    });
  }

  if (questionPairs.length > 0) {
    delta -= questionPairs.length >= 3 ? 12 : 6;
    issues.push({
      id: "agent-card.question-homogeneity",
      severity: questionPairs.length >= 3 ? "fail" : "warning",
      message: "Agent diagnosticQuestions are too homogeneous across cards.",
      evidence: questionPairs.join(", "),
      suggestion: "Make diagnostic questions reflect each Agent's actual reasoning model."
    });
  }

  return delta;
}

function hasDuanDraftMismatch(sourceBasis: unknown[], card: AgentCardSnapshot): boolean {
  const hasDraftSource = sourceBasis.some(
    (source) => isRecord(source) && source.verificationStatus === "draft"
  );
  const text = JSON.stringify(card).toLowerCase();
  return hasDraftSource && (text.includes("all verified") || text.includes("全部 verified"));
}

function isCompressedQualitySnapshot(card: AgentCardSnapshot): boolean {
  return (
    typeof card.hasDisclaimer === "boolean" ||
    typeof card.hasVoiceCalibration === "boolean" ||
    typeof card.sourceCount === "number" ||
    typeof card.failureModeHandlingCount === "number" ||
    typeof card.valid === "boolean"
  );
}

function stringifyExamples(exampleResponses: unknown[] | undefined): string {
  if (!Array.isArray(exampleResponses)) return "";
  return exampleResponses
    .map((example) => {
      if (typeof example === "string") return example;
      if (isRecord(example) && typeof example.response === "string") return example.response;
      return JSON.stringify(example);
    })
    .join("\n");
}

function extractConceptValues(conceptMap: unknown[] | undefined): string[] {
  if (!Array.isArray(conceptMap)) return [];
  return conceptMap
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (isRecord(entry) && typeof entry.concept === "string") return entry.concept;
      return "";
    })
    .filter(Boolean);
}

function extractStringArray(values: unknown[] | undefined): string[] {
  if (!Array.isArray(values)) return [];
  return values.filter((value): value is string => typeof value === "string");
}

function voiceCalibrationDistance(
  left: Record<string, unknown>,
  right: Record<string, unknown>
): number {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  let distance = 0;

  for (const key of keys) {
    const leftValue = typeof left[key] === "number" ? left[key] : 0;
    const rightValue = typeof right[key] === "number" ? right[key] : 0;
    distance += Math.abs(leftValue - rightValue);
  }

  return distance;
}

function overlapRatio(leftValues: string[], rightValues: string[]): number {
  const left = new Set(leftValues.map(normalize));
  const right = new Set(rightValues.map(normalize));
  const intersection = [...left].filter((item) => right.has(item)).length;
  const denominator = Math.min(left.size, right.size) || 1;
  return intersection / denominator;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function forEachPair<T>(items: T[], callback: (left: T, right: T) => void): void {
  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
      callback(items[leftIndex], items[rightIndex]);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export const agentCardQualityEval = {
  name: "agent-card-quality",
  evaluate: evaluateAgentCardQuality
} as const;
