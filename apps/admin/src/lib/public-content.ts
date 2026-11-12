// Read-only Public Content API — data layer (ASTRO_HYBRID_PLAN.md §7).
//
// Serves published content rows to the Astro public site. The Cloudflare
// Worker cannot TCP to the VPS Postgres, so this HTTP API is the only way
// live content reaches the public site.
//
// Published-only: drafts never leave the DB. is_preview rows ARE included
// when published — the dummy preview rows must appear on the public site
// during the design phase; delete them later with
// DELETE FROM <table> WHERE is_preview = true.
//
// Response shape mirrors the Astro content schemas
// (astro-public/src/content.config.ts) and the loader contract
// (astro-public/src/loaders/public-content.ts): every item carries at
// least slug + title; the rest is optional and filled from the DB row.
import type { NextRequest } from "next/server";
import {
  AVAILABILITY_DEFAULT,
  AVAILABILITY_KEY,
  DESIGNATIONS_BN_KEY,
  DESIGNATIONS_KEY,
  FAVICON_KEY,
  HERO_PORTRAIT_KEY,
  PRIMARY_IDENTITY_KEY,
  SEARCH_INDEXING_DEFAULT,
  SEARCH_INDEXING_KEY,
  SITE_COPY_BN_KEY,
  SITE_COPY_KEY,
  SITE_PRIMARY_IDENTITY_DEFAULT,
  SITE_URL_KEY,
  normalizeAvailability,
  normalizeFaviconUrl,
  normalizeHeroPortraitUrl,
  normalizeSearchIndexing,
  normalizeSitePrimaryIdentity,
  slugify,
  type AvailabilitySetting,
  type SitePrimaryIdentity,
} from "@repo/shared";
import {
  DEFAULT_LANGUAGE_DEFAULT,
  DEFAULT_LANGUAGE_KEY,
  normalizeDefaultLanguage,
  type DefaultLanguage,
} from "./default-language";
import {
  findActiveIntegrationByToken,
  hasActiveIntegration,
  touchIntegrationLastUsed,
} from "./website-integrations";
import { asc, desc, eq } from "drizzle-orm";
import {
  getDb,
  SettingsRepository,
  homepageSections,
  posts,
  postTags,
  tags,
  projects,
  projectTechnologies,
  projectTags,
  technologies,
  caseStudies,
  caseStudyTags,
  services,
  ventures,
  releases,
  releasePlatforms,
  releaseLyrics,
  releaseVideos,
  platforms,
  clients,
  personProfiles,
} from "@repo/database";

export type PublicContentType =
  | "posts"
  | "projects"
  | "case-studies"
  | "ventures"
  | "releases"
  | "services"
  | "platforms"
  | "technologies"
  | "clients";

export const PUBLIC_CONTENT_TYPES: readonly PublicContentType[] = [
  "posts",
  "projects",
  "case-studies",
  "ventures",
  "releases",
  "services",
  "platforms",
  "technologies",
  "clients",
];

export function isPublicContentType(value: string): value is PublicContentType {
  return (PUBLIC_CONTENT_TYPES as readonly string[]).includes(value);
}

export interface PublicContentItem {
  slug: string;
  title: string;
  description?: string;
  content?: string;
  tags?: string[];
  publishedAt?: string;
  updatedAt?: string;
  thumbnail?: string;
  thumbnailType?: "image" | "video";
  [key: string]: unknown;
}

/**
 * Website Integration auth for the public API.
 *
 * The public site sends its integration token as
 * `Authorization: Bearer <token>` (created in Settings → Website
 * Integrations). Only the SHA-256 hash is stored, so a presented token is
 * hashed and looked up here. The env PUBLIC_CONTENT_API_TOKEN stays as a
 * temporary fallback until the Astro loader is wired to an integration
 * token (then it is retired).
 *
 * Auth is REQUIRED only when it is configured — an env token, or at least
 * one active integration. When nothing is configured the API stays
 * public-read (current behavior, so the live site never breaks while the
 * integration is being set up). A DB failure fails open to public-read
 * for the same reason; a configured env token still enforces its check.
 */
export async function isAuthorized(request: NextRequest): Promise<boolean> {
  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : "";
  const envToken = process.env.PUBLIC_CONTENT_API_TOKEN;

  if (presented) {
    if (envToken && presented === envToken) return true;
    try {
      const match = await findActiveIntegrationByToken(presented);
      if (match) {
        touchIntegrationLastUsed(match.id);
        return true;
      }
    } catch {
      // DB lookup failed — fall through to the configured/public decision.
    }
  }

  // No valid token presented. Auth is required only when configured.
  if (envToken) return false;
  try {
    return !(await hasActiveIntegration());
  } catch {
    return true; // DB unreachable — fail open so the public site stays up.
  }
}

