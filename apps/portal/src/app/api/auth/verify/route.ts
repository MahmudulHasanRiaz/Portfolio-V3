import { NextRequest, NextResponse } from "next/server";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (token) {
      const { createPortalRepositories } = await import("@repo/portal-pkg");
      const repo = createPortalRepositories(dbUrl);

      try {
        const session = await repo.auth.getSessionByToken(token);
        if (!session) {
          return NextResponse.json({ error: "Invalid token" }, { status: 404 });
        }

        const project = await repo.projects.getById(session.projectId);
        return NextResponse.json({
          projectId: session.projectId,
          clientEmail: session.clientEmail,
          projectName: project?.title || "Unknown Project",
        });
      } finally {
        await repo.close();
      }
    }

    const sessionToken = request.cookies.get("portal_session_token")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const { createPortalRepositories } = await import("@repo/portal-pkg");
    const repo = createPortalRepositories(dbUrl);

    try {
      const payload = repo.auth.verifyJwt(sessionToken);
      await repo.auth.updateLastAccessed(payload.sessionId);
      return NextResponse.json({ projectId: payload.projectId, email: payload.email });
    } finally {
      await repo.close();
    }
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
}
