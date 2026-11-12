import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createWorkflowService } from "@repo/workflows";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { repo, engine } = createWorkflowService(dbUrl);
    const run = await repo.getRun(id);

    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

    if (run.status !== "failed" && run.status !== "partially_failed") {
      return NextResponse.json({ error: "Only failed runs can be retried" }, { status: 400 });
    }

    // Clear any backoff timestamp from the failed attempt: without this the
    // worker (which only picks up runs with next_retry_at <= NOW()) would
    // ignore the retried run until the old backoff expired.
    await repo.updateRunStatus(id, "pending", { retryCount: run.retryCount, nextRetryAt: null });
    await engine.executeRun(run);

    const updatedRun = await repo.getRun(id);
    return NextResponse.json({ run: updatedRun });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retry run" },
      { status: 500 },
    );
  }
}
