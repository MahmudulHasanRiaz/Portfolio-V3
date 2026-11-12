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
      const clientId = project?.clientId;
      if (!clientId) return NextResponse.json({ error: "No client" }, { status: 400 });

      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status") || undefined;
      const page = parseInt(searchParams.get("page") ?? "1", 10);
      const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

      const result = await repo.invoices.listByClient(clientId, { status, page, pageSize });

      const invoicesWithProject = await Promise.all(
        (result.invoices || []).map(async (inv) => {
          let projectTitle: string | null = null;
          if (inv.sourceId) {
            const p = await repo.projects.getById(inv.sourceId);
            projectTitle = p?.title ?? null;
          }
          return { ...inv, projectTitle };
        })
      );

      return NextResponse.json({
        invoices: invoicesWithProject,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      });
    } finally {
      await repo.close();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
