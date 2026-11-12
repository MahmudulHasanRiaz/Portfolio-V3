import { NextRequest, NextResponse } from "next/server";
import { createPortalRepositories } from "@repo/portal-pkg";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionToken = request.cookies.get("portal_session_token")?.value;
    if (!sessionToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const repo = createPortalRepositories(dbUrl);
    try {
      const payload = repo.auth.verifyJwt(sessionToken);
      const { id: projectId } = await params;

      const clientId = (await repo.projects.getById(payload.projectId))?.clientId;
      const project = await repo.projects.getByIdAndClient(projectId, clientId || "");
      if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const result = await repo.activities.listByProject(projectId);
      return NextResponse.json(result);
    } finally {
      await repo.close();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
