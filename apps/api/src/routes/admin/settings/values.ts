// Admin settings — single-key values (Hono port of
// apps/admin/src/app/api/settings/*).
//
// Split from routes/admin/settings.ts — move-only, no behaviour change.
// Mounted at /api/admin/settings (see routes/admin/index.ts) via
// settings/index.ts, which mounts this router at "/".
//
// Fidelity notes:
// - The seven single-key settings read/write one row of the generic
//   `settings` table (key/value) via direct Drizzle on the Neon HTTP
//   DB (getApiDb), mirroring SettingsRepository.findByKey / update /
//   create in the Next.js originals. Response shapes, defaults and
//   validation errors match the originals exactly.
// - The Next.js originals for the seven single-key settings had NO
//   in-body auth (middleware cookie-presence only). Hono has no such
//   middleware, so every handler here calls requireAuth explicitly
//   (401 when there is no valid Better Auth session).
//
// Cache purge (wired at cutover via lib/side-effects): the originals
// call purgePublicCache(["home"]) after saving availability,
// default-language, favicon, hero-portrait, primary-identity and
// site-copy (best-effort, never fails the save).
// search-indexing has no purge call in the original.
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { settings } from "@repo/database/schema";
import { getApiDb } from "../../../db";
import { requireAuth } from "../../../lib/admin-auth";
import { purgePublicCache, waitUntilOf } from "../../../lib/side-effects";
import {
  AVAILABILITY_DEFAULT,
  AVAILABILITY_KEY,
  FAVICON_KEY,
  HERO_PORTRAIT_KEY,
  PRIMARY_IDENTITY_KEY,
  SEARCH_INDEXING_DEFAULT,
  SEARCH_INDEXING_KEY,
  SITE_COPY_BN_KEY,
  SITE_COPY_KEY,
  SITE_PRIMARY_IDENTITY_DEFAULT,
  normalizeAvailability,
  normalizeFaviconUrl,
  normalizeHeroPortraitUrl,
  normalizeSearchIndexing,
  normalizeSitePrimaryIdentity,
} from "../../../lib/shared";
import {
  DEFAULT_LANGUAGE_DEFAULT,
  DEFAULT_LANGUAGE_KEY,
  normalizeDefaultLanguage,
} from "../../../lib/default-language";
import {
  SITE_NAME_KEY,
  SITE_TAGLINE_KEY,
  TIMEZONE_KEY,
  TIMEZONES,
  normalizeSiteName,
  normalizeSiteTagline,
  normalizeTimezone,
} from "../../../lib/general-settings";
import {
  NOTIFICATIONS_KEY,
  normalizeNotifications,
} from "../../../lib/notifications-settings";
import { z } from "zod";
import {
  isRecord,
  readJsonBody,
  validateBody,
} from "../../../lib/validate";
import type { ApiDb, Env } from "./helpers";
import { errorMessage } from "./helpers";

const app = new Hono<Env>();

// ─── Local request schemas (Zod audit, 2026-11-13) ─────────────────────────
// Zod strips unknown keys, so server-managed fields (id, createdBy,
// createdAt, updatedAt) can never reach a DB write through these bodies.

const availabilitySchema = z.object({
  available: z.boolean(),
  badgeText: z.string().max(100).optional(),
});

const defaultLanguageSchema = z.object({
  defaultLanguage: z.enum(["en", "bn", "system"]),
});

/** URL field: trims, empty string clears to null (existing behaviour),
 *  otherwise must be a URL of at most 2048 chars. The http(s)-only
 *  check stays in the handler (z.string().url() alone would also
 *  accept e.g. ftp://, which the original rejected). */
function urlOrNullField() {
  return z.preprocess(
    (v) =>
      typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v,
    z.string().url().max(2048).nullable(),
  );
}

const faviconSchema = z.object({ faviconUrl: urlOrNullField() });

const heroPortraitSchema = z.object({ portraitUrl: urlOrNullField() });

const primaryIdentitySchema = z.object({
  primaryIdentity: z.enum(["developer", "know-me"]),
});

const searchIndexingSchema = z.object({
  searchIndexingEnabled: z.boolean(),
});

