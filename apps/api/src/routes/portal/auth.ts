// Portal auth — Better Auth (same ba_user/ba_session tables, cookie and
// secret as the admin). The old JWT + portal_session_token cookie +
// bcryptjs login are retired.
//
// - POST /auth/login  { projectId, email, password }
// - POST /auth/setup  { token, email, password }
// - GET  /auth/verify?token=...
//
// Logout is POST /api/auth/sign-out (the Better Auth handler itself).
//
// Legacy migration: a client who never set up a Better Auth account but
// has a legacy bcrypt password_hash on their portal session is verified
// against that hash on first login and transparently migrated to a
// Better Auth account with the same password. A wrong password never
// creates an account.
import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getApiDb } from "../../db";
import { portalSessions, projectsFreelance } from "@repo/database/schema";
import {
  delegateToBetterAuth,
  findBaUserByEmail,
  logActivity,
  readJsonBody,
  resolveClientName,
  updateLastAccessed,
} from "./helpers";

const auth = new Hono();

/** Error body from a Better Auth handler response, if any. */
async function betterAuthError(res: Response): Promise<string | null> {
  try {
    const data: unknown = await res.json();
    if (data && typeof data === "object" && "message" in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === "string" && message) return message;
    }
  } catch {
    // No JSON body — fall through to the default message.
  }
  return null;
}

auth.post("/login", async (c) => {
  try {
    const body = await readJsonBody(c);
    const projectId = body?.projectId;
    const email = body?.email;
    const password = body?.password;
    if (
      typeof projectId !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !projectId ||
      !email ||
      !password
    ) {
      return c.json(
        { error: "Project ID, email, and password are required" },
        400,
      );
    }

    const db = getApiDb();
    const [project] = await db
      .select()
      .from(projectsFreelance)
      .where(eq(projectsFreelance.id, projectId))
      .limit(1);
    if (!project || !project.portalAccessEnabled) {
      return c.json(
        { error: "Project not found or portal access not enabled" },
        404,
      );
    }

    // Legacy migration: no Better Auth account yet — verify the legacy
    // bcrypt hash on the portal session and create the account.
    const existingUser = await findBaUserByEmail(db, email);
    if (!existingUser) {
      const [session] = await db
        .select()
        .from(portalSessions)
        .where(eq(portalSessions.projectId, projectId))
        .limit(1);
      if (
        !session?.passwordHash ||
        !session.clientEmail ||
        session.clientEmail.toLowerCase() !== email.toLowerCase()
      ) {
        return c.json({ error: "Invalid email or password" }, 401);
      }
      const passwordOk = await bcrypt.compare(password, session.passwordHash);
      if (!passwordOk) {
        return c.json({ error: "Invalid email or password" }, 401);
      }
      const name = await resolveClientName(db, project.clientId ?? "");
      const signupRes = await delegateToBetterAuth(
        c,
        "/api/auth/sign-up/email",
        { email, password, name },
      );
      if (!signupRes.ok) {
        const message = await betterAuthError(signupRes);
        // Race: the account was created between the check and the sign-up.
        if (!message || !/already exists/i.test(message)) {
          return c.json(
            { error: message ?? "Login failed" },
            (signupRes.status as 400 | 401 | 422 | 500) || 500,
          );
        }
      }
    }

    // Sign in through the Better Auth handler; its Response (with the
    // session cookie) is returned untouched.
    const signInRes = await delegateToBetterAuth(
      c,
      "/api/auth/sign-in/email",
      { email, password },
    );
    if (!signInRes.ok) {
      const message = await betterAuthError(signInRes);
      return c.json(
        { error: message ?? "Login failed" },
        (signInRes.status as 400 | 401 | 422 | 500) || 401,
      );
    }

    const [session] = await db
      .select()
      .from(portalSessions)
      .where(eq(portalSessions.projectId, projectId))
      .limit(1);
    if (session) {
      await updateLastAccessed(db, session.id);
      try {
        await logActivity(db, projectId, "client_logged_in", { email });
      } catch {
        // Activity logging must never fail a successful login.
      }
    }
    return signInRes;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return c.json({ error: message }, 401);
  }
});

auth.post("/setup", async (c) => {
  try {
    const body = await readJsonBody(c);
    const token = body?.token;
    const email = body?.email;
    const password = body?.password;
    if (
      typeof token !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !token ||
      !email ||
      !password
    ) {
      return c.json(
        { error: "Token, email, and password are required" },
        400,
      );
    }
    if (password.length < 8) {
      return c.json(
        { error: "Password must be at least 8 characters" },
        400,
      );
    }

    const db = getApiDb();
    const [session] = await db
      .select()
      .from(portalSessions)
      .where(eq(portalSessions.portalToken, token))
      .limit(1);
    if (!session) {
      return c.json({ error: "Invalid or expired access token" }, 404);
    }
    if (!session.projectId) {
      return c.json({ error: "Invalid or expired access token" }, 404);
    }
    const existingUser = await findBaUserByEmail(db, email);
    if (session.passwordHash || existingUser) {
      return c.json(
        { error: "Password already set. Please login." },
        400,
      );
    }
    if (
      session.clientEmail &&
      session.clientEmail.toLowerCase() !== email.toLowerCase()
    ) {
      return c.json(
        { error: "Email does not match the portal invitation" },
        400,
      );
    }
    if (!session.clientEmail) {
      await db
        .update(portalSessions)
        .set({ clientEmail: email })
        .where(eq(portalSessions.id, session.id));
    }

    // Create the Better Auth account; the handler's Response (with the
    // session cookie) is returned untouched.
    const [project] = await db
      .select()
      .from(projectsFreelance)
      .where(eq(projectsFreelance.id, session.projectId))
      .limit(1);
    const name = await resolveClientName(db, project?.clientId ?? "");
    const signupRes = await delegateToBetterAuth(
      c,
      "/api/auth/sign-up/email",
      { email, password, name },
    );
    if (!signupRes.ok) {
      const message = await betterAuthError(signupRes);
      return c.json(
        { error: message ?? "Setup failed" },
        (signupRes.status as 400 | 401 | 422 | 500) || 500,
      );
    }

    await updateLastAccessed(db, session.id);
    try {
      await logActivity(db, session.projectId, "portal_setup_complete", {
        email,
      });
    } catch {
      // Activity logging must never fail a successful setup.
    }
    return signupRes;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Setup failed";
    return c.json({ error: message }, 500);
  }
});

// Token lookup only — the setup page is the only caller and always sends a
// token. (The old route also accepted a portal_session_token cookie and
// decoded a JWT; that path is dead and is not ported.)
auth.get("/verify", async (c) => {
  try {
    const token = c.req.query("token");
    if (!token) {
      return c.json({ error: "Token is required" }, 400);
    }
    const db = getApiDb();
    const [session] = await db
      .select()
      .from(portalSessions)
      .where(eq(portalSessions.portalToken, token))
      .limit(1);
    if (!session) {
      return c.json({ error: "Invalid token" }, 404);
    }
    if (!session.projectId) {
      return c.json({ error: "Invalid token" }, 404);
    }
    const [project] = await db
      .select()
      .from(projectsFreelance)
      .where(eq(projectsFreelance.id, session.projectId))
      .limit(1);
    return c.json({
      projectId: session.projectId,
      clientEmail: session.clientEmail,
      projectName: project?.title ?? "Unknown Project",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return c.json({ error: message }, 500);
  }
});

export { auth as portalAuthRouter };
