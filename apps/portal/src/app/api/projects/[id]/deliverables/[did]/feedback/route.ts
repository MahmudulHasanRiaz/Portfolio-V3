import { NextRequest, NextResponse } from "next/server";
import { createPortalRepositories } from "@repo/portal-pkg";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; did: string }> }) {
  try {
    const sessionToken = request.cookies.get("portal_session_token")?.value;
    if (!sessionToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const repo = createPortalRepositories(dbUrl);
    try {
      const payload = repo.auth.verifyJwt(sessionToken);
      const { did } = await params;
      const { feedback } = await request.json();

      if (!feedback || !feedback.trim()) {
        return NextResponse.json({ error: "Feedback is required" }, { status: 400 });
      }

      const clientId = (await repo.projects.getById(payload.projectId))?.clientId;

      const deliverable = await repo.deliverables.getById(did);
      if (!deliverable) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const project = await repo.projects.getByIdAndClient(deliverable.projectId, clientId || "");
      if (!project) return NextResponse.json({ error: "Access denied" }, { status: 403 });

      const updated = await repo.deliverables.submitFeedback(did, feedback);
      await repo.activities.log(deliverable.projectId, null, "client_submitted_feedback", {
        deliverableId: did, deliverableTitle: deliverable.title,
      });

      return NextResponse.json(updated);
    } finally {
      await repo.close();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
