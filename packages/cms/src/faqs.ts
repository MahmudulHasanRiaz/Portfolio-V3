import { getDb, faqs, SearchIndexerService } from "@repo/database";
import { eq, asc } from "drizzle-orm";

const searchIndexer = new SearchIndexerService();
const ENTITY_TYPE = "faq";

export interface FAQData {
  id: string;
  question: string | null;
  answer: string | null;
  sortOrder: number | null;
  entityType: string | null;
  entityId: string | null;
}

export class FAQService {
  async list(entityType?: string, entityId?: string): Promise<FAQData[]> {
    const db = getDb();
    const conditions = [];
    if (entityType) conditions.push(eq(faqs.entityType, entityType));
    if (entityId) conditions.push(eq(faqs.entityId, entityId));
    const where = conditions.length > 0
      ? conditions.reduce((acc, c) => acc && c)
      : undefined;
    const results = await db
      .select()
      .from(faqs)
      .where(where as any)
      .orderBy(asc(faqs.sortOrder));
    return results as unknown as FAQData[];
  }

  async getById(id: string): Promise<FAQData | null> {
    const db = getDb();
    const [result] = await db.select().from(faqs).where(eq(faqs.id, id)).limit(1);
    return (result as unknown as FAQData) || null;
  }

  async create(data: {
    question: string;
    answer?: string;
    sortOrder?: number;
    entityType?: string;
    entityId?: string;
  }): Promise<FAQData> {
    const db = getDb();
    const [result] = await db.insert(faqs).values(data).returning();
    if (result) searchIndexer.indexEntity(ENTITY_TYPE, result.id).catch(() => {});
    return result as unknown as FAQData;
  }

  async update(id: string, data: {
    question?: string;
    answer?: string;
    sortOrder?: number;
  }): Promise<FAQData> {
    const db = getDb();
    const [result] = await db.update(faqs).set(data).where(eq(faqs.id, id)).returning();
    if (!result) throw new Error("FAQ not found");
    searchIndexer.indexEntity(ENTITY_TYPE, result.id).catch(() => {});
    return result as unknown as FAQData;
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.delete(faqs).where(eq(faqs.id, id));
    searchIndexer.deleteEntity(ENTITY_TYPE, id).catch(() => {});
  }
}
