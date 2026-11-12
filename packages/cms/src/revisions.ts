import { getDb, contentRevisions } from "@repo/database";
import { eq, and, desc, count } from "drizzle-orm";
import type { PaginatedResponse } from "@repo/shared";
import type { ContentTypeName } from "./types";

export interface RevisionData {
  id: string;
  entityType: string;
  entityId: string;
  revisionNumber: number;
  contentSnapshot: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

export class RevisionService {
  static async create(
    entityType: string,
    entityId: string,
    contentSnapshot: Record<string, unknown>,
    userId: string,
  ): Promise<RevisionData> {
    const db = getDb();

    const [latest] = await db
      .select({ maxRev: count() })
      .from(contentRevisions)
      .where(
        and(
          eq(contentRevisions.entityType, entityType),
          eq(contentRevisions.entityId, entityId),
        ),
      );

    const revisionNumber = (Number(latest?.maxRev) || 0) + 1;

    const [result] = await db
      .insert(contentRevisions)
      .values({
        entityType,
        entityId,
        revisionNumber,
        contentSnapshot,
        createdBy: userId,
      })
      .returning();

    return result as unknown as RevisionData;
  }

  static async list(
    entityType: string,
    entityId: string,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResponse<RevisionData>> {
    const db = getDb();

    const where = and(
      eq(contentRevisions.entityType, entityType),
      eq(contentRevisions.entityId, entityId),
    );

    const [countResult] = await db
      .select({ count: count() })
      .from(contentRevisions)
      .where(where);

    const total = Number(countResult?.count ?? 0);

    const items = await db
      .select()
      .from(contentRevisions)
      .where(where)
      .orderBy(desc(contentRevisions.revisionNumber))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items: items as unknown as RevisionData[],
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

  static async listRecent(
    page = 1,
    pageSize = 20,
    entityType?: string,
  ): Promise<PaginatedResponse<RevisionData>> {
    const db = getDb();

    const where = entityType
      ? eq(contentRevisions.entityType, entityType)
      : undefined;

    const [countResult] = await db
      .select({ count: count() })
      .from(contentRevisions)
      .where(where);

    const total = Number(countResult?.count ?? 0);

    const items = await db
      .select()
      .from(contentRevisions)
      .where(where)
      .orderBy(
        desc(contentRevisions.createdAt),
        desc(contentRevisions.revisionNumber),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items: items as unknown as RevisionData[],
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

  static async getById(id: string): Promise<RevisionData | null> {
    const db = getDb();
    const [result] = await db
      .select()
      .from(contentRevisions)
      .where(eq(contentRevisions.id, id))
      .limit(1);
    return (result as unknown as RevisionData) || null;
  }

  static async restore(
    revisionId: string,
    entityType: ContentTypeName,
    userId: string,
  ): Promise<Record<string, unknown>> {
    const { ContentService } = await import("./content-service");

    const revision = await this.getById(revisionId);
    if (!revision) throw new Error("Revision not found");

    const service = new ContentService(entityType);
    return service.update(revision.entityId, revision.contentSnapshot, userId);
  }
}
