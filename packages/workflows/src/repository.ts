import postgres from "postgres";
import type { WorkflowDefinition, WorkflowRun, WorkflowLog, ListResponse, WorkflowFilters, WorkflowRunFilters, ActionDefinition } from "./types";

function toCamelCase(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

function jsonOrNull(v: unknown): string {
  return v !== null && v !== undefined ? JSON.stringify(v) : "null";
}

export class WorkflowRepository {
  constructor(private sql: postgres.Sql) {}

  async listWorkflows(filters: WorkflowFilters): Promise<ListResponse<WorkflowDefinition>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;
    const conditions: string[] = [];
    const params: postgres.ParameterOrJSON<never>[] = [];
    let idx = 1;

    if (filters.triggerType) { conditions.push(`trigger_type = $${idx++}`); params.push(filters.triggerType); }
    if (filters.isActive !== undefined) { conditions.push(`is_active = $${idx++}`); params.push(filters.isActive); }
    if (filters.search) { conditions.push(`name ILIKE $${idx++}`); params.push(`%${filters.search}%`); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await this.sql.unsafe<{ count: string }[]>(`SELECT COUNT(*) as count FROM workflows ${where}`, params);
    const total = parseInt(countResult[0]?.count || "0", 10);

    const rows = await this.sql.unsafe<Record<string, unknown>[]>(
      `SELECT * FROM workflows ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset],
    );

    return { items: rows.map((r) => toCamelCase(r) as unknown as WorkflowDefinition), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getWorkflow(id: string): Promise<WorkflowDefinition | null> {
    const rows = await this.sql.unsafe<Record<string, unknown>[]>(
      "SELECT * FROM workflows WHERE id = $1",
      [id],
    );
    return rows[0] ? (toCamelCase(rows[0]) as unknown as WorkflowDefinition) : null;
  }

  async createWorkflow(data: {
    name: string;
    triggerType: string;
    triggerConfig: Record<string, unknown>;
    actions: ActionDefinition[];
    isActive?: boolean;
    maxRetries?: number;
    createdBy?: string;
  }): Promise<WorkflowDefinition> {
    const rows = await this.sql.unsafe<Record<string, unknown>[]>(
      `INSERT INTO workflows (name, trigger_type, trigger_config, actions, is_active, max_retries, created_by, version)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, 1)
       RETURNING *`,
      [
        data.name,
        data.triggerType,
        jsonOrNull(data.triggerConfig || {}),
        jsonOrNull(data.actions || []),
        data.isActive ?? true,
        data.maxRetries ?? 3,
        data.createdBy || null,
      ].map((v) => v ?? null),
    );
    return toCamelCase(rows[0]!) as unknown as WorkflowDefinition;
  }

  async updateWorkflow(id: string, data: {
    name?: string; triggerType?: string; triggerConfig?: Record<string, unknown>;
    actions?: ActionDefinition[]; isActive?: boolean; maxRetries?: number;
  }): Promise<WorkflowDefinition | null> {
    const current = await this.getWorkflow(id);
    if (!current) return null;

    const sets: string[] = [];
    const params: postgres.ParameterOrJSON<never>[] = [];
    let idx = 1;

    if (data.name !== undefined) { sets.push(`name = $${idx++}`); params.push(data.name); }
    if (data.triggerType !== undefined) { sets.push(`trigger_type = $${idx++}`); params.push(data.triggerType); }
    if (data.triggerConfig !== undefined) { sets.push(`trigger_config = $${idx++}::jsonb`); params.push(jsonOrNull(data.triggerConfig)); }
    if (data.actions !== undefined) { sets.push(`actions = $${idx++}::jsonb`); params.push(jsonOrNull(data.actions)); }
    if (data.isActive !== undefined) { sets.push(`is_active = $${idx++}`); params.push(data.isActive); }
    if (data.maxRetries !== undefined) { sets.push(`max_retries = $${idx++}`); params.push(data.maxRetries); }
    sets.push("version = version + 1, updated_at = NOW()");

    params.push(id);
    const rows = await this.sql.unsafe<Record<string, unknown>[]>(
      `UPDATE workflows SET ${sets.join(", ")} WHERE id = $${idx++} RETURNING *`,
      params.map((v) => v ?? null),
    );
    return rows[0] ? (toCamelCase(rows[0]) as unknown as WorkflowDefinition) : null;
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    // No FK cascade exists on workflow_runs/logs, so remove the run
    // history explicitly — otherwise deleting a workflow orphans runs
    // that still show up on the Runs pages.
    await this.sql.unsafe(
      "DELETE FROM workflow_logs WHERE run_id IN (SELECT id FROM workflow_runs WHERE workflow_id = $1)",
      [id],
    );
    await this.sql.unsafe("DELETE FROM workflow_runs WHERE workflow_id = $1", [id]);
    const result = await this.sql.unsafe<{ count: string }[]>(
      "DELETE FROM workflows WHERE id = $1 RETURNING id", [id],
    );
    return result.length > 0;
  }

  async findActiveWorkflowsByTrigger(triggerType: string): Promise<WorkflowDefinition[]> {
    const rows = await this.sql.unsafe<Record<string, unknown>[]>(
      "SELECT * FROM workflows WHERE trigger_type = $1 AND is_active = true ORDER BY created_at ASC",
      [triggerType],
    );
    return rows.map((r) => toCamelCase(r) as unknown as WorkflowDefinition);
  }

  async createRun(data: {
    workflowId: string; workflowVersion: number; triggerType: string;
    triggerEntityId?: string; triggerPayload: Record<string, unknown>;
  }): Promise<WorkflowRun> {
    const rows = await this.sql.unsafe<Record<string, unknown>[]>(
      `INSERT INTO workflow_runs (workflow_id, workflow_version, trigger_type, trigger_entity_id, trigger_payload, status)
       VALUES ($1, $2, $3, $4, $5::jsonb, 'pending')
       RETURNING *`,
      [data.workflowId, data.workflowVersion, data.triggerType, data.triggerEntityId || null, jsonOrNull(data.triggerPayload)]
        .map((v) => v ?? null),
    );
    return toCamelCase(rows[0]!) as unknown as WorkflowRun;
  }

  async updateRunStatus(id: string, status: string, extra?: {
    startedAt?: string; completedAt?: string; retryCount?: number; nextRetryAt?: string | null;
  }): Promise<void> {
    const sets: string[] = []; const params: postgres.ParameterOrJSON<never>[] = []; let idx = 1;
    sets.push(`status = $${idx++}`); params.push(status);
    if (extra?.startedAt) { sets.push(`started_at = $${idx++}`); params.push(extra.startedAt); }
    if (extra?.completedAt) { sets.push(`completed_at = $${idx++}`); params.push(extra.completedAt); }
    if (extra?.retryCount !== undefined) { sets.push(`retry_count = $${idx++}`); params.push(extra.retryCount); }
    // "nextRetryAt" in extra (even as null) means set/clear it; absent means leave it alone.
    if (extra && "nextRetryAt" in extra) { sets.push(`next_retry_at = $${idx++}`); params.push(extra.nextRetryAt ?? null); }
    params.push(id);
    await this.sql.unsafe(`UPDATE workflow_runs SET ${sets.join(", ")} WHERE id = $${idx++}`, params.map((v) => v ?? null));
  }

  async listRuns(filters: WorkflowRunFilters): Promise<ListResponse<WorkflowRun>> {
    const page = filters.page || 1; const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize; const conditions: string[] = []; const params: postgres.ParameterOrJSON<never>[] = []; let idx = 1;
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    if (filters.workflowId) { conditions.push(`workflow_id = $${idx++}`); params.push(filters.workflowId); }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await this.sql.unsafe<{ count: string }[]>(`SELECT COUNT(*) as count FROM workflow_runs ${where}`, params);
    const total = parseInt(countResult[0]?.count || "0", 10);
    const rows = await this.sql.unsafe<Record<string, unknown>[]>(
      `SELECT * FROM workflow_runs ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset].map((v) => v ?? null),
    );
    return { items: rows.map((r) => toCamelCase(r) as unknown as WorkflowRun), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getRun(id: string): Promise<WorkflowRun | null> {
    const rows = await this.sql.unsafe<Record<string, unknown>[]>(
      "SELECT * FROM workflow_runs WHERE id = $1", [id],
    );
    return rows[0] ? (toCamelCase(rows[0]) as unknown as WorkflowRun) : null;
  }

  async getLogsByRun(runId: string): Promise<WorkflowLog[]> {
    const rows = await this.sql.unsafe<Record<string, unknown>[]>(
      "SELECT * FROM workflow_logs WHERE run_id = $1 ORDER BY action_order ASC", [runId],
    );
    return rows.map((r) => toCamelCase(r) as unknown as WorkflowLog);
  }

  async createLog(data: {
    runId: string; actionType: string; actionOrder: number; status: string;
    input: Record<string, unknown>; output?: Record<string, unknown>; error?: string;
    startedAt?: string; completedAt?: string;
  }): Promise<WorkflowLog> {
    const rows = await this.sql.unsafe<Record<string, unknown>[]>(
      `INSERT INTO workflow_logs (run_id, action_type, action_order, status, input, output, error, started_at, completed_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9) RETURNING *`,
      [
        data.runId, data.actionType, data.actionOrder, data.status,
        jsonOrNull(data.input), jsonOrNull(data.output || {}),
        data.error || null, data.startedAt || null, data.completedAt || null,
      ].map((v) => v ?? null),
    );
    return toCamelCase(rows[0]!) as unknown as WorkflowLog;
  }

  async updateLog(id: string, data: {
    status?: string; output?: Record<string, unknown>; error?: string; completedAt?: string;
  }): Promise<void> {
    const sets: string[] = []; const params: postgres.ParameterOrJSON<never>[] = []; let idx = 1;
    if (data.status) { sets.push(`status = $${idx++}`); params.push(data.status); }
    if (data.output) { sets.push(`output = $${idx++}::jsonb`); params.push(jsonOrNull(data.output)); }
    if (data.error !== undefined) { sets.push(`error = $${idx++}`); params.push(data.error || null); }
    if (data.completedAt) { sets.push(`completed_at = $${idx++}`); params.push(data.completedAt); }
    if (sets.length === 0) return;
    params.push(id);
    await this.sql.unsafe(`UPDATE workflow_logs SET ${sets.join(", ")} WHERE id = $${idx++}`, params.map((v) => v ?? null));
  }

  async getPendingRuns(): Promise<WorkflowRun[]> {
    const rows = await this.sql.unsafe<Record<string, unknown>[]>(
      `SELECT * FROM workflow_runs WHERE status = 'pending'
       AND (next_retry_at IS NULL OR next_retry_at <= NOW())
       ORDER BY created_at ASC LIMIT 1`,
    );
    return rows.map((r) => toCamelCase(r) as unknown as WorkflowRun);
  }

  async getCompletedLogsByRun(runId: string): Promise<WorkflowLog[]> {
    const rows = await this.sql.unsafe<Record<string, unknown>[]>(
      "SELECT * FROM workflow_logs WHERE run_id = $1 AND status = 'completed' ORDER BY action_order ASC", [runId],
    );
    return rows.map((r) => toCamelCase(r) as unknown as WorkflowLog);
  }

  /** Exposes the underlying connection so the engine can hand action
   *  handlers a persistence context (handlers that write real rows). */
  getSql(): postgres.Sql {
    return this.sql;
  }

  async close(): Promise<void> {
    await this.sql.end();
  }
}
