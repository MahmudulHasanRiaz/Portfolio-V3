// Main search + SEO validation — Hono port of
// apps/admin/src/app/api/search/route.ts (GET) and
// apps/admin/src/app/api/seo/validate/route.ts (GET).
//
// Mounted at /api/admin (see routes/admin/index.ts) so these become
// /api/admin/search and /api/admin/seo/validate.
//
// Workers-safety verdict: the search repositories are NOT Workers-safe
// as imported — SearchIndexRepository / SearchAnalyticsRepository extend
// BaseRepository, whose `db` getter calls getDb() from @repo/database
// (postgres.js, TCP). The FTS query itself is plain Drizzle + raw
// `tsquery`/`ts_rank`/`ts_headline` SQL, so it is re-implemented here
// with direct Drizzle over getApiDb() (Neon HTTP), logic verbatim from
// packages/database/src/repository/search.ts and
// search-analytics.ts (logQuery only). The `trackQuery` timing helper
// is internal observability and is not ported.
// generateValidationReport is pure (no DB) and is copied verbatim from
// packages/seo/src/validation.ts — the @repo/seo barrel is not imported
// because it also exports sitemap.ts, which calls getDb().
//
// Fidelity notes:
// - GET /search is PUBLIC by design (no auth; middleware-public
//   /api/search in the original). Every query is logged to
//   search_analytics fire-and-forget, exactly as in the original
//   (a logging failure is console.error'd, never fails the search).
// - GET /seo/validate requires a session (requireAuth → 401).
//   SeoMetaRepository.findAll / SlugRedirectsRepository.findAll use
//   BaseRepository.findAll's defaults (page 1, pageSize 50), so the
//   report covers only the first 50 meta rows and first 50 redirects
//   — preserved as-is, not "fixed" here.
// - The dead routes /api/search/analytics, /api/search/rebuild,
//   /api/search/synonyms, /api/search/synonyms/[id] and /api/seo/meta,
//   /api/seo/meta/[id], /api/seo/redirects, /api/seo/redirects/[id]
//   are NOT ported: they gate on session.user.role, which is never
//   populated (ba_user has no role column), so they always 403 today.
import { Hono } from "hono";
import { and, count, desc, eq, like, or, sql } from "drizzle-orm";
import {
  searchAnalytics,
  searchIndex,
  searchSynonyms,
  seoMeta,
  slugRedirects,
} from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
  };
};

type Db = ReturnType<typeof getApiDb>;

const app = new Hono<Env>();

// ─── Search FTS (packages/database/src/repository/search.ts) ────────────────
// search_index has a `search_vector` tsvector column in the DB that is
// NOT in the Drizzle schema (maintained by migration/trigger), so it is
// referenced via a raw sql fragment exactly as the repository does.

interface SearchResult {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  content: string;
  summary: string;
  url: string;
  thumbnail: string;
  publishedAt: Date | null;
  contentType: string | null;
  locale: string | null;
  rank: number;
  headline: string;
}

