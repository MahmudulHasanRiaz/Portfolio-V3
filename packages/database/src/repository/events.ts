import { BaseRepository } from "./base";
import { DatabaseError } from "../errors";
import { trackQuery } from "../utils/query-timing";
import * as schema from "../schema";
import { eq, and, gte, lte } from "drizzle-orm";

export class EventCategoriesRepository extends BaseRepository<typeof schema.eventCategories> {
  constructor() {
    super(schema.eventCategories, "eventCategory");
  }

  async findBySlug(slug: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.eventCategories as any).slug, slug) as any)
        .limit(1);
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      return (result as typeof schema.eventCategories.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      throw new DatabaseError("Failed to find event category by slug", { entity: this.entityName, operation: "findBySlug", cause: error });
    }
  }
}

export class ArtistEventsRepository extends BaseRepository<typeof schema.artistEvents> {
  constructor() {
    super(schema.artistEvents, "artistEvent");
  }

  async findByStatus(status: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.artistEvents as any).status, status) as any);
      trackQuery(this.entityName, "findByStatus", Date.now() - start);
      return results as typeof schema.artistEvents.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByStatus", Date.now() - start);
      throw new DatabaseError("Failed to find events by status", { entity: this.entityName, operation: "findByStatus", cause: error });
    }
  }

  async findByDateRange(startDate: Date, endDate: Date) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(and(gte((schema.artistEvents as any).eventDate, startDate) as any, lte((schema.artistEvents as any).eventDate, endDate) as any) as any);
      trackQuery(this.entityName, "findByDateRange", Date.now() - start);
      return results as typeof schema.artistEvents.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByDateRange", Date.now() - start);
      throw new DatabaseError("Failed to find events by date range", { entity: this.entityName, operation: "findByDateRange", cause: error });
    }
  }

  async findByOrganizer(organizerId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.artistEvents as any).organizerId, organizerId) as any);
      trackQuery(this.entityName, "findByOrganizer", Date.now() - start);
      return results as typeof schema.artistEvents.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByOrganizer", Date.now() - start);
      throw new DatabaseError("Failed to find events by organizer", { entity: this.entityName, operation: "findByOrganizer", cause: error });
    }
  }
}

export class EventLogisticsRepository extends BaseRepository<typeof schema.eventLogistics> {
  constructor() {
    super(schema.eventLogistics, "eventLogistics");
  }

  async findByEventId(eventId: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.eventLogistics as any).eventId, eventId) as any)
        .limit(1);
      trackQuery(this.entityName, "findByEventId", Date.now() - start);
      return (result as typeof schema.eventLogistics.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findByEventId", Date.now() - start);
      throw new DatabaseError("Failed to find event logistics by event id", { entity: this.entityName, operation: "findByEventId", cause: error });
    }
  }
}

export class AvailabilityRepository extends BaseRepository<typeof schema.artistAvailability> {
  constructor() {
    super(schema.artistAvailability, "availability");
  }

  async findByDateRange(startDate: Date, endDate: Date) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(and(gte((schema.artistAvailability as any).date, startDate) as any, lte((schema.artistAvailability as any).date, endDate) as any) as any);
      trackQuery(this.entityName, "findByDateRange", Date.now() - start);
      return results as typeof schema.artistAvailability.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByDateRange", Date.now() - start);
      throw new DatabaseError("Failed to find availability by date range", { entity: this.entityName, operation: "findByDateRange", cause: error });
    }
  }
}
