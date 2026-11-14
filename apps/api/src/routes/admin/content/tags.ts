// Admin tag CRUD — split from content.ts (moved verbatim).
// Mounted at /api/admin/content (see routes/admin/index.ts).
import { Hono } from "hono";
import { createTagSchema, updateTagSchema } from "@repo/validation";
import { asc, eq } from "drizzle-orm";
import { tags } from "@repo/database/schema";
import { getApiDb } from "../../../db";
import { requireAuth } from "../../../lib/admin-auth";
import {
  invalidParam,
  isRecord,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../../lib/validate";
import {
  errorMessage,
  pickFields,
  slugify,
  stripServerManaged,
  type Env,
} from "./helpers";

const app = new Hono<Env>();

app.get("/tags", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const rows = await db.select().from(tags).orderBy(asc(tags.name));
    return c.json(rows);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.post("/tags", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, createTagSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data as Record<string, unknown>;
    stripServerManaged(data);
    if (typeof data.name !== "string" || data.name.trim() === "") {
      return c.json({ error: "name is required" }, 400);
    }
    const db = getApiDb();
    const slug =
      typeof data.slug === "string" && data.slug !== ""
        ? data.slug
        : slugify(data.name);
    const [row] = await db
      .insert(tags)
      .values({ name: data.name, slug })
      .returning();
    return c.json(row, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.put("/tags/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, updateTagSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = { ...(v.data as Record<string, unknown>) };
    stripServerManaged(data);
    const db = getApiDb();
    const [row] = await db
      .update(tags)
      .set(pickFields(data, ["name", "slug"]))
      .where(eq(tags.id, id))
      .returning();
    if (!row) throw new Error("Tag not found");
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.delete("/tags/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    await db.delete(tags).where(eq(tags.id, id));
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

export default app;
