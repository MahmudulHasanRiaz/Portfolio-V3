import { buildSitemapXml, generateSitemapXml } from "@repo/seo";
import { SettingsRepository } from "@repo/database";
import { SEARCH_INDEXING_KEY, normalizeSearchIndexing } from "@repo/shared";

/**
 * Sitemap — honors the admin search-indexing switch
 * (Settings → Search Engine Indexing, key "search_indexing_enabled").
 * Default is OFF (fail-closed): while off, the sitemap is empty, matching
 * the promise on the settings page. Only when the switch is ON are the
 * published-content URLs emitted.
 */
export async function GET() {
  try {
    let indexingEnabled = false;
    try {
      const row = await new SettingsRepository().findByKey(SEARCH_INDEXING_KEY);
      indexingEnabled = row ? normalizeSearchIndexing(row.value) : false;
    } catch {
      // Fail closed: an unreadable setting means an empty sitemap.
      indexingEnabled = false;
    }

    const xml = indexingEnabled
      ? await generateSitemapXml()
      : buildSitemapXml([]);
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("[Sitemap] Generation failed:", error);
    return new Response("", { status: 500 });
  }
}
