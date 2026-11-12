import { NextResponse } from "next/server";
import { SettingsRepository } from "@repo/database";
import {
  SITE_PRIMARY_IDENTITY_DEFAULT,
  PRIMARY_IDENTITY_KEY,
  isSitePrimaryIdentity,
  normalizeSitePrimaryIdentity,
  purgePublicCache,
} from "@repo/shared";

/**
 * Admin-only primary_identity setting. Stored as one row in the EXISTING
 * generic settings table (key "primary_identity") — no migration.
 * The dashboard middleware already requires a session cookie for /api/*
 * (except its public prefixes), so no extra auth check is added here,
 * matching the other dashboard API routes.
 */
const repo = new SettingsRepository();

export async function GET() {
  try {
    const row = await repo.findByKey(PRIMARY_IDENTITY_KEY);
    return NextResponse.json({
      primaryIdentity: row ? normalizeSitePrimaryIdentity(row.value) : SITE_PRIMARY_IDENTITY_DEFAULT,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load primary identity" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const value = body?.primaryIdentity;
    if (!isSitePrimaryIdentity(value)) {
      return NextResponse.json(
        { error: "primaryIdentity must be one of: developer, know-me" },
        { status: 400 },
      );
    }
    const existing = await repo.findByKey(PRIMARY_IDENTITY_KEY);
    if (existing) {
      await repo.update(existing.id, { value });
    } else {
      await repo.create({
        key: PRIMARY_IDENTITY_KEY,
        value,
        group: "brand",
        description: "Focused public profile shown first on the homepage",
      });
    }
    // Instant public-site refresh (best-effort, never fails the save).
    void purgePublicCache(["home"]);
    return NextResponse.json({ primaryIdentity: value });
  } catch {
    return NextResponse.json({ error: "Failed to save primary identity" }, { status: 500 });
  }
}
