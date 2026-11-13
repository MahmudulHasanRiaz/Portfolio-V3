"use server";

import type {
  CategoryData,
  ContentTypeName,
  FAQData,
  TagData,
  TimelineEventData,
} from "@repo/cms";
import { SearchIndexerService } from "@repo/database";
import { purgePublicCache, type PaginatedResponse } from "@repo/shared";
import { dispatchTrigger } from "@repo/workflows";
import { getServerSession } from "@/lib/get-server-session";
import { HonoApiError, honoFetch } from "@/lib/hono-client";

// Content admin server actions.
//
// Hono cutover: content CRUD (list / get / create / update / delete /
// transition) and category + tag CRUD now go to the Hono worker
// (GET/POST/PUT/DELETE /api/admin/content/*) via the typed fetch
// wrapper in @/lib/hono-client. Hono's content router documents the
// same response shapes (list { items, pagination }, get/create/update/
// transition the bare row, delete { ok: true }), so the return shapes
// callers depend on are unchanged.
//
// What stays local, and why:
//  - `dispatchTrigger(..., "content_published", ...)` on publish —
//    Hono does not wire workflow triggers yet (its TODO), so the admin
//    keeps dispatching it after a create/update/transition lands on
//    status "published", exactly as before.
//  - Search indexing (index on publish, de-index when a published row
//    leaves published / is archived) and `purgePublicCache` — both live
//    inside ContentService today and are likewise not wired in Hono
//    yet, so the admin keeps doing them here, best-effort, mirroring
//    packages/cms/src/content-service.ts (the maps below are copied
//    from there; it stays the source of truth).
//  - FAQ, timeline events and the content taxonomy (set/get categories
//    and tags per content item) now go to the Hono worker too
//    (GET/POST/PUT/DELETE /api/admin/faqs, /api/admin/timeline-events
//    and /api/admin/content-taxonomy/*) — Hono's routers mirror the
//    @repo/cms services' behaviour, so the return shapes callers
//    depend on are unchanged.

const searchIndexer = new SearchIndexerService();

/** Search entity type per content type (packages/cms/src/content-service.ts). */
const ENTITY_TYPE_MAP: Record<string, string> = {
  pages: "page",
  posts: "post",
  services: "service",
  projects: "project",
  case_studies: "case_study",
};

/** Public-site cache tags per content type (packages/cms/src/content-service.ts). */
const PUBLIC_CACHE_TAGS: Record<string, string> = {
  projects: "projects",
  posts: "posts",
  case_studies: "case-studies",
};

function getSearchEntityType(typeName: string): string {
  return ENTITY_TYPE_MAP[typeName] ?? typeName;
}

function cacheTagsFor(typeName: string): string[] {
  const tag = PUBLIC_CACHE_TAGS[typeName];
  return tag ? [tag, "home"] : ["home"];
}

function getUserId(session: Awaited<ReturnType<typeof getServerSession>>): string {
  if (!session?.user?.id) throw new Error("Authentication required");
  return session.user.id;
}

type ContentRow = Record<string, unknown>;

function rowStatus(row: ContentRow | null): string | null {
  const status = row?.status;
  return typeof status === "string" ? status : null;
}

export async function listContent(type: ContentTypeName, params: {
  page?: number; pageSize?: number; search?: string; status?: string;
  sortField?: string; sortDir?: "asc" | "desc";
}): Promise<PaginatedResponse<ContentRow>> {
  const session = await getServerSession();
  getUserId(session);
  return honoFetch<PaginatedResponse<ContentRow>>(
    `/api/admin/content/${type}`,
    {
      query: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        status: params.status,
        sortField: params.sortField,
        sortDir: params.sortDir,
      },
    },
  );
}

export async function getContentById(type: ContentTypeName, id: string): Promise<ContentRow | null> {
  const session = await getServerSession();
  getUserId(session);
  try {
    return await honoFetch<ContentRow>(`/api/admin/content/${type}/${id}`);
  } catch (err) {
    if (err instanceof HonoApiError && err.status === 404) return null;
    throw err;
  }
}

export async function createContent(type: ContentTypeName, data: Record<string, unknown>): Promise<ContentRow> {
  const session = await getServerSession();
  const userId = getUserId(session);
  const result = await honoFetch<ContentRow>(`/api/admin/content/${type}`, {
    method: "POST",
    json: data,
  });
  // Cross-cutting side effects (see the header note): purge always,
  // index + workflow trigger when the row lands published.
  void purgePublicCache(cacheTagsFor(type));
  if (rowStatus(result) === "published") {
    searchIndexer.indexEntity(getSearchEntityType(type), result.id as string).catch(() => {});
    await dispatchTrigger(process.env.DATABASE_URL!, "content_published", result.id as string, { ...result, contentType: type, triggeredBy: userId });
  }
  return result;
}

