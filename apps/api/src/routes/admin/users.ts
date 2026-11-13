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
import { asc, sql } from "drizzle-orm";
import { users } from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
  };
};

const app = new Hono<Env>();

// STANDARD: GET /users is open to ANY authenticated session.
// Non-admin CRM staff need it for the assignee picker (an admin-only
// guard left them with an empty list). The response is safe by
// construction: the SELECT picks only id, name and email — never a
// password hash, session token or any other sensitive field (the
// internal `users` table holds no credential material at all; the
// Better Auth hash lives in `ba_user`, which this route never reads).
app.get("/users", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const rows = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(sql`${users.isActive} IS DISTINCT FROM false`)
      .orderBy(sql`${users.name} ASC NULLS LAST`, asc(users.email));
    return c.json(rows);
  } catch (err) {
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
