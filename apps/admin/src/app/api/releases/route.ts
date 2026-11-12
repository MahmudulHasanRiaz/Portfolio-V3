import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createArtistRepositories } from "@repo/artist";
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
    const type = searchParams.get("type");
    const format = searchParams.get("format");
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

    const { releases } = createArtistRepositories(dbUrl);
    const result = await releases.list({
      search: search ?? undefined,
      status: status ?? undefined,
      type: type ?? undefined,
      format: format ?? undefined,
      page,
      pageSize,
    });
    return NextResponse.json(toCamel(result));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch releases" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { releases } = createArtistRepositories(dbUrl);
    const release = await releases.create({ ...body, createdBy: session.user.id });
    searchIndexer.indexEntity("release", release.id).catch(() => {});
    await dispatchTrigger(dbUrl, "release_published", release.id, { ...release, triggeredBy: session.user.id });
    // Instant public-site refresh (best-effort, never fails the save).
    void purgePublicCache(["releases", "home"]);
    return NextResponse.json(toCamel(release), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create release" },
      { status: 500 },
    );
  }
}