export async function updateContent(type: ContentTypeName, id: string, data: Record<string, unknown>): Promise<ContentRow> {
  const session = await getServerSession();
  const userId = getUserId(session);
  const existing = await getContentById(type, id);
  if (!existing) throw new Error(`Content not found: ${id}`);
  const wasPublished = rowStatus(existing) === "published";
  const result = await honoFetch<ContentRow>(`/api/admin/content/${type}/${id}`, {
    method: "PUT",
    json: data,
  });
  void purgePublicCache(cacheTagsFor(type));
  if (rowStatus(result) === "published") {
    searchIndexer.indexEntity(getSearchEntityType(type), id).catch(() => {});
    await dispatchTrigger(process.env.DATABASE_URL!, "content_published", id, { ...result, contentType: type, triggeredBy: userId });
  } else if (wasPublished) {
    searchIndexer.deleteEntity(getSearchEntityType(type), id).catch(() => {});
  }
  return result;
}

export async function deleteContent(type: ContentTypeName, id: string): Promise<void> {
  const session = await getServerSession();
  getUserId(session);
  const existing = await getContentById(type, id);
  if (!existing) throw new Error(`Content not found: ${id}`);
  const wasPublished = rowStatus(existing) === "published";
  await honoFetch<{ ok: boolean }>(`/api/admin/content/${type}/${id}`, {
    method: "DELETE",
  });
  void purgePublicCache(cacheTagsFor(type));
  if (wasPublished) {
    searchIndexer.deleteEntity(getSearchEntityType(type), id).catch(() => {});
  }
}

export async function transitionContent(type: ContentTypeName, id: string, action: string): Promise<ContentRow> {
  const session = await getServerSession();
  const userId = getUserId(session);
  const existing = await getContentById(type, id);
  if (!existing) throw new Error(`Content not found: ${id}`);
  const wasPublished = rowStatus(existing) === "published";
  const result = await honoFetch<ContentRow>(`/api/admin/content/${type}/${id}/transition`, {
    method: "POST",
    json: { action },
  });
  void purgePublicCache(cacheTagsFor(type));
  if (rowStatus(result) === "published") {
    searchIndexer.indexEntity(getSearchEntityType(type), id).catch(() => {});
    await dispatchTrigger(process.env.DATABASE_URL!, "content_published", id, { ...result, contentType: type, action, triggeredBy: userId });
  } else if (wasPublished) {
    searchIndexer.deleteEntity(getSearchEntityType(type), id).catch(() => {});
  }
  return result;
}

export async function listCategories(type?: string): Promise<CategoryData[]> {
  const session = await getServerSession();
  getUserId(session);
  return honoFetch<CategoryData[]>("/api/admin/content/categories", {
    query: type ? { type } : undefined,
  });
}

export async function createCategory(data: { name: string; slug?: string; description?: string; type?: string }): Promise<CategoryData> {
  const session = await getServerSession();
  getUserId(session);
  return honoFetch<CategoryData>("/api/admin/content/categories", {
    method: "POST",
    json: data,
  });
}

export async function updateCategory(id: string, data: { name?: string; slug?: string; description?: string; type?: string }): Promise<CategoryData> {
  const session = await getServerSession();
  getUserId(session);
  return honoFetch<CategoryData>(`/api/admin/content/categories/${id}`, {
    method: "PUT",
    json: data,
  });
}

export async function deleteCategory(id: string): Promise<void> {
  const session = await getServerSession();
  getUserId(session);
  await honoFetch<{ ok: boolean }>(`/api/admin/content/categories/${id}`, {
    method: "DELETE",
  });
}

export async function listTags(): Promise<TagData[]> {
  const session = await getServerSession();
  getUserId(session);
  return honoFetch<TagData[]>("/api/admin/content/tags");
}

export async function createTag(data: { name: string; slug?: string }): Promise<TagData> {
  const session = await getServerSession();
  getUserId(session);
  return honoFetch<TagData>("/api/admin/content/tags", {
    method: "POST",
    json: data,
  });
}

export async function updateTag(id: string, data: { name?: string; slug?: string }): Promise<TagData> {
  const session = await getServerSession();
  getUserId(session);
  return honoFetch<TagData>(`/api/admin/content/tags/${id}`, {
    method: "PUT",
    json: data,
  });
}

