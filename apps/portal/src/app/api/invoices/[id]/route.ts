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

      const project = await repo.projects.getById(payload.projectId);
      const clientId = project?.clientId;
      if (!clientId) return NextResponse.json({ error: "No client" }, { status: 400 });

      const invoice = await repo.invoices.getById(id);
      if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

      if (invoice.clientId !== clientId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      let projectTitle: string | null = null;
      if (invoice.sourceId) {
        const p = await repo.projects.getById(invoice.sourceId);
        projectTitle = p?.title ?? null;
      }

      return NextResponse.json({ ...invoice, projectTitle });
    } finally {
      await repo.close();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}