function toISO(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/** Per-item SEO fields (re-audit row 53). Every content type carries
 * these columns in the DB; they are emitted flat on every list item +
 * single item (undefined when unset) so the Astro detail pages can pass
 * them to Layout. Keywords is the stored string, verbatim. */
function seoFields(r: {
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: string | null;
  canonicalUrl?: string | null;
  keywords?: string | null;
}): {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  keywords?: string;
} {
  return {
    metaTitle: r.metaTitle ?? undefined,
    metaDescription: r.metaDescription ?? undefined,
    ogImage: r.ogImage ?? undefined,
    canonicalUrl: r.canonicalUrl ?? undefined,
    keywords: r.keywords ?? undefined,
  };
}

/** The year of a date (project key info: Astro reads `year`). */
function yearOf(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return String(d.getFullYear());
}

/** Build the optional nested `bn` object for one item: the SAME field
 * names as the English top level, carrying only the populated Bangla
 * strings. Returns undefined when nothing is set — the Astro public site
 * then falls back to English for every field. Never invents a value. */
function bnOf(
  fields: Record<string, string | null | undefined>,
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string" && value.trim() !== "") out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** A settings-table value (a bare string, or { value: string }) as a
 * non-empty string, or undefined when unset/empty. Never throws. */
function asNonEmptyString(value: unknown): string | undefined {
  const raw =
    typeof value === "string"
      ? value
      : value !== null &&
          typeof value === "object" &&
          "value" in value &&
          typeof (value as { value: unknown }).value === "string"
        ? (value as { value: string }).value
        : undefined;
  if (!raw) return undefined;
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

interface VideoItem {
  url: string;
  title?: string;
}

/** videos jsonb is an array of strings or {url,title} objects. */
function toVideoList(value: unknown): VideoItem[] {
  if (!Array.isArray(value)) return [];
  const out: VideoItem[] = [];
  for (const v of value) {
    if (typeof v === "string" && v) out.push({ url: v });
    else if (typeof v === "object" && v !== null) {
      const url = (v as { url?: unknown }).url;
      if (typeof url === "string" && url) {
        const title = (v as { title?: unknown }).title;
        out.push({
          url,
          ...(typeof title === "string" && title ? { title } : {}),
        });
      }
    }
  }
  return out;
}

export interface MetricItem {
  value: string;
  label: string;
}

/**
 * Human labels for known case-study / venture metric keys (the metrics
 * jsonb column stores an OBJECT keyed by a short camelCase id).
 * Unknown keys fall back to a readable Title Case label.
 */
const METRIC_LABELS: Record<string, string> = {
  stores: "Stores",
  fraudChecks: "Fraud checks",
  ordersPerDay: "Orders / day",
  pageLoad: "Page load",
  codConfirmation: "COD confirmation",
  conversionUplift: "Conversion uplift",
  fraudOrderReduction: "Fraud order reduction",
  orderTimeSaved: "Order time saved",
  branchesOnboarded: "Branches onboarded",
  stockOutReduction: "Stock-out reduction",
  expiryLossReduction: "Expiry loss reduction",
};

function metricLabel(key: string): string {
  const known = METRIC_LABELS[key];
  if (known) return known;
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Normalize a metrics jsonb value into the Metric[] array the Astro
 * public site's live schemas require ({value, label}).
 *
 * The column stores an OBJECT ({stores, fraudChecks, ordersPerDay, ...})
 * but the Astro liveCaseStudies / liveVentures schemas require an ARRAY
 * — Zod rejected the whole live entry, so case-study pages fell back to
 * build-time rows with no cover/gallery/research/metrics. An array passes
 * through (cleaned), an object becomes [{value, label}] pairs, anything
 * else (null / missing / wrong type) becomes [] — never throws, never
 * invents a value (labels come from the stored keys only).
 */
export function toMetricList(value: unknown): MetricItem[] {
  if (Array.isArray(value)) {
    return value
      .filter(
        (m): m is { value: unknown; label: unknown } =>
          typeof m === "object" && m !== null,
      )
      .map((m) => ({
        value: String(m.value ?? ""),
        label: String(m.label ?? ""),
      }))
      .filter((m) => m.value !== "" && m.label !== "");
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && String(v) !== "")
      .map(([k, v]) => ({ value: String(v), label: metricLabel(k) }));
  }
  return [];
}

function readingTimeMinutes(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return undefined;
  return Math.max(1, Math.round(words / 200));
}

function truncate(text: string | undefined, max = 160): string | undefined {
  if (!text) return undefined;
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return undefined;
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

function extractYoutubeId(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const short = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (short?.[1]) return short[1];
  const watch = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  if (watch?.[1]) return watch[1];
  const embed = url.match(/\/embed\/([A-Za-z0-9_-]{6,})/);
  if (embed?.[1]) return embed[1];
  return undefined;
}

type Db = ReturnType<typeof getDb>;

async function postTagsByPostId(db: Db): Promise<Map<string, string[]>> {
  const rows = await db
    .select({ postId: postTags.postId, name: tags.name })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id));
  const map = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.postId || !row.name) continue;
    const list = map.get(row.postId) ?? [];
    list.push(row.name);
    map.set(row.postId, list);
  }
  return map;
}

/** Project tags from the project_tags join (0028) — same shape as
 * postTagsByPostId. Replaces the hardcoded `tags: []` in listProjects. */
async function projectTagsByProjectId(
  db: Db,
): Promise<Map<string, string[]>> {
  const rows = await db
    .select({ projectId: projectTags.projectId, name: tags.name })
    .from(projectTags)
    .innerJoin(tags, eq(projectTags.tagId, tags.id));
  const map = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.projectId || !row.name) continue;
    const list = map.get(row.projectId) ?? [];
    list.push(row.name);
    map.set(row.projectId, list);
  }
  return map;
}

/** Case-study tags from the case_study_tags join (0028) — same shape as
 * postTagsByPostId. Replaces the hardcoded `tags: []` in listCaseStudies. */
async function caseStudyTagsByCaseStudyId(
  db: Db,
): Promise<Map<string, string[]>> {
  const rows = await db
    .select({ caseStudyId: caseStudyTags.caseStudyId, name: tags.name })
    .from(caseStudyTags)
    .innerJoin(tags, eq(caseStudyTags.tagId, tags.id));
  const map = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.caseStudyId || !row.name) continue;
    const list = map.get(row.caseStudyId) ?? [];
    list.push(row.name);
    map.set(row.caseStudyId, list);
  }
  return map;
}

async function techsByProjectId(db: Db): Promise<Map<string, string[]>> {
  const rows = await db
    .select({
      projectId: projectTechnologies.projectId,
      name: technologies.name,
    })
    .from(projectTechnologies)
    .innerJoin(
      technologies,
      eq(projectTechnologies.technologyId, technologies.id),
    );
  const map = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.projectId || !row.name) continue;
    const list = map.get(row.projectId) ?? [];
    list.push(row.name);
    map.set(row.projectId, list);
  }
  return map;
}

/** A video thumbnail serves the video URL (poster image as fallback);
 * an image thumbnail serves the image URL. */
function thumbnailFor(
  type: string | null | undefined,
  videoUrl: string | null | undefined,
  imageUrl: string | null | undefined,
  ...fallbacks: (string | null | undefined)[]
): string | undefined {
  if (type === "video") {
    return (
      videoUrl ?? imageUrl ?? fallbacks.find((f) => f) ?? undefined
    );
  }
  return imageUrl ?? fallbacks.find((f) => f) ?? undefined;
}

async function lyricsByReleaseId(db: Db): Promise<Map<string, string>> {
  // The admin lyrics UI writes ONLY to release_lyrics (via
  // PUT /api/releases/[id]/lyrics); releases.lyrics is never populated,
  // so the public API must read this table for lyrics to ever arrive.
  const rows = await db
    .select({
      releaseId: releaseLyrics.releaseId,
      lyrics: releaseLyrics.lyricsText,
    })
    .from(releaseLyrics);
  const map = new Map<string, string>();
  for (const row of rows) {
    if (!row.releaseId || !row.lyrics) continue;
    map.set(row.releaseId, row.lyrics);
  }
  return map;
}

/** Bangla lyrics live in release_lyrics.translations under the "bn" key
 * (that jsonb exists precisely for translations); the admin lyrics tab
 * edits it through a dedicated "Lyrics (Bangla)" field. */
