import { NextRequest, NextResponse } from "next/server";
import { createWorkflowService } from "@repo/workflows";

const dbUrl = process.env.DATABASE_URL!;

// Internal cron route: executed by the stack's scheduler sidecar every 5 minutes.
// Executes pending workflow runs that triggers have recorded (e.g. invoice_paid).
// Auth: requires the x-cron-secret header to match CRON_SECRET (fail closed).
export const dynamic = "force-dynamic";

const MAX_RUNS_PER_TICK = 25;

export async function GET(request: NextRequest) {
  const configured = process.env.CRON_SECRET;
  if (!configured) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("x-cron-secret") !== configured) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { worker } = createWorkflowService(dbUrl);
    const runs: { runId?: string; status?: string }[] = [];
    for (let i = 0; i < MAX_RUNS_PER_TICK; i++) {
      const result = await worker.processNext();
      if (!result.processed) break;
      runs.push({ runId: result.runId, status: result.status });
    }
    return NextResponse.json({ success: true, processed: runs.length, runs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process workflow runs" },
      { status: 500 },
    );
  }
}
