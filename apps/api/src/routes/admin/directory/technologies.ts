// Admin technology CRUD — moved verbatim from routes/admin/directory.ts
// (Hono port of the Next.js admin server actions in
// apps/admin/src/actions/directory.ts).
//
// The source is server actions, so there is no REST shape to preserve —
// these routes expose the same rows the actions returned (TechnologyRow)
// as JSON: GET list returns the array, GET :id / POST / PUT :id return the
// single row, DELETE returns { success: true }. Validation failures are
// 400, missing rows are 404, mirroring the messages the actions threw.
// Drizzle rows are already camelCase, so no toCamel conversion is applied.
//
// Cache purge (wired at cutover via lib/side-effects): the source calls
// purgePublicCache(["home"]) after every create/update/delete
// (best-effort, never fails the save).
import { Hono } from "hono";
import {
  createTechnologySchema,
  updateTechnologySchema,
} from "@repo/validation";
import { asc, eq, ilike } from "drizzle-orm";
import { technologies } from "@repo/database/schema";
import { getApiDb } from "../../../db";
import { requireAuth, unauthorized } from "../../../lib/admin-auth";
import { isRecord, readJsonBody, validateBody } from "../../../lib/validate";
import { purgePublicCache, waitUntilOf } from "../../../lib/side-effects";
import {
  ApiError,
  asSortOrder,
  asText,
  assertUuid,
  errorMessage,
  escapeLike,
} from "./helpers";

const app = new Hono();

// Technology category options — copied verbatim from
// apps/admin/src/lib/technology-categories.ts (that module cannot be
// imported from the Hono app; it lives in the Next.js admin).
const TECHNOLOGY_CATEGORIES = [
  "Frontend",
  "Backend",
  "Database",
  "Cloud & Tools",
  "CMS & E-commerce",
  "Concepts",
  "Auth",
] as const;

// List `search` is capped at 255 chars (400 when longer) — checked
// inline in each list handler below.

// ─── Technologies ────────────────────────────────────────────────────────────

export interface TechnologyRow {
  id: string;
  name: string;
  nameBn: string | null;
  category: string | null;
  icon: string | null;
  /** Only PHP has a use in the live copy ("Plugin development"). */
  use: string | null;
  useBn: string | null;
  sortOrder: number | null;
}

function toTechnologyRow(r: typeof technologies.$inferSelect): TechnologyRow {
  return {
    id: r.id,
    name: r.name ?? "",
    nameBn: r.nameBn,
    category: r.category,
    icon: r.icon,
    use: r.use,
    useBn: r.useBn,
    sortOrder: r.sortOrder,
  };
}

export interface TechnologyInput {
  name: string;
  nameBn?: string | null;
  category?: string | null;
  icon?: string | null;
  use?: string | null;
  useBn?: string | null;
  sortOrder?: number | null;
}

function technologyValues(data: TechnologyInput) {
  const name = asText(data.name);
  if (!name) throw new ApiError(400, "Name is required");
  if (
    data.category !== undefined &&
    data.category !== null &&
    data.category !== "" &&
    !(TECHNOLOGY_CATEGORIES as readonly string[]).includes(data.category)
  ) {
    throw new ApiError(400, "Invalid category");
  }
  return {
    name,
    nameBn: asText(data.nameBn),
    category: asText(data.category),
    icon: asText(data.icon),
    use: asText(data.use),
    useBn: asText(data.useBn),
    sortOrder: asSortOrder(data.sortOrder),
  };
}

app.get("/technologies", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const db = getApiDb();
    const search = (c.req.query("search") ?? "").trim();
    if (search.length > 255) {
      return c.json({ error: "search must be at most 255 characters" }, 400);
    }
    const rows = await db
      .select()
      .from(technologies)
      .where(search ? ilike(technologies.name, `%${escapeLike(search)}%`) : undefined)
      .orderBy(asc(technologies.sortOrder), asc(technologies.name));
    return c.json(rows.map(toTechnologyRow));
  } catch (err) {
    if (err instanceof ApiError) return c.json({ error: err.message }, err.status);
    return c.json({ error: errorMessage(err, "Failed to fetch technologies") }, 500);
  }
});

app.get("/technologies/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
    assertUuid(id, "technology");
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(technologies)
      .where(eq(technologies.id, id))
      .limit(1);
    if (!row) throw new ApiError(404, "Technology not found");
    return c.json(toTechnologyRow(row));
  } catch (err) {
    if (err instanceof ApiError) return c.json({ error: err.message }, err.status);
    return c.json({ error: errorMessage(err, "Failed to fetch technology") }, 500);
  }
});

app.post("/technologies", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, createTechnologySchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    const db = getApiDb();
    const [row] = await db
      .insert(technologies)
      .values(technologyValues(data))
      .returning();
    if (!row) return c.json({ error: "Failed to create technology" }, 500);
    void purgePublicCache(c.env, ["home"], waitUntilOf(c));
    return c.json(toTechnologyRow(row), 201);
  } catch (err) {
    if (err instanceof ApiError) return c.json({ error: err.message }, err.status);
    return c.json({ error: errorMessage(err, "Failed to create technology") }, 500);
  }
});

app.put("/technologies/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
    assertUuid(id, "technology");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, updateTechnologySchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    // updateTechnologySchema is partial (name optional); technologyValues
    // still enforces "Name is required" at runtime, as before.
    const data = v.data as TechnologyInput;
    const db = getApiDb();
    // Note: the technologies table has no updated_at column (unlike
    // platforms/clients), so — like the source — no timestamp is set here.
    const [row] = await db
      .update(technologies)
      .set(technologyValues(data))
      .where(eq(technologies.id, id))
      .returning();
    if (!row) throw new ApiError(404, "Technology not found");
    void purgePublicCache(c.env, ["home"], waitUntilOf(c));
    return c.json(toTechnologyRow(row));
  } catch (err) {
    if (err instanceof ApiError) return c.json({ error: err.message }, err.status);
    return c.json({ error: errorMessage(err, "Failed to update technology") }, 500);
  }
});

app.delete("/technologies/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
    assertUuid(id, "technology");
    await getApiDb().delete(technologies).where(eq(technologies.id, id));
    void purgePublicCache(c.env, ["home"], waitUntilOf(c));
    return c.json({ success: true });
  } catch (err) {
    if (err instanceof ApiError) return c.json({ error: err.message }, err.status);
    return c.json({ error: errorMessage(err, "Failed to delete technology") }, 500);
  }
});

export default app;
