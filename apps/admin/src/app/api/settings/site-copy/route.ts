import { NextResponse } from "next/server";
import { SettingsRepository } from "@repo/database";
import { purgePublicCache } from "@repo/shared";

/**
 * Admin-only bilingual site copy: the hero + Know Me headlines/subs in
 * English and Bangla, plus the Know Me bio paragraphs (P1–P3, EN + BN),
 * the founder summary (EN + BN), and the single homepage SEO title /
 * description.
 *
 * The hero/headline, founder-summary and site-title fields are stored
 * as twelve rows in the EXISTING generic settings table (keys
 * hero_headline, hero_headline_bn, hero_description,
 * hero_description_bn, know_me_headline, know_me_headline_bn,
 * know_me_sub, know_me_sub_bn, founder_summary, founder_summary_bn,
 * site_title, site_description) — no migration. The English hero rows
 * are seeded by migration 0018 with the exact live Astro copy; the
 * *_bn rows stay empty until an admin writes Bangla (empty Bangla =
 * the public site shows the English copy). The founder-summary rows
 * are written through by the homepage founder section editor (one
 * write path — this endpoint is the settings half of that save); the
 * site title / description replace the old per-variant hero SEO
 * fields, which were write-only dead input.
 *
 * The bio paragraphs live in the generic site-copy JSONB rows instead
 * (settings keys `site_copy` / `site_copy_bn`, keys aboutP1 / aboutP2 /
 * aboutP3 — seeded by migrations 0030 + 0034). PUT merges only the three
 * bio keys into each row and leaves the other ~250 keys untouched; an
 * empty bio field deletes that key from the JSONB, so the public site
 * falls back to its built-in text.
 *
 * PUT accepts any subset of the eighteen fields; each must be a string,
 * and an empty string clears that field (stores null for the twelve
 * single-key fields, deletes the key for the six bio fields).
 * The dashboard middleware already requires a session cookie for /api/*
 * (except its public prefixes), so no extra auth check is added here,
 * matching the other dashboard API routes.
 */
const repo = new SettingsRepository();

const FIELDS = [
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
const BIO_FIELDS = [
  { bodyKey: "aboutP1", rowKey: "site_copy", jsonKey: "aboutP1", description: "Know Me bio, paragraph 1 (English) — public Know Me page" },
  { bodyKey: "aboutP2", rowKey: "site_copy", jsonKey: "aboutP2", description: "Know Me bio, paragraph 2 (English) — public Know Me page" },
  { bodyKey: "aboutP3", rowKey: "site_copy", jsonKey: "aboutP3", description: "Know Me bio, paragraph 3 (English) — public Know Me page" },
  { bodyKey: "aboutP1Bn", rowKey: "site_copy_bn", jsonKey: "aboutP1", description: "Know Me bio, paragraph 1 (Bangla) — public Know Me page. Empty = show English." },
  { bodyKey: "aboutP2Bn", rowKey: "site_copy_bn", jsonKey: "aboutP2", description: "Know Me bio, paragraph 2 (Bangla) — public Know Me page. Empty = show English." },
  { bodyKey: "aboutP3Bn", rowKey: "site_copy_bn", jsonKey: "aboutP3", description: "Know Me bio, paragraph 3 (Bangla) — public Know Me page. Empty = show English." },
] as const;

function asText(value: unknown): string | null | undefined {
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

export async function GET() {
  try {
    const rows = await Promise.all(FIELDS.map((f) => repo.findByKey(f.key)));
    const out: Record<string, string | null> = {};
    FIELDS.forEach((f, i) => {
      out[f.bodyKey] = readSingleKey(rows[i]?.value);
    });
    // Bio paragraphs — from the site_copy / site_copy_bn JSONB rows.
    const [siteCopyRow, siteCopyBnRow] = await Promise.all([
      repo.findByKey("site_copy"),
      repo.findByKey("site_copy_bn"),
    ]);
    const siteCopy = asJsonObject(siteCopyRow?.value);
    const siteCopyBn = asJsonObject(siteCopyBnRow?.value);
    for (const f of BIO_FIELDS) {
      const source = f.rowKey === "site_copy" ? siteCopy : siteCopyBn;
      const raw = source[f.jsonKey];
      out[f.bodyKey] = typeof raw === "string" ? raw : null;
    }
    return NextResponse.json(out);
  } catch {
    return NextResponse.json(
      { error: "Failed to load site copy" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const saved: Record<string, string | null> = {};
    for (const f of FIELDS) {
      if (!(f.bodyKey in body)) continue;
      const value = asText(body[f.bodyKey]);
      if (value === undefined) {
        return NextResponse.json(
          { error: `${f.bodyKey} must be a string` },
          { status: 400 },
        );
      }
      const existing = await repo.findByKey(f.key);
      if (existing) {
        await repo.update(existing.id, { value });
      } else if (value !== null) {
        await repo.create({
          key: f.key,
          value,
          group: "brand",
          description: f.description,
        });
      }
      saved[f.bodyKey] = value;
    }
    // Bio paragraphs — merge only the three keys into each JSONB row so
    // the other ~250 site-copy keys are never touched.
    const bioByRow = new Map<string, Record<string, unknown>>();
    for (const f of BIO_FIELDS) {
      if (!(f.bodyKey in body)) continue;
      const value = asText(body[f.bodyKey]);
      if (value === undefined) {
        return NextResponse.json(
          { error: `${f.bodyKey} must be a string` },
          { status: 400 },
        );
      }
      let merged = bioByRow.get(f.rowKey);
      if (!merged) {
        const row = await repo.findByKey(f.rowKey);
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
      const row = await repo.findByKey(rowKey);
      if (row) {
        await repo.update(row.id, { value: merged });
      } else if (Object.keys(merged).length > 0) {
        const desc =
          rowKey === "site_copy"
            ? "Generic site copy (English) — B1 dict, verbatim; Astro overlays this over its i18n dict. Bangla twin key: site_copy_bn."
            : "Generic site copy (Bangla) — B1 dict, verbatim; Astro overlays this over its i18n dict.";
        await repo.create({
          key: rowKey,
          value: merged,
          group: "brand",
          description: desc,
        });
      }
    }
    // Instant public-site refresh (best-effort, never fails the save).
    if (Object.keys(saved).length > 0) void purgePublicCache(["home"]);
    return NextResponse.json(saved);
  } catch {
    return NextResponse.json(
      { error: "Failed to save site copy" },
      { status: 500 },
    );
  }
}
