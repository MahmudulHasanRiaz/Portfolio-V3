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
    const q = c.req.query();
    const conditions: any[] = [];
    if (q.entityType) conditions.push(eq(faqs.entityType, q.entityType));
    if (q.entityId) conditions.push(eq(faqs.entityId, q.entityId));
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
    const body = (await c.req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (typeof body?.question !== "string" || body.question.trim() === "") {
      return c.json({ error: "question is required" }, 400);
    }
    const db = getApiDb();
    const [row] = await db
      .insert(faqs)
      .values({
        question: body.question,
        answer: typeof body.answer === "string" ? body.answer : undefined,
        sortOrder:
          typeof body.sortOrder === "number" ? body.sortOrder : undefined,
        entityType:
          typeof body.entityType === "string" ? body.entityType : undefined,
        entityId:
          typeof body.entityId === "string" ? body.entityId : undefined,
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
    const body = (await c.req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const db = getApiDb();
    const patch: Record<string, unknown> = {};
    if (body?.question !== undefined) patch.question = body.question;
    if (body?.answer !== undefined) patch.answer = body.answer;
    if (body?.sortOrder !== undefined) patch.sortOrder = body.sortOrder;
    const [row] = await db
      .update(faqs)
      .set(patch)
      .where(eq(faqs.id, c.req.param("id")))
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
    const id = c.req.param("id");
    await db.delete(faqs).where(eq(faqs.id, id));
    void deleteSearchEntity(db, "faq", id, waitUntilOf(c));
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

export default app;
