import type { CreateMemoryInput, MemoryType, UpdateMemoryInput, UserMemory } from "../types";
import {
  assertHasUpdateValues,
  getRepositoryDbClient,
  toDbValues,
  wrapRepositoryError,
} from "./shared";

export type ListActiveMemoriesByUserInput = {
  memory_type?: MemoryType;
};

export async function listActiveMemoriesByUser(
  userId: string,
  input: ListActiveMemoriesByUserInput = {},
): Promise<UserMemory[]> {
  const operation = "listActiveMemoriesByUser";
  try {
    return await getRepositoryDbClient().select<UserMemory>("user_memories", {
      filters: [
        { column: "user_id", operator: "eq", value: userId },
        { column: "is_active", operator: "eq", value: true },
        ...(input.memory_type === undefined
          ? []
          : [{ column: "memory_type", operator: "eq" as const, value: input.memory_type }]),
      ],
      order: { column: "updated_at", ascending: false },
    });
  } catch (error) {
    wrapRepositoryError(operation, error);
  }
}

export async function createMemory(input: CreateMemoryInput): Promise<UserMemory> {
  const operation = "createMemory";
  try {
    return await getRepositoryDbClient().insert<UserMemory>(
      "user_memories",
      toDbValues({ ...input }),
    );
  } catch (error) {
    wrapRepositoryError(operation, error);
  }
}

export async function updateMemory(id: string, input: UpdateMemoryInput): Promise<UserMemory> {
  const operation = "updateMemory";
  try {
    const values = toDbValues({ ...input });
    assertHasUpdateValues(operation, values);

    return await getRepositoryDbClient().update<UserMemory>("user_memories", values, {
      filters: [{ column: "id", operator: "eq", value: id }],
    });
  } catch (error) {
    wrapRepositoryError(operation, error);
  }
}

export async function disableMemory(id: string, reason?: string): Promise<UserMemory> {
  const operation = "disableMemory";
  try {
    const db = getRepositoryDbClient();
    const disabledMemory = await db.update<UserMemory>(
      "user_memories",
      { is_active: false },
      { filters: [{ column: "id", operator: "eq", value: id }] },
    );

    if (reason !== undefined) {
      await db.insert("memory_events", {
        user_id: disabledMemory.user_id,
        memory_id: disabledMemory.id,
        event_type: "disabled",
        reason,
      });
    }

    return disabledMemory;
  } catch (error) {
    wrapRepositoryError(operation, error);
  }
}

export const memoriesRepository = {
  listActiveMemoriesByUser,
  createMemory,
  updateMemory,
  disableMemory,
};
