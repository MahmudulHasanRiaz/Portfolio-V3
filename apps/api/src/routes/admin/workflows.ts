// Admin workflows — Hono port of apps/admin/src/app/api/workflows/*/route.ts
// (list/create, [id] get/patch/delete, process, runs, runs/[id],
// runs/[id]/retry, trigger-test).
//
// Mounted at /api/admin/workflows (see routes/admin/index.ts).
//
// Workers-safety verdict: @repo/workflows is NOT Workers-safe —
// createWorkflowService opens a postgres.js pool
// (`postgres(connectionString, { max: 10 })`), the repository issues
// raw `sql.unsafe(...)` calls over that TCP client, and the engine
// hands action handlers `{ sql: postgres.Sql }`. The repository,
// engine, trigger registry and all eight action handlers are therefore
// re-implemented here with direct Drizzle over getApiDb() (Neon HTTP).
// Behaviour is preserved verbatim: same queries, same run/status
// state machine, same retry/backoff maths, same response shapes.
// Neon HTTP does not support db.transaction(): the multi-statement
// deleteWorkflow (logs → runs → workflow) runs as sequential
// statements, as do the engine's per-action writes.
//
// Fidelity notes:
// - [id] is GET + PATCH + DELETE in the source (the task brief said
//   PUT; the source uses PATCH — PATCH is preserved).
// - POST /process and POST /runs/:id/retry execute runs SYNCHRONOUSLY
//   in-request, exactly as in the original (see the TODO (cutover)
//   markers — Workers max duration is a cutover concern).
// - POST /trigger-test only DISPATCHES (creates pending runs for the
//   matching active workflows); it does not execute them. The inventory
//   calls this "synchronous dispatch" — the dispatch itself only
//   records runs; execution happens via /process or the cron tick.
// - The two DB-writing action handlers (create_timeline_event,
//   create_crm_activity) previously took an optional `ctx.sql` and had
//   a no-persistence fallback (persisted:false) for direct/test
//   callers. In this port the engine always passes the Drizzle db, so
//   that fallback branch is dead and is omitted; the handlers always
//   persist. The other six handlers are pure and copied verbatim.
// - The BackgroundWorker's in-memory `isProcessing` guard is omitted:
//   the original created a fresh service (and worker) per request, so
//   the guard could never trigger across requests anyway.
// - `dispatchTrigger` / `purgePublicCache` / search-indexer side
//   effects are NOT wired here (cutover), matching the other routers.
import { Hono } from "hono";
import { and, asc, count, desc, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { uuidSchema } from "@repo/validation";
import {
  leadActivities,
  timelineEvents,
  workflowLogs,
  workflowRuns,
  workflows,
} from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";
import {
  invalidParam,
  isRecord,
  parsePagination,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../lib/validate";

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
  };
};

type Db = ReturnType<typeof getApiDb>;

type WorkflowRow = typeof workflows.$inferSelect;
type WorkflowRunRow = typeof workflowRuns.$inferSelect;
type WorkflowLogRow = typeof workflowLogs.$inferSelect;

const app = new Hono<Env>();

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

// ─── Repository (packages/workflows/src/repository.ts, Drizzle port) ─────────
// The original returned snake_case rows converted with toCamelCase;
// Drizzle rows are already keyed by the schema's camelCase property
// names, so no conversion is needed. Timestamps are Date objects in
// both drivers and serialise to ISO strings the same way.

interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ActionDefinition {
  type: string;
  config: Record<string, unknown>;
  order: number;
}

