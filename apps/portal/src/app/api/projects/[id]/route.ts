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

      const { id } = await params;
      const project = await repo.projects.getByIdAndClient(id, (await repo.projects.getById(payload.projectId))?.clientId || "");
      if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

      return NextResponse.json({
        id: project.id, title: project.title, status: project.status,
        description: project.description, scopeNotes: project.scopeNotes,
        startDate: project.startDate, expectedEndDate: project.expectedEndDate,
        actualEndDate: project.actualEndDate,
        totalAgreedAmount: project.totalAgreedAmount, currency: project.currency,
        isPaidProject: project.isPaidProject, createdAt: project.createdAt,
      });
    } finally {
      await repo.close();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch project" },
      { status: 500 }
    );
  }
}