const siteCopySchema = z.object({
  heroHeadline: z.string().max(255).nullable().optional(),
  heroHeadlineBn: z.string().max(255).nullable().optional(),
  heroDescription: z.string().max(2000).nullable().optional(),
  heroDescriptionBn: z.string().max(2000).nullable().optional(),
  knowMeHeadline: z.string().max(255).nullable().optional(),
  knowMeHeadlineBn: z.string().max(255).nullable().optional(),
  knowMeSub: z.string().max(2000).nullable().optional(),
  knowMeSubBn: z.string().max(2000).nullable().optional(),
  founderSummary: z.string().max(2000).nullable().optional(),
  founderSummaryBn: z.string().max(2000).nullable().optional(),
  siteTitle: z.string().max(255).nullable().optional(),
  siteDescription: z.string().max(2000).nullable().optional(),
  aboutP1: z.string().max(5000).nullable().optional(),
  aboutP2: z.string().max(5000).nullable().optional(),
  aboutP3: z.string().max(5000).nullable().optional(),
  aboutP1Bn: z.string().max(5000).nullable().optional(),
  aboutP2Bn: z.string().max(5000).nullable().optional(),
  aboutP3Bn: z.string().max(5000).nullable().optional(),
});

// ─── Settings-table helpers ──────────────────────────────────────────────────

async function findSetting(db: ApiDb, key: string) {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return row ?? null;
}

/** Mirror repo.update(id, { value }) / repo.create({ key, value, group, description }). */
async function upsertSetting(
  db: ApiDb,
  key: string,
  value: unknown,
  group: string,
  description: string,
): Promise<void> {
  const existing = await findSetting(db, key);
  if (existing) {
    await db
      .update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.id, existing.id));
  } else {
    await db.insert(settings).values({ key, value, group, description });
  }
}

/** Mirror the favicon / hero-portrait / site-copy pattern: update an
 *  existing row even when clearing to null, but only create a row for
 *  a non-null value. */
async function upsertSettingIfNotNull(
  db: ApiDb,
  key: string,
  value: unknown,
  group: string,
  description: string,
): Promise<void> {
  const existing = await findSetting(db, key);
  if (existing) {
    await db
      .update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.id, existing.id));
  } else if (value !== null) {
    await db.insert(settings).values({ key, value, group, description });
  }
}

// ─── Availability ────────────────────────────────────────────────────────────

