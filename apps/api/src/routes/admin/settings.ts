// Admin settings — Hono port of apps/admin/src/app/api/settings/*
// (availability, default-language, favicon, hero-portrait,
// primary-identity, search-indexing, site-copy, integrations,
// integrations/[id], integrations/[id]/regenerate).
//
// Mounted at /api/admin/settings (see routes/admin/index.ts).
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
// - Integrations keep the original role guard (admin / super_admin
//   via authorizeByEmail). packages/auth's authorizeByEmail is
//   TCP-bound (getDb()/postgres.js), so the email -> internal user ->
//   slugified roles lookup is re-implemented here on the Neon HTTP
//   DB (users / user_roles / roles tables), exactly as in
//   packages/auth/src/lib/authorization.ts (display names such as
//   "Super Admin" slugify to "super_admin").
// - Integrations token handling mirrors
//   apps/admin/src/lib/website-integrations.ts: only the SHA-256 hash
//   is stored; the full token (wpi_ + 32 random bytes, base64url) is
//   returned exactly once at creation / regeneration and never again.
//   Hashing reuses apps/api/src/lib/integrations.ts (Web Crypto
//   SHA-256, Workers-safe); token randomness uses
//   crypto.getRandomValues (Web Crypto, Workers-safe).
// - Integrations [id]: the Next.js original is PATCH + DELETE (no
//   GET). This router adds the GET single-item read and a PUT alias
//   for PATCH (same handler, same validation), so both the original
//   PATCH contract and the PUT contract are served.
//
// Cache purge (wired at cutover via lib/side-effects): the originals
// call purgePublicCache(["home"]) after saving availability,
// default-language, favicon, hero-portrait, primary-identity and
// site-copy (best-effort, never fails the save).
// search-indexing has no purge call in the original.
import { Hono } from "hono";
import type { Context } from "hono";
import { desc, eq } from "drizzle-orm";
import {
  roles,
  settings,
  userRoles,
  users,
  websiteIntegrations,
} from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";
import { purgePublicCache, waitUntilOf } from "../../lib/side-effects";
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
} from "../../lib/shared";
import {
  DEFAULT_LANGUAGE_DEFAULT,
  DEFAULT_LANGUAGE_KEY,
  normalizeDefaultLanguage,
} from "../../lib/default-language";
import { hashIntegrationToken } from "../../lib/integrations";
import { z } from "zod";
import {
  invalidParam,
  isRecord,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../lib/validate";

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
    PUBLIC_SITE_URL?: string;
    CACHE_INVALIDATE_SECRET?: string;
  };
};

const app = new Hono<Env>();

type ApiDb = ReturnType<typeof getApiDb>;

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

const createIntegrationSchema = z.object({
  name: z.string().trim().min(1).max(255),
});

const updateIntegrationSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  isActive: z.boolean().optional(),
});

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

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

// ─── Integrations ────────────────────────────────────────────────────────────
// Role guard ported from packages/auth/src/lib/authorization.ts
// (authorizeByEmail) + apps/admin/src/lib/website-integrations.ts
// (requireIntegrationAdmin), re-implemented on the Neon HTTP DB because
// the original is TCP-bound (getDb()/postgres.js).

class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

function slugifyRoleName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Mirror authorizeByEmail(email, "admin", "super_admin"): resolve the
 *  internal user by Better Auth email, require an active account, then
 *  require one of the given slugified roles. Throws UnauthorizedError
 *  (401) or ForbiddenError (403). */
async function requireIntegrationAdmin(
  db: ApiDb,
  email: string | undefined,
): Promise<{ id: string; email: string }> {
  if (!email) throw new UnauthorizedError("Unauthorized");
  const [internal] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!internal) throw new UnauthorizedError("User not found in internal registry");
  if (!internal.isActive) throw new ForbiddenError("User account is disabled");
  const roleRows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, internal.id));
  const roleSlugs = [
    ...new Set(roleRows.map((r) => slugifyRoleName(r.roleName))),
  ];
  if (!roleSlugs.includes("admin") && !roleSlugs.includes("super_admin")) {
    throw new ForbiddenError("Required role: admin or super_admin");
  }
  return { id: internal.id, email: internal.email };
}

function handleIntegrationError(err: unknown) {
  if (err instanceof UnauthorizedError) {
    return { status: 401 as const, body: { error: "Unauthorized" } };
  }
  if (err instanceof ForbiddenError) {
    return { status: 403 as const, body: { error: "Forbidden" } };
  }
  return {
    status: 500 as const,
    body: { error: errorMessage(err) },
  };
}

