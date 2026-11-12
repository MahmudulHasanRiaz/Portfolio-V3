import { BaseRepository } from "./base";
import { DatabaseError } from "../errors";
import { trackQuery } from "../utils/query-timing";
import * as schema from "../schema";
import { eq, and, gte, lte } from "drizzle-orm";

export class TimelineEventsRepository extends BaseRepository<typeof schema.timelineEvents> {
  constructor() {
    super(schema.timelineEvents, "timelineEvent");
  }

  async findBySource(sourceType: string, sourceId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(and(eq((schema.timelineEvents as any).sourceType, sourceType) as any, eq((schema.timelineEvents as any).sourceId, sourceId) as any) as any);
      trackQuery(this.entityName, "findBySource", Date.now() - start);
      return results as typeof schema.timelineEvents.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findBySource", Date.now() - start);
      throw new DatabaseError("Failed to find timeline events by source", { entity: this.entityName, operation: "findBySource", cause: error });
    }
  }

  async findByDateRange(startDate: Date, endDate: Date) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(and(gte((schema.timelineEvents as any).eventDate, startDate) as any, lte((schema.timelineEvents as any).eventDate, endDate) as any) as any);
      trackQuery(this.entityName, "findByDateRange", Date.now() - start);
      return results as typeof schema.timelineEvents.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByDateRange", Date.now() - start);
      throw new DatabaseError("Failed to find timeline events by date range", { entity: this.entityName, operation: "findByDateRange", cause: error });
    }
  }
}