async function lyricsTranslationsByReleaseId(
  db: Db,
): Promise<Map<string, Record<string, unknown>>> {
  const rows = await db
    .select({
      releaseId: releaseLyrics.releaseId,
      translations: releaseLyrics.translations,
    })
    .from(releaseLyrics);
  const map = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    if (!row.releaseId || !row.translations) continue;
    if (typeof row.translations === "object") {
      map.set(row.releaseId, row.translations as Record<string, unknown>);
    }
  }
  return map;
}

async function videosByReleaseId(
  db: Db,
): Promise<Map<string, { platform: string; url: string; title?: string }[]>> {
  const rows = await db
    .select({
      releaseId: releaseVideos.releaseId,
      platform: releaseVideos.platformName,
      url: releaseVideos.videoUrl,
      title: releaseVideos.title,
    })
    .from(releaseVideos)
    .orderBy(releaseVideos.sortOrder, releaseVideos.createdAt);
  const map = new Map<string, { platform: string; url: string; title?: string }[]>();
  for (const row of rows) {
    if (!row.releaseId || !row.platform || !row.url) continue;
    const list = map.get(row.releaseId) ?? [];
    list.push({
      platform: row.platform,
      url: row.url,
      ...(row.title ? { title: row.title } : {}),
    });
    map.set(row.releaseId, list);
  }
  return map;
}

async function platformsByReleaseId(
  db: Db,
): Promise<Map<string, { name: string; url: string }[]>> {
  const rows = await db
    .select({
      releaseId: releasePlatforms.releaseId,
      name: releasePlatforms.platformName,
      url: releasePlatforms.platformUrl,
    })
    .from(releasePlatforms);
  const map = new Map<string, { name: string; url: string }[]>();
  for (const row of rows) {
    if (!row.releaseId || !row.name || !row.url) continue;
    const list = map.get(row.releaseId) ?? [];
    list.push({ name: row.name, url: row.url });
    map.set(row.releaseId, list);
  }
  return map;
}

async function projectSlugById(db: Db): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: projects.id, slug: projects.slug })
    .from(projects);
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.id && row.slug) map.set(row.id, row.slug);
  }
  return map;
}

async function listPosts(db: Db): Promise<PublicContentItem[]> {
  const rows = await db
    .select()
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishAt), desc(posts.createdAt));
  const tagsById = await postTagsByPostId(db);
  return rows
    .filter((r) => r.slug && r.title)
    .map((r) => {
      const thumbnail = thumbnailFor(
        r.thumbnailType,
        r.thumbnailVideoUrl,
        r.thumbnailUrl,
        r.coverImage,
      );
      return {
        slug: r.slug as string,
        title: r.title as string,
        description: r.excerpt ?? undefined,
        content: r.content ?? undefined,
        // `description` mirrors `excerpt` (list cards read description).
        bn: bnOf({
          title: r.titleBn,
          excerpt: r.excerptBn,
          description: r.excerptBn,
          content: r.contentBn,
        }),
        tags: tagsById.get(r.id) ?? [],
        publishedAt: toISO(r.publishAt ?? r.createdAt),
        updatedAt: toISO(r.updatedAt),
        ...seoFields(r),
        thumbnail,
        thumbnailType:
          r.thumbnailType === "video" ? "video" : ("image" as const),
        thumbnailVideoUrl: r.thumbnailVideoUrl ?? undefined,
        thumbnailAutoplay: r.thumbnailAutoplay ?? undefined,
        excerpt: r.excerpt ?? undefined,
        readingTime: readingTimeMinutes(r.content ?? undefined),
        gallery: toStringList(r.galleryImages),
        videos: toVideoList(r.videos),
      } satisfies PublicContentItem;
    });
}

async function listProjects(db: Db): Promise<PublicContentItem[]> {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.status, "published"))
    .orderBy(desc(projects.createdAt));
  const techsById = await techsByProjectId(db);
  const projectTagsById = await projectTagsByProjectId(db);
  return rows
    .filter((r) => r.slug && r.title)
    .map((r) => {
      const thumbnail = thumbnailFor(
        r.thumbnailType,
        r.thumbnailVideoUrl,
        r.thumbnailUrl,
        r.thumbnail,
        r.coverImage,
      );
      return {
        slug: r.slug,
        title: r.title as string,
        description: r.description ?? r.summary ?? undefined,
        content: r.description ?? undefined,
        // `content` mirrors `description` (the project detail story
        // reads bn.content / bn.longDescription — bn.description alone
        // never reaches it).
        bn: bnOf({
          title: r.titleBn,
          summary: r.summaryBn,
          description: r.descriptionBn,
          content: r.descriptionBn,
        }),
        tags: projectTagsById.get(r.id) ?? [],
        techs: techsById.get(r.id) ?? [],
        publishedAt: toISO(r.startDate ?? r.createdAt),
        updatedAt: toISO(r.updatedAt),
        ...seoFields(r),
        thumbnail,
        thumbnailType:
          r.thumbnailType === "video" ? "video" : ("image" as const),
        thumbnailVideoUrl: r.thumbnailVideoUrl ?? undefined,
        thumbnailAutoplay: r.thumbnailAutoplay ?? undefined,
        gallery: toStringList(r.galleryImages),
        videos: toVideoList(r.videos),
        featured: r.isFeatured ?? undefined,
        startDate: toISO(r.startDate),
        // Project key info, field names the Astro detail page reads
        // (re-audit row 60): client / liveUrl / year / status. `role`
        // has no source anywhere — no DB column, no .md field, and the
        // Astro build-time rows carry no role either — so it is omitted
        // rather than invented; the detail strip skips it when absent.
        client: r.clientName ?? undefined,
        liveUrl: r.projectUrl ?? undefined,
        year: yearOf(r.startDate),
        status: r.status ?? undefined,
        endDate: toISO(r.endDate),
        industry: r.industry ?? undefined,
      } satisfies PublicContentItem;
    });
}

