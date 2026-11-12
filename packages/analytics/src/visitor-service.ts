import { getDb, visitors } from "@repo/database";
import { eq, sql } from "drizzle-orm";

export interface VisitorData {
  anonymousId: string;
  userAgent?: string | null;
  referrer?: string | null;
}

export class VisitorService {
  async identify(data: VisitorData) {
    const db = getDb();
    const existing = await db
      .select()
      .from(visitors)
      .where(eq(visitors.anonymousId, data.anonymousId))
      .limit(1);

    if (existing.length > 0) {
      const visitor = existing[0]!;
      const [updated] = await db
        .update(visitors)
        .set({
          lastVisit: new Date(),
          visitCount: sql`${visitors.visitCount} + 1`,
          userAgent: data.userAgent ?? visitor.userAgent,
          referrer: data.referrer ?? visitor.referrer,
        })
        .where(eq(visitors.id, visitor.id))
        .returning();
      return updated!;
    }

    const [created] = await db
      .insert(visitors)
      .values({
        anonymousId: data.anonymousId,
        userAgent: data.userAgent,
        referrer: data.referrer,
        visitCount: 1,
      })
      .returning();
    return created!;
  }
}
