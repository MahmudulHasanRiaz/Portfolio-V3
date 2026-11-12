import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createEntrepreneurRepositories } from "@repo/entrepreneur";
import { SearchIndexerService } from "@repo/database/services/search-indexer";
import { dispatchTrigger } from "@repo/workflows";
import { toCamel } from "@/lib/to-camel";
import { purgePublicCache } from "@repo/shared";

const dbUrl = process.env.DATABASE_URL!;
const searchIndexer = new SearchIndexerService();

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const contentStatus = searchParams.get("contentStatus");
    const categoryId = searchParams.get("categoryId");
    const industry = searchParams.get("industry");
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

    const { ventures } = createEntrepreneurRepositories();
    const result = await ventures.list({
      search: search ?? undefined,
      status: status ?? undefined,
      contentStatus: contentStatus ?? undefined,
      categoryId: categoryId ?? undefined,
      industry: industry ?? undefined,
      page,
      pageSize,
    });
    return NextResponse.json(toCamel(result));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch ventures" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    const { ventures } = createEntrepreneurRepositories();
    const venture = await ventures.create({ ...body, createdBy: session.user.id });
    searchIndexer.indexEntity("venture", venture.id).catch(() => {});
    await dispatchTrigger(dbUrl, "venture_published", venture.id, { ...venture, triggeredBy: session.user.id });
    // Instant public-site refresh (best-effort, never fails the save).
    void purgePublicCache(["ventures", "home"]);
    return NextResponse.json(toCamel(venture), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create venture" },
      { status: 500 },
    );
  }
}
