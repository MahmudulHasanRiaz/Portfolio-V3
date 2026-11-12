import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { SlugRedirectsRepository } from "@repo/database/repository/seo";

const repo = new SlugRedirectsRepository();

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.role || !["admin", "editor", "marketer"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sourceSlug = searchParams.get("source");
    const activeOnly = searchParams.get("active") === "true";

    if (sourceSlug) {
      const result = await repo.findBySource(sourceSlug);
      return NextResponse.json({ redirect: result || null });
    }

    if (activeOnly) {
      const results = await repo.findActive();
      return NextResponse.json({ redirects: results });
    }

    const all = await repo.findAll();
    return NextResponse.json({ redirects: all?.data || all || [] });
  } catch (error) {
    console.error("[Redirects API] Error:", error);
    return NextResponse.json({ error: "Failed to fetch redirects." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.role || !["admin", "editor", "marketer"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { sourceSlug, destinationUrl, redirectType, entityType, isActive } = body;

    if (!sourceSlug || !destinationUrl) {
      return NextResponse.json({ error: "sourceSlug and destinationUrl are required." }, { status: 400 });
    }

    const result = await repo.create({
      sourceSlug,
      destinationUrl,
      redirectType: redirectType || 301,
      entityType: entityType || null,
      isActive: isActive !== false,
    });

    return NextResponse.json({ redirect: result }, { status: 201 });
  } catch (error) {
    console.error("[Redirects API] Error:", error);
    return NextResponse.json({ error: "Failed to create redirect." }, { status: 500 });
  }
}
