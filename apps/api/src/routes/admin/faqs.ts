// FAQs — Hono port of packages/cms/src/faqs.ts (FAQService) as used
// by apps/admin/src/actions/content.ts (listFAQs / createFAQ /
// updateFAQ / deleteFAQ).
//
// Mounted at /api/admin/faqs (see routes/admin/index.ts).
//
// Fidelity notes:
// - GET returns the FAQ rows (bare array, ordered by sortOrder asc),
//   optionally filtered by entityType / entityId — exactly what the
//   action returned. (The original service's where-clause reduce
//   (`acc && c`) only ever applied the LAST condition; this port uses
//   a proper `and(...)` — the admin UI never passes filters, so no
//   observable behaviour changes.)
// - POST / PUT return the bare row; PUT throws "FAQ not found" (404)
//   when the id does not exist, exactly as the service did.
// - DELETE returns { ok: true } (the action returned void).
// - Search indexing: create/update index the "faq" entity and delete
//   de-indexes it, mirroring FAQService (best-effort via
//   lib/side-effects — the faq loader was added there for this).
import { Hono } from "hono";
import { and, asc, eq } from "drizzle-orm";
import { faqs } from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";
import { createFaqSchema, updateFaqSchema, uuidSchema } from "@repo/validation";
import {
  invalidParam,
  isRecord,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../lib/validate";
import {
  deleteSearchEntity,
  indexSearchEntity,
  waitUntilOf,
} from "../../lib/side-effects";

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
    PUBLIC_SITE_URL?: string;
    CACHE_INVALIDATE_SECRET?: string;
  };
};

const app = new Hono<Env>();

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

// GET / — list FAQs, optionally filtered by entityType / entityId.
app.get("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const entityType = c.req.query("entityType");
    if (entityType !== undefined && entityType.length > 50) {
      return c.json({ error: "entityType must be at most 50 characters" }, 400);
    }
    const entityId = c.req.query("entityId");
    if (entityId !== undefined && !uuidSchema.safeParse(entityId).success) {
      return c.json({ error: "entityId must be a UUID" }, 400);
    }
    const conditions: any[] = [];
    if (entityType) conditions.push(eq(faqs.entityType, entityType));
    if (entityId) conditions.push(eq(faqs.entityId, entityId));
    const rows = await db
      .select()
      .from(faqs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(faqs.sortOrder));
    return c.json(rows);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// POST / — create an FAQ.
app.post("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, createFaqSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    // The shared create schema leaves question optional; the original
    // required a non-empty question, so that check stays.
    if (typeof data.question !== "string" || data.question.trim() === "") {
      return c.json({ error: "question is required" }, 400);
    }
    const db = getApiDb();
    const [row] = await db
      .insert(faqs)
      .values({
        question: data.question,
        answer: data.answer,
        sortOrder: data.sortOrder,
        entityType: data.entityType,
        entityId: data.entityId,
      })
      .returning();
    if (!row) return c.json({ error: "Failed to create FAQ" }, 500);
    void indexSearchEntity(db, "faq", row.id, c.env, waitUntilOf(c));
    return c.json(row, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// PUT /:id — update an FAQ.
app.put("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, updateFaqSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    const db = getApiDb();
    // Only question / answer / sortOrder were ever patched here (the
    // original ignored entityType / entityId on PUT); the partial
    // schema's server-managed `id` is likewise never passed through.
    const patch: Record<string, unknown> = {};
    if (data.question !== undefined) patch.question = data.question;
    if (data.answer !== undefined) patch.answer = data.answer;
    if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
    const [row] = await db
      .update(faqs)
      .set(patch)
      .where(eq(faqs.id, id))
      .returning();
    if (!row) return c.json({ error: "FAQ not found" }, 404);
    void indexSearchEntity(db, "faq", row.id, c.env, waitUntilOf(c));
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// DELETE /:id — delete an FAQ.
app.delete("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    await db.delete(faqs).where(eq(faqs.id, id));
    void deleteSearchEntity(db, "faq", id, waitUntilOf(c));
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

export default app;
