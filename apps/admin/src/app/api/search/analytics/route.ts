import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { SearchAnalyticsRepository } from "@repo/database/repository/search-analytics";

const analyticsRepo = new SearchAnalyticsRepository();

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.role || !["admin", "editor"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const [popularQueries, totalQueries, queriesByType, zeroResultQueries] =
      await Promise.all([
        analyticsRepo.getPopularQueries(),
        analyticsRepo.getTotalQueries(),
        analyticsRepo.getQueriesByEntityType(),
        analyticsRepo.getZeroResultQueries(),
      ]);

    return NextResponse.json({
      popularQueries,
      totalQueries,
      queriesByType,
      zeroResultQueries,
    });
  } catch (error) {
    console.error("[Search Analytics API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics." },
      { status: 500 }
    );
  }
}
