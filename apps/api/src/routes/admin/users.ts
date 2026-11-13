// Admin users route — Hono port of apps/admin/src/app/api/users/route.ts:
//   GET /users
//
// Mounted at /api/admin/users (this router is mounted at / — see
// routes/admin/index.ts).
//
// Fidelity notes:
// - Reads the internal `users` table (uuid PKs), NOT `ba_user`: lead
//   assignment stores `assigned_user_id` as uuid, and Better Auth ids
//   are opaque text, so listing `ba_user` ids would make every assign
//   fail the `::uuid` cast in the assign route. Only active users are
//   listed (is_active IS DISTINCT FROM false, i.e. true or NULL).
// - The Next.js route used raw postgres.js + sql.unsafe (Node-only, TCP).
//   That is NOT ported: this router runs the same SELECT through
//   getApiDb() (Neon HTTP Drizzle) and returns the same shape — a bare
//   array of { id, name, email }, ordered by name ASC NULLS LAST, then
//   email ASC. No postgres.js import anywhere in this file.
import { Hono } from "hono";
import { asc, eq, sql } from "drizzle-orm";
import { roles, userRoles, users } from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
  };
};

const app = new Hono<Env>();

type ApiDb = ReturnType<typeof getApiDb>;

// ─── Admin role guard ────────────────────────────────────────────────────────
// The requireIntegrationAdmin pattern from routes/admin/settings.ts,
// re-implemented here on the Neon HTTP DB (same reason media.ts gives
// for its local authorizeByEmailNeon: packages/auth's authorizeByEmail
// is TCP-bound and cannot run on Workers). settings.ts does not export
// its guard, and importing a route module for it would couple the two
// routers; the lookup is small and mirrors the original exactly:
// internal user by Better Auth email, active account, then one of the
// slugified roles "admin" / "super_admin".
// This endpoint lists internal users' emails, so it gets the guard
// the original Next.js route never had; the response shape is
// unchanged.

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

app.get("/users", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    await requireIntegrationAdmin(db, user.email);
    const rows = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(sql`${users.isActive} IS DISTINCT FROM false`)
      .orderBy(sql`${users.name} ASC NULLS LAST`, asc(users.email));
    return c.json(rows);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (err instanceof ForbiddenError) {
      return c.json({ error: "Forbidden" }, 403);
    }
    return c.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to fetch users",
      },
      500,
    );
  }
});

export default app;
