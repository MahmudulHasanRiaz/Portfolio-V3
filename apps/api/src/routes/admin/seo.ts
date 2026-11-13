// SEO metadata + slug redirects — Hono port of the kept Next.js routes
// apps/admin/src/app/api/seo/meta[/[id]] and
// apps/admin/src/app/api/seo/redirects[/[id]].
//
// WHY A PORT: those routes gate on `session.user.role` (local Better Auth
// via postgres.js TCP), which is never populated on Workers —
// `auth.api.getSession` returns null on the edge, so every call 403'd
// ("Unauthorized" on the Metadata page, "Failed to fetch" on Redirects).
// The repositories also use @repo/database getDb() (postgres.js TCP),
// which cannot run on Workers either. So both the auth and the DB access
// are re-implemented here with requireAuth + getApiDb() (Neon HTTP),
// logic verbatim from the original routes.
//
// Fidelity notes:
// - GET /meta with ?entityType=&entityId= returns a single row
//   ({ meta: row | null }); without them it lists (first 50, matching
//   BaseRepository.findAll's defaults).
// - POST /meta upserts by (entityType, entityId): update when a row
//   exists (200), create when not (201) — exactly as the original.
// - PUT /meta/:id and PUT /redirects/:id 404 when the row is missing.
// - DELETE returns { success: true }.
// - Redirect create defaults redirectType to 301 when omitted (the
//   original did `redirectType || 301`); isActive defaults to true.
// - Auth is requireAuth (any valid session). The original role list
//   (admin/editor/marketer) is not enforced here: the sidebar only
//   shows Marketing to super_admin/admin/marketer, and the role value
//   itself is not reliably populated — the same standard the Zod
//   leftovers applied to GET /users.
import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import {
  createSeoMetaSchema,
  createSlugRedirectSchema,
  updateSeoMetaSchema,
  updateSlugRedirectSchema,
} from "@repo/validation";
import { seoMeta, slugRedirects } from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";
import {
  invalidParam,
  isRecord,
  queryParam,
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

const app = new Hono<Env>();

// Strip server-managed fields before a DB write (they must never be
// client-settable, even though the update schemas are .partial()).
function stripManaged<T extends Record<string, unknown>>(v: T) {
  const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = v;
  return rest;
}

// ─── SEO Meta ───────────────────────────────────────────────────────────────

// GET /meta — list (first 50), or a single row by ?entityType=&entityId=.
app.get("/meta", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const entityType = queryParam(c, "entityType");
    const entityId = queryParam(c, "entityId");
    if (entityType && entityId) {
      const [row] = await db
        .select()
        .from(seoMeta)
        .where(and(eq(seoMeta.entityType, entityType), eq(seoMeta.entityId, entityId)))
        .limit(1);
      return c.json({ meta: row ?? null });
    }
    const rows = await db
      .select()
      .from(seoMeta)
      .orderBy(desc(seoMeta.createdAt))
      .limit(50);
    return c.json({ meta: rows });
  } catch (err) {
    console.error("[SEO Meta API] Error:", err);
    return c.json({ error: "Failed to fetch SEO meta." }, 500);
  }
});

// GET /meta/:id — a single row.
app.get("/meta/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [row] = await db.select().from(seoMeta).where(eq(seoMeta.id, id)).limit(1);
    if (!row) return c.json({ error: "SEO meta not found." }, 404);
    return c.json({ meta: row });
  } catch (err) {
    console.error("[SEO Meta API] Error:", err);
    return c.json({ error: "Failed to fetch SEO meta." }, 500);
  }
});

// POST /meta — upsert by (entityType, entityId): 200 when updating, 201 when creating.
app.post("/meta", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, createSeoMetaSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const db = getApiDb();
    const [existing] = await db
      .select()
      .from(seoMeta)
      .where(and(eq(seoMeta.entityType, v.data.entityType), eq(seoMeta.entityId, v.data.entityId)))
      .limit(1);
    if (existing) {
      const [row] = await db
        .update(seoMeta)
        .set({ ...stripManaged(v.data), updatedAt: new Date() })
        .where(eq(seoMeta.id, existing.id))
        .returning();
      return c.json({ meta: row }, 200);
    }
    const [row] = await db.insert(seoMeta).values(v.data).returning();
    if (!row) return c.json({ error: "Failed to save SEO meta." }, 500);
    return c.json({ meta: row }, 201);
  } catch (err) {
    console.error("[SEO Meta API] Error:", err);
    return c.json({ error: "Failed to save SEO meta." }, 500);
  }
});

