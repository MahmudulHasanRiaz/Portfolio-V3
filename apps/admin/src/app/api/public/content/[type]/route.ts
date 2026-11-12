// Public Content API — list endpoint (ASTRO_HYBRID_PLAN.md §7).
// GET /api/public/content/:type
// Returns published rows for one content type as { items: [...] }.
// The Astro live loader accepts either a bare array or { items }.
import { NextResponse, type NextRequest } from "next/server";
import {
  isAuthorized,
  isPublicContentType,
  listPublicContent,
} from "@/lib/public-content";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  try {
    const { type } = await params;
    if (!isPublicContentType(type)) {
      return NextResponse.json(
        { error: "Unknown content type" },
        { status: 404 },
      );
    }
    if (!(await isAuthorized(_request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const items = await listPublicContent(type);
    // Ya Nabi rule (LIST ONLY): "Ya Nabi Salam Alaika" must NEVER be
    // shown separately (no spotlight / featured / homepage). It may exist
    // as an ordinary row in the full releases list + an ordinary detail
    // page, but the live loader merges this list into the homepage, so it
    // is excluded here to keep it off the homepage. The single-item
    // endpoint must still return it — do NOT move this filter into
    // listPublicContent / getPublicContent.
    const visible =
      type === "releases"
        ? items.filter((item) => item.slug !== "ya-nabi-salam-alaika")
        : items;
    return NextResponse.json({ items: visible });
  } catch {
    return NextResponse.json(
      { error: "Failed to load public content" },
      { status: 500 },
    );
  }
}
