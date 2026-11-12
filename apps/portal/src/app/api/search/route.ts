import { NextRequest, NextResponse } from "next/server";
import { SearchIndexRepository } from "@repo/database";

const searchRepo = new SearchIndexRepository();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const entityType = searchParams.get("type") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10)));

    if (!query || query.length > 200) {
      return NextResponse.json({ results: [], total: 0 });
    }

    const result = await searchRepo.searchFTS({ query, entityType, page, pageSize });
    return NextResponse.json({
      results: result.results,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    });
  } catch (error) {
    console.error("[Portal Search API] Error:", error);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
