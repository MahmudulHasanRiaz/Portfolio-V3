import { NextResponse } from "next/server";
import { SettingsRepository } from "@repo/database";
import {
  HERO_PORTRAIT_KEY,
  normalizeHeroPortraitUrl,
  purgePublicCache,
} from "@repo/shared";

/**
 * Admin-only hero_portrait_url setting. Stored as one row in the EXISTING
 * generic settings table (key "hero_portrait_url", value = portrait URL
 * string) — no migration. The dashboard middleware already requires a
 * session cookie for /api/* (except its public prefixes), so no extra auth
 * check is added here, matching the other dashboard API routes.
 *
 * The portrait is uploaded from the admin panel (Brand / Identity page)
 * via /api/media/upload and its URL saved here; the public site reads it
 * from GET /api/public/settings. It is NEVER served from a repo file.
 */
const repo = new SettingsRepository();

export async function GET() {
  try {
    const row = await repo.findByKey(HERO_PORTRAIT_KEY);
    return NextResponse.json({
      portraitUrl: row ? normalizeHeroPortraitUrl(row.value) : null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load hero portrait" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const raw = body?.portraitUrl;
    if (typeof raw !== "string") {
      return NextResponse.json(
        { error: "portraitUrl must be a string" },
        { status: 400 },
      );
    }
    // Empty string clears the portrait to null.
    const portraitUrl = raw.trim() === "" ? null : raw.trim();
    if (portraitUrl !== null && !/^https?:\/\//i.test(portraitUrl)) {
      return NextResponse.json(
        { error: "portraitUrl must be an http(s) URL" },
        { status: 400 },
      );
    }
    const existing = await repo.findByKey(HERO_PORTRAIT_KEY);
    if (existing) {
      await repo.update(existing.id, { value: portraitUrl });
    } else if (portraitUrl !== null) {
      await repo.create({
        key: HERO_PORTRAIT_KEY,
        value: portraitUrl,
        group: "brand",
        description: "Hero portrait image URL, uploaded from the admin panel (never a repo file)",
      });
    }
    // Instant public-site refresh (best-effort, never fails the save).
    void purgePublicCache(["home"]);
    return NextResponse.json({ portraitUrl });
  } catch {
    return NextResponse.json({ error: "Failed to save hero portrait" }, { status: 500 });
  }
}