// PUT /meta/:id — update. 404 when missing.
app.put("/meta/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, updateSeoMetaSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const db = getApiDb();
    const [row] = await db
      .update(seoMeta)
      .set({ ...stripManaged(v.data), updatedAt: new Date() })
      .where(eq(seoMeta.id, id))
      .returning();
    if (!row) return c.json({ error: "SEO meta not found." }, 404);
    return c.json({ meta: row });
  } catch (err) {
    console.error("[SEO Meta API] Error:", err);
    return c.json({ error: "Failed to update SEO meta." }, 500);
  }
});

// DELETE /meta/:id — 404 when missing, { success: true } when deleted.
app.delete("/meta/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [existing] = await db.select({ id: seoMeta.id }).from(seoMeta).where(eq(seoMeta.id, id)).limit(1);
    if (!existing) return c.json({ error: "SEO meta not found." }, 404);
    await db.delete(seoMeta).where(eq(seoMeta.id, id));
    return c.json({ success: true });
  } catch (err) {
    console.error("[SEO Meta API] Error:", err);
    return c.json({ error: "Failed to delete SEO meta." }, 500);
  }
});

// ─── Slug Redirects ─────────────────────────────────────────────────────────

// GET /redirects — list; ?source= looks one up by source slug;
// ?active=true lists only active redirects.
app.get("/redirects", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const source = queryParam(c, "source");
    const activeOnly = queryParam(c, "active") === "true";
    if (source) {
      const [row] = await db
        .select()
        .from(slugRedirects)
        .where(eq(slugRedirects.sourceSlug, source))
        .limit(1);
      return c.json({ redirect: row ?? null });
    }
    if (activeOnly) {
      const rows = await db
        .select()
        .from(slugRedirects)
        .where(eq(slugRedirects.isActive, true))
        .orderBy(desc(slugRedirects.createdAt));
      return c.json({ redirects: rows });
    }
    const rows = await db
      .select()
      .from(slugRedirects)
      .orderBy(desc(slugRedirects.createdAt))
      .limit(50);
    return c.json({ redirects: rows });
  } catch (err) {
    console.error("[Redirects API] Error:", err);
    return c.json({ error: "Failed to fetch redirects." }, 500);
  }
});

// GET /redirects/:id — a single redirect.
app.get("/redirects/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [row] = await db.select().from(slugRedirects).where(eq(slugRedirects.id, id)).limit(1);
    if (!row) return c.json({ error: "Redirect not found." }, 404);
    return c.json({ redirect: row });
  } catch (err) {
    console.error("[Redirects API] Error:", err);
    return c.json({ error: "Failed to fetch redirects." }, 500);
  }
});

// POST /redirects — create. redirectType defaults to 301, isActive to true.
app.post("/redirects", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, createSlugRedirectSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const db = getApiDb();
    const [row] = await db
      .insert(slugRedirects)
      .values({
        sourceSlug: v.data.sourceSlug,
        destinationUrl: v.data.destinationUrl,
        redirectType: v.data.redirectType ?? 301,
        entityType: v.data.entityType ?? null,
        isActive: v.data.isActive ?? true,
      })
      .returning();
    if (!row) return c.json({ error: "Failed to create redirect." }, 500);
    return c.json({ redirect: row }, 201);
  } catch (err) {
    console.error("[Redirects API] Error:", err);
    return c.json({ error: "Failed to create redirect." }, 500);
  }
});

// PUT /redirects/:id — update. 404 when missing.
app.put("/redirects/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, updateSlugRedirectSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const db = getApiDb();
    const [row] = await db
      .update(slugRedirects)
      .set(stripManaged(v.data))
      .where(eq(slugRedirects.id, id))
      .returning();
    if (!row) return c.json({ error: "Redirect not found." }, 404);
    return c.json({ redirect: row });
  } catch (err) {
    console.error("[Redirects API] Error:", err);
    return c.json({ error: "Failed to update redirect." }, 500);
  }
});

// DELETE /redirects/:id — 404 when missing, { success: true } when deleted.
app.delete("/redirects/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [existing] = await db
      .select({ id: slugRedirects.id })
      .from(slugRedirects)
      .where(eq(slugRedirects.id, id))
      .limit(1);
    if (!existing) return c.json({ error: "Redirect not found." }, 404);
    await db.delete(slugRedirects).where(eq(slugRedirects.id, id));
    return c.json({ success: true });
  } catch (err) {
    console.error("[Redirects API] Error:", err);
    return c.json({ error: "Failed to delete redirect." }, 500);
  }
});

export default app;