async function searchFTS(
  db: Db,
  params: {
    query: string;
    entityType?: string;
    locale?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<{ results: SearchResult[]; total: number }> {
  const { query, entityType, locale, page = 1, pageSize = 20 } = params;

  if (!query || query.trim().length === 0) {
    return { results: [], total: 0 };
  }

  const sanitizedQuery = query.trim().slice(0, 200);
  const terms = sanitizedQuery.split(/\s+/).filter(Boolean);

  const synonymRows = await db
    .select()
    .from(searchSynonyms)
    .where(
      and(
        sql`${searchSynonyms.isEnabled} = true`,
        or(...terms.map((t) => like(searchSynonyms.term, `%${t}%`))),
      ),
    )
    .limit(10);

  let tsquery: ReturnType<typeof sql>;
  const synonymTerms = synonymRows
    .flatMap((s) => [s.term, ...(s.synonyms || [])])
    .filter((t): t is string => !!t);

  const allTerms = [...new Set([...terms, ...synonymTerms])];

  if (allTerms.length === 1) {
    tsquery = sql`plainto_tsquery('english', ${sanitizedQuery})`;
  } else {
    const queryStr = allTerms
      .map((t) => t.replace(/[^\w\s-]/g, ""))
      .filter(Boolean)
      .join(" | ");
    tsquery = sql`to_tsquery('english', ${queryStr})`;
  }

  const searchVector = sql`search_vector`;

  const conditions = [sql`${searchVector} @@ ${tsquery}`];

  if (entityType) {
    conditions.push(eq(searchIndex.entityType, entityType));
  }
  if (locale) {
    conditions.push(eq(searchIndex.locale, locale));
  }

  const whereClause = and(...conditions);

  const countResult = await db
    .select({ count: count() })
    .from(searchIndex)
    .where(whereClause);
  const total = Number(countResult[0]?.count ?? 0);

  if (total === 0) {
    return { results: [], total: 0 };
  }

  const offset = (page - 1) * pageSize;
  const rows = await db
    .select({
      id: searchIndex.id,
      entityType: searchIndex.entityType,
      entityId: searchIndex.entityId,
      title: searchIndex.title,
      content: searchIndex.content,
      summary: searchIndex.summary,
      url: searchIndex.url,
      thumbnail: searchIndex.thumbnail,
      publishedAt: searchIndex.publishedAt,
      contentType: searchIndex.contentType,
      locale: searchIndex.locale,
      rank: sql<number>`ts_rank(${searchVector}, ${tsquery})`,
      headline: sql<string>`ts_headline('english', coalesce(${searchIndex.content}, ''), ${tsquery}, 'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20')`,
    })
    .from(searchIndex)
    .where(whereClause)
    .orderBy(desc(sql`ts_rank(${searchVector}, ${tsquery})`))
    .limit(pageSize)
    .offset(offset);

  const results: SearchResult[] = rows.map((row) => ({
    id: row.id,
    entityType: row.entityType ?? "",
    entityId: row.entityId ?? "",
    title: row.title ?? "",
    content: row.content ?? "",
    summary: row.summary ?? "",
    url: row.url ?? "",
    thumbnail: row.thumbnail ?? "",
    publishedAt: row.publishedAt ?? null,
    contentType: row.contentType ?? null,
    locale: row.locale ?? null,
    rank: row.rank ?? 0,
    headline: row.headline ?? "",
  }));

  return { results, total };
}

// SearchAnalyticsRepository.logQuery (packages/database/src/repository/search-analytics.ts)
async function logSearchQuery(
  db: Db,
  query: string,
  entityType?: string,
  resultCount?: number,
): Promise<void> {
  if (!query || query.trim().length === 0) return;
  await db.insert(searchAnalytics).values({
    query: query.trim().slice(0, 500),
    entityType: entityType || null,
    resultCount: resultCount ?? 0,
  });
}

// ─── SEO validation report (packages/seo/src/validation.ts, verbatim) ───────

interface ValidationIssue {
  entityType: string | null;
  entityId: string | null;
  field: string;
  severity: "warning" | "error";
  message: string;
}

interface ValidationReport {
  total: number;
  warnings: number;
  errors: number;
  issues: ValidationIssue[];
}

function validateEntitySeo(
  entityType: string | null,
  entityId: string | null,
  meta: {
    metaTitle?: string | null;
    metaDescription?: string | null;
    ogImage?: string | null;
    canonicalUrl?: string | null;
    keywords?: string | null;
  },
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!meta.metaTitle || meta.metaTitle.trim().length === 0) {
    issues.push({
      entityType,
      entityId,
      field: "metaTitle",
      severity: "error",
      message: "Missing meta title — search results will show untitled",
    });
  } else if (meta.metaTitle.length > 60) {
    issues.push({
      entityType,
      entityId,
      field: "metaTitle",
      severity: "warning",
      message: `Meta title is ${meta.metaTitle.length} characters (recommended: ≤60)`,
    });
  }

  if (!meta.metaDescription || meta.metaDescription.trim().length === 0) {
    issues.push({
      entityType,
      entityId,
      field: "metaDescription",
      severity: "error",
      message: "Missing meta description — search snippets will be auto-generated",
    });
  } else if (meta.metaDescription.length > 160) {
    issues.push({
      entityType,
      entityId,
      field: "metaDescription",
      severity: "warning",
      message: `Meta description is ${meta.metaDescription.length} characters (recommended: ≤160)`,
    });
  }

  if (!meta.ogImage || meta.ogImage.trim().length === 0) {
    issues.push({
      entityType,
      entityId,
      field: "ogImage",
      severity: "warning",
      message: "Missing Open Graph image — social shares will lack preview",
    });
  }

  if (!meta.canonicalUrl || meta.canonicalUrl.trim().length === 0) {
    issues.push({
      entityType,
      entityId,
      field: "canonicalUrl",
      severity: "warning",
      message: "Missing canonical URL — duplicate content risk",
    });
  }

  return issues;
}

function validateRedirects(
  redirects: Array<{
    id: string;
    sourceSlug: string | null;
    destinationUrl: string | null;
    isActive: boolean | null;
  }>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const sourceMap = new Map<string | null, string | null>();

  const seen = new Map<string | null, string[]>();
  for (const r of redirects) {
    if (!r.isActive) continue;
    const existing = seen.get(r.sourceSlug) || [];
    existing.push(r.id);
    seen.set(r.sourceSlug, existing);
  }

  for (const [source, ids] of seen) {
    if (ids.length > 1) {
      issues.push({
        entityType: "redirect",
        entityId: ids.join(","),
        field: "sourceSlug",
        severity: "error",
        message: `Duplicate redirect source: "${source}" has ${ids.length} active redirects`,
      });
    }
  }

  for (const r of redirects) {
    if (!r.isActive) continue;
    sourceMap.set(r.sourceSlug, r.destinationUrl);
  }

  for (const r of redirects) {
    if (!r.isActive) continue;
    let current = r.destinationUrl;
    const visited = new Set<string | null>();
    visited.add(r.sourceSlug);

    while (current) {
      // String(current) preserves the original's implicit coercion:
      // new URL(null, base) parses "null" as the path.
      const parsed = new URL(String(current), "http://localhost");
      const sourceKey = parsed.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
      if (visited.has(sourceKey)) {
        issues.push({
          entityType: "redirect",
          entityId: r.id,
          field: "destinationUrl",
          severity: "error",
          message: `Circular redirect detected: "${r.sourceSlug}" → "${r.destinationUrl}" creates a loop`,
        });
        break;
      }
      if (sourceMap.has(sourceKey)) {
        visited.add(sourceKey);
        current = sourceMap.get(sourceKey)!;
      } else {
        break;
      }
    }
  }

  return issues;
}

function generateValidationReport(
  entities: Array<{
    entityType: string | null;
    entityId: string | null;
    meta: {
      metaTitle?: string | null;
      metaDescription?: string | null;
      ogImage?: string | null;
      canonicalUrl?: string | null;
      keywords?: string | null;
    };
  }>,
  redirects?: Array<{
    id: string;
    sourceSlug: string | null;
    destinationUrl: string | null;
    isActive: boolean | null;
  }>,
): ValidationReport {
  const issues: ValidationIssue[] = [];

  for (const entity of entities) {
    issues.push(...validateEntitySeo(entity.entityType, entity.entityId, entity.meta));
  }

  if (redirects) {
    issues.push(...validateRedirects(redirects));
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;

  return {
    total: issues.length,
    warnings,
    errors,
    issues,
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /search — PUBLIC by design (no auth). Query params: q (required),
// type?, locale?, page? (default 1), pageSize? (default 20, max 100).
// Returns { results, total, page, pageSize, totalPages }.
app.get("/search", async (c) => {
  try {
    const query = c.req.query("q")?.trim() || "";
    const entityType = c.req.query("type") || undefined;
    const locale = c.req.query("locale") || undefined;
    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(c.req.query("pageSize") || "20", 10)),
    );

    if (!query) {
      return c.json({ results: [], total: 0 });
    }

    if (query.length > 200) {
      return c.json(
        { error: "Query too long. Maximum 200 characters." },
        400,
      );
    }

    const db = getApiDb();
    const result = await searchFTS(db, {
      query,
      entityType,
      locale,
      page,
      pageSize,
    });

    // Fire-and-forget analytics logging, exactly as in the original:
    // a logging failure must never fail the search.
    logSearchQuery(db, query, entityType, result.total).catch((err) => {
      console.error("[Search Analytics] Failed to log query:", err);
    });

    return c.json({
      results: result.results,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    });
  } catch (err) {
    console.error("[Search API] Error:", err);
    return c.json({ error: "Search failed. Please try again." }, 500);
  }
});

// GET /seo/validate — requires a session. Returns the validation report
// { total, warnings, errors, issues } over the first 50 seo_meta rows
// and first 50 slug_redirects rows (BaseRepository.findAll defaults).
app.get("/seo/validate", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const db = getApiDb();
    const allMeta = await db.select().from(seoMeta).limit(50).offset(0);
    const allRedirects = await db
      .select()
      .from(slugRedirects)
      .limit(50)
      .offset(0);

    const entities = allMeta.map((m) => ({
      entityType: m.entityType,
      entityId: m.entityId,
      meta: {
        metaTitle: m.metaTitle,
        metaDescription: m.metaDescription,
        ogImage: m.ogImage,
        canonicalUrl: m.canonicalUrl,
        keywords: m.keywords,
      },
    }));

    const redirects = allRedirects.map((r) => ({
      id: r.id,
      sourceSlug: r.sourceSlug,
      destinationUrl: r.destinationUrl,
      isActive: r.isActive,
    }));

    const report = generateValidationReport(entities, redirects);

    return c.json(report);
  } catch (err) {
    console.error("[SEO Validation API] Error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Validation failed." },
      500,
    );
  }
});

