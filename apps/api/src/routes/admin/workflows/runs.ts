// Admin workflows — run routes (split from routes/admin/workflows.ts).
// Mounted at /api/admin/workflows (see routes/admin/index.ts).
// Routes: GET /runs, GET /runs/:id, POST /runs/:id/retry.
import { Hono } from "hono";
import { z } from "zod";
import { uuidSchema } from "@repo/validation";
import { getApiDb } from "../../../db";
import { requireAuth } from "../../../lib/admin-auth";
import {
  invalidParam,
  parsePagination,
  uuidParam,
} from "../../../lib/validate";
import {
  type Env,
  errorMessage,
  executeRun,
  getLogsByRun,
  getRun,
  listRuns,
  updateRunStatus,
} from "./helpers";

const app = new Hono<Env>();

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

export default app;
