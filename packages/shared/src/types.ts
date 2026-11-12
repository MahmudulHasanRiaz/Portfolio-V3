export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

export class ApiError extends DomainError {
  constructor(
    message: string,
    code: string,
    statusCode: number = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message, code, statusCode);
    this.name = "ApiError";
  }
}

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: Record<string, unknown>;
}

export type EntityStatus = "draft" | "published" | "archived";

export type SortDirection = "asc" | "desc";

export interface SortParams {
  field: string;
  direction: SortDirection;
}

export interface QueryParams {
  pagination?: PaginationParams;
  sort?: SortParams;
  search?: string;
  filters?: Record<string, unknown>;
}
