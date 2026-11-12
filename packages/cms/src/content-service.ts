import { getDb, SearchIndexerService } from "@repo/database";
import { eq, and, or, asc, desc, count, ilike, inArray } from "drizzle-orm";
import { getContentType, type ContentTypeName, type ContentTypeDefinition } from "./types";
import { purgePublicCache, type PaginatedResponse } from "@repo/shared";
import { validateTransition, getTargetStatus } from "./workflow";
import { RevisionService } from "./revisions";

const searchIndexer = new SearchIndexerService();

/** Public-site cache tags (Portfolio-Public route-rule tags) per content
 * type. Every mutation also purges "home": the homepage aggregates all
 * collections, and the Know Me / Platforms pages carry the "home" tag —
 * so a content edit refreshes every page that embeds it. Types with no
 * public route (pages) purge "home" only. The purge is best-effort and
 * never throws — a failure leaves pages cached up to the 1 h TTL. */
const PUBLIC_CACHE_TAGS: Record<string, string> = {
  projects: "projects",
  posts: "posts",
  case_studies: "case-studies",
};

function cacheTagsFor(typeName: string): string[] {
  const tag = PUBLIC_CACHE_TAGS[typeName];
  return tag ? [tag, "home"] : ["home"];
}

const ENTITY_TYPE_MAP: Record<string, string> = {
  pages: "page",
  posts: "post",
  services: "service",
  projects: "project",
  case_studies: "case_study",
};

function getSearchEntityType(name: string): string {
  return ENTITY_TYPE_MAP[name] ?? name;
}

export interface ListContentParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortField?: string;
  sortDir?: "asc" | "desc";
  status?: string;
  categoryId?: string;
  tagId?: string;
  authorId?: string;
}

export class ContentService {
  private def: ContentTypeDefinition;

  constructor(typeName: ContentTypeName) {
    this.def = getContentType(typeName);
  }

