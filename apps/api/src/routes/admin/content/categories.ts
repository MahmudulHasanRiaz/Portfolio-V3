// Admin category CRUD — split from content.ts (moved verbatim).
// Mounted at /api/admin/content (see routes/admin/index.ts).
import { Hono } from "hono";
import { createCategorySchema, updateCategorySchema } from "@repo/validation";
import { asc, eq } from "drizzle-orm";
import { categories } from "@repo/database/schema";
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

app.get("/categories", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const type = c.req.query("type");
    const rows = await db
      .select()
      .from(categories)
      .where(type ? eq(categories.type, type) : undefined)
      .orderBy(asc(categories.name));
    return c.json(rows);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.post("/categories", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, createCategorySchema);
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
      .insert(categories)
      .values({
        name: data.name,
        slug,
        description:
          typeof data.description === "string" ? data.description : null,
        type: typeof data.type === "string" ? data.type : null,
      })
      .returning();
    return c.json(row, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.put("/categories/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, updateCategorySchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = { ...(v.data as Record<string, unknown>) };
    stripServerManaged(data);
    const db = getApiDb();
    const [row] = await db
      .update(categories)
      .set(pickFields(data, ["name", "slug", "description", "type"]))
      .where(eq(categories.id, id))
      .returning();
    if (!row) throw new Error("Category not found");
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.delete("/categories/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    await db.delete(categories).where(eq(categories.id, id));
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

export default app;
