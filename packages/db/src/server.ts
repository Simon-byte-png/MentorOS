declare const process: {
  env: Record<string, string | undefined>;
};

import { DbRepositoryError } from "./errors";
import type { DbClient } from "./rest-client";
import { createPostgrestDbClient } from "./rest-client";

export type ServerDbClientConfig = {
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
  supabaseServiceRoleKey: string | undefined;
};

export type ServerDbClientOptions = {
  accessToken?: string;
  fetch?: typeof globalThis.fetch;
  useServiceRole?: boolean;
};

export function getServerDbClientConfig(): ServerDbClientConfig {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function createServerDbClient(options: ServerDbClientOptions = {}): DbClient {
  const config = getServerDbClientConfig();
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL", config.supabaseUrl);
  const useServiceRole = options.useServiceRole ?? options.accessToken === undefined;

  if (useServiceRole) {
    const serviceRoleKey = requireEnv(
      "SUPABASE_SERVICE_ROLE_KEY",
      config.supabaseServiceRoleKey,
    );

    return createPostgrestDbClient({
      supabaseUrl,
      apiKey: serviceRoleKey,
      authorizationToken: serviceRoleKey,
      fetch: options.fetch,
    });
  }

  const supabaseAnonKey = requireEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    config.supabaseAnonKey,
  );

  return createPostgrestDbClient({
    supabaseUrl,
    apiKey: supabaseAnonKey,
    authorizationToken: options.accessToken ?? supabaseAnonKey,
    fetch: options.fetch,
  });
}

export function createServiceRoleDbClient(
  options: Omit<ServerDbClientOptions, "accessToken" | "useServiceRole"> = {},
): DbClient {
  return createServerDbClient({ ...options, useServiceRole: true });
}

function requireEnv(name: string, value: string | undefined): string {
  if (value === undefined || value.length === 0) {
    throw new DbRepositoryError(`Missing ${name} environment variable.`, {
      operation: "createServerDbClient",
    });
  }

  return value;
}
