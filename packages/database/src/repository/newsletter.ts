import { BaseRepository } from "./base";
import { DatabaseError } from "../errors";
import { trackQuery } from "../utils/query-timing";
import * as schema from "../schema";
import { eq, and, gte } from "drizzle-orm";

export class SubscribersRepository extends BaseRepository<typeof schema.subscribers> {
  constructor() {
    super(schema.subscribers, "subscriber");
  }

  async findByEmail(email: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.subscribers as any).email, email) as any)
        .limit(1);
      trackQuery(this.entityName, "findByEmail", Date.now() - start);
      return (result as typeof schema.subscribers.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findByEmail", Date.now() - start);
      throw new DatabaseError("Failed to find subscriber by email", { entity: this.entityName, operation: "findByEmail", cause: error });
    }
  }

  async findByStatus(status: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.subscribers as any).status, status) as any);
      trackQuery(this.entityName, "findByStatus", Date.now() - start);
      return results as typeof schema.subscribers.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByStatus", Date.now() - start);
      throw new DatabaseError("Failed to find subscribers by status", { entity: this.entityName, operation: "findByStatus", cause: error });
    }
  }
}

export class CampaignsRepository extends BaseRepository<typeof schema.campaigns> {
  constructor() {
    super(schema.campaigns, "campaign");
  }

  async findByStatus(status: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.campaigns as any).status, status) as any);
      trackQuery(this.entityName, "findByStatus", Date.now() - start);
      return results as typeof schema.campaigns.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByStatus", Date.now() - start);
      throw new DatabaseError("Failed to find campaigns by status", { entity: this.entityName, operation: "findByStatus", cause: error });
    }
  }

  async findScheduled() {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(and(eq((schema.campaigns as any).status, "scheduled") as any, gte((schema.campaigns as any).scheduledAt, new Date()) as any) as any);
      trackQuery(this.entityName, "findScheduled", Date.now() - start);
      return results as typeof schema.campaigns.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findScheduled", Date.now() - start);
      throw new DatabaseError("Failed to find scheduled campaigns", { entity: this.entityName, operation: "findScheduled", cause: error });
    }
  }
}
