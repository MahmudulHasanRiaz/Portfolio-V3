// Admin workflows — CRUD routes (split from routes/admin/workflows.ts).
// Mounted at /api/admin/workflows (see routes/admin/index.ts).
// Routes: GET /, POST /, GET /:id, PATCH /:id, DELETE /:id.
import { Hono } from "hono";
import { z } from "zod";
import { getApiDb } from "../../../db";
import { requireAuth } from "../../../lib/admin-auth";
import {
  invalidParam,
  isRecord,
  parsePagination,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../../lib/validate";
import {
  type ActionDefinition,
  type Env,
  createWorkflow,
  deleteWorkflow,
  errorMessage,
  getWorkflow,
  listWorkflows,
  updateWorkflow,
  workflowTriggerTypeSchema,
} from "./helpers";

const app = new Hono<Env>();

// Local schemas — no workflow schemas exist in @repo/validation.
// Trigger/action enums are the resolved lists from the DB schema and
// the action registry (AVAILABLE_TRIGGERS / actionRegistry in
// triggers.ts / helpers.ts). Per-type action `config` shapes are NOT
// validated (plain record) — that is a known limitation: a mistyped
// config only fails at run execution, not at workflow creation.
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