async function listCaseStudies(db: Db): Promise<PublicContentItem[]> {
  const rows = await db
    .select()
    .from(caseStudies)
    .where(eq(caseStudies.status, "published"))
    .orderBy(desc(caseStudies.createdAt));
  const slugById = await projectSlugById(db);
  const caseStudyTagsById = await caseStudyTagsByCaseStudyId(db);
  return rows
    .filter((r) => r.slug && r.title)
    .map((r) => {
      const content = [r.challenge, r.research, r.strategy, r.results]
        .filter(Boolean)
        .join("\n\n");
      const thumbnail = thumbnailFor(
        r.thumbnailType,
        r.thumbnailVideoUrl,
        r.thumbnailUrl,
      );
      return {
        slug: r.slug as string,
        title: r.title as string,
        description: truncate(r.challenge ?? r.results ?? undefined),
        content: content || undefined,
        // bn uses the DB story-field names (challenge / research /
        // strategy / results); the English top level keeps the API names
        // (problem / fix / result) for the Astro loader contract.
        // `description` mirrors the English truncate(challenge ??
        // results) for list cards; `content` is the joined Bangla story
        // — the detail lede reads bn.content, and without it the lede
        // stays English (and dedupes against Bangla fields fail).
        bn: bnOf({
          title: r.titleBn,
          description: truncate(r.challengeBn ?? r.resultsBn ?? undefined),
          content:
            [r.challengeBn, r.researchBn, r.strategyBn, r.resultsBn]
              .filter(
                (v): v is string =>
                  typeof v === "string" && v.trim() !== "",
              )
              .join("\n\n") || undefined,
          challenge: r.challengeBn,
          research: r.researchBn,
          strategy: r.strategyBn,
          results: r.resultsBn,
        }),
        tags: caseStudyTagsById.get(r.id) ?? [],
        publishedAt: toISO(r.createdAt),
        updatedAt: toISO(r.updatedAt),
        ...seoFields(r),
        thumbnail,
        thumbnailType:
          r.thumbnailType === "video" ? "video" : ("image" as const),
        thumbnailVideoUrl: r.thumbnailVideoUrl ?? undefined,
        thumbnailAutoplay: r.thumbnailAutoplay ?? undefined,
        problem: r.challenge ?? undefined,
        research: r.research ?? undefined,
        fix: r.strategy ?? undefined,
        result: r.results ?? undefined,
        metrics: toMetricList(r.metrics),
        projectSlug: r.projectId
          ? (slugById.get(r.projectId) ?? undefined)
          : undefined,
        projectId: r.projectId ?? undefined,
        gallery: toStringList(r.galleryImages),
        videos: toVideoList(r.videos),
      } satisfies PublicContentItem;
    });
}

async function listVentures(db: Db): Promise<PublicContentItem[]> {
  const rows = await db
    .select()
    .from(ventures)
    .where(eq(ventures.contentStatus, "published"))
    .orderBy(desc(ventures.createdAt));
  return rows
    .filter((r) => r.slug && r.name)
    .map((r) => {
      const thumbnail = thumbnailFor(
        r.thumbnailType,
        r.thumbnailVideoUrl,
        r.thumbnailUrl,
        r.coverImage,
        r.logo,
      );
      return {
        slug: r.slug,
        title: r.name as string,
        description: r.description ?? undefined,
        // `title` mirrors `name`: the Astro site renders venture titles
        // from `title`, so bn.name alone never overlays the title.
        bn: bnOf({
          name: r.nameBn,
          title: r.nameBn,
          description: r.descriptionBn,
          shortDescription: r.shortDescriptionBn,
        }),
        tags: r.industry ? [r.industry] : [],
        // publishedAt derivation only: a year-only venture has no
        // foundedDate, so its publishedAt falls back to
        // `${foundedYear}-01-01` — for ordering only, never displayed
        // as a date (the site renders `foundedYear` on its own). A
        // full date wins over the year when both are somehow present.
        publishedAt: toISO(
          r.foundedDate ??
            (r.foundedYear ? `${r.foundedYear}-01-01` : undefined) ??
            r.createdAt,
        ),
        updatedAt: toISO(r.updatedAt),
        ...seoFields(r),
        thumbnail,
        thumbnailType:
          r.thumbnailType === "video" ? "video" : ("image" as const),
        thumbnailVideoUrl: r.thumbnailVideoUrl ?? undefined,
        thumbnailAutoplay: r.thumbnailAutoplay ?? undefined,
        website: r.website ?? null,
        gallery: toStringList(r.galleryImages),
        videos: toVideoList(r.videos),
        metrics: toMetricList(r.metrics),
        stage: r.stage ?? undefined,
        location: r.location ?? undefined,
        teamSize: r.teamSize ?? undefined,
        industry: r.industry ?? undefined,
        foundedDate: toISO(r.foundedDate),
        foundedYear: r.foundedYear ?? undefined,
        isFeatured: r.isFeatured ?? undefined,
        // Mini-row copy + order (re-audit row 42 / migration 0029):
        // the Combined section renders the SHORT one-liner, not the
        // long description, in VENTURE_ORDER.
        shortDescription: r.shortDescription ?? undefined,
        sortOrder: r.sortOrder ?? undefined,
      } satisfies PublicContentItem;
    });
}

async function listReleases(db: Db): Promise<PublicContentItem[]> {
  const rows = await db
    .select()
    .from(releases)
    .where(eq(releases.status, "published"))
    .orderBy(desc(releases.releaseDate), desc(releases.createdAt));
  const platformsById = await platformsByReleaseId(db);
  const lyricsById = await lyricsByReleaseId(db);
  const lyricsTranslationsById = await lyricsTranslationsByReleaseId(db);
  const videosById = await videosByReleaseId(db);
  return rows
    // NOTE: no Ya Nabi exclusion here — the LIST route filters it out
    // (see api/public/content/[type]/route.ts); the single-item endpoint
    // must still return it. Filtering here would 404 its detail page.
    .filter((r) => r.slug && r.title)
    .map((r) => {
      const platforms = platformsById.get(r.id) ?? [];
      const youtube = platforms.find((p) =>
        /youtu\.?be/i.test(p.name) || /youtu\.?be/i.test(p.url),
      );
      const credits =
        r.credits && typeof r.credits === "object"
          ? (r.credits as Record<string, unknown>)
          : {};
      const tune =
        typeof credits.tune === "string" ? credits.tune : undefined;
      const lyricist =
        typeof credits.lyricist === "string" ? credits.lyricist : undefined;
      // Bangla credits live in the same credits jsonb as "tune_bn" /
      // "lyricist_bn" keys; Bangla lyrics live in release_lyrics
      // .translations under the "bn" key (see lyricsTranslationsByReleaseId).
      const bnTune =
        typeof credits.tune_bn === "string" ? credits.tune_bn : undefined;
      const bnLyricist =
        typeof credits.lyricist_bn === "string"
          ? credits.lyricist_bn
          : undefined;
      const translations = lyricsTranslationsById.get(r.id) ?? {};
      const bnLyrics =
        typeof translations.bn === "string" ? translations.bn : undefined;
      return {
        slug: r.slug,
        title: r.title as string,
        description: r.description ?? undefined,
        content: r.description ?? undefined,
        bn: bnOf({
          title: r.titleBn,
          description: r.descriptionBn,
          lyrics: bnLyrics,
          tune: bnTune,
          lyricist: bnLyricist,
        }),
        tags: [],
        publishedAt: toISO(r.releaseDate ?? r.createdAt),
        updatedAt: toISO(r.updatedAt),
        ...seoFields(r),
        thumbnail: r.coverImage ?? undefined,
        thumbnailType: "image" as const,
        releaseType: r.type ?? undefined,
        platforms,
        youtubeId: extractYoutubeId(youtube?.url),
        tune,
        lyricist,
        // Lyrics live in release_lyrics (admin writes there); fall back to
        // the legacy releases.lyrics column if a row was seeded with it.
        lyrics: lyricsById.get(r.id) ?? r.lyrics ?? undefined,
        videos: videosById.get(r.id) ?? [],
        releaseDate: toISO(r.releaseDate),
      } satisfies PublicContentItem;
    });
}

