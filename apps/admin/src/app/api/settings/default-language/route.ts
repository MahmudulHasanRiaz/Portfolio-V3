import { NextResponse } from "next/server";
import { SettingsRepository } from "@repo/database";
import { purgePublicCache } from "@repo/shared";
import {
  DEFAULT_LANGUAGE_DEFAULT,
  DEFAULT_LANGUAGE_KEY,
  isDefaultLanguage,
  normalizeDefaultLanguage,
} from "@/lib/default-language";

/**
 * Admin-only default_language setting. Stored as one row in the EXISTING
 * generic settings table (key "default_language") — no migration.
 * Only "en" | "bn" | "system" are accepted (server-side validation);
 * anything else is a 400. A missing row means "en" (the code default).
 * The dashboard middleware already requires a session cookie for /api/*
 * (except its public prefixes), so no extra auth check is added here,
 * matching the other dashboard API routes.
 */
const repo = new SettingsRepository();

export async function GET() {
  try {
    const row = await repo.findByKey(DEFAULT_LANGUAGE_KEY);
    return NextResponse.json({
      defaultLanguage: row
        ? normalizeDefaultLanguage(row.value)
        : DEFAULT_LANGUAGE_DEFAULT,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load default language" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const value = body?.defaultLanguage;
    if (!isDefaultLanguage(value)) {
      return NextResponse.json(
        { error: "defaultLanguage must be one of: en, bn, system" },
        { status: 400 },
      );
    }
    const existing = await repo.findByKey(DEFAULT_LANGUAGE_KEY);
    if (existing) {
      await repo.update(existing.id, { value });
    } else {
      await repo.create({
        key: DEFAULT_LANGUAGE_KEY,
        value,
        group: "brand",
        description:
          "Default language of the public site: en (English), bn (Bangla), or system (auto-detect from the visitor's device language). A visitor's manual switch always wins.",
      });
    }
    // Instant public-site refresh (best-effort, never fails the save).
    void purgePublicCache(["home"]);
    return NextResponse.json({ defaultLanguage: value });
  } catch {
    return NextResponse.json(
      { error: "Failed to save default language" },
      { status: 500 },
    );
  }
}
