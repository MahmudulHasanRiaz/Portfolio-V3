// Auth routes — Hono port of
// apps/admin/src/app/api/auth/user/roles/route.ts.
// Mounted at /api/auth (see src/index.ts). This is the start of the
// /api/auth mount; the full Better Auth handler remount
// (/api/auth/[...all]) is a separate, later piece.
//
// Fidelity notes:
// - No session email -> 401 { roles: [] }.
// - Otherwise resolve the internal user by email (authorizeByEmail) and
//   return getInternalRoles(user.id) -> { roles } (slugified role names,
//   e.g. "super_admin", exactly as packages/auth returns them).
// - Inner failure (user not found / roles lookup) -> { roles: [] } (200),
//   exactly as the original's inner catch.
// - Outer failure -> 500 { roles: [] }.
// - authorizeByEmail + getInternalRoles are re-implemented here on the
//   Neon HTTP DB because packages/auth's versions are TCP-bound
//   (getDb()/postgres.js). The slugify + join logic mirrors
//   packages/auth/src/lib/authorization.ts (fetchRolesAndPermissions).
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { roles, userRoles, users } from "@repo/database/schema";
import { getApiDb } from "../db";
import { getSessionUser } from "../auth";

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
  };
};

const app = new Hono<Env>();

function slugifyRoleName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Mirror getInternalRoles(userId): slugified role names for the user. */
async function getInternalRoles(userId: string): Promise<string[]> {
  const db = getApiDb();
  const rows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
  return [...new Set(rows.map((r) => slugifyRoleName(r.roleName)))];
}

// GET /user/roles
app.get("/user/roles", async (c) => {
  try {
    const sessionUser = await getSessionUser(c.req.raw.headers);
    if (!sessionUser?.email) {
      return c.json({ roles: [] }, 401);
    }
    try {
      const db = getApiDb();
      const [internal] = await db
        .select()
        .from(users)
        .where(eq(users.email, sessionUser.email))
        .limit(1);
      if (!internal) throw new Error("User not found in internal registry");
      const rolesList = await getInternalRoles(internal.id);
      return c.json({ roles: rolesList });
    } catch {
      return c.json({ roles: [] });
    }
  } catch {
    return c.json({ roles: [] }, 500);
  }
});

export default app;
