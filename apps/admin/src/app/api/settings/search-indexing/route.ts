import { NextResponse } from "next/server";
import { SettingsRepository } from "@repo/database";
import {
  SEARCH_INDEXING_KEY,
  SEARCH_INDEXING_DEFAULT,
  normalizeSearchIndexing,
} from "@repo/shared";

/**
 * Admin-only search-indexing setting. Stored as one row in the EXISTING
 * generic settings table (key "search_indexing_enabled", value boolean) —
 * no migration. Default is OFF (fail-closed): a missing row means the
 * public site is not indexed. The dashboard middleware already requires
 * a session cookie for /api/* (except its public prefixes), so no extra
 * auth check is added here, matching the other dashboard API routes.
 */
const repo = new SettingsRepository();

export async function GET() {
  try {
    const row = await repo.findByKey(SEARCH_INDEXING_KEY);
    return NextResponse.json({
      searchIndexingEnabled: row ? normalizeSearchIndexing(row.value) : SEARCH_INDEXING_DEFAULT,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load search indexing setting" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const value = body?.searchIndexingEnabled;
    if (typeof value !== "boolean") {
      return NextResponse.json(
        { error: "searchIndexingEnabled must be a boolean" },
        { status: 400 },
      );
    }
    const existing = await repo.findByKey(SEARCH_INDEXING_KEY);
    if (existing) {
      await repo.update(existing.id, { value });
    } else {
      await repo.create({
        key: SEARCH_INDEXING_KEY,
        value,
        group: "seo",
        description: "Allow search engines to index the public site (default off — enable only when the site is final)",
      });
    }
    return NextResponse.json({ searchIndexingEnabled: value });
  } catch {
    return NextResponse.json({ error: "Failed to save search indexing setting" }, { status: 500 });
  }
}
