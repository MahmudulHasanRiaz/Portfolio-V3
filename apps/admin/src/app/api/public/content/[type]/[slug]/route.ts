// Public Content API — detail endpoint (ASTRO_HYBRID_PLAN.md §7).
// GET /api/public/content/:type/:slug
// Returns one published row as the item itself. The Astro live loader
// accepts either the bare item or { item }.
import { NextResponse, type NextRequest } from "next/server";
import {
  getPublicContent,
  isAuthorized,
  isPublicContentType,
} from "@/lib/public-content";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string; slug: string }> },
) {
  try {
    const { type, slug } = await params;
    if (!isPublicContentType(type)) {
      return NextResponse.json(
        { error: "Unknown content type" },
        { status: 404 },
      );
    }
    if (!(await isAuthorized(_request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const item = await getPublicContent(type, decodeURIComponent(slug));
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch {
    return NextResponse.json(
      { error: "Failed to load public content" },
      { status: 500 },
    );
  }
}
