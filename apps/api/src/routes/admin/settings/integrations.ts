// Admin settings — website integrations (Hono port of
// apps/admin/src/app/api/settings/integrations/*).
//
// Split from routes/admin/settings.ts — move-only, no behaviour change.
// Mounted at /api/admin/settings (see routes/admin/index.ts) via
// settings/index.ts, which mounts this router at "/".
//
// Fidelity notes:
// - Integrations keep the original role guard (admin / super_admin
//   via authorizeByEmail). packages/auth's authorizeByEmail is
//   TCP-bound (getDb()/postgres.js), so the email -> internal user ->
//   slugified roles lookup is re-implemented here on the Neon HTTP
//   DB (users / user_roles / roles tables), exactly as in
//   packages/auth/src/lib/authorization.ts (display names such as
//   "Super Admin" slugify to "super_admin").
// - Integrations token handling mirrors
//   apps/admin/src/lib/website-integrations.ts: only the SHA-256 hash
//   is stored; the full token (wpi_ + 32 random bytes, base64url) is
//   returned exactly once at creation / regeneration and never again.
//   Hashing reuses apps/api/src/lib/integrations.ts (Web Crypto
//   SHA-256, Workers-safe); token randomness uses
//   crypto.getRandomValues (Web Crypto, Workers-safe).
// - Integrations [id]: the Next.js original is PATCH + DELETE (no
//   GET). This router adds the GET single-item read and a PUT alias
//   for PATCH (same handler, same validation), so both the original
//   PATCH contract and the PUT contract are served.
import { Hono } from "hono";
import type { Context } from "hono";
import { desc, eq } from "drizzle-orm";
import {
  roles,
  userRoles,
  users,
  websiteIntegrations,
} from "@repo/database/schema";
import { getApiDb } from "../../../db";
import { requireAuth } from "../../../lib/admin-auth";
import { hashIntegrationToken } from "../../../lib/integrations";
import { z } from "zod";
import {
  invalidParam,
  isRecord,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../../lib/validate";
import type { ApiDb, Env } from "./helpers";
import { errorMessage } from "./helpers";

const app = new Hono<Env>();

// ─── Local request schemas (Zod audit, 2026-11-13) ─────────────────────────
// Zod strips unknown keys, so server-managed fields (id, createdBy,
// createdAt, updatedAt) can never reach a DB write through these bodies.

const createIntegrationSchema = z.object({
  name: z.string().trim().min(1).max(255),
});

const updateIntegrationSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  isActive: z.boolean().optional(),
});

// ─── Integrations ────────────────────────────────────────────────────────────
// Role guard ported from packages/auth/src/lib/authorization.ts
// (authorizeByEmail) + apps/admin/src/lib/website-integrations.ts
// (requireIntegrationAdmin), re-implemented on the Neon HTTP DB because
// the original is TCP-bound (getDb()/postgres.js).

class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

function slugifyRoleName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Mirror authorizeByEmail(email, "admin", "super_admin"): resolve the
 *  internal user by Better Auth email, require an active account, then
 *  require one of the given slugified roles. Throws UnauthorizedError
 *  (401) or ForbiddenError (403). */
async function requireIntegrationAdmin(
  db: ApiDb,
  email: string | undefined,
): Promise<{ id: string; email: string }> {
  if (!email) throw new UnauthorizedError("Unauthorized");
  const [internal] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!internal) throw new UnauthorizedError("User not found in internal registry");
  if (!internal.isActive) throw new ForbiddenError("User account is disabled");
  const roleRows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, internal.id));
  const roleSlugs = [
    ...new Set(roleRows.map((r) => slugifyRoleName(r.roleName))),
  ];
  if (!roleSlugs.includes("admin") && !roleSlugs.includes("super_admin")) {
    throw new ForbiddenError("Required role: admin or super_admin");
  }
  return { id: internal.id, email: internal.email };
}

function handleIntegrationError(err: unknown) {
  if (err instanceof UnauthorizedError) {
    return { status: 401 as const, body: { error: "Unauthorized" } };
  }
  if (err instanceof ForbiddenError) {
    return { status: 403 as const, body: { error: "Forbidden" } };
  }
  return {
    status: 500 as const,
    body: { error: errorMessage(err) },
  };
}

interface WebsiteIntegrationListItem {
  id: string;
  name: string;
  tokenPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type WebsiteIntegrationRow = typeof websiteIntegrations.$inferSelect;

function toListItem(row: WebsiteIntegrationRow): WebsiteIntegrationListItem {
  return {
    id: row.id,
    name: row.name,
    tokenPrefix: row.tokenPrefix,
    isActive: row.isActive ?? false,
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    createdAt: (row.createdAt ?? new Date(0)).toISOString(),
    updatedAt: (row.updatedAt ?? new Date(0)).toISOString(),
  };
}

/** Mirror generateIntegrationToken(): `wpi_` + 32 random bytes, base64url.
 *  Web Crypto only (no node:crypto on Workers). The SHA-256 hash is
 *  computed by the caller via hashIntegrationToken (async Web Crypto). */
function generateIntegrationToken(): {
  token: string;
  tokenPrefix: string;
} {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let encoded = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const b1 = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    encoded += alphabet[b0 >> 2]!;
    encoded += alphabet[((b0 & 0x03) << 4) | (b1 >> 4)]!;
    if (i + 1 < bytes.length) {
      encoded += alphabet[((b1 & 0x0f) << 2) | (b2 >> 6)]!;
    }
    if (i + 2 < bytes.length) {
      encoded += alphabet[b2 & 0x3f]!;
    }
  }
  const token = `wpi_${encoded}`;
  return { token, tokenPrefix: token.slice(0, 8) };
}

