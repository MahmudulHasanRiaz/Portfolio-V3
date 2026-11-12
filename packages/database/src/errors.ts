export class DatabaseError extends Error {
  public readonly entity?: string;
  public readonly operation?: string;
  public readonly cause?: unknown;

  constructor(
    message: string,
    options?: {
      entity?: string;
      operation?: string;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "DatabaseError";
    this.entity = options?.entity;
    this.operation = options?.operation;
    this.cause = options?.cause;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      entity: this.entity,
      operation: this.operation,
      cause: this.cause instanceof Error ? this.cause.message : this.cause,
    };
  }
}

export class NotFoundError extends DatabaseError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, { entity, operation: "findById" });
    this.name = "NotFoundError";
  }
}

export class ConstraintViolationError extends DatabaseError {
  public readonly constraint?: string;

  constructor(
    message: string,
    options?: { entity?: string; constraint?: string; cause?: unknown },
  ) {
    super(message, { ...options, operation: "constraint" });
    this.name = "ConstraintViolationError";
    this.constraint = options?.constraint;
  }
}
