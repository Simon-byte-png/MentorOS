import { DbRepositoryError } from "./errors";

export type DbFilterOperator = "eq" | "gte" | "lt" | "is";

export type DbFilter = {
  column: string;
  operator: DbFilterOperator;
  value: string | number | boolean | Date | null;
};

export type DbOrder = {
  column: string;
  ascending?: boolean;
};

export type DbSelectOptions = {
  select?: string;
  filters?: DbFilter[];
  order?: DbOrder;
  limit?: number;
};

export type DbClient = {
  select<T>(table: string, options?: DbSelectOptions): Promise<T[]>;
  maybeSingle<T>(table: string, options?: DbSelectOptions): Promise<T | null>;
  insert<T>(table: string, values: Record<string, unknown>): Promise<T>;
  update<T>(
    table: string,
    values: Record<string, unknown>,
    options: Required<Pick<DbSelectOptions, "filters">>,
  ): Promise<T>;
  count(table: string, options?: DbSelectOptions): Promise<number>;
  rpc<T>(fnName: string, params?: Record<string, unknown>): Promise<T>;
};

export type PostgrestDbClientConfig = {
  supabaseUrl: string;
  apiKey: string;
  authorizationToken?: string;
  fetch?: typeof globalThis.fetch;
};

type ErrorPayload = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export function createPostgrestDbClient(config: PostgrestDbClientConfig): DbClient {
  const client = new PostgrestDbClient(config);
  return {
    select: client.select.bind(client),
    maybeSingle: client.maybeSingle.bind(client),
    insert: client.insert.bind(client),
    update: client.update.bind(client),
    count: client.count.bind(client),
    rpc: client.rpc.bind(client),
  };
}

class PostgrestDbClient {
  private readonly restUrl: string;
  private readonly apiKey: string;
  private readonly authorizationToken: string;
  private readonly requestFetch: typeof globalThis.fetch;

  constructor(config: PostgrestDbClientConfig) {
    this.restUrl = `${config.supabaseUrl.replace(/\/$/, "")}/rest/v1`;
    this.apiKey = config.apiKey;
    this.authorizationToken = config.authorizationToken ?? config.apiKey;
    this.requestFetch = config.fetch ?? globalThis.fetch;

    if (typeof this.requestFetch !== "function") {
      throw new DbRepositoryError("Supabase REST client requires fetch.", {
        operation: "createPostgrestDbClient",
      });
    }
  }

  async select<T>(table: string, options: DbSelectOptions = {}): Promise<T[]> {
    const response = await this.request(table, {
      method: "GET",
      search: this.createSelectParams(options),
      operation: `select ${table}`,
    });
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new DbRepositoryError(`Expected ${table} select to return an array.`, {
        operation: `select ${table}`,
      });
    }
    return data as T[];
  }

  async maybeSingle<T>(table: string, options: DbSelectOptions = {}): Promise<T | null> {
    const rows = await this.select<T>(table, { ...options, limit: 1 });
    return rows[0] ?? null;
  }

  async insert<T>(table: string, values: Record<string, unknown>): Promise<T> {
    const response = await this.request(table, {
      method: "POST",
      body: JSON.stringify(values),
      search: this.createSelectParams({ select: "*" }),
      operation: `insert ${table}`,
      prefer: "return=representation",
    });
    return this.readSingleResponse<T>(table, "insert", response);
  }

  async update<T>(
    table: string,
    values: Record<string, unknown>,
    options: Required<Pick<DbSelectOptions, "filters">>,
  ): Promise<T> {
    const response = await this.request(table, {
      method: "PATCH",
      body: JSON.stringify(values),
      search: this.createSelectParams({ select: "*", filters: options.filters }),
      operation: `update ${table}`,
      prefer: "return=representation",
    });
    return this.readSingleResponse<T>(table, "update", response);
  }

  async count(table: string, options: DbSelectOptions = {}): Promise<number> {
    const response = await this.request(table, {
      method: "HEAD",
      search: this.createSelectParams({ ...options, select: "id" }),
      operation: `count ${table}`,
      prefer: "count=exact",
    });
    const contentRange = response.headers.get("content-range");
    const total = contentRange?.split("/")[1];
    return total === undefined ? 0 : Number(total);
  }

  async rpc<T>(fnName: string, params: Record<string, unknown> = {}): Promise<T> {
    const url = `${this.restUrl}/rpc/${fnName}`;
    const headers: Record<string, string> = {
      apikey: this.apiKey,
      authorization: `Bearer ${this.authorizationToken}`,
      "content-type": "application/json",
    };

    const response = await this.requestFetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw await createRequestError(`rpc ${fnName}`, response);
    }

    return (await response.json()) as T;
  }

  private async readSingleResponse<T>(
    table: string,
    action: string,
    response: Response,
  ): Promise<T> {
    const data = await response.json();
    if (!Array.isArray(data) || data.length !== 1) {
      throw new DbRepositoryError(`Expected ${action} ${table} to return one row.`, {
        operation: `${action} ${table}`,
      });
    }
    return data[0] as T;
  }

  private createSelectParams(options: DbSelectOptions): URLSearchParams {
    const search = new URLSearchParams();
    search.set("select", options.select ?? "*");

    for (const filter of options.filters ?? []) {
      search.append(filter.column, `${filter.operator}.${formatFilterValue(filter.value)}`);
    }

    if (options.order) {
      const direction = options.order.ascending === false ? "desc" : "asc";
      search.set("order", `${options.order.column}.${direction}`);
    }

    if (options.limit !== undefined) {
      search.set("limit", String(options.limit));
    }

    return search;
  }

  private async request(
    table: string,
    options: {
      method: "GET" | "HEAD" | "POST" | "PATCH";
      search: URLSearchParams;
      operation: string;
      body?: string;
      prefer?: string;
    },
  ): Promise<Response> {
    const url = new URL(`${this.restUrl}/${table}`);
    url.search = options.search.toString();

    const headers: Record<string, string> = {
      apikey: this.apiKey,
      authorization: `Bearer ${this.authorizationToken}`,
    };

    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
    }

    if (options.prefer !== undefined) {
      headers.prefer = options.prefer;
    }

    const response = await this.requestFetch(url, {
      method: options.method,
      headers,
      body: options.body,
    });

    if (!response.ok) {
      throw await createRequestError(options.operation, response);
    }

    return response;
  }
}

function formatFilterValue(value: DbFilter["value"]): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value === null ? "null" : String(value);
}

async function createRequestError(operation: string, response: Response): Promise<DbRepositoryError> {
  const payload = await readErrorPayload(response);
  const message = payload.message ?? response.statusText;
  return new DbRepositoryError(`${operation} failed: ${message}`, {
    operation,
    status: response.status,
    code: payload.code,
    cause: payload,
  });
}

async function readErrorPayload(response: Response): Promise<ErrorPayload> {
  try {
    const payload = (await response.json()) as ErrorPayload;
    return payload;
  } catch {
    return {};
  }
}
