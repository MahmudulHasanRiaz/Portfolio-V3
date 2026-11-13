// Admin platform CRUD — moved verbatim from routes/admin/directory.ts
// (Hono port of the Next.js admin server actions in
// apps/admin/src/actions/directory.ts).
//
// The source is server actions, so there is no REST shape to preserve —
// these routes expose the same rows the actions returned (PlatformRow)
// as JSON: GET list returns the array, GET :id / POST / PUT :id return the
// single row, DELETE returns { success: true }. Validation failures are
// 400, missing rows are 404, mirroring the messages the actions threw.
// Drizzle rows are already camelCase, so no toCamel conversion is applied.
//
// Cache purge (wired at cutover via lib/side-effects): the source calls
// purgePublicCache(["home"]) after every create/update/delete
// (best-effort, never fails the save).
import { Hono } from "hono";
import { z } from "zod";
import { asc, eq, ilike } from "drizzle-orm";
import { platforms } from "@repo/database/schema";
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

// ─── Validation ──────────────────────────────────────────────────────────────
// Local schemas (finance.ts precedent): platforms and clients have no
// shared @repo/validation schema. PUT is full-replace, so the update
// schema is the same as the create schema — name/url/group (platforms)
// and name (clients) stay required on PUT, exactly as platformValues /
// clientValues enforced before.
// sortOrder uses z.coerce so a numeric string ("3") still parses, as
// asSortOrder accepted before.
const createPlatformSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url().max(2048),
  group: z.enum(["music", "social", "professional"]),
  // Nullable: the admin sends null (not undefined) for every empty
  // optional field (its asText/asSortOrder) — same 400 as clients
  // (2026-11-14) if the schema rejects null.
  handle: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  nameBn: z.string().nullable().optional(),
  subtitleBn: z.string().nullable().optional(),
  isPrimary: z.boolean().optional(),
  sortOrder: z.coerce.number().int().nullable().optional(),
});
const updatePlatformSchema = createPlatformSchema;

// List `search` is capped at 255 chars (400 when longer) — checked
// inline in each list handler below.

// ─── Platforms ───────────────────────────────────────────────────────────────

export type PlatformGroup = "music" | "social" | "professional";

export interface PlatformRow {
  id: string;
  name: string;
  url: string;
  handle: string | null;
  group: PlatformGroup;
  icon: string | null;
  subtitle: string | null;
  note: string | null;
  isPrimary: boolean;
  sortOrder: number | null;
  nameBn: string | null;
  subtitleBn: string | null;
}

const PLATFORM_GROUPS: PlatformGroup[] = ["music", "social", "professional"];

function toPlatformRow(r: typeof platforms.$inferSelect): PlatformRow {
  return {
    id: r.id,
    name: r.name ?? "",
    url: r.url ?? "",
    handle: r.handle,
    group: PLATFORM_GROUPS.includes(r.group as PlatformGroup)
      ? (r.group as PlatformGroup)
      : "social",
    icon: r.icon,
    subtitle: r.subtitle,
    note: r.note,
    isPrimary: r.isPrimary ?? false,
    sortOrder: r.sortOrder,
    nameBn: r.nameBn,
    subtitleBn: r.subtitleBn,
  };
}

export interface PlatformInput {
  name: string;
  url: string;
  handle?: string | null;
  group: PlatformGroup;
  icon?: string | null;
  subtitle?: string | null;
  note?: string | null;
  isPrimary?: boolean;
  sortOrder?: number | null;
  nameBn?: string | null;
  subtitleBn?: string | null;
}

function platformValues(data: PlatformInput) {
  const name = asText(data.name);
  const url = asText(data.url);
  if (!name) throw new ApiError(400, "Name is required");
  if (!url) throw new ApiError(400, "URL is required");
  if (!PLATFORM_GROUPS.includes(data.group)) throw new ApiError(400, "Invalid group");
  return {
    name,
    url,
    handle: asText(data.handle),
    group: data.group,
    icon: asText(data.icon),
    subtitle: asText(data.subtitle),
    note: asText(data.note),
    isPrimary: data.isPrimary === true,
    sortOrder: asSortOrder(data.sortOrder),
    nameBn: asText(data.nameBn),
    subtitleBn: asText(data.subtitleBn),
  };
}

app.get("/platforms", async (c) => {
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
      .from(platforms)
      .where(search ? ilike(platforms.name, `%${escapeLike(search)}%`) : undefined)
      .orderBy(asc(platforms.sortOrder), asc(platforms.createdAt));
    return c.json(rows.map(toPlatformRow));
  } catch (err) {
    if (err instanceof ApiError) return c.json({ error: err.message }, err.status);
    return c.json({ error: errorMessage(err, "Failed to fetch platforms") }, 500);
  }
});

app.get("/platforms/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
    assertUuid(id, "platform");
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(platforms)
      .where(eq(platforms.id, id))
      .limit(1);
    if (!row) throw new ApiError(404, "Platform not found");
    return c.json(toPlatformRow(row));
  } catch (err) {
    if (err instanceof ApiError) return c.json({ error: err.message }, err.status);
    return c.json({ error: errorMessage(err, "Failed to fetch platform") }, 500);
  }
});

app.post("/platforms", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, createPlatformSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    const db = getApiDb();
    const [row] = await db
      .insert(platforms)
      .values(platformValues(data))
      .returning();
    if (!row) return c.json({ error: "Failed to create platform" }, 500);
    void purgePublicCache(c.env, ["home"], waitUntilOf(c));
    return c.json(toPlatformRow(row), 201);
  } catch (err) {
    if (err instanceof ApiError) return c.json({ error: err.message }, err.status);
    return c.json({ error: errorMessage(err, "Failed to create platform") }, 500);
  }
});

app.put("/platforms/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
    assertUuid(id, "platform");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, updatePlatformSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    const db = getApiDb();
    const [row] = await db
      .update(platforms)
      .set({ ...platformValues(data), updatedAt: new Date() })
      .where(eq(platforms.id, id))
      .returning();
    if (!row) throw new ApiError(404, "Platform not found");
    void purgePublicCache(c.env, ["home"], waitUntilOf(c));
    return c.json(toPlatformRow(row));
  } catch (err) {
    if (err instanceof ApiError) return c.json({ error: err.message }, err.status);
    return c.json({ error: errorMessage(err, "Failed to update platform") }, 500);
  }
});

app.delete("/platforms/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
    assertUuid(id, "platform");
    await getApiDb().delete(platforms).where(eq(platforms.id, id));
    void purgePublicCache(c.env, ["home"], waitUntilOf(c));
    return c.json({ success: true });
  } catch (err) {
    if (err instanceof ApiError) return c.json({ error: err.message }, err.status);
    return c.json({ error: errorMessage(err, "Failed to delete platform") }, 500);
  }
});

export default app;
