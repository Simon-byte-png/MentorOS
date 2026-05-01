import sampleAgentCardSnapshot from "./fixtures/sample-agent-card-snapshot.json";
import { evaluateAgentCardQuality } from "./agent-card-quality.eval";
import type { EvalScore } from "./eval-types";

const expectedAgentSlugs = [
  "munger",
  "duan",
  "naval",
  "feynman",
  "jobs",
  "taleb"
] as const;

type ExpectedAgentSlug = (typeof expectedAgentSlugs)[number];
type RunnerSource = "real-agent-snapshot" | "fixture-fallback";

export interface AgentCardEvalRunnerResult {
  source: RunnerSource;
  importAvailable: boolean;
  score: EvalScore;
  report?: unknown;
  summary: {
    sixAgentPresence: Record<ExpectedAgentSlug, boolean>;
    duanDraftStatus: "allowed-draft-present" | "no-draft-detected" | "unknown";
    voiceCalibrationDistinctiveness: "pass" | "warning" | "fail" | "unknown";
    fakeQuoteOrPersonaRisk: "pass" | "warning" | "fail";
  };
}

interface OptionalAgentsModule {
  getAgentQualitySnapshot?: () => unknown;
  getAgentQualityReport?: () => unknown;
}

export async function runAgentCardEval(): Promise<AgentCardEvalRunnerResult> {
  const realSnapshot = await loadRealAgentSnapshot();
  const source: RunnerSource = realSnapshot ? "real-agent-snapshot" : "fixture-fallback";
  const snapshot = realSnapshot?.snapshot ?? sampleAgentCardSnapshot;
  const score = evaluateAgentCardQuality(snapshot);
  const result: AgentCardEvalRunnerResult = {
    source,
    importAvailable: Boolean(realSnapshot),
    score,
    report: realSnapshot?.report,
    summary: {
      sixAgentPresence: getSixAgentPresence(snapshot),
      duanDraftStatus: getDuanDraftStatus(snapshot, realSnapshot?.report),
      voiceCalibrationDistinctiveness: getVoiceCalibrationDistinctiveness(
        score,
        realSnapshot?.report
      ),
      fakeQuoteOrPersonaRisk: getFakeQuoteOrPersonaRisk(score, realSnapshot?.report)
    }
  };

  printAgentCardEvalReport(result);
  return result;
}

async function loadRealAgentSnapshot(): Promise<
  { snapshot: unknown; report: unknown } | undefined
> {
  const packageName = "@mentoros/agents";

  try {
    const agentsModule = (await import(packageName)) as OptionalAgentsModule;

    if (typeof agentsModule.getAgentQualitySnapshot !== "function") {
      console.log("real agent snapshot import unavailable: getAgentQualitySnapshot missing");
      return undefined;
    }

    const snapshot = agentsModule.getAgentQualitySnapshot();
    const report =
      typeof agentsModule.getAgentQualityReport === "function"
        ? agentsModule.getAgentQualityReport()
        : undefined;

    if (report !== undefined) {
      console.log("real agent quality report");
      console.log(JSON.stringify(report, null, 2));
    }

    return { snapshot, report };
  } catch (error) {
    console.log("real agent snapshot import unavailable");
    console.log(getImportErrorMessage(error));
    return undefined;
  }
}

function printAgentCardEvalReport(result: AgentCardEvalRunnerResult): void {
  console.log("agent-card-quality eval report");
  console.log(
    JSON.stringify(
      {
        source: result.source,
        importAvailable: result.importAvailable,
        score: result.score.score,
        passed: result.score.passed,
        issues: result.score.issues,
        sixAgentPresence: result.summary.sixAgentPresence,
        duanDraftStatus: result.summary.duanDraftStatus,
        voiceCalibrationDistinctiveness:
          result.summary.voiceCalibrationDistinctiveness,
        fakeQuoteOrPersonaRisk: result.summary.fakeQuoteOrPersonaRisk
      },
      null,
      2
    )
  );
}

function getSixAgentPresence(snapshot: unknown): Record<ExpectedAgentSlug, boolean> {
  const slugs = new Set(normalizeCards(snapshot).map((card) => card.slug));
  return Object.fromEntries(
    expectedAgentSlugs.map((slug) => [slug, slugs.has(slug)])
  ) as Record<ExpectedAgentSlug, boolean>;
}

function getDuanDraftStatus(
  snapshot: unknown,
  report: unknown
): "allowed-draft-present" | "no-draft-detected" | "unknown" {
  const duanCard = normalizeCards(snapshot).find((card) => card.slug === "duan");
  const serialized = JSON.stringify({ duanCard, report }).toLowerCase();

  if (!duanCard) return "unknown";
  if (serialized.includes("draft")) return "allowed-draft-present";
  if (isCompressedQualityEntry(duanCard)) return "unknown";
  return "no-draft-detected";
}

function getVoiceCalibrationDistinctiveness(
  score: EvalScore,
  report: unknown
): "pass" | "warning" | "fail" | "unknown" {
  const evalIssue = score.issues.find((issue) => issue.id === "agent-card.voice-too-similar");
  if (evalIssue) return evalIssue.severity === "fail" ? "fail" : "warning";

  const distinctiveness = isRecord(report) ? report.distinctiveness : undefined;
  if (isRecord(distinctiveness) && distinctiveness.passed === false) return "fail";
  if (isRecord(distinctiveness) && distinctiveness.passed === true) return "pass";

  return "unknown";
}

function getFakeQuoteOrPersonaRisk(
  score: EvalScore,
  report: unknown
): "pass" | "warning" | "fail" {
  const safetyIssue = score.issues.find(
    (issue) =>
      issue.id === "agent-card.persona-claim" ||
      issue.id === "agent-card.fake-quote-risk" ||
      issue.id === "agent-card.c-window-validation-error"
  );

  if (safetyIssue) return safetyIssue.severity === "fail" ? "fail" : "warning";

  const safety = isRecord(report) ? report.safety : undefined;
  if (isRecord(safety) && safety.passed === false) return "fail";

  return "pass";
}

function normalizeCards(snapshot: unknown): Array<Record<string, unknown> & { slug?: string }> {
  if (Array.isArray(snapshot)) {
    return snapshot.filter(isRecord).map((card) => card as Record<string, unknown>);
  }

  if (!isRecord(snapshot)) {
    return [];
  }

  if (Array.isArray(snapshot.cards)) {
    return snapshot.cards.filter(isRecord).map((card) => card as Record<string, unknown>);
  }

  if (Array.isArray(snapshot.agents)) {
    return snapshot.agents.filter(isRecord).map((card) => card as Record<string, unknown>);
  }

  return Object.entries(snapshot)
    .filter(([, value]) => isRecord(value))
    .map(([key, value]) => {
      const card = value as Record<string, unknown>;
      return { slug: typeof card.slug === "string" ? card.slug : key, ...card };
    });
}

function isCompressedQualityEntry(card: Record<string, unknown>): boolean {
  return (
    typeof card.hasDisclaimer === "boolean" ||
    typeof card.hasVoiceCalibration === "boolean" ||
    typeof card.sourceCount === "number" ||
    typeof card.failureModeHandlingCount === "number" ||
    typeof card.valid === "boolean"
  );
}

function getImportErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
