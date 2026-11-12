import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createEntrepreneurRepositories } from "@repo/entrepreneur";
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
    const { ventures } = createEntrepreneurRepositories();
    const venture = await ventures.getById(id);
    if (!venture) return NextResponse.json({ error: "Venture not found" }, { status: 404 });
    return NextResponse.json(toCamel(venture));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch venture" },
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

    const { ventures } = createEntrepreneurRepositories();
    const venture = await ventures.update(id, body);
    if (!venture) return NextResponse.json({ error: "Venture not found" }, { status: 404 });
    searchIndexer.indexEntity("venture", venture.id).catch(() => {});
    // Instant public-site refresh (best-effort, never fails the save).
    void purgePublicCache(["ventures", "home"]);
    return NextResponse.json(toCamel(venture));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update venture" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { ventures } = createEntrepreneurRepositories();
    const deleted = await ventures.delete(id);
    if (!deleted) return NextResponse.json({ error: "Venture not found" }, { status: 404 });
    searchIndexer.deleteEntity("venture", id).catch(() => {});
    // Instant public-site refresh (best-effort, never fails the save).
    void purgePublicCache(["ventures", "home"]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete venture" },
      { status: 500 },
    );
  }
}
