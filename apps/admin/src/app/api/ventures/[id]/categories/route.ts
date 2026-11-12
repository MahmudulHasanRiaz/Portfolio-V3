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
    const { ventures } = createEntrepreneurRepositories();
    const categories = await ventures.getCategories(id);
    return NextResponse.json(toCamel(categories));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { categoryIds } = await request.json();

    const { ventures } = createEntrepreneurRepositories();
    await ventures.setCategories(id, categoryIds);
    const categories = await ventures.getCategories(id);
    return NextResponse.json(toCamel(categories), { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set categories" },
      { status: 500 },
    );
  }
}
