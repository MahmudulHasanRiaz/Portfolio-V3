import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createFinanceRepositories, FinanceError } from "@repo/finance";

const dbUrl = process.env.DATABASE_URL!;

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const sourceType = searchParams.get("sourceType");
    const sourceId = searchParams.get("sourceId");
    const agreedAmountBdt = searchParams.get("agreedAmountBdt");

    const { summary } = createFinanceRepositories(dbUrl);

    if (sourceType && sourceId) {
      const result = await summary.getSourceSummary(
        sourceType,
        sourceId,
        agreedAmountBdt ? Number(agreedAmountBdt) : undefined,
      );
      return NextResponse.json(result);
    }

    const result = await summary.getGlobalSummary();
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof FinanceError) {
      const status = error.code.endsWith("_NOT_FOUND") ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch finance summary" },
      { status: 500 },
    );
  }
}