export async function deleteTag(id: string): Promise<void> {
  const session = await getServerSession();
  getUserId(session);
  await honoFetch<{ ok: boolean }>(`/api/admin/content/tags/${id}`, {
    method: "DELETE",
  });
}

// ─── Content taxonomy, FAQs, timeline events ─────────────────────────────────
// Hono endpoints (see the header note) — the @repo/cms services are no
// longer called here; Hono's faqs / timeline-events / content-taxonomy
// routers mirror them.

export async function setContentCategories(contentType: ContentTypeName, contentId: string, categoryIds: string[]): Promise<void> {
  const session = await getServerSession();
  getUserId(session);
  await honoFetch<{ ok: boolean }>(
    `/api/admin/content-taxonomy/${contentType}/${contentId}/categories`,
    { method: "POST", json: { categoryIds } },
  );
}

export async function getContentCategories(contentType: ContentTypeName, contentId: string): Promise<CategoryData[]> {
  const session = await getServerSession();
  getUserId(session);
  return honoFetch<CategoryData[]>(
    `/api/admin/content-taxonomy/${contentType}/${contentId}/categories`,
  );
}

export async function setContentTags(contentType: ContentTypeName, contentId: string, tagIds: string[]): Promise<void> {
  const session = await getServerSession();
  getUserId(session);
  await honoFetch<{ ok: boolean }>(
    `/api/admin/content-taxonomy/${contentType}/${contentId}/tags`,
    { method: "POST", json: { tagIds } },
  );
}

export async function getContentTags(contentType: ContentTypeName, contentId: string): Promise<TagData[]> {
  const session = await getServerSession();
  getUserId(session);
  return honoFetch<TagData[]>(
    `/api/admin/content-taxonomy/${contentType}/${contentId}/tags`,
  );
}

export async function listFAQs(entityType?: string, entityId?: string): Promise<FAQData[]> {
  const session = await getServerSession();
  getUserId(session);
  return honoFetch<FAQData[]>("/api/admin/faqs", {
    query: { entityType, entityId },
  });
}

export async function createFAQ(data: {
  question: string; answer?: string; sortOrder?: number;
  entityType?: string; entityId?: string;
}): Promise<FAQData> {
  const session = await getServerSession();
  getUserId(session);
  return honoFetch<FAQData>("/api/admin/faqs", {
    method: "POST",
    json: data,
  });
}

export async function updateFAQ(id: string, data: {
  question?: string; answer?: string; sortOrder?: number;
}): Promise<FAQData> {
  const session = await getServerSession();
  getUserId(session);
  return honoFetch<FAQData>(`/api/admin/faqs/${id}`, {
    method: "PUT",
    json: data,
  });
}

export async function deleteFAQ(id: string): Promise<void> {
  const session = await getServerSession();
  getUserId(session);
  await honoFetch<{ ok: boolean }>(`/api/admin/faqs/${id}`, {
    method: "DELETE",
  });
}

export async function listTimelineEvents(params?: {
  sourceType?: string; sourceId?: string; eventType?: string;
  page?: number; pageSize?: number;
}): Promise<PaginatedResponse<TimelineEventData>> {
  const session = await getServerSession();
  getUserId(session);
  return honoFetch<PaginatedResponse<TimelineEventData>>(
    "/api/admin/timeline-events",
    { query: params },
  );
}

export async function createTimelineEvent(data: {
  sourceType?: string; sourceId?: string; eventType?: string;
  title: string; description?: string; eventDate: string;
  icon?: string; url?: string; sortOrder?: number;
}): Promise<TimelineEventData> {
  const session = await getServerSession();
  getUserId(session);
  return honoFetch<TimelineEventData>("/api/admin/timeline-events", {
    method: "POST",
    json: data,
  });
}

export async function updateTimelineEvent(id: string, data: {
  sourceType?: string; sourceId?: string; eventType?: string;
  title?: string; description?: string; eventDate?: string;
  icon?: string; url?: string; sortOrder?: number;
}): Promise<TimelineEventData> {
  const session = await getServerSession();
  getUserId(session);
  return honoFetch<TimelineEventData>(`/api/admin/timeline-events/${id}`, {
    method: "PUT",
    json: data,
  });
}

export async function deleteTimelineEvent(id: string): Promise<void> {
  const session = await getServerSession();
  getUserId(session);
  await honoFetch<{ ok: boolean }>(`/api/admin/timeline-events/${id}`, {
    method: "DELETE",
  });
}
