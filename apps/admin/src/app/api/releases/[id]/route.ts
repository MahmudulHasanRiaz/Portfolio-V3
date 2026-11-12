import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createArtistRepositories } from "@repo/artist";
import { SearchIndexerService } from "@repo/database/services/search-indexer";
import { toCamel } from "@/lib/to-camel";
import { purgePublicCache } from "@repo/shared";

const searchIndexer = new SearchIndexerService();

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { releases } = createArtistRepositories();
    const release = await releases.getById(id);
    if (!release) return NextResponse.json({ error: "Release not found" }, { status: 404 });
    return NextResponse.json(toCamel(release));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch release" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { releases } = createArtistRepositories();
    const release = await releases.update(id, body);
    if (!release) return NextResponse.json({ error: "Release not found" }, { status: 404 });
    searchIndexer.indexEntity("release", release.id).catch(() => {});
    // Instant public-site refresh (best-effort, never fails the save).
    void purgePublicCache(["releases", "home"]);
    return NextResponse.json(toCamel(release));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update release" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { releases } = createArtistRepositories();
    const deleted = await releases.delete(id);
    if (!deleted) return NextResponse.json({ error: "Release not found" }, { status: 404 });
    searchIndexer.deleteEntity("release", id).catch(() => {});
    // Instant public-site refresh (best-effort, never fails the save).
    void purgePublicCache(["releases", "home"]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete release" },
      { status: 500 },
    );
  }
}
