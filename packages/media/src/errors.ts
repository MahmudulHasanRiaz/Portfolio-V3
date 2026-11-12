export class MediaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "MediaError";
  }
}

export class UploadError extends MediaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "UPLOAD_ERROR", 400, details);
    this.name = "UploadError";
  }
}

export class ValidationError extends MediaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

export class StorageError extends MediaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "STORAGE_ERROR", 500, details);
    this.name = "StorageError";
  }
}

export class NotFoundError extends MediaError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, "NOT_FOUND", 404, { entity, id });
    this.name = "NotFoundError";
  }
}
