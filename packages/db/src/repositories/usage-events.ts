import type { RecordUsageEventInput, UsageEvent } from "../types";
import { getRepositoryDbClient, toDbValues, wrapRepositoryError } from "./shared";

export async function recordUsageEvent(input: RecordUsageEventInput): Promise<UsageEvent> {
  const operation = "recordUsageEvent";
  try {
    return await getRepositoryDbClient().insert<UsageEvent>(
      "usage_events",
      toDbValues({ ...input }),
    );
  } catch (error) {
    wrapRepositoryError(operation, error);
  }
}

export async function listUsageEventsByUser(userId: string): Promise<UsageEvent[]> {
  const operation = "listUsageEventsByUser";
  try {
    return await getRepositoryDbClient().select<UsageEvent>("usage_events", {
      filters: [{ column: "user_id", operator: "eq", value: userId }],
      order: { column: "created_at", ascending: false },
    });
  } catch (error) {
    wrapRepositoryError(operation, error);
  }
}

export async function getDailyUsageCount(userId: string, date: string | Date): Promise<number> {
  const operation = "getDailyUsageCount";
  try {
    const { start, end } = getUtcDayRange(date, operation);
    return await getRepositoryDbClient().count("usage_events", {
      filters: [
        { column: "user_id", operator: "eq", value: userId },
        { column: "created_at", operator: "gte", value: start },
        { column: "created_at", operator: "lt", value: end },
      ],
    });
  } catch (error) {
    wrapRepositoryError(operation, error);
  }
}

function getUtcDayRange(
  date: string | Date,
  operation: string,
): { start: Date; end: Date } {
  const parsedDate = typeof date === "string" ? parseDateString(date) : date;

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`${operation} requires a valid date.`);
  }

  const start = new Date(
    Date.UTC(
      parsedDate.getUTCFullYear(),
      parsedDate.getUTCMonth(),
      parsedDate.getUTCDate(),
    ),
  );
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 1);

  return { start, end };
}

function parseDateString(date: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Date(`${date}T00:00:00.000Z`);
  }

  return new Date(date);
}

export const usageEventsRepository = {
  recordUsageEvent,
  listUsageEventsByUser,
  getDailyUsageCount,
};
