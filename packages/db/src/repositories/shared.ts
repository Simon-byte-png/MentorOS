import { DbRepositoryError } from "../errors";
import type { DbClient } from "../rest-client";
import { createServiceRoleDbClient } from "../server";

let repositoryDbClientFactory: () => DbClient = createServiceRoleDbClient;

export function getRepositoryDbClient(): DbClient {
  return repositoryDbClientFactory();
}

export function setRepositoryDbClientFactory(factory: () => DbClient): () => void {
  const previousFactory = repositoryDbClientFactory;
  repositoryDbClientFactory = factory;
  return () => {
    repositoryDbClientFactory = previousFactory;
  };
}

export function toDbValues(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}

export function assertHasUpdateValues(operation: string, values: Record<string, unknown>): void {
  if (Object.keys(values).length === 0) {
    throw new DbRepositoryError(`${operation} requires at least one field to update.`, {
      operation,
    });
  }
}

export function wrapRepositoryError(operation: string, error: unknown): never {
  if (error instanceof DbRepositoryError) {
    throw error;
  }

  throw new DbRepositoryError(`${operation} failed.`, {
    operation,
    cause: error,
  });
}
