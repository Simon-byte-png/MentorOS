export type DbRepositoryErrorOptions = {
  operation: string;
  status?: number;
  code?: string;
  cause?: unknown;
};

export class DbRepositoryError extends Error {
  readonly operation: string;
  readonly status?: number;
  readonly code?: string;
  readonly cause?: unknown;

  constructor(message: string, options: DbRepositoryErrorOptions) {
    super(message);
    this.name = "DbRepositoryError";
    this.operation = options.operation;
    this.status = options.status;
    this.code = options.code;
    this.cause = options.cause;
  }
}