// ─── Synonyms CRUD ─────────────────────────────────────────────────────────
// Hono port of apps/admin/src/actions/search.ts (listSynonyms /
// createSynonym / updateSynonym / deleteSynonym), the server actions
// the admin's Search Management page uses. These are NOT the dead
// /api/search/synonyms API routes (which gate on session.user.role and
// always 403) — those stay unported. These endpoints require a valid
// session (requireAuth → 401), exactly like the actions did.
//
// Fidelity notes:
// - GET returns the full rows, ordered by term — exactly what the
//   action returned (the page casts them to { id, term, synonyms,
//   isEnabled }).
// - POST returns the created row (201); PATCH returns the updated
//   row (404 when the id does not exist — the action returned
//   undefined there, but the page only ever updates rows it listed,
//   and a 404 surfaces the same "not found" as the other routers);
//   DELETE returns { ok: true } (the action returned void).

// GET /search/synonyms — list all synonyms, ordered by term.
app.get("/search/synonyms", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const rows = await db
      .select()
      .from(searchSynonyms)
      .orderBy(searchSynonyms.term);
    return c.json(rows);
  } catch (err) {
    console.error("[Search Synonyms API] Error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to list synonyms." },
      500,
    );
  }
});

// POST /search/synonyms — create a synonym.
app.post("/search/synonyms", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = (await c.req.json().catch(() => null)) as {
      term?: unknown;
      synonyms?: unknown;
    } | null;
    if (typeof body?.term !== "string" || body.term.trim() === "") {
      return c.json({ error: "term is required" }, 400);
    }
    const synonyms = Array.isArray(body.synonyms)
      ? body.synonyms.filter((s): s is string => typeof s === "string")
      : [];
    const db = getApiDb();
    const [row] = await db
      .insert(searchSynonyms)
      .values({ term: body.term, synonyms })
      .returning();
    if (!row) return c.json({ error: "Failed to create synonym" }, 500);
    return c.json(row, 201);
  } catch (err) {
    console.error("[Search Synonyms API] Error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to create synonym." },
      500,
    );
  }
});

