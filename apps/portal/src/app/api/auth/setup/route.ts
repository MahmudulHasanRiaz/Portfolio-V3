import { NextRequest, NextResponse } from "next/server";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { token, email, password } = await request.json();
    if (!token || !email || !password) {
      return NextResponse.json({ error: "Token, email, and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const { createPortalRepositories } = await import("@repo/portal-pkg");
    const repo = createPortalRepositories(dbUrl);

    try {
      const session = await repo.auth.getSessionByToken(token);
      if (!session) {
        return NextResponse.json({ error: "Invalid or expired access token" }, { status: 404 });
      }

      if (session.passwordHash) {
        return NextResponse.json({ error: "Password already set. Please login." }, { status: 400 });
      }

      if (session.clientEmail) {
        if (session.clientEmail.toLowerCase() !== email.toLowerCase()) {
          return NextResponse.json({ error: "Email does not match the registered email for this project" }, { status: 400 });
        }
      } else {
        // No client email registered for this project (e.g. no linked
        // client): bind the email used at first setup.
        await repo.auth.bindClientEmail(session.projectId, email);
      }

      await repo.auth.setPassword(session.projectId, password);

      const jwt = repo.auth.generateJwt(session.id, session.projectId, email);
      await repo.auth.updateLastAccessed(session.id);
      await repo.activities.log(session.projectId, null, "portal_setup_complete", { email });

      const response = NextResponse.json({ success: true, projectId: session.projectId, email });
      response.cookies.set("portal_session_token", jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });

      return response;
    } finally {
      await repo.close();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Setup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
