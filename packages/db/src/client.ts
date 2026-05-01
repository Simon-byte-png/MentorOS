declare const process: {
  env: Record<string, string | undefined>;
};

import { DbRepositoryError } from "./errors";
import type { DbClient } from "./rest-client";
import { createPostgrestDbClient } from "./rest-client";

export type BrowserDbClientConfig = {
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
};

export type BrowserDbClientOptions = {
  accessToken?: string;
  fetch?: typeof globalThis.fetch;
};

export function getBrowserDbClientConfig(): BrowserDbClientConfig {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function createBrowserDbClient(options: BrowserDbClientOptions = {}): DbClient {
  const config = getBrowserDbClientConfig();
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL", config.supabaseUrl);
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

function requireEnv(name: string, value: string | undefined): string {
  if (value === undefined || value.length === 0) {
    throw new DbRepositoryError(`Missing ${name} environment variable.`, {
      operation: "createBrowserDbClient",
    });
  }

  return value;
}
