import type { CreateMessageInput, Message } from "../types";
import { getRepositoryDbClient, toDbValues, wrapRepositoryError } from "./shared";

export async function createMessage(input: CreateMessageInput): Promise<Message> {
  const operation = "createMessage";
  try {
    return await getRepositoryDbClient().insert<Message>("messages", toDbValues({ ...input }));
  } catch (error) {
    wrapRepositoryError(operation, error);
  }
}

export async function listMessagesByConversation(conversationId: string): Promise<Message[]> {
  const operation = "listMessagesByConversation";
  try {
    return await getRepositoryDbClient().select<Message>("messages", {
      filters: [{ column: "conversation_id", operator: "eq", value: conversationId }],
      order: { column: "created_at" },
    });
  } catch (error) {
    wrapRepositoryError(operation, error);
  }
}

export const messagesRepository = {
  createMessage,
  listMessagesByConversation,
};