async function listServices(db: Db): Promise<PublicContentItem[]> {
  const rows = await db
    .select()
    .from(services)
    .where(eq(services.status, "published"))
    .orderBy(asc(services.sortOrder), desc(services.createdAt));
  return rows
    .filter((r) => r.slug && r.title)
    .map((r) => {
      const thumbnail = thumbnailFor(
        r.thumbnailType,
        r.thumbnailVideoUrl,
        r.thumbnailUrl,
      );
      return {
        slug: r.slug,
        title: r.title as string,
        description: r.description ?? r.summary ?? undefined,
        content: r.description ?? undefined,
        summary: r.summary ?? undefined,
        icon: r.icon ?? undefined,
        priceRange: r.priceRange ?? undefined,
        bn: bnOf({
          title: r.titleBn,
          summary: r.summaryBn,
          description: r.descriptionBn,
        }),
        tags: [],
        publishedAt: toISO(r.createdAt),
        updatedAt: toISO(r.updatedAt),
        ...seoFields(r),
        thumbnail,
        thumbnailType:
          r.thumbnailType === "video" ? "video" : ("image" as const),
        thumbnailVideoUrl: r.thumbnailVideoUrl ?? undefined,
        thumbnailAutoplay: r.thumbnailAutoplay ?? undefined,
        featured: r.isFeatured ?? undefined,
        sortOrder: r.sortOrder ?? undefined,
      } satisfies PublicContentItem;
    });
}

/** Platforms (0025): all rows, PLATFORMS order. No status column exists
 * on this table, so nothing is filtered. Slug is the slugified name;
 * the two Facebook rows share a name, so the note disambiguates them
 * (facebook-personal / facebook-professional). */
async function listPlatforms(db: Db): Promise<PublicContentItem[]> {
  const rows = await db
    .select()
    .from(platforms)
    .orderBy(asc(platforms.sortOrder), asc(platforms.createdAt));
  return rows
    .filter((r) => r.name && r.url)
    .map((r) => {
      const base = slugify(r.name);
      const slug = r.note ? `${base}-${slugify(r.note)}` : base;
      return {
        slug,
        title: r.name,
        name: r.name,
        handle: r.handle ?? undefined,
        url: r.url,
        group: r.group,
        icon: r.icon ?? undefined,
        subtitle: r.subtitle ?? undefined,
        note: r.note ?? undefined,
        isPrimary: r.isPrimary ?? undefined,
        sortOrder: r.sortOrder ?? undefined,
        bn: bnOf({ name: r.nameBn, subtitle: r.subtitleBn }),
      } satisfies PublicContentItem;
    });
}

/** Technologies / stack globe (0026): all 44 rows, STACK order. No
 * status column exists on this table, so nothing is filtered. The bn
 * overlay (0032) carries the Bangla name / use where set; empty falls
 * back to English via bnOf. */
async function listTechnologies(db: Db): Promise<PublicContentItem[]> {
  const rows = await db
    .select()
    .from(technologies)
    .orderBy(asc(technologies.sortOrder), asc(technologies.name));
  return rows
    .filter((r) => r.name)
    .map((r) => {
      const name = r.name as string;
      return {
        slug: slugify(name),
        title: name,
        name,
        category: r.category ?? undefined,
        icon: r.icon ?? undefined,
        use: r.use ?? undefined,
        sortOrder: r.sortOrder ?? undefined,
        bn: bnOf({ name: r.nameBn, use: r.useBn }),
      } satisfies PublicContentItem;
    });
}

/** Clients (0027): all rows, sort_order ascending. No status column
 * exists on this table, so nothing is filtered. */
async function listClients(db: Db): Promise<PublicContentItem[]> {
  const rows = await db
    .select()
    .from(clients)
    .orderBy(asc(clients.sortOrder), asc(clients.createdAt));
  return rows
    .filter((r) => r.name)
    .map((r) => {
      const name = r.name as string;
      return {
        slug: slugify(name),
        title: name,
        name,
        logoUrl: r.logoUrl ?? undefined,
        website: r.website ?? undefined,
        sortOrder: r.sortOrder ?? undefined,
        bn: bnOf({ name: r.nameBn }),
      } satisfies PublicContentItem;
    });
}

export async function listPublicContent(
  type: PublicContentType,
): Promise<PublicContentItem[]> {
  const db = getDb();
  switch (type) {
    case "posts":
      return listPosts(db);
    case "projects":
      return listProjects(db);
    case "case-studies":
      return listCaseStudies(db);
    case "ventures":
      return listVentures(db);
    case "releases":
      return listReleases(db);
    case "services":
      return listServices(db);
    case "platforms":
      return listPlatforms(db);
    case "technologies":
      return listTechnologies(db);
    case "clients":
      return listClients(db);
  }
}

export async function getPublicContent(
  type: PublicContentType,
  slug: string,
): Promise<PublicContentItem | undefined> {
  const items = await listPublicContent(type);
  return items.find((item) => item.slug === slug);
}

/** One designation: a title + a one-line description (the Know Me
 * identity cells). Stored in the settings table under DESIGNATIONS_KEY
 * as a jsonb array of these objects; Bangla under DESIGNATIONS_BN_KEY. */
export interface DesignationItem {
  title: string;
  description?: string;
}

/** Bangla site copy for the settings the endpoint returns. Only populated
 * fields are included — the Astro site falls back to the English top-level
 * field (or its own hardcoded copy) for anything missing. */
