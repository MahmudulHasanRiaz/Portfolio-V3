import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { AnalyticsAggregator } from "@repo/analytics";

const aggregator = new AnalyticsAggregator();

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const days = parseInt(searchParams.get("days") ?? "30", 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const pages = await aggregator.getTopPages(limit, since);
    return NextResponse.json({ pages });
  } catch (error) {
    console.error("[Analytics Pages] Error:", error);
    return NextResponse.json({ error: "Failed to fetch pages." }, { status: 500 });
  }
}
