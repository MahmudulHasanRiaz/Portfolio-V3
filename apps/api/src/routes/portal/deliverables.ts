// Portal deliverables — list, detail, client feedback.
// (The old nested POST /projects/:id/deliverables/:did/feedback was never
// called by any page — the page posts to /deliverables/:id/feedback —
// so only the flat feedback path is ported.)
import { Hono } from "hono";
import { desc, eq, inArray } from "drizzle-orm";
import { getApiDb } from "../../db";
import {
  projectDeliverables,
  projectsFreelance,
} from "@repo/database/schema";
import {
  invalidParam,
  isRecord,
  parsePagination,
  uuidParam,
  validateBody,
} from "../../lib/validate";
import { z } from "zod";
import {
  getClientProjectIds,
  logActivity,
  readJsonBody,
  requirePortalClient,
} from "./helpers";

const deliverables = new Hono();

const feedbackSchema = z.object({
  feedback: z.string().min(1, "Feedback is required"),
});

deliverables.get("/", async (c) => {
  try {
    const client = await requirePortalClient(c);
    if (!client) return c.json({ error: "Unauthorized" }, 401);
    const { page, pageSize } = parsePagination(c);
    const db = getApiDb();
    const projectIds = await getClientProjectIds(db, client.clientId);
    if (projectIds.length === 0) {
      return c.json({ deliverables: [], total: 0, page, pageSize });
    }
    const rows = await db
      .select()
      .from(projectDeliverables)
      .where(inArray(projectDeliverables.projectId, projectIds))
      // No created_at column on this table — order by submitted date.
      .orderBy(desc(projectDeliverables.submittedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return c.json({
      deliverables: rows,
      total: rows.length,
      page,
      pageSize,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch deliverables";
    return c.json({ error: message }, 500);
  }
});

deliverables.get("/:id", async (c) => {
  try {
    const client = await requirePortalClient(c);
    if (!client) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [deliverable] = await db
      .select()
      .from(projectDeliverables)
      .where(eq(projectDeliverables.id, id))
      .limit(1);
    if (!deliverable) return c.json({ error: "Deliverable not found" }, 404);
    if (!deliverable.projectId) {
      return c.json({ error: "Deliverable not found" }, 404);
    }
    const [project] = await db
      .select()
      .from(projectsFreelance)
      .where(eq(projectsFreelance.id, deliverable.projectId))
      .limit(1);
    if (
      !project ||
      project.clientId !== client.clientId ||
      !project.portalAccessEnabled
    ) {
      return c.json({ error: "Deliverable not found" }, 404);
    }
    return c.json(deliverable);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch deliverable";
    return c.json({ error: message }, 500);
  }
});

deliverables.post("/:id/feedback", async (c) => {
  try {
    const client = await requirePortalClient(c);
    if (!client) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Feedback is required" }, 400);
    }
    const parsed = validateBody(body, feedbackSchema);
    if ("error" in parsed) return c.json({ error: parsed.error }, 400);
    const db = getApiDb();
    const [deliverable] = await db
      .select()
      .from(projectDeliverables)
      .where(eq(projectDeliverables.id, id))
      .limit(1);
    if (!deliverable) return c.json({ error: "Deliverable not found" }, 404);
    if (!deliverable.projectId) {
      return c.json({ error: "Deliverable not found" }, 404);
    }
    const [project] = await db
      .select()
      .from(projectsFreelance)
      .where(eq(projectsFreelance.id, deliverable.projectId))
      .limit(1);
    if (
      !project ||
      project.clientId !== client.clientId ||
      !project.portalAccessEnabled
    ) {
      return c.json({ error: "Deliverable not found" }, 404);
    }
    const [updated] = await db
      .update(projectDeliverables)
      .set({
        clientFeedback: parsed.data.feedback,
        status: "revision_requested",
      })
      .where(eq(projectDeliverables.id, id))
      .returning();
    await logActivity(db, project.id, "deliverable_feedback", {
      deliverableId: id,
      feedback: parsed.data.feedback,
    });
    return c.json({
      success: true,
      deliverable: updated ?? deliverable,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to submit feedback";
    return c.json({ error: message }, 500);
  }
});

export { deliverables as portalDeliverablesRouter };
