import type postgres from "postgres";

export interface ActionDefinition {
  type: string;
  config: Record<string, unknown>;
  order: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  actions: ActionDefinition[];
  version: number;
  isActive: boolean;
  maxRetries: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowVersion: number;
  triggerType: string;
  triggerEntityId: string | null;
  triggerPayload: Record<string, unknown>;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  retryCount: number;
  nextRetryAt: string | null;
  createdAt: string;
}

export interface WorkflowLog {
  id: string;
  runId: string;
  actionType: string;
  actionOrder: number;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ActionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * Persistence context handed to action handlers by the engine. Handlers
 * that write real rows (timeline events, CRM activities) use `ctx.sql`;
 * handlers without a destination table ignore it. Optional so existing
 * direct callers (tests, scripts) keep working.
 */
export interface ActionContext {
  sql: postgres.Sql;
}

export type ActionHandler = (
  config: Record<string, unknown>,
  triggerPayload: Record<string, unknown>,
  ctx?: ActionContext,
) => Promise<ActionResult>;

export interface TriggerPayload {
  triggerType: string;
  entityId?: string;
  payload: Record<string, unknown>;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WorkflowFilters {
  page?: number;
  pageSize?: number;
  triggerType?: string;
  isActive?: boolean;
  search?: string;
}

export interface WorkflowRunFilters {
  page?: number;
  pageSize?: number;
  status?: string;
  workflowId?: string;
}
