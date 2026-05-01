import type { AgentSlug, AgentStyleCard } from "./agent-types";
import { duanCard } from "./style-cards/duan";
import { feynmanCard } from "./style-cards/feynman";
import { jobsCard } from "./style-cards/jobs";
import { mungerCard } from "./style-cards/munger";
import { navalCard } from "./style-cards/naval";
import { talebCard } from "./style-cards/taleb";

export const AGENT_REGISTRY = [
  mungerCard,
  duanCard,
  navalCard,
  feynmanCard,
  jobsCard,
  talebCard
] as const satisfies readonly AgentStyleCard[];

export function getAgentBySlug(slug: AgentSlug): AgentStyleCard | undefined {
  return AGENT_REGISTRY.find((agent) => agent.slug === slug);
}

export function listAgents(): AgentStyleCard[] {
  return [...AGENT_REGISTRY];
}

export function listDefaultAgents(): AgentStyleCard[] {
  return AGENT_REGISTRY.filter((agent) => agent.defaultCouncilRoles.length > 0);
}

export function listAgentsByTag(tag: string): AgentStyleCard[] {
  const normalizedTag = tag.trim().toLowerCase();
  return AGENT_REGISTRY.filter((agent) =>
    agent.selectionTags.some((selectionTag) => selectionTag.toLowerCase() === normalizedTag)
  );
}

export function getAgentPublicDescriptions(): Record<AgentSlug, string> {
  return Object.fromEntries(
    AGENT_REGISTRY.map((agent) => [agent.slug, agent.publicDescription])
  ) as Record<AgentSlug, string>;
}