app.get("/integrations", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    await requireIntegrationAdmin(db, user.email);
    const rows = await db
      .select()
      .from(websiteIntegrations)
      .orderBy(desc(websiteIntegrations.createdAt));
    return c.json({ integrations: rows.map(toListItem) });
  } catch (err) {
    const { status, body } = handleIntegrationError(err);
    return c.json(body, status);
  }
});

app.post("/integrations", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    await requireIntegrationAdmin(db, user.email);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, createIntegrationSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const name = v.data.name;
    const { token, tokenPrefix } = generateIntegrationToken();
    const tokenHash = await hashIntegrationToken(token);
    const [row] = await db
      .insert(websiteIntegrations)
      .values({ name, tokenHash, tokenPrefix })
      .returning();
    if (!row) throw new Error("Failed to create website integration");
    return c.json({ integration: toListItem(row), token }, 201);
  } catch (err) {
    const { status, body } = handleIntegrationError(err);
    return c.json(body, status);
  }
});

app.get("/integrations/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    await requireIntegrationAdmin(db, user.email);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const [row] = await db
      .select()
      .from(websiteIntegrations)
      .where(eq(websiteIntegrations.id, id))
      .limit(1);
    if (!row) return c.json({ error: "Integration not found" }, 404);
    return c.json({ integration: toListItem(row) });
  } catch (err) {
    const { status, body } = handleIntegrationError(err);
    return c.json(body, status);
  }
});

async function updateIntegrationHandler(c: Context<Env, "/integrations/:id">) {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    await requireIntegrationAdmin(db, user.email);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, updateIntegrationSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const patch: { name?: string; isActive?: boolean } = {};
    if (v.data.name !== undefined) patch.name = v.data.name;
    if (v.data.isActive !== undefined) patch.isActive = v.data.isActive;
    // Drizzle's update-set type rejects possibly-undefined values, so
    // each combination is set with a fully concrete literal (the
    // original updates with the same patch object; an empty patch just
    // stamps updatedAt).
    const [row] = await (async () => {
      if (patch.name !== undefined && patch.isActive !== undefined) {
        return db
          .update(websiteIntegrations)
          .set({
            name: patch.name,
            isActive: patch.isActive,
            updatedAt: new Date(),
          })
          .where(eq(websiteIntegrations.id, id))
          .returning();
      }
      if (patch.name !== undefined) {
        return db
          .update(websiteIntegrations)
          .set({ name: patch.name, updatedAt: new Date() })
          .where(eq(websiteIntegrations.id, id))
          .returning();
      }
      if (patch.isActive !== undefined) {
        return db
          .update(websiteIntegrations)
          .set({ isActive: patch.isActive, updatedAt: new Date() })
          .where(eq(websiteIntegrations.id, id))
          .returning();
      }
      return db
        .update(websiteIntegrations)
        .set({ updatedAt: new Date() })
        .where(eq(websiteIntegrations.id, id))
        .returning();
    })();
    if (!row) return c.json({ error: "Integration not found" }, 404);
    return c.json({ integration: toListItem(row) });
  } catch (err) {
    const { status, body } = handleIntegrationError(err);
    return c.json(body, status);
  }
}

// Original is PATCH; PUT is registered as an alias with identical behaviour.
app.patch("/integrations/:id", updateIntegrationHandler);
app.put("/integrations/:id", updateIntegrationHandler);

app.delete("/integrations/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    await requireIntegrationAdmin(db, user.email);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const rows = await db
      .delete(websiteIntegrations)
      .where(eq(websiteIntegrations.id, id))
      .returning({ id: websiteIntegrations.id });
    if (rows.length === 0) {
      return c.json({ error: "Integration not found" }, 404);
    }
    return c.json({ ok: true });
  } catch (err) {
    const { status, body } = handleIntegrationError(err);
    return c.json(body, status);
  }
});

app.post("/integrations/:id/regenerate", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    await requireIntegrationAdmin(db, user.email);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const { token, tokenPrefix } = generateIntegrationToken();
    const tokenHash = await hashIntegrationToken(token);
    const [row] = await db
      .update(websiteIntegrations)
      .set({ tokenHash, tokenPrefix, updatedAt: new Date() })
      .where(eq(websiteIntegrations.id, id))
      .returning();
    if (!row) return c.json({ error: "Integration not found" }, 404);
    return c.json({ integration: toListItem(row), token });
  } catch (err) {
    const { status, body } = handleIntegrationError(err);
    return c.json(body, status);
  }
});

export default app;
