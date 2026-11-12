import { NextRequest, NextResponse } from "next/server";
import { createPortalRepositories } from "@repo/portal-pkg";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("portal_session_token")?.value;
    if (!sessionToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const repo = createPortalRepositories(dbUrl);
    try {
      const payload = repo.auth.verifyJwt(sessionToken);

      const project = await repo.projects.getById(payload.projectId);
      if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

      const clientId = project.clientId;
      if (!clientId) return NextResponse.json({ error: "No client associated" }, { status: 404 });

      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status") || undefined;
      const page = parseInt(searchParams.get("page") ?? "1", 10);
      const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

      const result = await repo.projects.listByClient(clientId, { status, page, pageSize });
      return NextResponse.json(result);
    } finally {
      await repo.close();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch projects" },
      { status: 500 }
    );
  }
}
