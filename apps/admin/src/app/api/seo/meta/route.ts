import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { SeoMetaRepository } from "@repo/database/repository/seo";

const repo = new SeoMetaRepository();

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.role || !["admin", "editor", "marketer"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (entityType && entityId) {
      const result = await repo.findByEntity(entityType, entityId);
      return NextResponse.json({ meta: result || null });
    }

    const all = await repo.findAll();
    return NextResponse.json({ meta: all.data || [] });
  } catch (error) {
    console.error("[SEO Meta API] Error:", error);
    return NextResponse.json({ error: "Failed to fetch SEO meta." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.role || !["admin", "editor", "marketer"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { entityType, entityId, metaTitle, metaDescription, ogImage, canonicalUrl, keywords, indexable, followLinks, noArchive } = body;

    if (!entityType || !entityId) {
      return NextResponse.json({ error: "entityType and entityId are required." }, { status: 400 });
    }

    const existing = await repo.findByEntity(entityType, entityId);

    let result;
    if (existing) {
      result = await repo.update(existing.id, {
        metaTitle,
        metaDescription,
        ogImage,
        canonicalUrl,
        keywords,
        indexable,
        followLinks,
        noArchive,
      });
    } else {
      result = await repo.create({
        entityType,
        entityId,
        metaTitle,
        metaDescription,
        ogImage,
        canonicalUrl,
        keywords,
        indexable,
        followLinks,
        noArchive,
      });
    }

    return NextResponse.json({ meta: result }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error("[SEO Meta API] Error:", error);
    return NextResponse.json({ error: "Failed to save SEO meta." }, { status: 500 });
  }
}
