import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { SearchIndexerService } from "@repo/database/services/search-indexer";

const indexer = new SearchIndexerService();

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.role || !["admin", "editor"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const result = await indexer.rebuildAll();
    return NextResponse.json({
      success: true,
      indexed: result.total,
      errors: result.errors,
    });
  } catch (error) {
    console.error("[Search Rebuild API] Error:", error);
    return NextResponse.json(
      { error: "Rebuild failed." },
      { status: 500 }
    );
  }
}