interface WebsiteIntegrationListItem {
  id: string;
  name: string;
  tokenPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type WebsiteIntegrationRow = typeof websiteIntegrations.$inferSelect;

function toListItem(row: WebsiteIntegrationRow): WebsiteIntegrationListItem {
  return {
    id: row.id,
    name: row.name,
    tokenPrefix: row.tokenPrefix,
    isActive: row.isActive ?? false,
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    createdAt: (row.createdAt ?? new Date(0)).toISOString(),
    updatedAt: (row.updatedAt ?? new Date(0)).toISOString(),
  };
}

/** Mirror generateIntegrationToken(): `wpi_` + 32 random bytes, base64url.
 *  Web Crypto only (no node:crypto on Workers). The SHA-256 hash is
 *  computed by the caller via hashIntegrationToken (async Web Crypto). */
function generateIntegrationToken(): {
  token: string;
  tokenPrefix: string;
} {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let encoded = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const b1 = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    encoded += alphabet[b0 >> 2]!;
    encoded += alphabet[((b0 & 0x03) << 4) | (b1 >> 4)]!;
    if (i + 1 < bytes.length) {
      encoded += alphabet[((b1 & 0x0f) << 2) | (b2 >> 6)]!;
    }
    if (i + 2 < bytes.length) {
      encoded += alphabet[b2 & 0x3f]!;
    }
  }
  const token = `wpi_${encoded}`;
  return { token, tokenPrefix: token.slice(0, 8) };
}

app.get("/integrations", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    await requireIntegrationAdmin(db, user.email);
    const rows = await db
      .select()
      .from(websiteIntegrations)
      .orderBy(desc(websiteIntegrations.createdAt));
    return c.json({ integrations: rows.map(toListItem) });
  } catch (err) {
    const { status, body } = handleIntegrationError(err);
    return c.json(body, status);
  }
});

app.post("/integrations", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    await requireIntegrationAdmin(db, user.email);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, createIntegrationSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const name = v.data.name;
    const { token, tokenPrefix } = generateIntegrationToken();
    const tokenHash = await hashIntegrationToken(token);
    const [row] = await db
      .insert(websiteIntegrations)
      .values({ name, tokenHash, tokenPrefix })
      .returning();
    if (!row) throw new Error("Failed to create website integration");
    return c.json({ integration: toListItem(row), token }, 201);
  } catch (err) {
    const { status, body } = handleIntegrationError(err);
    return c.json(body, status);
  }
});

app.get("/integrations/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    await requireIntegrationAdmin(db, user.email);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const [row] = await db
      .select()
      .from(websiteIntegrations)
      .where(eq(websiteIntegrations.id, id))
      .limit(1);
    if (!row) return c.json({ error: "Integration not found" }, 404);
    return c.json({ integration: toListItem(row) });
  } catch (err) {
    const { status, body } = handleIntegrationError(err);
    return c.json(body, status);
  }
});

async function updateIntegrationHandler(c: Context<Env, "/integrations/:id">) {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    await requireIntegrationAdmin(db, user.email);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, updateIntegrationSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const patch: { name?: string; isActive?: boolean } = {};
    if (v.data.name !== undefined) patch.name = v.data.name;
    if (v.data.isActive !== undefined) patch.isActive = v.data.isActive;
    // Drizzle's update-set type rejects possibly-undefined values, so
    // each combination is set with a fully concrete literal (the
    // original updates with the same patch object; an empty patch just
    // stamps updatedAt).
    const [row] = await (async () => {
      if (patch.name !== undefined && patch.isActive !== undefined) {
        return db
          .update(websiteIntegrations)
          .set({
            name: patch.name,
            isActive: patch.isActive,
            updatedAt: new Date(),
          })
          .where(eq(websiteIntegrations.id, id))
          .returning();
      }
      if (patch.name !== undefined) {
        return db
          .update(websiteIntegrations)
          .set({ name: patch.name, updatedAt: new Date() })
          .where(eq(websiteIntegrations.id, id))
          .returning();
      }
      if (patch.isActive !== undefined) {
        return db
          .update(websiteIntegrations)
          .set({ isActive: patch.isActive, updatedAt: new Date() })
          .where(eq(websiteIntegrations.id, id))
          .returning();
      }
      return db
        .update(websiteIntegrations)
        .set({ updatedAt: new Date() })
        .where(eq(websiteIntegrations.id, id))
        .returning();
    })();
    if (!row) return c.json({ error: "Integration not found" }, 404);
    return c.json({ integration: toListItem(row) });
  } catch (err) {
    const { status, body } = handleIntegrationError(err);
    return c.json(body, status);
  }
}

// Original is PATCH; PUT is registered as an alias with identical behaviour.
app.patch("/integrations/:id", updateIntegrationHandler);
app.put("/integrations/:id", updateIntegrationHandler);

app.delete("/integrations/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    await requireIntegrationAdmin(db, user.email);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const rows = await db
      .delete(websiteIntegrations)
      .where(eq(websiteIntegrations.id, id))
      .returning({ id: websiteIntegrations.id });
    if (rows.length === 0) {
      return c.json({ error: "Integration not found" }, 404);
    }
    return c.json({ ok: true });
  } catch (err) {
    const { status, body } = handleIntegrationError(err);
    return c.json(body, status);
  }
});

app.post("/integrations/:id/regenerate", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    await requireIntegrationAdmin(db, user.email);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const { token, tokenPrefix } = generateIntegrationToken();
    const tokenHash = await hashIntegrationToken(token);
    const [row] = await db
      .update(websiteIntegrations)
      .set({ tokenHash, tokenPrefix, updatedAt: new Date() })
      .where(eq(websiteIntegrations.id, id))
      .returning();
    if (!row) return c.json({ error: "Integration not found" }, 404);
    return c.json({ integration: toListItem(row), token });
  } catch (err) {
    const { status, body } = handleIntegrationError(err);
    return c.json(body, status);
  }
});

export default app;
