import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createEntrepreneurRepositories } from "@repo/entrepreneur";
import { SearchIndexerService } from "@repo/database/services/search-indexer";
import { toCamel } from "@/lib/to-camel";

const searchIndexer = new SearchIndexerService();

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { products } = createEntrepreneurRepositories();
    const product = await products.getById(id);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(toCamel(product));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch product" },
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

    const { products } = createEntrepreneurRepositories();
    const product = await products.update(id, body);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    searchIndexer.indexEntity("product", product.id).catch(() => {});
    return NextResponse.json(toCamel(product));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update product" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { products } = createEntrepreneurRepositories();
    const deleted = await products.delete(id);
    if (!deleted) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    searchIndexer.deleteEntity("product", id).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete product" },
      { status: 500 },
    );
  }
}
