import type { AgentRun, CreateAgentRunInput } from "../types";

const TODO_MESSAGE = "TODO(Window B): connect agent runs repository to Supabase.";

export async function createAgentRun(input: CreateAgentRunInput): Promise<AgentRun> {
  throw new Error(`${TODO_MESSAGE} createAgentRun is not implemented yet.`);
}

export async function listAgentRunsByConversation(conversationId: string): Promise<AgentRun[]> {
  throw new Error(`${TODO_MESSAGE} listAgentRunsByConversation is not implemented yet.`);
}

export async function listAgentRunsByCouncilRun(councilRunId: string): Promise<AgentRun[]> {
  throw new Error(`${TODO_MESSAGE} listAgentRunsByCouncilRun is not implemented yet.`);
}

export const agentRunsRepository = {
  createAgentRun,
  listAgentRunsByConversation,
  listAgentRunsByCouncilRun,
};
