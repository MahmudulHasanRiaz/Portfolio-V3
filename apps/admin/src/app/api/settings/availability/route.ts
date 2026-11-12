import { NextResponse } from "next/server";
import { SettingsRepository } from "@repo/database";
import {
  AVAILABILITY_KEY,
  AVAILABILITY_DEFAULT,
  normalizeAvailability,
  purgePublicCache,
} from "@repo/shared";

/**
 * Admin-only availability-badge setting. Stored as one row in the EXISTING
 * generic settings table (key "availability", value { available, badgeText }) —
 * no migration. Default is NOT available (fail-closed): a missing row means
 * the badge is hidden. The dashboard middleware already requires a session
 * cookie for /api/* (except its public prefixes), so no extra auth check is
 * added here, matching the other dashboard API routes.
 */
const repo = new SettingsRepository();

export async function GET() {
  try {
    const row = await repo.findByKey(AVAILABILITY_KEY);
    return NextResponse.json(
      row ? normalizeAvailability(row.value) : { ...AVAILABILITY_DEFAULT },
    );
  } catch {
    return NextResponse.json({ error: "Failed to load availability setting" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const value = normalizeAvailability(body);
    if (typeof body?.available !== "boolean") {
      return NextResponse.json(
        { error: "available must be a boolean" },
        { status: 400 },
      );
    }
    const existing = await repo.findByKey(AVAILABILITY_KEY);
    if (existing) {
      await repo.update(existing.id, { value });
    } else {
      await repo.create({
        key: AVAILABILITY_KEY,
        value,
        group: "brand",
        description: "Availability badge shown on the public site (available + badge text)",
      });
    }
    // Instant public-site refresh (best-effort, never fails the save).
    void purgePublicCache(["home"]);
    return NextResponse.json(value);
  } catch {
    return NextResponse.json({ error: "Failed to save availability setting" }, { status: 500 });
  }
}
