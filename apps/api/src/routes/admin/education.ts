// Education entries — Hono admin CRUD (0039, PR #22).
//
// Mounted at /api/admin/education (see routes/admin/index.ts).
//
// The dedicated Education page (/education) reads its rows from the
// Public Content API (`education` type, visible rows only, newest
// first); these endpoints are the admin side: list / get / create /
// update / delete. The table starts EMPTY — the user enters his real
// education history here; no rows are ever seeded. A NULL endDate
// means ongoing / present. Validation lives in @repo/validation
// (create/updateEducationEntrySchema — every optional field accepts
// null, PR #11 lesson: the admin sends null for empty optionals).
//
// Cache purge: create/update/delete purge the "education" tag on both
// public sites (best-effort, never fails the save) — the /education
// and /bn/education pages carry that tag in astro.config.mjs.
import { Hono } from "hono";
import { asc, desc, eq } from "drizzle-orm";
import { educationEntries } from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";
import { ensureEducationSkills } from "../../lib/ensure-schema";
import {
  createEducationEntrySchema,
  updateEducationEntrySchema,
} from "@repo/validation";
import {
  invalidParam,
  isRecord,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../lib/validate";
import { purgePublicCache, waitUntilOf } from "../../lib/side-effects";

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

function asDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  // Plain calendar date only — anything else is rejected rather
  // than stored half-parsed.
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function entryValues(data: Record<string, unknown>) {
  const asText = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t === "" ? null : t;
  };
  const asSortOrder = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : parseInt(String(v), 10);
    return Number.isFinite(n) ? n : null;
  };
  return {
    degree: asText(data.degree),
    degreeBn: asText(data.degreeBn),
    institution: asText(data.institution),
    institutionBn: asText(data.institutionBn),
    fieldOfStudy: asText(data.fieldOfStudy),
    startDate: asDate(data.startDate),
    endDate: asDate(data.endDate),
    grade: asText(data.grade),
    description: asText(data.description),
    descriptionBn: asText(data.descriptionBn),
    sortOrder: asSortOrder(data.sortOrder),
    isVisible:
      typeof data.isVisible === "boolean" ? data.isVisible : true,
  };
}

// GET / — list all entries, newest first by start_date (then
// sort_order). The admin sees hidden rows too — the public list
// filters is_visible.
app.get("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    await ensureEducationSkills(db);
    const rows = await db
      .select()
      .from(educationEntries)
      .orderBy(desc(educationEntries.startDate), asc(educationEntries.sortOrder));
    return c.json(rows);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// GET /:id — one entry.
app.get("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    await ensureEducationSkills(db);
    const [row] = await db
      .select()
      .from(educationEntries)
      .where(eq(educationEntries.id, id))
      .limit(1);
    if (!row) return c.json({ error: "Education entry not found" }, 404);
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// POST / — create an entry.
app.post("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, createEducationEntrySchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const db = getApiDb();
    await ensureEducationSkills(db);
    const [row] = await db
      .insert(educationEntries)
      .values(entryValues(v.data as Record<string, unknown>))
      .returning();
    if (!row) return c.json({ error: "Failed to create education entry" }, 500);
    void purgePublicCache(c.env, ["education"], waitUntilOf(c));
    return c.json(row, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// PUT /:id — update an entry (partial: only the fields present in
// the body are patched).
app.put("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, updateEducationEntrySchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data as Record<string, unknown>;
    const db = getApiDb();
    await ensureEducationSkills(db);
    const patch: Record<string, unknown> = {};
    // Only patch keys the caller sent — an omitted field keeps its
    // stored value; an explicit null clears it.
    const full = entryValues(data);
    for (const [key, value] of Object.entries(full)) {
      if (data[key] !== undefined) patch[key] = value;
    }
    // isVisible defaults true in entryValues, so it must not be
    // patched from a missing key — the loop above already guards it
    // (data.isVisible undefined → skipped).
    const [row] = await db
      .update(educationEntries)
      .set(patch)
      .where(eq(educationEntries.id, id))
      .returning();
    if (!row) return c.json({ error: "Education entry not found" }, 404);
    void purgePublicCache(c.env, ["education"], waitUntilOf(c));
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// DELETE /:id — delete an entry.
app.delete("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    await ensureEducationSkills(db);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    await db.delete(educationEntries).where(eq(educationEntries.id, id));
    void purgePublicCache(c.env, ["education"], waitUntilOf(c));
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

export default app;
