// Admin client CRUD — moved verbatim from routes/admin/directory.ts
// (Hono port of the Next.js admin server actions in
// apps/admin/src/actions/directory.ts).
//
// The source is server actions, so there is no REST shape to preserve —
// these routes expose the same rows the actions returned (ClientRow)
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
import { clients } from "@repo/database/schema";
import { getApiDb } from "../../../db";
import { ensureClientsLogoDisplayMode } from "../../../lib/ensure-schema";
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
const createClientSchema = z.object({
  name: z.string().min(1).max(255),
  logoUrl: z.string().url().optional(),
  // "logo" = logo image only (the default, also what NULL means),
  // "name_logo" = square icon beside the client name. Nullable
  // because the admin sends null for an unset field (its asText);
  // any other value is rejected, never stored.
  logoDisplayMode: z.enum(["logo", "name_logo"]).nullable().optional(),
  website: z.string().url().optional(),
  nameBn: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
});
const updateClientSchema = createClientSchema;

// List `search` is capped at 255 chars (400 when longer) — checked
// inline in each list handler below.

// ─── Clients ─────────────────────────────────────────────────────────────────

export interface ClientRow {
  id: string;
  name: string;
  logoUrl: string | null;
  /** "logo" | "name_logo" | null (null = "logo" default). */
  logoDisplayMode: string | null;
  website: string | null;
  sortOrder: number | null;
  nameBn: string | null;
}

function toClientRow(r: typeof clients.$inferSelect): ClientRow {
  return {
    id: r.id,
    name: r.name ?? "",
    logoUrl: r.logoUrl,
    logoDisplayMode: r.logoDisplayMode,
    website: r.website,
    sortOrder: r.sortOrder,
    nameBn: r.nameBn,
  };
}

export interface ClientInput {
  name: string;
  logoUrl?: string | null;
  logoDisplayMode?: string | null;
  website?: string | null;
  sortOrder?: number | null;
  nameBn?: string | null;
}

/** Only the two known modes survive; anything else stores as NULL
 *  (the "logo" default) instead of failing the save. */
function asDisplayMode(value: unknown): "logo" | "name_logo" | null {
  return value === "logo" || value === "name_logo" ? value : null;
}

function clientValues(data: ClientInput) {
  const name = asText(data.name);
  if (!name) throw new ApiError(400, "Name is required");
  return {
    name,
    logoUrl: asText(data.logoUrl),
    logoDisplayMode: asDisplayMode(data.logoDisplayMode),
    website: asText(data.website),
    sortOrder: asSortOrder(data.sortOrder),
    nameBn: asText(data.nameBn),
  };
}

app.get("/clients", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const db = getApiDb();
    // 0036 auto-apply: create `logo_display_mode` before the first
    // query that selects it (no manual migration).
    await ensureClientsLogoDisplayMode(db);
    const search = (c.req.query("search") ?? "").trim();
    if (search.length > 255) {
      return c.json({ error: "search must be at most 255 characters" }, 400);
    }
    const rows = await db
      .select()
      .from(clients)
      .where(search ? ilike(clients.name, `%${escapeLike(search)}%`) : undefined)
      .orderBy(asc(clients.sortOrder), asc(clients.createdAt));
    return c.json(rows.map(toClientRow));
  } catch (err) {
    if (err instanceof ApiError) return c.json({ error: err.message }, err.status);
    return c.json({ error: errorMessage(err, "Failed to fetch clients") }, 500);
  }
});

app.get("/clients/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
    assertUuid(id, "client");
    const db = getApiDb();
    // 0036 auto-apply (see GET /clients).
    await ensureClientsLogoDisplayMode(db);
    const [row] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);
    if (!row) throw new ApiError(404, "Client not found");
    return c.json(toClientRow(row));
  } catch (err) {
    if (err instanceof ApiError) return c.json({ error: err.message }, err.status);
    return c.json({ error: errorMessage(err, "Failed to fetch client") }, 500);
  }
});

app.post("/clients", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, createClientSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    const db = getApiDb();
    // 0036 auto-apply (see GET /clients).
    await ensureClientsLogoDisplayMode(db);
    const [row] = await db
      .insert(clients)
      .values(clientValues(data))
      .returning();
    if (!row) return c.json({ error: "Failed to create client" }, 500);
    void purgePublicCache(c.env, ["home"], waitUntilOf(c));
    return c.json(toClientRow(row), 201);
  } catch (err) {
    if (err instanceof ApiError) return c.json({ error: err.message }, err.status);
    return c.json({ error: errorMessage(err, "Failed to create client") }, 500);
  }
});

app.put("/clients/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
    assertUuid(id, "client");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, updateClientSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    const db = getApiDb();
    // 0036 auto-apply (see GET /clients).
    await ensureClientsLogoDisplayMode(db);
    const [row] = await db
      .update(clients)
      .set({ ...clientValues(data), updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    if (!row) throw new ApiError(404, "Client not found");
    void purgePublicCache(c.env, ["home"], waitUntilOf(c));
    return c.json(toClientRow(row));
  } catch (err) {
    if (err instanceof ApiError) return c.json({ error: err.message }, err.status);
    return c.json({ error: errorMessage(err, "Failed to update client") }, 500);
  }
});

app.delete("/clients/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
    assertUuid(id, "client");
    await getApiDb().delete(clients).where(eq(clients.id, id));
    void purgePublicCache(c.env, ["home"], waitUntilOf(c));
    return c.json({ success: true });
  } catch (err) {
    if (err instanceof ApiError) return c.json({ error: err.message }, err.status);
    return c.json({ error: errorMessage(err, "Failed to delete client") }, 500);
  }
});

export default app;