export interface PublicSettingsBn {
  heroHeadline?: string;
  heroDescription?: string;
  knowMeHeadline?: string;
  knowMeSub?: string;
  /** Bangla founder summary (settings key `founder_summary_bn`, or
   * the homepage_sections "founder" row `summaryBn` fallback). */
  founderSummary?: string;
  /** Positional Bangla stat labels, same order as the stats row; null
   * where a label has no Bangla yet. Present only when at least one
   * label_bn is set. */
  statsLabels?: (string | null)[];
  /** Bangla designations, positional overlay by index over the English
   * `designations` list (missing fields fall back to the English entry).
   * Present only when the `designations_bn` key has at least one value. */
  designations?: DesignationItem[];
}

/** One homepage stat: the proof figure + its English label, from the
 * homepage_sections "stats" row (migration 0031 reconciled the row to
 * the live site copy, so emitting the EN labels no longer regresses
 * the site). */
export interface StatItem {
  value: string;
  label: string;
}

export interface PublicSettings {
  portraitUrl: string | null;
  faviconUrl: string | null;
  primaryIdentity: SitePrimaryIdentity;
  /** Admin-configured default language ("en" when unset). Never hardcoded
   * in the Astro site — it reads this value. */
  defaultLanguage: DefaultLanguage;
  /** Availability badge (admin toggle in Settings → Brand / Identity).
   * Default is NOT available (fail-closed): the badge stays hidden until
   * an admin turns it on. */
  availability: AvailabilitySetting;
  /** Search-engine indexing switch (admin toggle in Settings → Search
   * Engine Indexing). Default OFF (fail-closed): while off, the public
   * site emits noindex and serves an empty sitemap. */
  searchIndexingEnabled: boolean;
  heroHeadline?: string;
  heroDescription?: string;
  knowMeHeadline?: string;
  knowMeSub?: string;
  /** Founder summary (settings keys `founder_summary` /
   * `founder_summary_bn`, written through by the homepage founder
   * section editor). Falls back to the homepage_sections "founder" row
   * when the settings key is empty, so a summary written before the
   * keys existed still reaches the site. Omitted when both are empty;
   * the Astro site falls back to its built-in text. */
  founderSummary?: string;
  /** Homepage SEO title (settings key `site_title`, edited at
   * Settings → Site Copy). One title for the whole homepage — the old
   * per-variant hero `seoTitle` fields were write-only dead input.
   * Omitted when empty; the Astro site falls back to its built-in title. */
  siteTitle?: string;
  /** Homepage SEO description (settings key `site_description`,
   * edited at Settings → Site Copy). Omitted when empty. */
  siteDescription?: string;
  /** Profile (person_profiles, first row). Undefined until the admin
   * profile UI (D1b) fills the row — today only full_name is seeded. */
  name?: string;
  email?: string;
  location?: string;
  /** Designations list (settings key `designations`, written by the admin
   * profile UI — D1b; this API only reads it). Always present; [] when
   * the key is absent. */
  designations: DesignationItem[];
  /** Generic site copy (settings keys `site_copy` / `site_copy_bn`):
   * section headings, archive/detail chrome, contact copy and other
   * dictionary strings. Omitted when the key is absent/empty; the Astro
   * site overlays these over its i18n dict. Never seeded by this leg. */
  siteCopy?: Record<string, string>;
  siteCopyBn?: Record<string, string>;
  /** Canonical site URL (settings key `site_url`). Omitted when
   * absent/empty; Astro falls back to its workers.dev URL. Never seeded
   * by this leg, and setting it changes no live domain by itself. */
  siteUrl?: string;
  /** Homepage stats (homepage_sections "stats" row), English value +
   * label per item, in row order. Omitted when the row is absent or
   * holds no valid item; the Astro site falls back to its build-time
   * STATS. The Bangla labels ride in bn.statsLabels, positional over
   * this same row. */
  stats?: StatItem[];
  /** Hero floating-chip numbers (settings key `hero_chips`), positional
   * [projects, orders] — the two chip numbers only; the suffix words
   * stay in the Astro i18n dict so Bangla keeps working. Omitted when
   * the key is absent/empty; Astro falls back to the live stats value
   * (chip 1) / build-time number (chip 2). */
  heroChips?: string[];
  bn?: PublicSettingsBn;
}

/** Settings-table key for the hero floating-chip numbers (migration
 * 0031 seed). The value is a jsonb array of two number strings,
 * positional [projects, orders]. */
const HERO_CHIPS_KEY = "hero_chips";

/** Settings-table keys for the bilingual site copy. The English rows are
 * seeded by migration 0018 with the exact live Astro copy; the *_bn rows
 * stay empty until an admin writes Bangla. */
const SITE_COPY_KEYS = {
  heroHeadline: "hero_headline",
  heroHeadlineBn: "hero_headline_bn",
  heroDescription: "hero_description",
  heroDescriptionBn: "hero_description_bn",
  knowMeHeadline: "know_me_headline",
  knowMeHeadlineBn: "know_me_headline_bn",
  knowMeSub: "know_me_sub",
  knowMeSubBn: "know_me_sub_bn",
} as const;

/** Settings-table keys for the founder summary (EN + BN) and the single
 * homepage SEO title / description. No migration: the generic settings
 * table already holds them; the rows are created by the first admin
 * save (Site Copy page / founder section editor). Empty Bangla =
 * the public site shows the English copy. */
const FOUNDER_SUMMARY_KEY = "founder_summary";
const FOUNDER_SUMMARY_BN_KEY = "founder_summary_bn";
const SITE_TITLE_KEY = "site_title";
const SITE_DESCRIPTION_KEY = "site_description";

/** A settings-table jsonb value as a string→string record (site_copy /
 * site_copy_bn). Accepts a bare object or { value: {...} }; non-string
 * values are dropped. Returns undefined when nothing survives — the
 * caller then omits the field. Never throws. */
