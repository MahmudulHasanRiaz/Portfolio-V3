// Client Portal sessions — Hono port of the kept Next.js routes
// apps/admin/src/app/api/portal/sessions[/[id][/disable|/regenerate-token]].
//
// WHY A PORT: those routes use the local Better Auth instance
// (auth.api.getSession, postgres.js TCP) AND raw postgres.js for the
// queries — neither can run on Cloudflare Workers. Every call 401'd,
// so the Portal list page received `{ error: "Unauthorized" }` (an
// object, not the array it expects) and crashed with
// "e.map is not a function". Both the auth and the DB access are
// re-implemented here with requireAuth + getApiDb() (Neon HTTP),
// logic verbatim from the original routes.
//
// Fidelity notes:
// - GET /sessions returns a BARE ARRAY (the list page does
//   `sessions.map(...)` on the response directly) — not wrapped.
// - GET /sessions/:id does NOT return passwordHash (the original did;
//   Phase 0 flagged it). It returns `hasPassword: boolean` instead —
//   the detail page only ever rendered it as "Password set: Yes/No".
//   The detail page was updated to read hasPassword.
// - POST /sessions/:id/disable deletes the session row and clears
//   portal access on the freelance project (portalAccessEnabled false,
//   portalToken null). Neon HTTP has no db.transaction(), so the two
//   statements run sequentially, as elsewhere in this codebase.
// - POST /sessions/:id/regenerate-token mints a fresh 32-byte hex
//   token (Web Crypto — Workers-native) and writes it to both the
//   session row and the denormalized copy on the freelance project.
import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { portalSessions, projectsFreelance } from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";
import { invalidParam, uuidParam } from "../../lib/validate";

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
  };
};

const app = new Hono<Env>();

// GET /sessions — bare array, newest first, with the project title.
app.get("/sessions", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const rows = await db
      .select({
        id: portalSessions.id,
        projectId: portalSessions.projectId,
        portalToken: portalSessions.portalToken,
        clientEmail: portalSessions.clientEmail,
        lastAccessedAt: portalSessions.lastAccessedAt,
        createdAt: portalSessions.createdAt,
        projectTitle: projectsFreelance.title,
      })
      .from(portalSessions)
      .leftJoin(projectsFreelance, eq(projectsFreelance.id, portalSessions.projectId))
      .orderBy(desc(portalSessions.createdAt));
    return c.json(rows);
  } catch (err) {
    console.error("[Portal Sessions API] Error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to fetch sessions" },
      500,
    );
  }
});

// GET /sessions/:id — one session. No passwordHash (see header).
app.get("/sessions/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [row] = await db
      .select({
        id: portalSessions.id,
        projectId: portalSessions.projectId,
        portalToken: portalSessions.portalToken,
        clientEmail: portalSessions.clientEmail,
        passwordHash: portalSessions.passwordHash,
        lastAccessedAt: portalSessions.lastAccessedAt,
        expiresAt: portalSessions.expiresAt,
        createdAt: portalSessions.createdAt,
        projectTitle: projectsFreelance.title,
      })
      .from(portalSessions)
      .leftJoin(projectsFreelance, eq(projectsFreelance.id, portalSessions.projectId))
      .where(eq(portalSessions.id, id))
      .limit(1);
    if (!row) return c.json({ error: "Not found" }, 404);
    const { passwordHash, ...rest } = row;
    return c.json({ ...rest, hasPassword: passwordHash != null && passwordHash !== "" });
  } catch (err) {
    console.error("[Portal Sessions API] Error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to fetch session" },
      500,
    );
  }
});

// POST /sessions/:id/disable — delete the session, clear portal access
// on the freelance project.
app.post("/sessions/:id/disable", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [session] = await db
      .select({ projectId: portalSessions.projectId })
      .from(portalSessions)
      .where(eq(portalSessions.id, id))
      .limit(1);
    if (!session) return c.json({ error: "Not found" }, 404);
    await db.delete(portalSessions).where(eq(portalSessions.id, id));
    if (session.projectId) {
      await db
        .update(projectsFreelance)
        .set({ portalAccessEnabled: false, portalToken: null, updatedAt: new Date() })
        .where(eq(projectsFreelance.id, session.projectId));
    }
    return c.json({ success: true });
  } catch (err) {
    console.error("[Portal Sessions API] Error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to disable portal" },
      500,
    );
  }
});

// POST /sessions/:id/regenerate-token — mint a fresh token, keep the
// denormalized copy on the freelance project in sync.
app.post("/sessions/:id/regenerate-token", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [session] = await db
      .select({ projectId: portalSessions.projectId })
      .from(portalSessions)
      .where(eq(portalSessions.id, id))
      .limit(1);
    if (!session) return c.json({ error: "Not found" }, 404);
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const newToken = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    await db
      .update(portalSessions)
      .set({ portalToken: newToken })
      .where(eq(portalSessions.id, id));
    if (session.projectId) {
      await db
        .update(projectsFreelance)
        .set({ portalToken: newToken, updatedAt: new Date() })
        .where(eq(projectsFreelance.id, session.projectId));
    }
    return c.json({ success: true, portalToken: newToken });
  } catch (err) {
    console.error("[Portal Sessions API] Error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to regenerate token" },
      500,
    );
  }
});

export default app;
