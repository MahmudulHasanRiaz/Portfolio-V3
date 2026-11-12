import { NextResponse } from "next/server";
import { SettingsRepository } from "@repo/database";
import {
  FAVICON_KEY,
  normalizeFaviconUrl,
  purgePublicCache,
} from "@repo/shared";

/**
 * Admin-only favicon_url setting. Stored as one row in the EXISTING
 * generic settings table (key "favicon_url", value = favicon URL
 * string) — no migration. The dashboard middleware already requires a
 * session cookie for /api/* (except its public prefixes), so no extra auth
 * check is added here, matching the other dashboard API routes.
 *
 * The favicon is uploaded from the admin panel (Brand / Identity page)
 * via /api/media/upload and its URL saved here; the public site reads it
 * from GET /api/public/settings and renders it as <link rel="icon">.
 */
const repo = new SettingsRepository();

export async function GET() {
  try {
    const row = await repo.findByKey(FAVICON_KEY);
    return NextResponse.json({
      faviconUrl: row ? normalizeFaviconUrl(row.value) : null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load favicon" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const raw = body?.faviconUrl;
    if (typeof raw !== "string") {
      return NextResponse.json(
        { error: "faviconUrl must be a string" },
        { status: 400 },
      );
    }
    // Empty string clears the favicon to null.
    const faviconUrl = raw.trim() === "" ? null : raw.trim();
    if (faviconUrl !== null && !/^https?:\/\//i.test(faviconUrl)) {
      return NextResponse.json(
        { error: "faviconUrl must be an http(s) URL" },
        { status: 400 },
      );
    }
    const existing = await repo.findByKey(FAVICON_KEY);
    if (existing) {
      await repo.update(existing.id, { value: faviconUrl });
    } else if (faviconUrl !== null) {
      await repo.create({
        key: FAVICON_KEY,
        value: faviconUrl,
        group: "brand",
        description: "Favicon image URL, uploaded from the admin panel (public site renders it as <link rel=\"icon\">)",
      });
    }
    // Instant public-site refresh (best-effort, never fails the save).
    void purgePublicCache(["home"]);
    return NextResponse.json({ faviconUrl });
  } catch {
    return NextResponse.json({ error: "Failed to save favicon" }, { status: 500 });
  }
}
