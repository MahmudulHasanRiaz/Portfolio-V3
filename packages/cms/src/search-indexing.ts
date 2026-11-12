import { SettingsRepository } from "@repo/database";
import { SEARCH_INDEXING_KEY, normalizeSearchIndexing } from "@repo/shared";

/**
 * Effective search-indexing flag for the public site.
 *
 * Fail-closed by design: anything missing, malformed, or erroring means
 * NOT indexable. The owner enables indexing from the dashboard only once
 * the site is final. Non-production environments never report indexable,
 * so local/dev builds stay out of search engines regardless of the toggle.
 */
export async function isSearchIndexingEnabled(): Promise<boolean> {
  try {
    if (process.env.NODE_ENV !== "production") return false;
    const repo = new SettingsRepository();
    const row = await repo.findByKey(SEARCH_INDEXING_KEY);
    return normalizeSearchIndexing(row?.value);
  } catch {
    return false;
  }
}
