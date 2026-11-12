import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createCrmRepositories } from "@repo/crm";

const dbUrl = process.env.DATABASE_URL!;

/**
 * GET /api/leads/stats — aggregate pipeline counts computed in SQL.
 * The Overview tab used to count client-side from a capped (200-row) list
 * fetch, so totals were wrong once the pipeline grew past 200 leads.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { leads } = createCrmRepositories(dbUrl);
    const [byStatus, bySource, conversion] = await Promise.all([
      leads.getPipelineCounts(),
      leads.getSourceBreakdown(),
      leads.getConversionCount(),
    ]);

    const total = conversion.total ?? 0;
    const converted = conversion.converted ?? 0;

    return NextResponse.json({
      total,
      converted,
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
      byStatus,
      bySource,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch lead stats" },
      { status: 500 },
    );
  }
}
