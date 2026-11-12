import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { AnalyticsAggregator } from "@repo/analytics";

const aggregator = new AnalyticsAggregator();

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") ?? "30", 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const summary = await aggregator.getTrafficSummary(since);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[Analytics Summary] Error:", error);
    return NextResponse.json({ error: "Failed to fetch summary." }, { status: 500 });
  }
}
