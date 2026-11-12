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
import { abandonedLeads } from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";

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
app.post("/", async (c) => {
  try {
    const body = (await c.req.json()) as Record<string, unknown>;
    const db = getApiDb();
    const [row] = await db
      .insert(abandonedLeads)
      .values({
        email: typeof body.email === "string" ? body.email : null,
        phone: typeof body.phone === "string" ? body.phone : null,
        sourcePage:
          typeof body.sourcePage === "string" ? body.sourcePage : null,
        metadata:
          body.metadata !== undefined && body.metadata !== null
            ? (body.metadata as Record<string, unknown>)
            : null,
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
    const db = getApiDb();
    const [deleted] = await db
      .delete(abandonedLeads)
      .where(eq(abandonedLeads.id, c.req.param("id")))
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
