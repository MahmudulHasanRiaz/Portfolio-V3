import { NextRequest, NextResponse } from "next/server";
import { SchedulingService } from "@repo/cms";

// Internal cron route: executed by the stack's scheduler sidecar every 5 minutes.
// Auth: requires the x-cron-secret header to match CRON_SECRET (fail closed).
export async function GET(request: NextRequest) {
  const configured = process.env.CRON_SECRET;
  if (!configured) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("x-cron-secret") !== configured) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await SchedulingService.processScheduledContent();
    return NextResponse.json({
      success: true,
      published: result.published,
      unpublished: result.unpublished,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process scheduled content" }, { status: 500 });
  }
}
