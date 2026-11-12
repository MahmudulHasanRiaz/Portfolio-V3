// Public Settings API — GET /api/public/settings
// Returns the brand rows the Astro public site needs: the admin-set hero
// portrait URL, the focused profile, the admin-configured default
// language, the availability badge, the search-indexing switch, and the
// bilingual hero / Know Me copy (English top level,
// Bangla under `bn` — only populated Bangla fields are included), plus
// the public profile (name / email / location / designations, the last
// from the `designations` settings key), the generic site copy
// (`site_copy` / `site_copy_bn`, omitted when absent), the canonical
// site URL (`site_url`, omitted when absent — Astro falls back to its
// workers.dev URL), the homepage stats (`stats`, omitted when the row
// is absent) and the hero floating-chip numbers (`hero_chips`, omitted
// when the key is absent). All of it comes from getPublicSettings();
// this route only authenticates and returns it.
// Public read-only, same auth model as the content endpoints (optional
// Bearer token PUBLIC_CONTENT_API_TOKEN; when unset, public-read).
import { NextResponse, type NextRequest } from "next/server";
import { getPublicSettings, isAuthorized } from "@/lib/public-content";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const settings = await getPublicSettings();
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json(
      { error: "Failed to load public settings" },
      { status: 500 },
    );
  }
}
