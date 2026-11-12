import { getDb, timelineEvents, SearchIndexerService } from "@repo/database";
import { eq, asc, desc, count, and } from "drizzle-orm";
import type { PaginatedResponse } from "@repo/shared";

const searchIndexer = new SearchIndexerService();
const ENTITY_TYPE = "timeline_event";

export interface TimelineEventData {
  id: string;
  sourceType: string | null;
  sourceId: string | null;
  eventType: string | null;
  title: string | null;
  description: string | null;
  eventDate: string | null;
  icon: string | null;
  url: string | null;
  sortOrder: number | null;
  createdAt: string;
}

export class TimelineEventService {
  async list(params: {
    sourceType?: string;
    sourceId?: string;
    eventType?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<PaginatedResponse<TimelineEventData>> {
    const db = getDb();
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;

    const conditions = [];
    if (params.sourceType) conditions.push(eq(timelineEvents.sourceType, params.sourceType));
    if (params.sourceId) conditions.push(eq(timelineEvents.sourceId, params.sourceId));
    if (params.eventType) conditions.push(eq(timelineEvents.eventType, params.eventType));

    const where = conditions.length > 0
      ? (conditions as any[]).reduce((acc, c) => and(acc, c))
      : undefined;

    const [countResult] = await db.select({ count: count() }).from(timelineEvents).where(where);
    const total = Number(countResult?.count ?? 0);

    const items = await db
      .select()
      .from(timelineEvents)
      .where(where)
      .orderBy(desc(timelineEvents.eventDate), asc(timelineEvents.sortOrder))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items: items as unknown as TimelineEventData[],
      pagination: {
        page, pageSize, total, totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getById(id: string): Promise<TimelineEventData | null> {
    const db = getDb();
    const [result] = await db.select().from(timelineEvents).where(eq(timelineEvents.id, id)).limit(1);
    return (result as unknown as TimelineEventData) || null;
  }

  async create(data: {
    sourceType?: string;
    sourceId?: string;
    eventType?: string;
    title: string;
    description?: string;
    eventDate: string;
    icon?: string;
    url?: string;
    sortOrder?: number;
  }): Promise<TimelineEventData> {
    const db = getDb();
    const [result] = await db.insert(timelineEvents).values(data).returning();
    if (result) searchIndexer.indexEntity(ENTITY_TYPE, result.id).catch(() => {});
    return result as unknown as TimelineEventData;
  }

  async update(id: string, data: {
    sourceType?: string;
    sourceId?: string;
    eventType?: string;
    title?: string;
    description?: string;
    eventDate?: string;
    icon?: string;
    url?: string;
    sortOrder?: number;
  }): Promise<TimelineEventData> {
    const db = getDb();
    const [result] = await db.update(timelineEvents).set(data).where(eq(timelineEvents.id, id)).returning();
    if (!result) throw new Error("Timeline event not found");
    searchIndexer.indexEntity(ENTITY_TYPE, result.id).catch(() => {});
    return result as unknown as TimelineEventData;
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.delete(timelineEvents).where(eq(timelineEvents.id, id));
    searchIndexer.deleteEntity(ENTITY_TYPE, id).catch(() => {});
  }
}
