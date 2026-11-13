// Admin abandoned-leads — Hono port of the Next.js admin REST routes
// apps/admin/src/app/api/abandoned/route.ts (GET + POST) and
// apps/admin/src/app/api/abandoned/[id]/route.ts (DELETE).
//
// Mounted at /api/admin/abandoned (see routes/admin/index.ts).
//
// Fidelity notes:
// - Response shapes match the Next.js routes exactly: list returns the
//   bare array, newest first; capture returns the bare row (201);
//   delete returns { success: true }.
// - AUTH SPLIT (deliberate, preserved exactly): POST is INTENTIONALLY
//   unauthenticated — public capture (middleware-public /api/abandoned
//   in the Next.js admin). GET and DELETE require a valid session via
//   requireAuth, exactly as in the sources. Do NOT add auth to POST.
// - Drizzle rows are already keyed by the schema's camelCase property
//   names, so no case conversion is applied. NOTE: the original repo
//   returned raw snake_case rows (SELECT *), while the dashboard
//   Recovery queue reads camelCase (sourcePage, capturedAt); Drizzle
//   returns camelCase, which is what the UI declares.
// - No purgePublicCache / search-indexer / dispatchTrigger calls exist
//   in these sources.
import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { createAbandonedLeadSchema } from "@repo/validation";
import { abandonedLeads } from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";
import { createRateLimiter } from "../../lib/rate-limit";
import {
  invalidParam,
  isRecord,
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

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

// POST / capture validation: the shared create schema, but email is
// optional here (the route also accepts phone-only captures) with a
// refinement requiring at least one contact field — the old code
// inserted an all-null row when neither was given. sourcePage is capped
// at 255 chars and metadata at 50 keys. Nullable spellings are accepted
// (the old code coerced non-strings to null) and stored as null.
const createAbandonedLeadLocalSchema = createAbandonedLeadSchema
  .extend({
    email: z.string().max(255).email().nullable().optional(),
    phone: z.string().max(50).nullable().optional(),
    sourcePage: z.string().max(255).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .refine((d) => !!d.email || !!d.phone, {
    message: "email or phone is required",
  })
  .refine((d) => !d.metadata || Object.keys(d.metadata).length <= 50, {
    message: "metadata must have at most 50 keys",
  });

// GET / — list abandoned leads, newest first
// (AbandonedRepository.list). Requires auth.
app.get("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const rows = await db
      .select()
      .from(abandonedLeads)
      .orderBy(desc(abandonedLeads.capturedAt));
    return c.json(rows);
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to fetch abandoned leads") },
      500,
    );
  }
});

// POST / — capture an abandoned lead (AbandonedRepository.capture).
// INTENTIONALLY UNAUTHENTICATED: public capture endpoint. Do not
// require a session here.
//
// STANDARD: public write endpoints are rate-limited per IP — 10/min
// here (a visitor abandons a form at most a few times, so 10/min is
// far above legitimate use and only stops a hammering loop). The
// helper is in-memory per isolate (best-effort under multi-isolate);
// a limited request gets 429 + Retry-After, legitimate single
// submissions are unaffected.
const publicWriteLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many requests. Please try again later.",
});
app.post("/", publicWriteLimiter, async (c) => {
  try {
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const v = validateBody(body, createAbandonedLeadLocalSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    const db = getApiDb();
    const [row] = await db
      .insert(abandonedLeads)
      .values({
        email: data.email ?? null,
        phone: data.phone ?? null,
        sourcePage: data.sourcePage ?? null,
        metadata: data.metadata ?? null,
      })
      .returning();
    if (!row) {
      return c.json({ error: "Failed to capture abandoned lead" }, 500);
    }
    return c.json(row, 201);
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to capture abandoned lead") },
      500,
    );
  }
});

// DELETE /:id — delete an abandoned lead. Requires auth.
app.delete("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [deleted] = await db
      .delete(abandonedLeads)
      .where(eq(abandonedLeads.id, id))
      .returning({ id: abandonedLeads.id });
    if (!deleted) {
      return c.json({ error: "Abandoned lead not found" }, 404);
    }
    return c.json({ success: true });
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to delete abandoned lead") },
      500,
    );
  }
});

export default app;