app.get("/availability", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const row = await findSetting(db, AVAILABILITY_KEY);
    return c.json(
      row ? normalizeAvailability(row.value) : { ...AVAILABILITY_DEFAULT },
    );
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.put("/availability", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, availabilitySchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const value = normalizeAvailability(v.data);
    const db = getApiDb();
    await upsertSetting(
      db,
      AVAILABILITY_KEY,
      value,
      "brand",
      "Availability badge shown on the public site (available + badge text)",
    );
    void purgePublicCache(c.env, ["home"], waitUntilOf(c));
    return c.json(value);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// ─── Default language ────────────────────────────────────────────────────────

app.get("/default-language", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const row = await findSetting(db, DEFAULT_LANGUAGE_KEY);
    return c.json({
      defaultLanguage: row
        ? normalizeDefaultLanguage(row.value)
        : DEFAULT_LANGUAGE_DEFAULT,
    });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.put("/default-language", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, defaultLanguageSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const value = v.data.defaultLanguage;
    const db = getApiDb();
    await upsertSetting(
      db,
      DEFAULT_LANGUAGE_KEY,
      value,
      "brand",
      "Default language of the public site: en (English), bn (Bangla), or system (auto-detect from the visitor's device language). A visitor's manual switch always wins.",
    );
    void purgePublicCache(c.env, ["home"], waitUntilOf(c));
    return c.json({ defaultLanguage: value });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// ─── Favicon ─────────────────────────────────────────────────────────────────

app.get("/favicon", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const row = await findSetting(db, FAVICON_KEY);
    return c.json({
      faviconUrl: row ? normalizeFaviconUrl(row.value) : null,
    });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.put("/favicon", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, faviconSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    // Empty string clears the favicon to null (via the schema
    // preprocess); non-null values must still be http(s) URLs.
    const faviconUrl = v.data.faviconUrl;
    if (faviconUrl !== null && !/^https?:\/\//i.test(faviconUrl)) {
      return c.json({ error: "faviconUrl must be an http(s) URL" }, 400);
    }
    const db = getApiDb();
    await upsertSettingIfNotNull(
      db,
      FAVICON_KEY,
      faviconUrl,
      "brand",
      'Favicon image URL, uploaded from the admin panel (public site renders it as <link rel="icon">)',
    );
    void purgePublicCache(c.env, ["home"], waitUntilOf(c));
    return c.json({ faviconUrl });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// ─── Hero portrait ───────────────────────────────────────────────────────────

app.get("/hero-portrait", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const row = await findSetting(db, HERO_PORTRAIT_KEY);
    return c.json({
      portraitUrl: row ? normalizeHeroPortraitUrl(row.value) : null,
    });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.put("/hero-portrait", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, heroPortraitSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    // Empty string clears the portrait to null (via the schema
    // preprocess); non-null values must still be http(s) URLs.
    const portraitUrl = v.data.portraitUrl;
    if (portraitUrl !== null && !/^https?:\/\//i.test(portraitUrl)) {
      return c.json({ error: "portraitUrl must be an http(s) URL" }, 400);
    }
    const db = getApiDb();
    await upsertSettingIfNotNull(
      db,
      HERO_PORTRAIT_KEY,
      portraitUrl,
      "brand",
      "Hero portrait image URL, uploaded from the admin panel (never a repo file)",
    );
    void purgePublicCache(c.env, ["home"], waitUntilOf(c));
    return c.json({ portraitUrl });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// ─── Primary identity ────────────────────────────────────────────────────────

app.get("/primary-identity", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const row = await findSetting(db, PRIMARY_IDENTITY_KEY);
    return c.json({
      primaryIdentity: row
        ? normalizeSitePrimaryIdentity(row.value)
        : SITE_PRIMARY_IDENTITY_DEFAULT,
    });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.put("/primary-identity", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, primaryIdentitySchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const value = v.data.primaryIdentity;
    const db = getApiDb();
    await upsertSetting(
      db,
      PRIMARY_IDENTITY_KEY,
      value,
      "brand",
      "Focused public profile shown first on the homepage",
    );
    void purgePublicCache(c.env, ["home"], waitUntilOf(c));
    return c.json({ primaryIdentity: value });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// ─── Search indexing ─────────────────────────────────────────────────────────

app.get("/search-indexing", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const row = await findSetting(db, SEARCH_INDEXING_KEY);
    return c.json({
      searchIndexingEnabled: row
        ? normalizeSearchIndexing(row.value)
        : SEARCH_INDEXING_DEFAULT,
    });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.put("/search-indexing", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, searchIndexingSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const value = v.data.searchIndexingEnabled;
    const db = getApiDb();
    await upsertSetting(
      db,
      SEARCH_INDEXING_KEY,
      value,
      "seo",
      "Allow search engines to index the public site (default off — enable only when the site is final)",
    );
    // No purge call in the original.
    return c.json({ searchIndexingEnabled: value });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// ─── Site copy ───────────────────────────────────────────────────────────────

const SITE_COPY_FIELDS = [
  { bodyKey: "heroHeadline", key: "hero_headline", description: "SE hero headline (English) — public homepage" },
  { bodyKey: "heroHeadlineBn", key: "hero_headline_bn", description: "SE hero headline (Bangla) — public homepage. Empty = show English." },
  { bodyKey: "heroDescription", key: "hero_description", description: "SE hero description (English) — public homepage" },
  { bodyKey: "heroDescriptionBn", key: "hero_description_bn", description: "SE hero description (Bangla) — public homepage. Empty = show English." },
  { bodyKey: "knowMeHeadline", key: "know_me_headline", description: "Know Me hero headline (English) — public homepage" },
  { bodyKey: "knowMeHeadlineBn", key: "know_me_headline_bn", description: "Know Me hero headline (Bangla) — public homepage. Empty = show English." },
  { bodyKey: "knowMeSub", key: "know_me_sub", description: "Know Me hero sub (English) — public homepage" },
  { bodyKey: "knowMeSubBn", key: "know_me_sub_bn", description: "Know Me hero sub (Bangla) — public homepage. Empty = show English." },
  { bodyKey: "founderSummary", key: "founder_summary", description: "Founder summary (English) — public homepage 'Beyond the code'. Written through by the homepage founder section editor." },
  { bodyKey: "founderSummaryBn", key: "founder_summary_bn", description: "Founder summary (Bangla) — public homepage. Empty = show English." },
  { bodyKey: "siteTitle", key: "site_title", description: "Homepage SEO title (single title for the whole homepage) — public <title>. Replaces the old per-variant hero seoTitle fields." },
  { bodyKey: "siteDescription", key: "site_description", description: "Homepage SEO description — public meta description. Replaces the old per-variant hero seoDescription fields." },
] as const;

/** Know Me bio paragraphs — merged into the site_copy / site_copy_bn JSONB rows. */
const SITE_COPY_BIO_FIELDS = [
  { bodyKey: "aboutP1", rowKey: SITE_COPY_KEY, jsonKey: "aboutP1" },
  { bodyKey: "aboutP2", rowKey: SITE_COPY_KEY, jsonKey: "aboutP2" },
  { bodyKey: "aboutP3", rowKey: SITE_COPY_KEY, jsonKey: "aboutP3" },
  { bodyKey: "aboutP1Bn", rowKey: SITE_COPY_BN_KEY, jsonKey: "aboutP1" },
  { bodyKey: "aboutP2Bn", rowKey: SITE_COPY_BN_KEY, jsonKey: "aboutP2" },
  { bodyKey: "aboutP3Bn", rowKey: SITE_COPY_BN_KEY, jsonKey: "aboutP3" },
] as const;

/** String body value: undefined = wrong type, null = empty string (clear), string = as given. */
function asText(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? null : value;
}

/** A settings-table jsonb value as a plain object. Tolerates a { value: {...} } wrapper. */
function asJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const v = value as Record<string, unknown>;
  if (v.value && typeof v.value === "object" && !Array.isArray(v.value)) {
    return { ...(v.value as Record<string, unknown>) };
  }
  return { ...v };
}

function readSingleKey(raw: unknown): string | null {
  return typeof raw === "string"
    ? raw
    : raw !== null &&
        typeof raw === "object" &&
        "value" in raw &&
        typeof (raw as { value: unknown }).value === "string"
      ? (raw as { value: string }).value
      : null;
}

app.get("/site-copy", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const rows = await Promise.all(
      SITE_COPY_FIELDS.map((f) => findSetting(db, f.key)),
    );
    const out: Record<string, string | null> = {};
    SITE_COPY_FIELDS.forEach((f, i) => {
      out[f.bodyKey] = readSingleKey(rows[i]?.value);
    });
    // Bio paragraphs — from the site_copy / site_copy_bn JSONB rows.
    const [siteCopyRow, siteCopyBnRow] = await Promise.all([
      findSetting(db, SITE_COPY_KEY),
      findSetting(db, SITE_COPY_BN_KEY),
    ]);
    const siteCopy = asJsonObject(siteCopyRow?.value);
    const siteCopyBn = asJsonObject(siteCopyBnRow?.value);
    for (const f of SITE_COPY_BIO_FIELDS) {
      const source = f.rowKey === SITE_COPY_KEY ? siteCopy : siteCopyBn;
      const raw = source[f.jsonKey];
      out[f.bodyKey] = typeof raw === "string" ? raw : null;
    }
    return c.json(out);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.put("/site-copy", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, siteCopySchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    const db = getApiDb();
    const saved: Record<string, string | null> = {};
    for (const f of SITE_COPY_FIELDS) {
      if (!(f.bodyKey in data)) continue;
      const value = asText(data[f.bodyKey]);
      if (value === undefined) {
        return c.json({ error: `${f.bodyKey} must be a string` }, 400);
      }
      await upsertSettingIfNotNull(db, f.key, value, "brand", f.description);
      saved[f.bodyKey] = value;
    }
    // Bio paragraphs — merge only the three keys into each JSONB row so
    // the other ~250 site-copy keys are never touched.
    const bioByRow = new Map<string, Record<string, unknown>>();
    for (const f of SITE_COPY_BIO_FIELDS) {
      if (!(f.bodyKey in data)) continue;
      const value = asText(data[f.bodyKey]);
      if (value === undefined) {
        return c.json({ error: `${f.bodyKey} must be a string` }, 400);
      }
      let merged = bioByRow.get(f.rowKey);
      if (!merged) {
        const row = await findSetting(db, f.rowKey);
        merged = asJsonObject(row?.value);
        bioByRow.set(f.rowKey, merged);
      }
      if (value === null) {
        delete merged[f.jsonKey];
      } else {
        merged[f.jsonKey] = value;
      }
      saved[f.bodyKey] = value;
    }
    for (const [rowKey, merged] of bioByRow) {
      const row = await findSetting(db, rowKey);
      if (row) {
        await db
          .update(settings)
          .set({ value: merged, updatedAt: new Date() })
          .where(eq(settings.id, row.id));
      } else if (Object.keys(merged).length > 0) {
        const desc =
          rowKey === SITE_COPY_KEY
            ? "Generic site copy (English) — B1 dict, verbatim; Astro overlays this over its i18n dict. Bangla twin key: site_copy_bn."
            : "Generic site copy (Bangla) — B1 dict, verbatim; Astro overlays this over its i18n dict.";
        await db
          .insert(settings)
          .values({ key: rowKey, value: merged, group: "brand", description: desc });
      }
    }
    if (Object.keys(saved).length > 0) {
      void purgePublicCache(c.env, ["home"], waitUntilOf(c));
    }
    return c.json(saved);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// ─── General (site-level basics) ───────────────────────────────────────────
// One combined endpoint for the four Settings → General fields, following
// the site-copy precedent (one endpoint, several settings-table keys):
// site_name, site_tagline, timezone (new keys, created on first save)
// + default_language (existing key, also edited from Brand / Identity).
// Site name + tagline are public-facing (Layout title / og:site_name /
// default meta description), so a save purges the public cache like the
// other public-facing settings. Timezone + default language ride along
// because the page saves all four in one click.

const generalSchema = z.object({
  siteName: z.string().max(255).optional(),
  siteTagline: z.string().max(500).nullable().optional(),
  timezone: z.enum(TIMEZONES).optional(),
  defaultLanguage: z.enum(["en", "bn", "system"]).optional(),
});

app.get("/general", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const [siteNameRow, siteTaglineRow, timezoneRow, languageRow] =
      await Promise.all([
        findSetting(db, SITE_NAME_KEY),
        findSetting(db, SITE_TAGLINE_KEY),
        findSetting(db, TIMEZONE_KEY),
        findSetting(db, DEFAULT_LANGUAGE_KEY),
      ]);
    return c.json({
      siteName: normalizeSiteName(siteNameRow?.value),
      siteTagline: normalizeSiteTagline(siteTaglineRow?.value),
      timezone: normalizeTimezone(timezoneRow?.value),
      defaultLanguage: languageRow
        ? normalizeDefaultLanguage(languageRow.value)
        : DEFAULT_LANGUAGE_DEFAULT,
    });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.put("/general", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, generalSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    const db = getApiDb();
    const saved: Record<string, unknown> = {};
    if ("siteName" in data && data.siteName !== undefined) {
      const value = normalizeSiteName(data.siteName);
      await upsertSetting(
        db,
        SITE_NAME_KEY,
        value,
        "general",
        "The name of the site as displayed in the browser tab and header",
      );
      saved.siteName = value;
    }
    if ("siteTagline" in data && data.siteTagline !== undefined) {
      const value = asText(data.siteTagline);
      if (value === undefined) {
        return c.json({ error: "siteTagline must be a string" }, 400);
      }
      await upsertSettingIfNotNull(
        db,
        SITE_TAGLINE_KEY,
        value,
        "general",
        "Short tagline for the site — default meta description on public pages without their own description",
      );
      saved.siteTagline = value;
    }
    if ("timezone" in data && data.timezone !== undefined) {
      const value = normalizeTimezone(data.timezone);
      await upsertSetting(
        db,
        TIMEZONE_KEY,
        value,
        "general",
        "Default timezone for the site",
      );
      saved.timezone = value;
    }
    if ("defaultLanguage" in data && data.defaultLanguage !== undefined) {
      const value = normalizeDefaultLanguage(data.defaultLanguage);
      await upsertSetting(
        db,
        DEFAULT_LANGUAGE_KEY,
        value,
        "brand",
        "Default language of the public site: en (English), bn (Bangla), or system (auto-detect from the visitor's device language). A visitor's manual switch always wins.",
      );
      saved.defaultLanguage = value;
    }
    if (Object.keys(saved).length > 0) {
      void purgePublicCache(c.env, ["home"], waitUntilOf(c));
    }
    return c.json(saved);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// ─── Notifications ───────────────────────────────────────────────────────────
// One JSONB row (key "notifications"): { emailEnabled, newLead,
// abandonedLead }. Preferences only — there is NO email sender in the
// codebase today, so nothing is actually sent; the admin page says so
// plainly. No cache purge: these preferences never reach a public page.

const notificationsSchema = z.object({
  emailEnabled: z.boolean(),
  newLead: z.boolean(),
  abandonedLead: z.boolean(),
});

app.get("/notifications", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const row = await findSetting(db, NOTIFICATIONS_KEY);
    return c.json(normalizeNotifications(row?.value));
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.put("/notifications", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, notificationsSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const value = normalizeNotifications(v.data);
    const db = getApiDb();
    await upsertSetting(
      db,
      NOTIFICATIONS_KEY,
      value,
      "notifications",
      "Email notification preferences: master switch + per-event toggles for new leads and abandoned leads",
    );
    return c.json(value);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

export default app;
