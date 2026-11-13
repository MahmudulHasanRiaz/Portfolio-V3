// Shared cutover side effects for the Hono admin routes — the Workers-safe
// ports of the three cross-cutting side effects the V2 admin performed
// after successful mutations:
//
// 1. purgePublicCache — POST {PUBLIC_SITE_URL}/api/cache/invalidate with
//    the shared CACHE_INVALIDATE_SECRET (packages/shared/src/public-cache.ts).
//    Best-effort, never throws: a failed or unconfigured purge must NEVER
//    fail an admin save (pages stay cached up to the 1 h TTL).
// 2. SearchIndexerService index/deleteEntity
//    (packages/database/src/services/search-indexer.ts + repository/search.ts):
//    loads the entity row and upserts / deletes its row in `search_index`.
//    Best-effort, never throws.
// 3. dispatchTrigger (packages/workflows/src/index.ts + trigger-registry.ts):
//    finds active workflows for the trigger type and inserts one `pending`
//    row in `workflow_runs` per workflow. Best-effort, never throws
//    (the V2 function caught internally; routes awaited it).
// 4. LeadAttributionService.linkPageViewsToLead
//    (packages/analytics/src/lead-attribution-service.ts): links unattributed
//    page views to a new lead. Best-effort, never throws.
//
// All DB work uses the Neon HTTP Drizzle instance (ApiDb) — never postgres.js.
// Fire-and-forget calls accept the route's waitUntil (house pattern from
// routes/public.ts) so the side effect survives past the response on Workers;
// without it they still run as plain void promises, exactly as in V2.
//
// One deliberate deviation from V2, documented here: the V2 indexer upserted
// with onConflictDoUpdate on (entity_type, entity_id), but the schema only
// defines a PLAIN btree index on those columns (drizzle/0002, no unique
// constraint), so ON CONFLICT cannot work against it. The upsert below is
// delete-then-insert instead, which preserves the intended outcome (exactly
// one search_index row per entity, with fresh data) without depending on a
// unique constraint that does not exist in the migrations.

import { and, asc, eq, isNull } from "drizzle-orm";
import {
  caseStudies,
  pageViews,
  pages,
  posts,
  products,
  projects,
  releases,
  searchIndex,
  services,
  ventures,
  workflowRuns,
  workflows,
} from "@repo/database/schema";
import type { ApiDb } from "../db";

export type SideEffectEnv = Record<string, string | undefined>;

type WaitUntil = (promise: Promise<unknown>) => void;

/** House pattern (routes/public.ts): the route's waitUntil, if any. */
export function waitUntilOf(c: {
  executionCtx?: { waitUntil: (promise: Promise<unknown>) => void };
}): WaitUntil | undefined {
  const w = c.executionCtx?.waitUntil;
  return w ? w.bind(c.executionCtx) : undefined;
}

function readEnv(env: unknown, key: string): string | undefined {
  const rec =
    typeof env === "object" && env !== null
      ? (env as SideEffectEnv)
      : undefined;
  const fromBindings = rec?.[key];
  if (typeof fromBindings === "string" && fromBindings !== "") {
    return fromBindings;
  }
  const fromProcess =
    typeof process !== "undefined" ? process.env[key] : undefined;
  return typeof fromProcess === "string" && fromProcess !== ""
    ? fromProcess
    : undefined;
}

/** Default public Worker origin (task brief); PUBLIC_SITE_URL overrides it. */
export const DEFAULT_PUBLIC_SITE_URL =
  "https://portfolio-v3-public.riaaz.workers.dev";

function publicSiteUrl(env: unknown): string {
  const raw =
    readEnv(env, "PUBLIC_SITE_URL") ??
    readEnv(env, "NEXT_PUBLIC_BASE_URL") ??
    DEFAULT_PUBLIC_SITE_URL;
  return raw.replace(/\/+$/, "");
}

// ─── 1. Public-site cache purge ──────────────────────────────────────────────

const PURGE_TIMEOUT_MS = 5000;

// Warn once per process when the purge is unconfigured, so a missing
// secret is visible in the API log without spamming it on every save.
let warnedMissingConfig = false;

