import { getDb } from "@repo/database";
import * as schema from "@repo/database";
import { eq } from "drizzle-orm";

export type SitemapChangeFreq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

export interface SitemapEntry {
  url: string;
  lastModified?: string;
  changeFrequency?: SitemapChangeFreq;
  priority?: number;
}

/**
 * Resolve the public base URL for sitemap links.
 *
 * The stack never sets NEXT_PUBLIC_BASE_URL (docker-compose passes the
 * website URL as NEXT_PUBLIC_URL, from the PUBLIC_URL stack env), so the
 * old single-variable fallback always resolved to http://localhost:3000
 * in production. Chain the variables that actually exist, ignore any
 * localhost value (the compose default when PUBLIC_URL is unset), and
 * fall back to the production host for production builds so the sitemap
 * is correct even with no env set. Local dev keeps localhost:3000.
 */
export function resolveSitemapBaseUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_URL,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const trimmed = candidate.replace(/\/$/, "");
    try {
      const hostname = new URL(trimmed).hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
        continue;
      }
    } catch {
      continue;
    }
    return trimmed;
  }
  return process.env.NODE_ENV === "production"
    ? "https://riaz.com.bd"
    : "http://localhost:3000";
}

const BASE_URL = resolveSitemapBaseUrl();

export async function generateSitemapXml(): Promise<string> {
  const entries = await getAllPublishedEntries();
  return buildSitemapXml(entries);
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const parts = ["  <url>"];
      parts.push(`    <loc>${escapeXml(entry.url)}</loc>`);
      if (entry.lastModified) parts.push(`    <lastmod>${entry.lastModified}</lastmod>`);
      if (entry.changeFrequency) parts.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
      if (entry.priority !== undefined) parts.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
      parts.push("  </url>");
      return parts.join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
  ].join("\n");
}

export function buildSitemapIndex(sitemaps: { url: string; lastModified?: string }[]): string {
  const sitemapTags = sitemaps
    .map((s) => {
      const parts = ["  <sitemap>"];
      parts.push(`    <loc>${escapeXml(s.url)}</loc>`);
      if (s.lastModified) parts.push(`    <lastmod>${s.lastModified}</lastmod>`);
      parts.push("  </sitemap>");
      return parts.join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    sitemapTags,
    "</sitemapindex>",
  ].join("\n");
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(date: Date | null | undefined): string | undefined {
  if (!date) return undefined;
  try {
    return date instanceof Date ? date.toISOString().split("T")[0] : String(date).split("T")[0];
  } catch {
    return undefined;
  }
}

async function getAllPublishedEntries(): Promise<SitemapEntry[]> {
  const db = getDb();
  const entries: SitemapEntry[] = [];

  entries.push(
    { url: `${BASE_URL}`, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/blog`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/services`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/projects`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/faq`, changeFrequency: "monthly", priority: 0.5 },
  );

  await addPublishedEntries(db, entries, schema.pages, "pages", (r) => ({
    url: `${BASE_URL}/${r.slug ?? r.id}`,
    lastModified: formatDate(r.updatedAt ?? r.createdAt),
    changeFrequency: "monthly" as SitemapChangeFreq,
    priority: 0.7,
  }));

  await addPublishedEntries(db, entries, schema.posts, "posts", (r) => ({
    url: `${BASE_URL}/blog/${r.slug ?? r.id}`,
    lastModified: formatDate(r.updatedAt ?? r.publishAt ?? r.createdAt),
    changeFrequency: "weekly" as SitemapChangeFreq,
    priority: 0.6,
  }));

  await addPublishedEntries(db, entries, schema.services, "services", (r) => ({
    url: `${BASE_URL}/services/${r.slug ?? r.id}`,
    lastModified: formatDate(r.updatedAt ?? r.createdAt),
    changeFrequency: "monthly" as SitemapChangeFreq,
    priority: 0.7,
  }));

  await addPublishedEntries(db, entries, schema.projects, "projects", (r) => ({
    url: `${BASE_URL}/projects/${r.slug ?? r.id}`,
    lastModified: formatDate(r.updatedAt ?? r.createdAt),
    changeFrequency: "monthly" as SitemapChangeFreq,
    priority: 0.6,
  }));

  await addPublishedEntries(db, entries, schema.ventures, "ventures", (r) => ({
    url: `${BASE_URL}/ventures/${r.slug ?? r.id}`,
    lastModified: formatDate(r.updatedAt ?? r.createdAt),
    changeFrequency: "monthly" as SitemapChangeFreq,
    priority: 0.5,
  }));

  await addPublishedEntries(db, entries, schema.releases, "releases", (r) => ({
    url: `${BASE_URL}/releases/${r.slug ?? r.id}`,
    lastModified: formatDate(r.updatedAt ?? r.releaseDate ?? r.createdAt),
    changeFrequency: "monthly" as SitemapChangeFreq,
    priority: 0.5,
  }));

  return entries;
}

async function addPublishedEntries<T extends Record<string, any>>(
  db: ReturnType<typeof getDb>,
  entries: SitemapEntry[],
  table: any,
  entityName: string,
  mapper: (row: T) => SitemapEntry,
): Promise<void> {
  try {
    const hasContentStatus = entityName === "ventures" || entityName === "products";
    const statusColumn = hasContentStatus ? (table.contentStatus as any) : (table.status as any);

    const rows = await db
      .select()
      .from(table)
      .where(eq(statusColumn, "published"));

    for (const row of rows) {
      entries.push(mapper(row as T));
    }
  } catch (error) {
    console.error(`[Sitemap] Failed to fetch ${entityName}:`, error);
  }
}

export async function getPublishedCount(): Promise<number> {
  const entries = await getAllPublishedEntries();
  return entries.length;
}
