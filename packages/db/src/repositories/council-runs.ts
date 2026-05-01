import type { CompleteCouncilRunInput, CouncilRun, CreateCouncilRunInput } from "../types";

const TODO_MESSAGE = "TODO(Window B): connect council runs repository to Supabase.";

export async function createCouncilRun(input: CreateCouncilRunInput): Promise<CouncilRun> {
  throw new Error(`${TODO_MESSAGE} createCouncilRun is not implemented yet.`);
}

export async function completeCouncilRun(
  id: string,
  input: CompleteCouncilRunInput,
): Promise<CouncilRun> {
  throw new Error(`${TODO_MESSAGE} completeCouncilRun is not implemented yet.`);
}

export async function getCouncilRunById(id: string): Promise<CouncilRun | null> {
  throw new Error(`${TODO_MESSAGE} getCouncilRunById is not implemented yet.`);
}

export async function listCouncilRunsByConversation(conversationId: string): Promise<CouncilRun[]> {
  throw new Error(`${TODO_MESSAGE} listCouncilRunsByConversation is not implemented yet.`);
}

export const councilRunsRepository = {
  createCouncilRun,
  completeCouncilRun,
  getCouncilRunById,
  listCouncilRunsByConversation,
};
