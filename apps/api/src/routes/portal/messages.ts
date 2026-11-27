// Portal messages — list and send, scoped to the client's projects.
// The client sends as senderType "client"; admin replies arrive as "admin".
import { Hono } from "hono";
import { desc, inArray } from "drizzle-orm";
import { getApiDb } from "../../db";
import { portalMessages } from "@repo/database/schema";
import {
  isRecord,
  parsePagination,
  validateBody,
} from "../../lib/validate";
import { z } from "zod";
import {
  getClientProject,
  getClientProjectIds,
  portalError,
  readJsonBody,
  requirePortalClient,
} from "./helpers";

const messages = new Hono();

const sendSchema = z.object({
  projectId: z.string().uuid("Project ID must be a valid UUID"),
  message: z.string().min(1, "Message is required"),
});

messages.get("/", async (c) => {
  try {
    const client = await requirePortalClient(c);
    if (!client) return c.json({ error: "Unauthorized" }, 401);
    const { page, pageSize } = parsePagination(c);
    const db = getApiDb();
    const projectIdParam = c.req.query("projectId");
    let projectIds: string[];
    if (projectIdParam) {
      const project = await getClientProject(db, projectIdParam, client.clientId);
      if (!project) return c.json({ error: "Project not found" }, 404);
      projectIds = [project.id];
    } else {
      projectIds = await getClientProjectIds(db, client.clientId);
    }
    if (projectIds.length === 0) {
      return c.json({ messages: [], total: 0, page, pageSize });
    }
    const rows = await db
      .select()
      .from(portalMessages)
      .where(inArray(portalMessages.projectId, projectIds))
      .orderBy(desc(portalMessages.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    // The page renders oldest-first.
    rows.reverse();
    return c.json({ messages: rows, total: rows.length, page, pageSize });
  } catch (err) {
    return c.json({ error: portalError(err, "Failed to fetch messages") }, 500);
  }
});

messages.post("/", async (c) => {
  try {
    const client = await requirePortalClient(c);
    if (!client) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Project ID and message are required" }, 400);
    }
    const parsed = validateBody(body, sendSchema);
    if ("error" in parsed) return c.json({ error: parsed.error }, 400);
    const db = getApiDb();
    const project = await getClientProject(
      db,
      parsed.data.projectId,
      client.clientId,
    );
    if (!project) return c.json({ error: "Project not found" }, 404);
    const [inserted] = await db
      .insert(portalMessages)
      .values({
        projectId: parsed.data.projectId,
        senderType: "client",
        senderId: null,
        message: parsed.data.message,
        isRead: false,
      })
      .returning();
    return c.json({ success: true, message: inserted }, 201);
  } catch (err) {
    return c.json({ error: portalError(err, "Failed to send message") }, 500);
  }
});

export { messages as portalMessagesRouter };
