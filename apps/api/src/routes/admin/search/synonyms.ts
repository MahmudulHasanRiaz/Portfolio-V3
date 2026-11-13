// ─── Synonyms CRUD ─────────────────────────────────────────────────────────
// Hono port of apps/admin/src/actions/search.ts (listSynonyms /
// createSynonym / updateSynonym / deleteSynonym), the server actions
// the admin's Search Management page uses. These are NOT the dead
// /api/search/synonyms API routes (which gate on session.user.role and
// always 403) — those stay unported. These endpoints require a valid
// session (requireAuth → 401), exactly like the actions did.
//
// Fidelity notes:
// - GET returns the full rows, ordered by term — exactly what the
//   action returned (the page casts them to { id, term, synonyms,
//   isEnabled }).
// - POST returns the created row (201); PATCH returns the updated
//   row (404 when the id does not exist — the action returned
//   undefined there, but the page only ever updates rows it listed,
//   and a 404 surfaces the same "not found" as the other routers);
//   DELETE returns { ok: true } (the action returned void).
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  createSearchSynonymSchema,
  updateSearchSynonymSchema,
} from "@repo/validation";
import { searchSynonyms } from "@repo/database/schema";
import { getApiDb } from "../../../db";
import { requireAuth } from "../../../lib/admin-auth";
import {
  invalidParam,
  isRecord,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../../lib/validate";
import type { Env } from "./helpers";

const app = new Hono<Env>();

// POST /search/synonyms: the shared create schema, with synonyms
// optional (default []) — the old code defaulted a missing synonyms
// array to []. term is still required non-empty after trimming (the
// old check), enforced below after validation so the stored term
// keeps its original (untrimmed) value.
const createSynonymLocalSchema = createSearchSynonymSchema.extend({
  synonyms: z.array(z.string()).default([]),
});

// PATCH /search/synonyms/:id: the shared update schema (which has no
// isEnabled field) extended locally with isEnabled, and with the
// server-managed id omitted.
const updateSynonymLocalSchema = updateSearchSynonymSchema
  .omit({ id: true })
  .extend({ isEnabled: z.boolean().optional() });

// GET /search/synonyms — list all synonyms, ordered by term.
app.get("/search/synonyms", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const rows = await db
      .select()
      .from(searchSynonyms)
      .orderBy(searchSynonyms.term);
    return c.json(rows);
  } catch (err) {
    console.error("[Search Synonyms API] Error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to list synonyms." },
      500,
    );
  }
});

// POST /search/synonyms — create a synonym.
app.post("/search/synonyms", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const v = validateBody(body, createSynonymLocalSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    if (v.data.term.trim() === "") {
      return c.json({ error: "term is required" }, 400);
    }
    const db = getApiDb();
    const [row] = await db
      .insert(searchSynonyms)
      .values({ term: v.data.term, synonyms: v.data.synonyms })
      .returning();
    if (!row) return c.json({ error: "Failed to create synonym" }, 500);
    return c.json(row, 201);
  } catch (err) {
    console.error("[Search Synonyms API] Error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to create synonym." },
      500,
    );
  }
});

// PATCH /search/synonyms/:id — update a synonym.
app.patch("/search/synonyms/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const v = validateBody(body, updateSynonymLocalSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const patch: Record<string, unknown> = {};
    if (v.data.term !== undefined) {
      if (v.data.term.trim() === "") {
        return c.json({ error: "term must be a non-empty string" }, 400);
      }
      patch.term = v.data.term;
    }
    if (v.data.synonyms !== undefined) patch.synonyms = v.data.synonyms;
    if (v.data.isEnabled !== undefined) patch.isEnabled = v.data.isEnabled;
    const db = getApiDb();
    const [row] = await db
      .update(searchSynonyms)
      .set(patch)
      .where(eq(searchSynonyms.id, id))
      .returning();
    if (!row) return c.json({ error: "Synonym not found" }, 404);
    return c.json(row);
  } catch (err) {
    console.error("[Search Synonyms API] Error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to update synonym." },
      500,
    );
  }
});

// DELETE /search/synonyms/:id — delete a synonym.
app.delete("/search/synonyms/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    await db
      .delete(searchSynonyms)
      .where(eq(searchSynonyms.id, id));
    return c.json({ ok: true });
  } catch (err) {
    console.error("[Search Synonyms API] Error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to delete synonym." },
      500,
    );
  }
});

export default app;