async function listWorkflows(
  db: Db,
  filters: {
    triggerType?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<ListResponse<WorkflowRow>> {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const conditions: ReturnType<typeof eq>[] = [];
  if (filters.triggerType) {
    conditions.push(eq(workflows.triggerType, filters.triggerType));
  }
  if (filters.isActive !== undefined) {
    conditions.push(eq(workflows.isActive, filters.isActive));
  }
  if (filters.search) {
    conditions.push(ilike(workflows.name, `%${filters.search}%`));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: count() })
    .from(workflows)
    .where(where);
  const total = Number(countResult?.count ?? 0);

  const items = await db
    .select()
    .from(workflows)
    .where(where)
    .orderBy(desc(workflows.createdAt))
    .limit(pageSize)
    .offset(offset);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

async function getWorkflow(db: Db, id: string): Promise<WorkflowRow | null> {
  const [row] = await db
    .select()
    .from(workflows)
    .where(eq(workflows.id, id))
    .limit(1);
  return row || null;
}

async function createWorkflow(
  db: Db,
  data: {
    name: string;
    triggerType: string;
    triggerConfig: Record<string, unknown>;
    actions: ActionDefinition[];
    isActive?: boolean;
    maxRetries?: number;
    createdBy?: string;
  },
): Promise<WorkflowRow> {
  const [row] = await db
    .insert(workflows)
    .values({
      name: data.name,
      triggerType: data.triggerType,
      triggerConfig: data.triggerConfig || {},
      actions: data.actions || [],
      isActive: data.isActive ?? true,
      maxRetries: data.maxRetries ?? 3,
      createdBy: data.createdBy || null,
    })
    .returning();
  if (!row) throw new Error("Failed to create workflow");
  return row;
}

async function updateWorkflow(
  db: Db,
  id: string,
  data: {
    name?: string;
    triggerType?: string;
    triggerConfig?: Record<string, unknown>;
    actions?: ActionDefinition[];
    isActive?: boolean;
    maxRetries?: number;
  },
): Promise<WorkflowRow | null> {
  const current = await getWorkflow(db, id);
  if (!current) return null;

  const [row] = await db
    .update(workflows)
    .set({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.triggerType !== undefined
        ? { triggerType: data.triggerType }
        : {}),
      ...(data.triggerConfig !== undefined
        ? { triggerConfig: data.triggerConfig }
        : {}),
      ...(data.actions !== undefined ? { actions: data.actions } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.maxRetries !== undefined
        ? { maxRetries: data.maxRetries }
        : {}),
      // Always bumped, even when nothing else changes — as in the original.
      version: sql`${workflows.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(workflows.id, id))
    .returning();
  return row || null;
}

async function deleteWorkflow(db: Db, id: string): Promise<boolean> {
  // No FK cascade exists on workflow_runs/logs, so remove the run
  // history explicitly — otherwise deleting a workflow orphans runs
  // that still show up on the Runs pages. Sequential statements:
  // Neon HTTP has no transaction support, so this is not atomic.
  const runIds = await db
    .select({ id: workflowRuns.id })
    .from(workflowRuns)
    .where(eq(workflowRuns.workflowId, id));
  for (const run of runIds) {
    await db.delete(workflowLogs).where(eq(workflowLogs.runId, run.id));
  }
  await db.delete(workflowRuns).where(eq(workflowRuns.workflowId, id));
  const deleted = await db
    .delete(workflows)
    .where(eq(workflows.id, id))
    .returning({ id: workflows.id });
  return deleted.length > 0;
}

async function findActiveWorkflowsByTrigger(
  db: Db,
  triggerType: string,
): Promise<WorkflowRow[]> {
  return db
    .select()
    .from(workflows)
    .where(
      and(
        eq(workflows.triggerType, triggerType),
        eq(workflows.isActive, true),
      ),
    )
    .orderBy(asc(workflows.createdAt));
}

async function createRun(
  db: Db,
  data: {
    workflowId: string;
    workflowVersion: number;
    triggerType: string;
    triggerEntityId?: string;
    triggerPayload: Record<string, unknown>;
  },
): Promise<WorkflowRunRow> {
  const [row] = await db
    .insert(workflowRuns)
    .values({
      workflowId: data.workflowId,
      workflowVersion: data.workflowVersion,
      triggerType: data.triggerType,
      triggerEntityId: data.triggerEntityId || null,
      triggerPayload: data.triggerPayload,
      status: "pending",
    })
    .returning();
  if (!row) throw new Error("Failed to create workflow run");
  return row;
}

async function updateRunStatus(
  db: Db,
  id: string,
  status: string,
  extra?: {
    startedAt?: Date;
    completedAt?: Date;
    retryCount?: number;
    nextRetryAt?: Date | null;
  },
): Promise<void> {
  const set: Partial<typeof workflowRuns.$inferInsert> = { status };
  if (extra?.startedAt) set.startedAt = extra.startedAt;
  if (extra?.completedAt) set.completedAt = extra.completedAt;
  if (extra?.retryCount !== undefined) set.retryCount = extra.retryCount;
  // "nextRetryAt" in extra (even as null) means set/clear it; absent
  // means leave it alone.
  if (extra && "nextRetryAt" in extra) {
    set.nextRetryAt = extra.nextRetryAt ?? null;
  }
  await db.update(workflowRuns).set(set).where(eq(workflowRuns.id, id));
}

async function listRuns(
  db: Db,
  filters: {
    status?: string;
    workflowId?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<ListResponse<WorkflowRunRow>> {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const conditions: ReturnType<typeof eq>[] = [];
  if (filters.status) conditions.push(eq(workflowRuns.status, filters.status));
  if (filters.workflowId) {
    conditions.push(eq(workflowRuns.workflowId, filters.workflowId));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: count() })
    .from(workflowRuns)
    .where(where);
  const total = Number(countResult?.count ?? 0);

  const items = await db
    .select()
    .from(workflowRuns)
    .where(where)
    .orderBy(desc(workflowRuns.createdAt))
    .limit(pageSize)
    .offset(offset);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

async function getRun(db: Db, id: string): Promise<WorkflowRunRow | null> {
  const [row] = await db
    .select()
    .from(workflowRuns)
    .where(eq(workflowRuns.id, id))
    .limit(1);
  return row || null;
}

async function getLogsByRun(db: Db, runId: string): Promise<WorkflowLogRow[]> {
  return db
    .select()
    .from(workflowLogs)
    .where(eq(workflowLogs.runId, runId))
    .orderBy(asc(workflowLogs.actionOrder));
}

async function createLog(
  db: Db,
  data: {
    runId: string;
    actionType: string;
    actionOrder: number;
    status: string;
    input: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
  },
): Promise<WorkflowLogRow> {
  const [row] = await db
    .insert(workflowLogs)
    .values({
      runId: data.runId,
      actionType: data.actionType,
      actionOrder: data.actionOrder,
      status: data.status,
      input: data.input,
      output: data.output || {},
      error: data.error || null,
      startedAt: data.startedAt || null,
      completedAt: data.completedAt || null,
    })
    .returning();
  if (!row) throw new Error("Failed to create workflow log");
  return row;
}

async function updateLog(
  db: Db,
  id: string,
  data: {
    status?: string;
    output?: Record<string, unknown>;
    error?: string;
    completedAt?: Date;
  },
): Promise<void> {
  const set: Partial<typeof workflowLogs.$inferInsert> = {};
  if (data.status) set.status = data.status;
  if (data.output) set.output = data.output;
  if (data.error !== undefined) set.error = data.error || null;
  if (data.completedAt) set.completedAt = data.completedAt;
  if (Object.keys(set).length === 0) return;
  await db.update(workflowLogs).set(set).where(eq(workflowLogs.id, id));
}

async function getPendingRuns(db: Db): Promise<WorkflowRunRow[]> {
  return db
    .select()
    .from(workflowRuns)
    .where(
      and(
        eq(workflowRuns.status, "pending"),
        sql`${workflowRuns.nextRetryAt} IS NULL OR ${workflowRuns.nextRetryAt} <= NOW()`,
      ),
    )
    .orderBy(asc(workflowRuns.createdAt))
    .limit(1);
}

async function getCompletedLogsByRun(
  db: Db,
  runId: string,
): Promise<WorkflowLogRow[]> {
  return db
    .select()
    .from(workflowLogs)
    .where(
      and(
        eq(workflowLogs.runId, runId),
        eq(workflowLogs.status, "completed"),
      ),
    )
    .orderBy(asc(workflowLogs.actionOrder));
}

// ─── Action handlers (packages/workflows/src/actions/*) ─────────────────────
// The six pure handlers are copied verbatim. The two DB-writing handlers
// use Drizzle inserts instead of ctx.sql.unsafe; the db is always
// provided by the engine in this port (see the file header).

interface ActionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

type ActionHandler = (
  config: Record<string, unknown>,
  triggerPayload: Record<string, unknown>,
  db: Db,
) => Promise<ActionResult>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createTask: ActionHandler = async (config) => {
  const { title, description, assigneeId, dueInDays } = config as {
    title?: string;
    description?: string;
    assigneeId?: string;
    dueInDays?: number;
  };

  if (!title) {
    return { success: false, error: "Task title is required" };
  }

  return {
    success: true,
    data: {
      title,
      description: description || "",
      assigneeId: assigneeId || null,
      dueInDays: dueInDays || null,
      status: "pending",
      createdAt: new Date().toISOString(),
    },
  };
};

const createTimelineEvent: ActionHandler = async (
  config,
  triggerPayload,
  db,
) => {
  const { entityType, entityId, eventType, description, title } = config as {
    entityType?: string;
    entityId?: string;
    eventType?: string;
    description?: string;
    title?: string;
  };

  const resolvedEntityId = entityId || (triggerPayload.entityId as string) || "";

  if (!entityType || !resolvedEntityId) {
    return { success: false, error: "Entity type and entity ID are required" };
  }

  const resolvedTitle = title || description || eventType || "workflow_action";
  const resolvedEventType = eventType || "workflow_action";

  if (!UUID_RE.test(resolvedEntityId)) {
    return {
      success: false,
      error: `Entity ID is not a UUID, cannot link timeline event: ${resolvedEntityId}`,
    };
  }

  try {
    const [row] = await db
      .insert(timelineEvents)
      .values({
        sourceType: entityType,
        sourceId: resolvedEntityId,
        eventType: resolvedEventType,
        title: resolvedTitle,
        description: description || null,
        eventDate: sql`CURRENT_DATE`,
      })
      .returning({ id: timelineEvents.id });
    return {
      success: true,
      data: {
        id: row?.id,
        entityType,
        entityId: resolvedEntityId,
        eventType: resolvedEventType,
        title: resolvedTitle,
        description: description || "",
        persisted: true,
        createdAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to create timeline event: ${errorMessage(err)}`,
    };
  }
};

const createCrmActivity: ActionHandler = async (
  config,
  triggerPayload,
  db,
) => {
  const { leadId: configLeadId, activityType, description } = config as {
    leadId?: string;
    activityType?: string;
    description?: string;
  };

  // Lead id: explicit config first, then the trigger payload. Note: a bare
  // payload.id is deliberately NOT used — for non-lead triggers that id
  // belongs to another entity (content, invoice, ...) and would log a
  // bogus activity against a wrong lead.
  const lead = triggerPayload.lead as Record<string, unknown> | undefined;
  const leadId =
    configLeadId ||
    (triggerPayload.leadId as string) ||
    (triggerPayload.lead_id as string) ||
    (typeof lead?.id === "string" ? lead.id : "") ||
    (triggerPayload.entityId as string) ||
    "";

  if (!leadId) {
    return { success: false, error: "Lead ID is required for CRM activity" };
  }

  const resolvedType = activityType || "note";
  const resolvedDescription = description || "Workflow-triggered activity";

  if (!UUID_RE.test(leadId)) {
    return {
      success: false,
      error: `Lead ID is not a UUID, cannot log CRM activity: ${leadId}`,
    };
  }

  try {
    const [row] = await db
      .insert(leadActivities)
      .values({
        leadId,
        activityType: resolvedType,
        description: resolvedDescription,
        metadata: { source: "workflow" },
      })
      .returning({ id: leadActivities.id });
    return {
      success: true,
      data: {
        id: row?.id,
        leadId,
        activityType: resolvedType,
        description: resolvedDescription,
        persisted: true,
        createdAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to create CRM activity: ${errorMessage(err)}`,
    };
  }
};

const sendNotification: ActionHandler = async (config) => {
  const { userId, title, body, type } = config as {
    userId?: string;
    title?: string;
    body?: string;
    type?: string;
  };

  if (!userId || !title) {
    return {
      success: false,
      error: "User ID and title are required for notification",
    };
  }

  return {
    success: true,
    data: {
      userId,
      title,
      body: body || "",
      type: type || "info",
      read: false,
      createdAt: new Date().toISOString(),
    },
  };
};

const assignUser: ActionHandler = async (config, triggerPayload) => {
  const { entityType, entityId: configEntityId, userId } = config as {
    entityType?: string;
    entityId?: string;
    userId?: string;
  };

  const entityId = configEntityId || (triggerPayload.entityId as string) || "";

  if (!entityType || !entityId || !userId) {
    return {
      success: false,
      error: "Entity type, entity ID, and user ID are required",
    };
  }

  return {
    success: true,
    data: {
      entityType,
      entityId,
      userId,
      assignedAt: new Date().toISOString(),
    },
  };
};

const updateStatus: ActionHandler = async (config, triggerPayload) => {
  const { entityType, entityId: configEntityId, newStatus } = config as {
    entityType?: string;
    entityId?: string;
    newStatus?: string;
  };

  const entityId = configEntityId || (triggerPayload.entityId as string) || "";

  if (!entityType || !entityId || !newStatus) {
    return {
      success: false,
      error: "Entity type, entity ID, and new status are required",
    };
  }

  return {
    success: true,
    data: {
      entityType,
      entityId,
      oldStatus: null,
      newStatus,
      updatedAt: new Date().toISOString(),
    },
  };
};

const createFollowUp: ActionHandler = async (config) => {
  const { daysFromNow, note, assigneeId } = config as {
    daysFromNow?: number;
    note?: string;
    assigneeId?: string;
  };

  const days = daysFromNow || 1;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);

  return {
    success: true,
    data: {
      dueDate: dueDate.toISOString(),
      note: note || "",
      assigneeId: assigneeId || null,
      daysFromNow: days,
    },
  };
};

const triggerWebhook: ActionHandler = async (config, triggerPayload) => {
  const { url, method, headers, bodyTemplate } = config as {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    bodyTemplate?: string;
  };

  if (!url) {
    return { success: false, error: "Webhook URL is required" };
  }

  try {
    const resolvedBody = bodyTemplate
      ? JSON.parse(
          bodyTemplate.replace(/\{\{(\w+)\}\}/g, (_, key) =>
            String(triggerPayload[key] ?? ""),
          ),
        )
      : triggerPayload;

    const response = await fetch(url, {
      method: (method || "POST") as "GET" | "POST",
      headers: {
        "Content-Type": "application/json",
        ...(headers || {}),
      },
      body: method === "GET" ? undefined : JSON.stringify(resolvedBody),
    });

    return {
      success: response.ok,
      data: {
        statusCode: response.status,
        statusText: response.statusText,
      },
      error: response.ok ? undefined : `Webhook returned ${response.status}`,
    };
  } catch (err) {
    return {
      success: false,
      error: `Webhook call failed: ${errorMessage(err)}`,
    };
  }
};

const actionRegistry: Record<string, ActionHandler> = {
  create_task: createTask,
  create_timeline_event: createTimelineEvent,
  create_crm_activity: createCrmActivity,
  send_notification: sendNotification,
  assign_user: assignUser,
  update_status: updateStatus,
  create_follow_up: createFollowUp,
  trigger_webhook: triggerWebhook,
};

function getActionHandler(type: string): ActionHandler | undefined {
  return actionRegistry[type];
}

function getRegisteredActions(): string[] {
  return Object.keys(actionRegistry);
}

// ─── Engine (packages/workflows/src/engine.ts, Drizzle port) ────────────────

async function executeRun(db: Db, run: WorkflowRunRow): Promise<void> {
  const workflow = await getWorkflow(db, run.workflowId);
  if (!workflow) {
    await updateRunStatus(db, run.id, "failed", {
      completedAt: new Date(),
    });
    return;
  }

  await updateRunStatus(db, run.id, "running", { startedAt: new Date() });

  const completedLogs = await getCompletedLogsByRun(db, run.id);
  const completedOrders = new Set(completedLogs.map((l) => l.actionOrder));

  const actionsRaw: ActionDefinition[] =
    typeof workflow.actions === "string"
      ? (JSON.parse(workflow.actions as unknown as string) as ActionDefinition[])
      : workflow.actions;
  const actions = [...actionsRaw].sort((a, b) => a.order - b.order);
  let allSucceeded = true;
  let failedActionOrder = -1;

  for (const action of actions) {
    if (completedOrders.has(action.order)) continue;

    const handler = getActionHandler(action.type);
    if (!handler) {
      failedActionOrder = action.order;
      allSucceeded = false;
      await createLog(db, {
        runId: run.id,
        actionType: action.type,
        actionOrder: action.order,
        status: "failed",
        input: action.config,
        error: `Unknown action type: ${action.type}`,
      });
      break;
    }

    const log = await createLog(db, {
      runId: run.id,
      actionType: action.type,
      actionOrder: action.order,
      status: "running",
      input: action.config,
      startedAt: new Date(),
    });

    // Handlers resolve ids from the payload, so merge the run's own
    // trigger identity in (triggerPayload alone has neither entityId
    // nor triggerType — they live on the run row).
    const parsedPayload =
      typeof run.triggerPayload === "string"
        ? (JSON.parse(run.triggerPayload as unknown as string) as Record<
            string,
            unknown
          >)
        : (run.triggerPayload || {});
    const payload: Record<string, unknown> = {
      ...parsedPayload,
      entityId: run.triggerEntityId ?? parsedPayload.entityId,
      triggerType: run.triggerType,
    };
    const result = await handler(action.config, payload, db);

    if (result.success) {
      await updateLog(db, log.id, {
        status: "completed",
        output: result.data || {},
        completedAt: new Date(),
      });
    } else {
      failedActionOrder = action.order;
      allSucceeded = false;
      await updateLog(db, log.id, {
        status: "failed",
        error: result.error,
        completedAt: new Date(),
      });
      break;
    }
  }

  const now = new Date();

  if (allSucceeded) {
    await updateRunStatus(db, run.id, "completed", { completedAt: now });
  } else {
    const newRetryCount = (run.retryCount || 0) + 1;
    if (newRetryCount < (workflow.maxRetries || 3)) {
      const backoffMinutes = Math.pow(newRetryCount, 2);
      const nextRetry = new Date();
      nextRetry.setMinutes(nextRetry.getMinutes() + backoffMinutes);
      await updateRunStatus(db, run.id, "pending", {
        retryCount: newRetryCount,
        nextRetryAt: nextRetry,
      });
    } else {
      const hadCompletedActions =
        completedOrders.size > 0 || failedActionOrder > 0;
      await updateRunStatus(
        db,
        run.id,
        hadCompletedActions ? "partially_failed" : "failed",
        {
          completedAt: now,
          retryCount: newRetryCount,
        },
      );
    }
  }
}

// ─── Worker + trigger registry ───────────────────────────────────────────────
// (packages/workflows/src/worker.ts processNext and
// trigger-registry.ts dispatch, Drizzle port.)

// Exported for the cron tick (routes/admin/cron.ts) — the same
// single-run worker the /process route uses.
export async function processNextRun(
  db: Db,
): Promise<{ processed: boolean; runId?: string; status?: string }> {
  const pendingRuns = await getPendingRuns(db);
  if (pendingRuns.length === 0) {
    return { processed: false };
  }

  const run = pendingRuns[0]!;
  await executeRun(db, run);

  const updatedRun = await getRun(db, run.id);
  return { processed: true, runId: run.id, status: updatedRun?.status };
}

async function dispatchTrigger(
  db: Db,
  trigger: {
    triggerType: string;
    entityId?: string;
    payload: Record<string, unknown>;
  },
): Promise<{ triggered: number; runIds: string[] }> {
  const workflowList = await findActiveWorkflowsByTrigger(db, trigger.triggerType);
  const runIds: string[] = [];

  for (const workflow of workflowList) {
    const run = await createRun(db, {
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      triggerType: trigger.triggerType,
      triggerEntityId: trigger.entityId,
      triggerPayload: trigger.payload,
    });
    runIds.push(run.id);
  }

  return { triggered: workflowList.length, runIds };
}

// Local schemas — no workflow schemas exist in @repo/validation.
// Trigger/action enums are the resolved lists from the DB schema and
// the action registry below (AVAILABLE_TRIGGERS / actionRegistry).
// Per-type action `config` shapes are NOT validated (plain record) —
// that is a known limitation: a mistyped config only fails at run
// execution, not at workflow creation.
const workflowTriggerTypeSchema = z.enum([
  "lead_created",
  "lead_status_changed",
  "form_submitted",
  "content_published",
  "venture_published",
  "release_published",
  "proposal_accepted",
  "invoice_paid",
  "payment_received",
  "portal_message_received",
]);
const workflowActionTypeSchema = z.enum([
  "create_task",
  "create_timeline_event",
  "create_crm_activity",
  "send_notification",
  "assign_user",
  "update_status",
  "create_follow_up",
  "trigger_webhook",
]);
const workflowActionSchema = z.object({
  type: workflowActionTypeSchema,
  config: z.record(z.string(), z.unknown()),
  order: z.number().int(),
});
const createWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  triggerType: workflowTriggerTypeSchema,
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  actions: z.array(workflowActionSchema).optional().default([]),
  isActive: z.boolean().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});
const updateWorkflowSchema = createWorkflowSchema.partial();
const triggerTestSchema = z.object({
  triggerType: workflowTriggerTypeSchema,
  entityId: uuidSchema.optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});
// Verified against the workflowRunStatus pgEnum
// (packages/database/src/schema/enums.ts): pending|running|completed|
// failed|partially_failed.
const workflowRunStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "partially_failed",
]);

/** Validated data restricted to keys the client actually sent. Needed
 *  for PATCH: updateWorkflowSchema is createWorkflowSchema.partial()
 *  and `actions` carries a .default([]), which Zod fires even when
 *  the client sent nothing — without this filter every PATCH would
 *  silently wipe the workflow's actions. */
function sentFields(
  data: Record<string, unknown>,
  body: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key in body) out[key] = value;
  }
  return out;
}

const AVAILABLE_TRIGGERS = [
  "lead_created",
  "lead_status_changed",
  "form_submitted",
  "content_published",
  "venture_published",
  "release_published",
  "proposal_accepted",
  "invoice_paid",
  "payment_received",
  "portal_message_received",
];

// ─── Routes ──────────────────────────────────────────────────────────────────
// Static segments (/process, /runs, /trigger-test) are registered BEFORE
// /:id so they can never be captured by the id param.

// GET / — list workflows (listWorkflows)
app.get("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const triggerType = c.req.query("triggerType") || undefined;
    const isActiveParam = c.req.query("isActive");
    const search = c.req.query("search") || undefined;
    if (
      triggerType !== undefined &&
      !workflowTriggerTypeSchema.safeParse(triggerType).success
    ) {
      return c.json({ error: "Invalid triggerType" }, 400);
    }
    if (
      isActiveParam !== undefined &&
      isActiveParam !== "true" &&
      isActiveParam !== "false"
    ) {
      return c.json({ error: "Invalid isActive" }, 400);
    }
    if (search !== undefined && search.length > 255) {
      return c.json({ error: "search must be at most 255 characters" }, 400);
    }
    const { page, pageSize } = parsePagination(c);

    const result = await listWorkflows(getApiDb(), {
      triggerType,
      isActive:
        isActiveParam !== undefined
          ? isActiveParam === "true"
          : undefined,
      search,
      page,
      pageSize,
    });
    return c.json(result);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// POST / — create workflow (201)
app.post("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const v = validateBody(body, createWorkflowSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    const workflow = await createWorkflow(getApiDb(), {
      name: data.name,
      triggerType: data.triggerType,
      triggerConfig: data.triggerConfig || {},
      actions: (data.actions as ActionDefinition[]) || [],
      isActive: data.isActive,
      maxRetries: data.maxRetries,
      createdBy: user.id,
    });
    return c.json(workflow, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// POST /process — execute ONE pending run, synchronously.
//
// TODO (cutover): synchronous in-request execution is preserved from
// the original, but on Workers it is bounded by max CPU duration — a
// long run can hit the limit. Cutover must decide whether this stays
// synchronous or moves to a queue/trigger.
app.post("/process", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const result = await processNextRun(getApiDb());
    return c.json(result);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// GET /runs — list runs
app.get("/runs", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const status = c.req.query("status") || undefined;
    const workflowId = c.req.query("workflowId") || undefined;
    if (
      status !== undefined &&
      !workflowRunStatusSchema.safeParse(status).success
    ) {
      return c.json({ error: "Invalid status" }, 400);
    }
    if (
      workflowId !== undefined &&
      !uuidSchema.safeParse(workflowId).success
    ) {
      return c.json({ error: "Invalid uuid" }, 400);
    }
    const { page, pageSize } = parsePagination(c);

    const result = await listRuns(getApiDb(), {
      status,
      workflowId,
      page,
      pageSize,
    });
    return c.json(result);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// GET /runs/:id — one run + its logs
app.get("/runs/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const run = await getRun(db, id);

    if (!run) return c.json({ error: "Run not found" }, 404);

    const logs = await getLogsByRun(db, id);
    return c.json({ run, logs });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// POST /runs/:id/retry — re-execute a failed run, synchronously.
//
// TODO (cutover): same synchronous-execution concern as /process — a
// full run can be long on Workers (max duration). Cutover decision.
app.post("/runs/:id/retry", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const run = await getRun(db, id);

    if (!run) return c.json({ error: "Run not found" }, 404);

    if (run.status !== "failed" && run.status !== "partially_failed") {
      return c.json({ error: "Only failed runs can be retried" }, 400);
    }

    // Clear any backoff timestamp from the failed attempt: without this
    // the worker (which only picks up runs with next_retry_at <= NOW())
    // would ignore the retried run until the old backoff expired.
    await updateRunStatus(db, id, "pending", {
      retryCount: run.retryCount,
      nextRetryAt: null,
    });
    await executeRun(db, run);

    const updatedRun = await getRun(db, id);
    return c.json({ run: updatedRun });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// POST /trigger-test — dispatch a trigger (creates pending runs only;
// it does NOT execute them — execution happens via /process or cron).
// Returns { triggered, runIds, availableTriggers, availableActions }.
app.post("/trigger-test", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const v = validateBody(body, triggerTestSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);

    const result = await dispatchTrigger(getApiDb(), {
      triggerType: v.data.triggerType,
      entityId: v.data.entityId || undefined,
      payload: v.data.payload || {},
    });

    return c.json({
      ...result,
      availableTriggers: AVAILABLE_TRIGGERS,
      availableActions: getRegisteredActions(),
    });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// GET /:id — one workflow
app.get("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const workflow = await getWorkflow(getApiDb(), id);

    if (!workflow) return c.json({ error: "Workflow not found" }, 404);

    return c.json(workflow);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// PATCH /:id — partial update (the source uses PATCH, not PUT)
app.patch("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const v = validateBody(body, updateWorkflowSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = sentFields(v.data, body) as {
      name?: string;
      triggerType?: string;
      triggerConfig?: Record<string, unknown>;
      actions?: ActionDefinition[];
      isActive?: boolean;
      maxRetries?: number;
    };

    const updated = await updateWorkflow(getApiDb(), id, data);

    if (!updated) return c.json({ error: "Workflow not found" }, 404);

    return c.json(updated);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// DELETE /:id — delete workflow + its run history
app.delete("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const deleted = await deleteWorkflow(getApiDb(), id);

    if (!deleted) return c.json({ error: "Workflow not found" }, 404);

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

export default app;