// PATCH /search/synonyms/:id — update a synonym.
app.patch("/search/synonyms/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = (await c.req.json().catch(() => null)) as {
      term?: unknown;
      synonyms?: unknown;
      isEnabled?: unknown;
    } | null;
    const patch: Record<string, unknown> = {};
    if (body?.term !== undefined) {
      if (typeof body.term !== "string" || body.term.trim() === "") {
        return c.json({ error: "term must be a non-empty string" }, 400);
      }
      patch.term = body.term;
    }
    if (body?.synonyms !== undefined) {
      if (!Array.isArray(body.synonyms)) {
        return c.json({ error: "synonyms must be an array" }, 400);
      }
      patch.synonyms = body.synonyms.filter(
        (s): s is string => typeof s === "string",
      );
    }
    if (body?.isEnabled !== undefined) {
      if (typeof body.isEnabled !== "boolean") {
        return c.json({ error: "isEnabled must be a boolean" }, 400);
      }
      patch.isEnabled = body.isEnabled;
    }
    const db = getApiDb();
    const [row] = await db
      .update(searchSynonyms)
      .set(patch)
      .where(eq(searchSynonyms.id, c.req.param("id")))
      .returning();
    if (!row) return c.json({ error: "Synonym not found" }, 404);
    return c.json(row);
  } catch (err) {
    console.error("[Search Synonyms API] Error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to update synonym." },
      500,
    );
  }
});

// DELETE /search/synonyms/:id — delete a synonym.
app.delete("/search/synonyms/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    await db
      .delete(searchSynonyms)
      .where(eq(searchSynonyms.id, c.req.param("id")));
    return c.json({ ok: true });
  } catch (err) {
    console.error("[Search Synonyms API] Error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to delete synonym." },
      500,
    );
  }
});

export default app;
