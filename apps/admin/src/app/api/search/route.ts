import { NextRequest, NextResponse } from "next/server";
import { SearchIndexRepository } from "@repo/database/repository/search";
import { SearchAnalyticsRepository } from "@repo/database/repository/search-analytics";

const searchRepo = new SearchIndexRepository();
const analyticsRepo = new SearchAnalyticsRepository();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const entityType = searchParams.get("type") || undefined;
    const locale = searchParams.get("locale") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));

    if (!query) {
      return NextResponse.json({ results: [], total: 0 });
    }

    if (query.length > 200) {
      return NextResponse.json(
        { error: "Query too long. Maximum 200 characters." },
        { status: 400 }
      );
    }

    const result = await searchRepo.searchFTS({
      query,
      entityType,
      locale,
      page,
      pageSize,
    });

    analyticsRepo.logQuery(query, entityType, result.total).catch((err) => {
      console.error("[Search Analytics] Failed to log query:", err);
    });

    return NextResponse.json({
      results: result.results,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    });
  } catch (error) {
    console.error("[Search API] Error:", error);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 }
    );
  }
}
