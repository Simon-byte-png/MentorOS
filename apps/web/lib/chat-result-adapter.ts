import type {
  DialogueMessage,
  ExtractedMemoryCandidate,
  MentorOSPipelineResult,
  RuntimeSelectedAgent
} from "@mentoros/ai";

export type ChatAgentView = {
  slug: string;
  label: string;
};

export type ChatDialogueView = {
  opening: string;
  messages: DialogueMessage[];
  summary: string;
  nextQuestion: string;
};

export type EvalStatusView = {
  passed: boolean;
  label: "通过" | "需要复查";
  summary: string;
};

type SelectionAgentFallback = {
  slug: string;
};

export type ChatResultView = {
  selectedAgents: ChatAgentView[];
  dialogue: ChatDialogueView;
  memoryCandidates: ExtractedMemoryCandidate[];
  decisionMemo: MentorOSPipelineResult["decisionMemo"];
  evalStatus: EvalStatusView;
};

export function adaptChatResult(result: MentorOSPipelineResult): ChatResultView {
  const selectedAgents =
    normalizeRuntimeAgents(result.council.selectedAgents) ??
    normalizeSelectionAgents(result.council.selection.selectedAgents);
  const passed =
    result.evalReport.passed && !result.metadata.requiresReview;

  return {
    selectedAgents,
    dialogue: {
      opening: result.dialogue.opening,
      messages: result.dialogue.messages,
      summary: result.dialogue.summary,
      nextQuestion: result.dialogue.nextQuestion
    },
    memoryCandidates: result.memoryExtraction.candidates,
    decisionMemo: result.decisionMemo,
    evalStatus: {
      passed,
      label: passed ? "通过" : "需要复查",
      summary: result.evalReport.runtimeQuality.summary
    }
  };
}

function normalizeRuntimeAgents(
  agents: RuntimeSelectedAgent[] | undefined
): ChatAgentView[] | null {
  if (!agents || agents.length === 0) return null;

  return agents.map((agent) => ({
    slug: agent.slug,
    label: agent.shortName || agent.displayName || agent.slug
  }));
}

function normalizeSelectionAgents(
  agents: SelectionAgentFallback[] | undefined
): ChatAgentView[] {
  if (!agents) return [];

  return agents.map((agent) => ({
    slug: agent.slug,
    label: formatAgentSlug(agent.slug)
  }));
}

function formatAgentSlug(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}