function asStringRecord(value: unknown): Record<string, string> | undefined {
  const raw =
    value !== null &&
    typeof value === "object" &&
    "value" in value &&
    typeof (value as { value: unknown }).value === "object"
      ? (value as { value: unknown }).value
      : value;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string" && v !== "") out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** A settings-table jsonb value as a designations list: an array of
 * { title, description? }. Accepts a bare array or { value: [...] }.
 * Entries without a non-empty string title are dropped. Never throws. */
function asDesignationList(value: unknown): DesignationItem[] {
  const raw =
    value !== null &&
    typeof value === "object" &&
    "value" in value &&
    Array.isArray((value as { value: unknown }).value)
      ? (value as { value: unknown }).value
      : value;
  if (!Array.isArray(raw)) return [];
  const out: DesignationItem[] = [];
  for (const item of raw as unknown[]) {
    if (!item || typeof item !== "object") continue;
    const title = (item as { title?: unknown }).title;
    if (typeof title !== "string" || title.trim() === "") continue;
    const description = (item as { description?: unknown }).description;
    out.push({
      title: title.trim(),
      ...(typeof description === "string" && description.trim() !== ""
        ? { description: description.trim() }
        : {}),
    });
  }
  return out;
}

/** Bangla designations overlaid positionally on the English list: entry
 * i takes the Bangla title/description when present, else the English
 * value. Returns undefined unless the Bangla key contributed at least
 * one value — the caller then omits bn.designations. */
function overlayDesignationsBn(
  en: DesignationItem[],
  bnValue: unknown,
): DesignationItem[] | undefined {
  const bn = asDesignationList(bnValue);
  if (bn.length === 0) return undefined;
  let contributed = false;
  const out = en.map((entry, i) => {
    const bnEntry = bn[i];
    if (!bnEntry) return entry;
    contributed = true;
    return {
      title: bnEntry.title,
      description: bnEntry.description ?? entry.description,
    };
  });
  return contributed ? out : undefined;
}

/** The public profile row (person_profiles, first row by created_at).
 * Never throws — an empty table or a DB failure means no profile
 * fields, and the Astro site falls back to its own copy. */
async function publicProfile(db: Db): Promise<{
  name?: string;
  email?: string;
  location?: string;
}> {
  try {
    const [row] = await db
      .select()
      .from(personProfiles)
      .orderBy(asc(personProfiles.createdAt))
      .limit(1);
    if (!row) return {};
    return {
      ...(row.fullName ? { name: row.fullName } : {}),
      ...(row.email ? { email: row.email } : {}),
      ...(row.location ? { location: row.location } : {}),
    };
  } catch {
    return {};
  }
}

/** One parsed homepage_sections "stats" row entry, or null for an item
 * that holds no usable value + label (kept positional so the Bangla
 * overlay below stays aligned with the row). */
type StatsRowEntry = {
  value: string;
  label: string;
  labelBn: string | null;
} | null;

/** The homepage_sections "stats" row: { items: [{ value, label,
 * label_bn? }] }. One read serves both the English stats and the
 * Bangla labels, so they can never disagree about the row. Migration
 * 0031 reconciled the EN labels to the live site copy, so emitting
 * them no longer regresses the site. Never throws — a missing row, an
 * invalid shape, or any DB failure means no stats. */
async function statsRow(db: Db): Promise<StatsRowEntry[] | undefined> {
  try {
    const [row] = await db
      .select()
      .from(homepageSections)
      .where(eq(homepageSections.sectionKey, "stats"))
      .limit(1);
    const content = row?.content;
    if (!content || typeof content !== "object") return undefined;
    const items = (content as { items?: unknown }).items;
    if (!Array.isArray(items)) return undefined;
    return items.map((item) => {
      if (!item || typeof item !== "object") return null;
      const value = (item as { value?: unknown }).value;
      const label = (item as { label?: unknown }).label;
      if (
        typeof value !== "string" ||
        value.trim() === "" ||
        typeof label !== "string" ||
        label.trim() === ""
      )
        return null;
      const bn = (item as { label_bn?: unknown }).label_bn;
      return {
        value: value.trim(),
        label: label.trim(),
        labelBn:
          typeof bn === "string" && bn.trim() !== "" ? bn : null,
      };
    });
  } catch {
    return undefined;
  }
}

/** The homepage_sections "founder" row: { summary, summaryBn? }.
 * Fallback source for the founder summary while the `founder_summary`
 * / `founder_summary_bn` settings keys are still empty (summaries
 * written before those keys existed live only here). The settings key
 * wins when set; the section editor writes both places on every save,
 * so they cannot drift apart going forward. Never throws. */
async function founderRow(db: Db): Promise<{
  summary?: string;
  summaryBn?: string;
}> {
  try {
    const [row] = await db
      .select()
      .from(homepageSections)
      .where(eq(homepageSections.sectionKey, "founder"))
      .limit(1);
    const content = row?.content;
    if (!content || typeof content !== "object") return {};
    const c = content as { summary?: unknown; summaryBn?: unknown };
    return {
      ...(typeof c.summary === "string" && c.summary.trim() !== ""
        ? { summary: c.summary }
        : {}),
      ...(typeof c.summaryBn === "string" && c.summaryBn.trim() !== ""
        ? { summaryBn: c.summaryBn }
        : {}),
    };
  } catch {
    return {};
  }
}

/** A settings-table jsonb value as a string list (hero_chips). Accepts
 * a bare array or { value: [...] }; non-string / empty entries are
 * dropped. Returns undefined when nothing survives — the caller then
 * omits the field. Never throws. */
function asStringList(value: unknown): string[] | undefined {
  const raw =
    value !== null &&
    typeof value === "object" &&
    "value" in value &&
    Array.isArray((value as { value: unknown }).value)
      ? (value as { value: unknown }).value
      : value;
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .filter(
      (v): v is string => typeof v === "string" && v.trim() !== "",
    )
    .map((v) => v.trim());
  return out.length > 0 ? out : undefined;
}

/**
 * Public site settings — the brand rows the Astro public site needs:
 * the admin-set hero portrait URL, the focused profile, the default
 * language, the availability badge, the search-indexing switch, the
 * bilingual hero / Know Me copy, the founder summary (EN + BN), the
 * single homepage SEO title / description, the public profile (name /
 * email / location / designations), the generic site copy, the canonical
 * site URL, the homepage stats, and the hero floating-chip numbers.
 * Never throws: a missing row, an invalid value, or any DB failure
 * falls back to portraitUrl null + the default identity +
 * default language "en" + empty designations (and no bn object), so the
 * public site keeps rendering.
 */
export async function getPublicSettings(): Promise<PublicSettings> {
  const fallback: PublicSettings = {
    portraitUrl: null,
    faviconUrl: null,
    primaryIdentity: SITE_PRIMARY_IDENTITY_DEFAULT,
    defaultLanguage: DEFAULT_LANGUAGE_DEFAULT,
    availability: { ...AVAILABILITY_DEFAULT },
    searchIndexingEnabled: SEARCH_INDEXING_DEFAULT,
    designations: [],
  };
  try {
    const repo = new SettingsRepository();
    const [
      portraitRow,
      faviconRow,
      identityRow,
      languageRow,
      availabilityRow,
      searchIndexingRow,
      heroHeadlineRow,
      heroHeadlineBnRow,
      heroDescriptionRow,
      heroDescriptionBnRow,
      knowMeHeadlineRow,
      knowMeHeadlineBnRow,
      knowMeSubRow,
      knowMeSubBnRow,
      designationsRow,
      designationsBnRow,
      siteCopyRow,
      siteCopyBnRow,
      siteUrlRow,
      heroChipsRow,
      founderSummaryRow,
      founderSummaryBnRow,
      siteTitleRow,
      siteDescriptionRow,
    ] = await Promise.all([
      repo.findByKey(HERO_PORTRAIT_KEY),
      repo.findByKey(FAVICON_KEY),
      repo.findByKey(PRIMARY_IDENTITY_KEY),
      repo.findByKey(DEFAULT_LANGUAGE_KEY),
      repo.findByKey(AVAILABILITY_KEY),
      repo.findByKey(SEARCH_INDEXING_KEY),
      repo.findByKey(SITE_COPY_KEYS.heroHeadline),
      repo.findByKey(SITE_COPY_KEYS.heroHeadlineBn),
      repo.findByKey(SITE_COPY_KEYS.heroDescription),
      repo.findByKey(SITE_COPY_KEYS.heroDescriptionBn),
      repo.findByKey(SITE_COPY_KEYS.knowMeHeadline),
      repo.findByKey(SITE_COPY_KEYS.knowMeHeadlineBn),
      repo.findByKey(SITE_COPY_KEYS.knowMeSub),
      repo.findByKey(SITE_COPY_KEYS.knowMeSubBn),
      repo.findByKey(DESIGNATIONS_KEY),
      repo.findByKey(DESIGNATIONS_BN_KEY),
      repo.findByKey(SITE_COPY_KEY),
      repo.findByKey(SITE_COPY_BN_KEY),
      repo.findByKey(SITE_URL_KEY),
      repo.findByKey(HERO_CHIPS_KEY),
      repo.findByKey(FOUNDER_SUMMARY_KEY),
      repo.findByKey(FOUNDER_SUMMARY_BN_KEY),
      repo.findByKey(SITE_TITLE_KEY),
      repo.findByKey(SITE_DESCRIPTION_KEY),
    ]);
    const statsEntries = await statsRow(getDb());
    // English stats: the valid row items, in row order. Bangla labels:
    // positional over ALL row items (null = no Bangla yet for that
    // slot), present only when at least one label is set — the same
    // rule statsLabelsBn used before the two were read together.
    const validStats = statsEntries?.filter(
      (
        e,
      ): e is { value: string; label: string; labelBn: string | null } =>
        e !== null,
    );
    const stats =
      validStats && validStats.length > 0
        ? validStats.map(({ value, label }) => ({ value, label }))
        : undefined;
    const statsBn =
      statsEntries && statsEntries.some((e) => e?.labelBn !== null)
        ? statsEntries.map((e) => e?.labelBn ?? null)
        : undefined;
    const heroChips = asStringList(heroChipsRow?.value);
    const profile = await publicProfile(getDb());
    // Founder summary: the settings keys win; the homepage_sections
    // "founder" row is the fallback for summaries written before the
    // keys existed (see founderRow).
    const founder = await founderRow(getDb());
    const founderSummary =
      asNonEmptyString(founderSummaryRow?.value) ?? founder.summary;
    const founderSummaryBn =
      asNonEmptyString(founderSummaryBnRow?.value) ?? founder.summaryBn;
    const siteTitle = asNonEmptyString(siteTitleRow?.value);
    const siteDescription = asNonEmptyString(siteDescriptionRow?.value);
    const designations = asDesignationList(designationsRow?.value);
    const designationsBn = overlayDesignationsBn(
      designations,
      designationsBnRow?.value,
    );
    const bn: PublicSettingsBn = {
      heroHeadline: asNonEmptyString(heroHeadlineBnRow?.value),
      heroDescription: asNonEmptyString(heroDescriptionBnRow?.value),
      knowMeHeadline: asNonEmptyString(knowMeHeadlineBnRow?.value),
      knowMeSub: asNonEmptyString(knowMeSubBnRow?.value),
      ...(founderSummaryBn ? { founderSummary: founderSummaryBn } : {}),
      ...(statsBn ? { statsLabels: statsBn } : {}),
      ...(designationsBn ? { designations: designationsBn } : {}),
    };
    const hasBn = Object.values(bn).some((v) => v !== undefined);
    const siteCopy = asStringRecord(siteCopyRow?.value);
    const siteCopyBn = asStringRecord(siteCopyBnRow?.value);
    const siteUrl = asNonEmptyString(siteUrlRow?.value);
    return {
      portraitUrl: portraitRow
        ? normalizeHeroPortraitUrl(portraitRow.value)
        : null,
      faviconUrl: faviconRow
        ? normalizeFaviconUrl(faviconRow.value)
        : null,
      primaryIdentity: identityRow
        ? normalizeSitePrimaryIdentity(identityRow.value)
        : SITE_PRIMARY_IDENTITY_DEFAULT,
      defaultLanguage: languageRow
        ? normalizeDefaultLanguage(languageRow.value)
        : DEFAULT_LANGUAGE_DEFAULT,
      availability: availabilityRow
        ? normalizeAvailability(availabilityRow.value)
        : { ...AVAILABILITY_DEFAULT },
      searchIndexingEnabled: searchIndexingRow
        ? normalizeSearchIndexing(searchIndexingRow.value)
        : SEARCH_INDEXING_DEFAULT,
      heroHeadline: asNonEmptyString(heroHeadlineRow?.value),
      heroDescription: asNonEmptyString(heroDescriptionRow?.value),
      knowMeHeadline: asNonEmptyString(knowMeHeadlineRow?.value),
      knowMeSub: asNonEmptyString(knowMeSubRow?.value),
      ...(founderSummary ? { founderSummary } : {}),
      ...(siteTitle ? { siteTitle } : {}),
      ...(siteDescription ? { siteDescription } : {}),
      ...(profile.name ? { name: profile.name } : {}),
      ...(profile.email ? { email: profile.email } : {}),
      ...(profile.location ? { location: profile.location } : {}),
      designations,
      ...(siteCopy ? { siteCopy } : {}),
      ...(siteCopyBn ? { siteCopyBn } : {}),
      ...(siteUrl ? { siteUrl } : {}),
      ...(stats ? { stats } : {}),
      ...(heroChips ? { heroChips } : {}),
      bn: hasBn ? bn : undefined,
    };
  } catch {
    return fallback;
  }
}
