import type { Conversation, CreateConversationInput } from "../types";
import { getRepositoryDbClient, toDbValues, wrapRepositoryError } from "./shared";

export async function createConversation(input: CreateConversationInput): Promise<Conversation> {
  const operation = "createConversation";
  try {
    return await getRepositoryDbClient().insert<Conversation>(
      "conversations",
      toDbValues({ ...input }),
    );
  } catch (error) {
    wrapRepositoryError(operation, error);
  }
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  const operation = "getConversationById";
  try {
    return await getRepositoryDbClient().maybeSingle<Conversation>("conversations", {
      filters: [{ column: "id", operator: "eq", value: id }],
    });
  } catch (error) {
    wrapRepositoryError(operation, error);
  }
}

export async function listConversationsByUser(userId: string): Promise<Conversation[]> {
  const operation = "listConversationsByUser";
  try {
    return await getRepositoryDbClient().select<Conversation>("conversations", {
      filters: [{ column: "user_id", operator: "eq", value: userId }],
      order: { column: "updated_at", ascending: false },
    });
  } catch (error) {
    wrapRepositoryError(operation, error);
  }
}

export const conversationsRepository = {
  createConversation,
  getConversationById,
  listConversationsByUser,
};
