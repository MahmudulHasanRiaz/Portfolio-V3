import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createEntrepreneurRepositories } from "@repo/entrepreneur";
import { SearchIndexerService } from "@repo/database/services/search-indexer";
import { toCamel } from "@/lib/to-camel";

const searchIndexer = new SearchIndexerService();

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const ventureId = searchParams.get("ventureId");
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "50", 10);

    const { products } = createEntrepreneurRepositories();
    const result = await products.list({
      ventureId: ventureId ?? undefined,
      page,
      pageSize,
    });
    return NextResponse.json(toCamel(result));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch products" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    const { products } = createEntrepreneurRepositories();
    const product = await products.create({ ...body, createdBy: session.user.id });
    searchIndexer.indexEntity("product", product.id).catch(() => {});
    return NextResponse.json(toCamel(product), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create product" },
      { status: 500 },
    );
  }
}