  async list(params: ListContentParams = {}): Promise<PaginatedResponse<Record<string, unknown>>> {
    const db = getDb();
    const { table, searchFields, statusField, authorField, categories, tags } = this.def;
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;

    const conditions: any[] = [];

    if (params.status) {
      conditions.push(eq(table[statusField], params.status));
    }

    if (params.search && searchFields.length > 0) {
      const searchConditions = searchFields.map((f) =>
        ilike(table[f] as any, `%${params.search}%`),
      );
      conditions.push(or(...searchConditions));
    }

    if (params.authorId && authorField) {
      conditions.push(eq(table[authorField] as any, params.authorId));
    }

    if (params.categoryId && categories) {
      const jt = categories.junctionTable;
      const entityField = jt[categories.entityIdField];
      const categoryField = jt[categories.categoryIdField];
      const subQuery = db.select({ id: entityField }).from(jt).where(eq(categoryField, params.categoryId));
      conditions.push(inArray(table.id, subQuery));
    }

    if (params.tagId && tags) {
      const jt = tags.junctionTable;
      const entityField = jt[tags.entityIdField];
      const tagField = jt[tags.tagIdField];
      const subQuery = db.select({ id: entityField }).from(jt).where(eq(tagField, params.tagId));
      conditions.push(inArray(table.id, subQuery));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db.select({ count: count() }).from(table).where(where);
    const total = Number(countResult?.count ?? 0);

    const orderField = params.sortField || "createdAt";
    const orderDir = params.sortDir || "desc";
    const orderCol = table[orderField as any];
    const orderBy = orderCol
      ? orderDir === "desc" ? desc(orderCol) : asc(orderCol)
      : desc(table.createdAt as any);

    const items = await db
      .select()
      .from(table)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items: items as Record<string, unknown>[],
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getById(id: string): Promise<Record<string, unknown> | null> {
    const db = getDb();
    const { table } = this.def;
    const [result] = await db.select().from(table).where(eq(table.id, id)).limit(1);
    return (result as Record<string, unknown>) || null;
  }

  async getBySlug(slug: string): Promise<Record<string, unknown> | null> {
    const db = getDb();
    const { table, slugField } = this.def;
    const [result] = await db
      .select()
      .from(table)
      .where(eq(table[slugField as any], slug))
      .limit(1);
    return (result as Record<string, unknown>) || null;
  }

  async create(data: Record<string, unknown>, userId: string): Promise<Record<string, unknown>> {
    const db = getDb();
    const { table, createSchema, authorField } = this.def;

    // Zod 4 types bare `z.ZodSchema` as unknown-output, so narrow here:
    // every content schema in @repo/validation is an object schema.
    const validated = createSchema.parse(data) as Record<string, unknown>;

    const insertData: Record<string, unknown> = {
      ...validated,
      status: validated.status || "draft",
    };

    if (authorField) {
      insertData[authorField] = userId;
    }

    const [result] = await db.insert(table).values(insertData).returning();

    if (result && (result as any).status === "published") {
      searchIndexer.indexEntity(getSearchEntityType(this.def.name), (result as any).id).catch(() => {});
    }

    // Instant public-site refresh (best-effort, never fails the save).
    void purgePublicCache(cacheTagsFor(this.def.name));

    return result as Record<string, unknown>;
  }

  async update(
    id: string,
    data: Record<string, unknown>,
    userId: string,
  ): Promise<Record<string, unknown>> {
    const db = getDb();
    const { table, updateSchema } = this.def;

    const validated = updateSchema.parse(data) as Record<string, unknown>;

    const existing = await this.getById(id);
    if (existing) {
      await RevisionService.create(this.def.name, id, existing, userId);
    }

    const updateData: Record<string, unknown> = {
      ...validated,
      updatedAt: new Date(),
    };

    const [result] = await db
      .update(table)
      .set(updateData)
      .where(eq(table.id, id))
      .returning();

    if (!result) {
      throw new Error(`Content not found: ${id}`);
    }

    const entityType = getSearchEntityType(this.def.name);
    const wasPublished = existing?.[this.def.statusField] === "published";
    const isPublished = (result as any)?.[this.def.statusField] === "published";

    if (isPublished) {
      searchIndexer.indexEntity(entityType, (result as any).id).catch(() => {});
    } else if (wasPublished) {
      searchIndexer.deleteEntity(entityType, (result as any).id).catch(() => {});
    }

    // Instant public-site refresh (best-effort, never fails the save).
    void purgePublicCache(cacheTagsFor(this.def.name));

    return result as Record<string, unknown>;
  }

  async delete(id: string, userId: string): Promise<void> {
    const db = getDb();
    const { table, statusField } = this.def;

    const existing = await this.getById(id);
    if (!existing) throw new Error(`Content not found: ${id}`);

    const currentStatus = existing[statusField] as string;
    // Delete is a soft-delete to "archived" and must work from ANY status
    // (a draft has no workflow path to "archived", so validateTransition
    // rejected deleting drafts). Only re-archiving is an error.
    if (currentStatus === "archived") {
      throw new Error(`Content is already archived: ${id}`);
    }

    await RevisionService.create(this.def.name, id, existing, userId);

    if (currentStatus === "published") {
      searchIndexer.deleteEntity(getSearchEntityType(this.def.name), id).catch(() => {});
    }

    await db
      .update(table)
      .set({ [statusField]: "archived", updatedAt: new Date() })
      .where(eq(table.id, id));

    // Instant public-site refresh (best-effort, never fails the save).
    void purgePublicCache(cacheTagsFor(this.def.name));
  }

  async restore(id: string, _userId?: string): Promise<Record<string, unknown>> {
    return this.transition(id, "restore");
  }

  async transition(
    id: string,
    action: string,
    _userId?: string,
  ): Promise<Record<string, unknown>> {
    const db = getDb();
    const { table, workflow, statusField } = this.def;

    const existing = await this.getById(id);
    if (!existing) throw new Error(`Content not found: ${id}`);

    const currentStatus = existing[statusField] as string;
    const targetStatus = getTargetStatus(action);

    validateTransition(currentStatus, targetStatus, workflow.transitions as Record<string, readonly string[]>);

    const [result] = await db
      .update(table)
      .set({ [statusField]: targetStatus, updatedAt: new Date() })
      .where(eq(table.id, id))
      .returning();

    if (!result) throw new Error(`Content not found: ${id}`);

    const entityType = getSearchEntityType(this.def.name);
    if (targetStatus === "published") {
      searchIndexer.indexEntity(entityType, (result as any).id).catch(() => {});
    } else if (currentStatus === "published") {
      searchIndexer.deleteEntity(entityType, (result as any).id).catch(() => {});
    }

    // Instant public-site refresh (best-effort, never fails the save).
    void purgePublicCache(cacheTagsFor(this.def.name));

    return result as Record<string, unknown>;
  }
}