export async function purgePublicCache(
  env: unknown,
  tags: string[],
  waitUntil?: WaitUntil,
): Promise<void> {
  const promise = (async (): Promise<void> => {
    const clean = [
      ...new Set(tags.filter((t) => typeof t === "string" && t.length > 0)),
    ];
    if (clean.length === 0) return;

    const siteUrl = publicSiteUrl(env);
    const secret = readEnv(env, "CACHE_INVALIDATE_SECRET");
    if (!secret) {
      if (!warnedMissingConfig) {
        warnedMissingConfig = true;
        console.warn(
          "[public-cache] PUBLIC_SITE_URL / CACHE_INVALIDATE_SECRET not configured — " +
            "public site cache is NOT purged on admin saves (pages stay cached up to the 1 h TTL).",
        );
      }
      return;
    }

    // Service binding first (2026-11-13): a Worker CANNOT fetch another
    // Worker's `*.workers.dev` URL from inside the Worker (Cloudflare
    // "error code: 1042" — the `workers.dev` hostname does not resolve
    // in the Worker's subrequest context). The plain-HTTPS purge below
    // therefore 1042s in production and the public cache is never
    // purged (edits take up to the 1 h TTL to appear). The PUBLIC_SITE
    // service binding (wrangler.jsonc `services`) calls the public
    // Worker directly with no DNS, so the purge actually lands. The
    // binding routes by service, not hostname, so the Request uses a
    // placeholder origin; only the path + headers + body reach the
    // public worker. Without a binding (local dev) the HTTPS fetch is
    // used — it resolves fine from Node.
    try {
      const binding = (
        env as Record<string, unknown> | null
      )?.PUBLIC_SITE as
        | { fetch?: (req: Request) => Promise<Response> }
        | undefined;
      let res: Response;
      if (binding && typeof binding.fetch === "function") {
        res = await binding.fetch(
          new Request("https://public-site/api/cache/invalidate", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${secret}`,
            },
            body: JSON.stringify({ tags: clean }),
            signal: AbortSignal.timeout(PURGE_TIMEOUT_MS),
          }),
        );
      } else {
        res = await fetch(`${siteUrl}/api/cache/invalidate`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify({ tags: clean }),
          signal: AbortSignal.timeout(PURGE_TIMEOUT_MS),
        });
      }
      if (!res.ok) {
        console.warn(
          `[public-cache] purge failed (${res.status}) for tags ${clean.join(", ")} — ` +
            "pages stay cached up to the 1 h TTL.",
        );
      }
    } catch (err) {
      console.warn(
        `[public-cache] purge request failed for tags ${clean.join(", ")}: ` +
          `${err instanceof Error ? err.message : String(err)} — ` +
          "pages stay cached up to the 1 h TTL.",
      );
    }
  })();
  if (waitUntil) waitUntil(promise);
  return promise;
}

// ─── 2. Search index ─────────────────────────────────────────────────────────

interface SearchIndexData {
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
}

/** V2 PUBLIC_CACHE_TAGS / ENTITY_TYPE_MAP (packages/cms/src/content-service.ts). */
export const CONTENT_SEARCH_ENTITY_TYPE: Record<string, string> = {
  pages: "page",
  posts: "post",
  services: "service",
  projects: "project",
  case_studies: "case_study",
};

export function searchEntityTypeForContentType(typeName: string): string {
  return CONTENT_SEARCH_ENTITY_TYPE[typeName] ?? typeName;
}

export const CONTENT_CACHE_TAGS: Record<string, string> = {
  projects: "projects",
  posts: "posts",
  case_studies: "case-studies",
};

export function cacheTagsForContentType(typeName: string): string[] {
  const tag = CONTENT_CACHE_TAGS[typeName];
  return tag ? [tag, "home"] : ["home"];
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function dateOrNull(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" && value !== "") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Mirrors SearchIndexerService.loadEntity (single-id loaders only). */
async function loadSearchEntity(
  db: ApiDb,
  entityType: string,
  entityId: string,
  baseUrl: string,
): Promise<SearchIndexData | null> {
  switch (entityType) {
    case "page": {
      const [r] = await db
        .select()
        .from(pages)
        .where(eq(pages.id, entityId))
        .limit(1);
      if (!r) return null;
      return {
        entityType: "page",
        entityId: r.id,
        title: str(r.title),
        content: str(r.content),
        summary: "",
        url: `${baseUrl}/${r.slug ?? r.id}`,
        thumbnail: str(r.ogImage),
        publishedAt: r.createdAt ?? null,
        contentType: "page",
        locale: r.locale ?? null,
      };
    }
    case "post": {
      const [r] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, entityId))
        .limit(1);
      if (!r) return null;
      return {
        entityType: "post",
        entityId: r.id,
        title: str(r.title),
        content: str(r.content),
        summary: str(r.excerpt),
        url: `${baseUrl}/blog/${r.slug ?? r.id}`,
        thumbnail: str(r.coverImage),
        publishedAt: r.publishAt ?? null,
        contentType: "post",
        locale: r.locale ?? null,
      };
    }
    case "service": {
      const [r] = await db
        .select()
        .from(services)
        .where(eq(services.id, entityId))
        .limit(1);
      if (!r) return null;
      return {
        entityType: "service",
        entityId: r.id,
        title: str(r.title),
        content: str(r.description),
        summary: str(r.summary),
        url: `${baseUrl}/services/${r.slug ?? r.id}`,
        thumbnail: str(r.ogImage),
        publishedAt: r.createdAt ?? null,
        contentType: "service",
        locale: r.locale ?? null,
      };
    }
    case "project": {
      const [r] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, entityId))
        .limit(1);
      if (!r) return null;
      return {
        entityType: "project",
        entityId: r.id,
        title: str(r.title),
        content: str(r.description),
        summary: str(r.summary),
        url: `${baseUrl}/projects/${r.slug ?? r.id}`,
        thumbnail: str(r.thumbnail),
        publishedAt: r.createdAt ?? null,
        contentType: "project",
        locale: r.locale ?? null,
      };
    }
    case "case_study": {
      const [r] = await db
        .select()
        .from(caseStudies)
        .where(eq(caseStudies.id, entityId))
        .limit(1);
      if (!r) return null;
      const parts = [r.challenge, r.research, r.strategy, r.results].filter(
        Boolean,
      );
      return {
        entityType: "case_study",
        entityId: r.id,
        title: str(r.title),
        content: parts.join("\n\n"),
        summary: "",
        url: `${baseUrl}/case-studies/${r.slug ?? r.id}`,
        thumbnail: str(r.ogImage),
        publishedAt: r.createdAt ?? null,
        contentType: "case_study",
        locale: null,
      };
    }
    case "venture": {
      const [r] = await db
        .select()
        .from(ventures)
        .where(eq(ventures.id, entityId))
        .limit(1);
      if (!r) return null;
      return {
        entityType: "venture",
        entityId: r.id,
        title: str(r.name),
        content: str(r.description),
        summary: str(r.metaDescription),
        url: `${baseUrl}/ventures/${r.slug ?? r.id}`,
        thumbnail: str(r.logo),
        publishedAt: r.createdAt ?? null,
        contentType: "venture",
        locale: null,
      };
    }
    case "product": {
      const [r] = await db
        .select()
        .from(products)
        .where(eq(products.id, entityId))
        .limit(1);
      if (!r) return null;
      let thumbnail = "";
      const media: unknown = r.media;
      if (Array.isArray(media) && media.length > 0) {
        thumbnail = String(media[0]);
      }
      return {
        entityType: "product",
        entityId: r.id,
        title: str(r.name),
        content: str(r.description),
        summary: "",
        url: `${baseUrl}/shop/${r.slug ?? r.id}`,
        thumbnail,
        publishedAt: dateOrNull(r.launchDate),
        contentType: "product",
        locale: null,
      };
    }
    case "release": {
      const [r] = await db
        .select()
        .from(releases)
        .where(eq(releases.id, entityId))
        .limit(1);
      if (!r) return null;
      return {
        entityType: "release",
        entityId: r.id,
        title: str(r.title),
        content: str(r.description),
        summary: "",
        url: `${baseUrl}/releases/${r.slug ?? r.id}`,
        thumbnail: str(r.coverImage),
        publishedAt: dateOrNull(r.releaseDate),
        contentType: "release",
        locale: null,
      };
    }
    default:
      console.warn(`[SearchIndexer] Unknown entity type: ${entityType}`);
      return null;
  }
}

/** Mirrors SearchIndexerService.indexEntity — best-effort, never throws. */
export async function indexSearchEntity(
  db: ApiDb,
  entityType: string,
  entityId: string,
  env?: unknown,
  waitUntil?: WaitUntil,
): Promise<boolean> {
  const promise = (async (): Promise<boolean> => {
    try {
      const data = await loadSearchEntity(
        db,
        entityType,
        entityId,
        publicSiteUrl(env),
      );
      if (!data) return false;
      // Delete-then-insert: see the header note on the missing unique
      // constraint (V2's onConflictDoUpdate cannot work against it).
      await db
        .delete(searchIndex)
        .where(
          and(
            eq(searchIndex.entityType, data.entityType),
            eq(searchIndex.entityId, data.entityId),
          ),
        );
      await db.insert(searchIndex).values({
        entityType: data.entityType,
        entityId: data.entityId,
        title: data.title,
        content: data.content,
        summary: data.summary,
        url: data.url,
        thumbnail: data.thumbnail,
        publishedAt: data.publishedAt,
        contentType: data.contentType,
        locale: data.locale,
      });
      return true;
    } catch (error) {
      console.error(
        `[SearchIndexer] Failed to index ${entityType}/${entityId}:`,
        error,
      );
      return false;
    }
  })();
  if (waitUntil) waitUntil(promise);
  return promise;
}

/** Mirrors SearchIndexerService.deleteEntity — best-effort, never throws. */
export async function deleteSearchEntity(
  db: ApiDb,
  entityType: string,
  entityId: string,
  waitUntil?: WaitUntil,
): Promise<void> {
  const promise = (async (): Promise<void> => {
    try {
      await db
        .delete(searchIndex)
        .where(
          and(
            eq(searchIndex.entityType, entityType),
            eq(searchIndex.entityId, entityId),
          ),
        );
    } catch (error) {
      console.error(
        `[SearchIndexer] Failed to delete ${entityType}/${entityId}:`,
        error,
      );
    }
  })();
  if (waitUntil) waitUntil(promise);
  return promise;
}

// ─── 3. Workflow trigger dispatch ────────────────────────────────────────────

/**
 * Mirrors packages/workflows TriggerRegistry.dispatch + the local port in
 * routes/admin/workflows.ts: one `pending` workflow_runs row per active
 * workflow whose trigger_type matches. Best-effort, never throws.
 */
export async function dispatchTrigger(
  db: ApiDb,
  triggerType: string,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<{ triggered: number; runIds: string[] }> {
  try {
    const workflowList = await db
      .select()
      .from(workflows)
      .where(
        and(
          eq(workflows.triggerType, triggerType),
          eq(workflows.isActive, true),
        ),
      )
      .orderBy(asc(workflows.createdAt));
    const runIds: string[] = [];
    for (const workflow of workflowList) {
      const [run] = await db
        .insert(workflowRuns)
        .values({
          workflowId: workflow.id,
          workflowVersion: workflow.version,
          triggerType,
          triggerEntityId: entityId || null,
          triggerPayload: payload,
          status: "pending",
        })
        .returning();
      if (run) runIds.push(run.id);
    }
    return { triggered: workflowList.length, runIds };
  } catch (err) {
    console.error(`[Workflow] Failed to dispatch ${triggerType}:`, err);
    return { triggered: 0, runIds: [] };
  }
}

// ─── 4. Lead attribution ─────────────────────────────────────────────────────

/**
 * Mirrors LeadAttributionService.linkPageViewsToLead: attribute still
 * unattributed page views from this visitor to the new lead.
 * Best-effort, never throws (the V2 route only logged the failure).
 */
export async function linkPageViewsToLead(
  db: ApiDb,
  visitorId: string,
  leadId: string,
  waitUntil?: WaitUntil,
): Promise<void> {
  const promise = (async (): Promise<void> => {
    try {
      await db
        .update(pageViews)
        .set({ leadId })
        .where(
          and(
            eq(pageViews.visitorId, visitorId),
            isNull(pageViews.leadId),
          ),
        );
    } catch (err) {
      console.error("[Leads API] Failed to link attribution:", err);
    }
  })();
  if (waitUntil) waitUntil(promise);
  return promise;
}
