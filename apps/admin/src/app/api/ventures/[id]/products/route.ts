import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createEntrepreneurRepositories } from "@repo/entrepreneur";
import { toCamel } from "@/lib/to-camel";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "50", 10);

    const { products } = createEntrepreneurRepositories();
    const result = await products.list({ ventureId: id, page, pageSize });
    return NextResponse.json(toCamel(result));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch products" },
      { status: 500 },
    );
  }
}
