import type { CreateDecisionMemoInput, DecisionMemo } from "../types";
import { getRepositoryDbClient, toDbValues, wrapRepositoryError } from "./shared";

export async function createDecisionMemo(input: CreateDecisionMemoInput): Promise<DecisionMemo> {
  const operation = "createDecisionMemo";
  try {
    return await getRepositoryDbClient().insert<DecisionMemo>(
      "decision_memos",
      toDbValues({ ...input }),
    );
  } catch (error) {
    wrapRepositoryError(operation, error);
  }
}

export async function getDecisionMemoByConversation(
  conversationId: string,
): Promise<DecisionMemo | null> {
  const operation = "getDecisionMemoByConversation";
  try {
    return await getRepositoryDbClient().maybeSingle<DecisionMemo>("decision_memos", {
      filters: [{ column: "conversation_id", operator: "eq", value: conversationId }],
      order: { column: "created_at", ascending: false },
    });
  } catch (error) {
    wrapRepositoryError(operation, error);
  }
}

export const decisionMemosRepository = {
  createDecisionMemo,
  getDecisionMemoByConversation,
};
