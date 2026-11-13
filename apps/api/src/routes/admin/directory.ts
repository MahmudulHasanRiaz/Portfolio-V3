// Admin directory CRUD — Hono port of the Next.js admin server actions in
// apps/admin/src/actions/directory.ts (platforms, technologies, clients).
// Mounted at /api/admin/directory by routes/admin/index.ts.
//
// The source is server actions, so there is no REST shape to preserve —
// these routes expose the same rows the actions returned (PlatformRow /
// TechnologyRow / ClientRow) as JSON: GET list returns the array, GET :id /
// POST / PUT :id return the single row, DELETE returns { success: true }.
// Validation failures are 400, missing rows are 404, mirroring the
// messages the actions threw. Drizzle rows are already camelCase, so no
// toCamel conversion is applied.
//
// Cache purge (wired at cutover via lib/side-effects): the source calls
// purgePublicCache(["home"]) after every create/update/delete
// (best-effort, never fails the save).
import { Hono } from "hono";
import { asc, eq, ilike } from "drizzle-orm";
import { clients, platforms, technologies } from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth, unauthorized } from "../../lib/admin-auth";
import { purgePublicCache, waitUntilOf } from "../../lib/side-effects";

const app = new Hono();

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/** Validation / not-found error: the catch in each handler maps it to its status. */
class ApiError extends Error {
  readonly status: 400 | 404;
  constructor(status: 400 | 404, message: string) {
    super(message);
    this.status = status;
  }
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function asSortOrder(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function assertUuid(id: string, label: string): void {
  if (!UUID_RE.test(id)) throw new ApiError(400, `Invalid ${label} id`);
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

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
    const data = (await c.req.json()) as PlatformInput;
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
    const data = (await c.req.json()) as PlatformInput;
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
    const data = (await c.req.json()) as TechnologyInput;
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
    const data = (await c.req.json()) as TechnologyInput;
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

// ─── Clients ─────────────────────────────────────────────────────────────────

export interface ClientRow {
  id: string;
  name: string;
  logoUrl: string | null;
  website: string | null;
  sortOrder: number | null;
  nameBn: string | null;
}

function toClientRow(r: typeof clients.$inferSelect): ClientRow {
  return {
    id: r.id,
    name: r.name ?? "",
    logoUrl: r.logoUrl,
    website: r.website,
    sortOrder: r.sortOrder,
    nameBn: r.nameBn,
  };
}

export interface ClientInput {
  name: string;
  logoUrl?: string | null;
  website?: string | null;
  sortOrder?: number | null;
  nameBn?: string | null;
}

function clientValues(data: ClientInput) {
  const name = asText(data.name);
  if (!name) throw new ApiError(400, "Name is required");
  return {
    name,
    logoUrl: asText(data.logoUrl),
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
    const search = (c.req.query("search") ?? "").trim();
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
    const data = (await c.req.json()) as ClientInput;
    const db = getApiDb();
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
    const data = (await c.req.json()) as ClientInput;
    const db = getApiDb();
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
