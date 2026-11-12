export class PortalError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "PortalError";
  }
}

export class AuthError extends PortalError {
  constructor(message: string) {
    super(message, "AUTH_ERROR");
  }
}

export class NotFoundError extends PortalError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, "NOT_FOUND");
  }
}

export class AccessDeniedError extends PortalError {
  constructor(message = "Access denied") {
    super(message, "ACCESS_DENIED");
  }
}
