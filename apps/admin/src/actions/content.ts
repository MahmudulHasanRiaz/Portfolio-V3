"use server";

import { ContentService, CategoryService, TagService, ContentTaxonomyService, FAQService, TimelineEventService } from "@repo/cms";
import type { ContentTypeName } from "@repo/cms";
import { dispatchTrigger } from "@repo/workflows";
import { getServerSession } from "@/lib/get-server-session";

function getUserId(session: Awaited<ReturnType<typeof getServerSession>>): string {
  if (!session?.user?.id) throw new Error("Authentication required");
  return session.user.id;
}

export async function listContent(type: ContentTypeName, params: {
  page?: number; pageSize?: number; search?: string; status?: string;
  sortField?: string; sortDir?: "asc" | "desc";
}) {
  const session = await getServerSession();
  getUserId(session);
  const service = new ContentService(type);
  return service.list(params);
}

export async function getContentById(type: ContentTypeName, id: string) {
  const session = await getServerSession();
  getUserId(session);
  const service = new ContentService(type);
  return service.getById(id);
}

export async function createContent(type: ContentTypeName, data: Record<string, unknown>) {
  const session = await getServerSession();
  const userId = getUserId(session);
  const service = new ContentService(type);
  const result = await service.create(data, userId);
  if ((result as any)?.status === "published") {
    await dispatchTrigger(process.env.DATABASE_URL!, "content_published", (result as any).id, { ...result, contentType: type, triggeredBy: userId });
  }
  return result;
}

export async function updateContent(type: ContentTypeName, id: string, data: Record<string, unknown>) {
  const session = await getServerSession();
  const userId = getUserId(session);
  const service = new ContentService(type);
  const result = await service.update(id, data, userId);
  if ((result as any)?.status === "published") {
    await dispatchTrigger(process.env.DATABASE_URL!, "content_published", id, { ...result, contentType: type, triggeredBy: userId });
  }
  return result;
}

export async function deleteContent(type: ContentTypeName, id: string) {
  const session = await getServerSession();
  const userId = getUserId(session);
  const service = new ContentService(type);
  return service.delete(id, userId);
}

export async function transitionContent(type: ContentTypeName, id: string, action: string) {
  const session = await getServerSession();
  const userId = getUserId(session);
  const service = new ContentService(type);
  const result = await service.transition(id, action);
  if ((result as any)?.status === "published") {
    await dispatchTrigger(process.env.DATABASE_URL!, "content_published", id, { ...result, contentType: type, action, triggeredBy: userId });
  }
  return result;
}

export async function listCategories(type?: string) {
  const session = await getServerSession();
  getUserId(session);
  const service = new CategoryService();
  return service.list(type);
}

export async function createCategory(data: { name: string; slug?: string; description?: string; type?: string }) {
  const session = await getServerSession();
  getUserId(session);
  const service = new CategoryService();
  return service.create(data);
}

export async function updateCategory(id: string, data: { name?: string; slug?: string; description?: string; type?: string }) {
  const session = await getServerSession();
  getUserId(session);
  const service = new CategoryService();
  return service.update(id, data);
}

export async function deleteCategory(id: string) {
  const session = await getServerSession();
  getUserId(session);
  const service = new CategoryService();
  return service.delete(id);
}

export async function listTags() {
  const session = await getServerSession();
  getUserId(session);
  const service = new TagService();
  return service.list();
}

export async function createTag(data: { name: string; slug?: string }) {
  const session = await getServerSession();
  getUserId(session);
  const service = new TagService();
  return service.create(data);
}

export async function updateTag(id: string, data: { name?: string; slug?: string }) {
  const session = await getServerSession();
  getUserId(session);
  const service = new TagService();
  return service.update(id, data);
}

export async function deleteTag(id: string) {
  const session = await getServerSession();
  getUserId(session);
  const service = new TagService();
  return service.delete(id);
}

export async function setContentCategories(contentType: ContentTypeName, contentId: string, categoryIds: string[]) {
  const session = await getServerSession();
  getUserId(session);
  const service = new ContentTaxonomyService();
  return service.setCategories(contentType, contentId, categoryIds);
}

export async function getContentCategories(contentType: ContentTypeName, contentId: string) {
  const session = await getServerSession();
  getUserId(session);
  const service = new ContentTaxonomyService();
  return service.getCategories(contentType, contentId);
}

export async function setContentTags(contentType: ContentTypeName, contentId: string, tagIds: string[]) {
  const session = await getServerSession();
  getUserId(session);
  const service = new ContentTaxonomyService();
  return service.setTags(contentType, contentId, tagIds);
}

export async function getContentTags(contentType: ContentTypeName, contentId: string) {
  const session = await getServerSession();
  getUserId(session);
  const service = new ContentTaxonomyService();
  return service.getTags(contentType, contentId);
}

export async function listFAQs(entityType?: string, entityId?: string) {
  const session = await getServerSession();
  getUserId(session);
  const service = new FAQService();
  return service.list(entityType, entityId);
}

export async function createFAQ(data: {
  question: string; answer?: string; sortOrder?: number;
  entityType?: string; entityId?: string;
}) {
  const session = await getServerSession();
  getUserId(session);
  const service = new FAQService();
  return service.create(data);
}

export async function updateFAQ(id: string, data: {
  question?: string; answer?: string; sortOrder?: number;
}) {
  const session = await getServerSession();
  getUserId(session);
  const service = new FAQService();
  return service.update(id, data);
}

export async function deleteFAQ(id: string) {
  const session = await getServerSession();
  getUserId(session);
  const service = new FAQService();
  return service.delete(id);
}

export async function listTimelineEvents(params?: {
  sourceType?: string; sourceId?: string; eventType?: string;
  page?: number; pageSize?: number;
}) {
  const session = await getServerSession();
  getUserId(session);
  const service = new TimelineEventService();
  return service.list(params);
}

export async function createTimelineEvent(data: {
  sourceType?: string; sourceId?: string; eventType?: string;
  title: string; description?: string; eventDate: string;
  icon?: string; url?: string; sortOrder?: number;
}) {
  const session = await getServerSession();
  getUserId(session);
  const service = new TimelineEventService();
  return service.create(data);
}

export async function updateTimelineEvent(id: string, data: {
  sourceType?: string; sourceId?: string; eventType?: string;
  title?: string; description?: string; eventDate?: string;
  icon?: string; url?: string; sortOrder?: number;
}) {
  const session = await getServerSession();
  getUserId(session);
  const service = new TimelineEventService();
  return service.update(id, data);
}

export async function deleteTimelineEvent(id: string) {
  const session = await getServerSession();
  getUserId(session);
  const service = new TimelineEventService();
  return service.delete(id);
}
