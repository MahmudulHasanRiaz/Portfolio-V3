import { NextRequest, NextResponse } from "next/server";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { projectId, email, password } = await request.json();
    if (!projectId || !email || !password) {
      return NextResponse.json({ error: "Project ID, email, and password are required" }, { status: 400 });
    }

    const { createPortalRepositories } = await import("@repo/portal-pkg");
    const repo = createPortalRepositories(dbUrl);

    try {
      const project = await repo.projects.getById(projectId);
      if (!project || !project.portalAccessEnabled) {
        return NextResponse.json({ error: "Project not found or portal access not enabled" }, { status: 404 });
      }

      const result = await repo.auth.authenticate(projectId, email, password);

      await repo.activities.log(projectId, null, "client_logged_in", { email });

      const response = NextResponse.json({ success: true, projectId: result.projectId, email: result.clientEmail });
      response.cookies.set("portal_session_token", result.token, {
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
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
