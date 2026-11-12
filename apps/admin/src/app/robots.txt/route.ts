import { NextResponse } from "next/server";
import { SettingsRepository } from "@repo/database";
import { SEARCH_INDEXING_KEY, normalizeSearchIndexing } from "@repo/shared";

/**
 * Robots.txt — honors the admin search-indexing switch
 * (Settings → Search Engine Indexing, key "search_indexing_enabled").
 * Default is OFF (fail-closed): while off, or outside production, every
 * crawler is disallowed. Only when the switch is ON and the app runs in
 * production do crawlers get access (dashboard / api / auth stay
 * disallowed, and the sitemap is advertised).
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const isProduction = process.env.NODE_ENV === "production";

  let indexingEnabled = false;
  try {
    const row = await new SettingsRepository().findByKey(SEARCH_INDEXING_KEY);
    indexingEnabled = row ? normalizeSearchIndexing(row.value) : false;
  } catch {
    // Fail closed: an unreadable setting means "do not index".
    indexingEnabled = false;
  }

  const lines: string[] = [];

  if (isProduction && indexingEnabled) {
    lines.push("User-agent: *");
    lines.push("Allow: /");
    lines.push("Disallow: /dashboard");
    lines.push("Disallow: /api");
    lines.push("Disallow: /auth");
    lines.push(`Sitemap: ${baseUrl}/sitemap.xml`);
  } else {
    lines.push("User-agent: *");
    lines.push("Disallow: /");
  }

  const text = lines.join("\n");

  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
