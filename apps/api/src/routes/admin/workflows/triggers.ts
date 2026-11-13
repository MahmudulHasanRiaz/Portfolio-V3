// Admin workflows — trigger/process routes (split from routes/admin/workflows.ts).
// Mounted at /api/admin/workflows (see routes/admin/index.ts).
// Routes: POST /process, POST /trigger-test.
import { Hono } from "hono";
import { z } from "zod";
import { uuidSchema } from "@repo/validation";
import { getApiDb } from "../../../db";
import { requireAuth } from "../../../lib/admin-auth";
import {
  isRecord,
  readJsonBody,
  validateBody,
} from "../../../lib/validate";
import {
  type Env,
  actionRegistry,
  dispatchTrigger,
  errorMessage,
  processNextRun,
  workflowTriggerTypeSchema,
} from "./helpers";

const app = new Hono<Env>();

function getRegisteredActions(): string[] {
  return Object.keys(actionRegistry);
}

const triggerTestSchema = z.object({
  triggerType: workflowTriggerTypeSchema,
  entityId: uuidSchema.optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

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

export default app;
