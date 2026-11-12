import { BaseRepository } from "./base";
import { DatabaseError } from "../errors";
import { trackQuery } from "../utils/query-timing";
import * as schema from "../schema";
import { eq, and, lte, gte, isNull } from "drizzle-orm";

export class LeadsRepository extends BaseRepository<typeof schema.leads> {
  constructor() {
    super(schema.leads, "lead");
  }

  async findByEmail(email: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.leads as any).email, email) as any);
      trackQuery(this.entityName, "findByEmail", Date.now() - start);
      return results as typeof schema.leads.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByEmail", Date.now() - start);
      throw new DatabaseError("Failed to find leads by email", { entity: this.entityName, operation: "findByEmail", cause: error });
    }
  }

  async findByStatus(status: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.leads as any).status, status) as any);
      trackQuery(this.entityName, "findByStatus", Date.now() - start);
      return results as typeof schema.leads.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByStatus", Date.now() - start);
      throw new DatabaseError("Failed to find leads by status", { entity: this.entityName, operation: "findByStatus", cause: error });
    }
  }

  async findByAssignedUser(userId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.leads as any).assignedUserId, userId) as any);
      trackQuery(this.entityName, "findByAssignedUser", Date.now() - start);
      return results as typeof schema.leads.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByAssignedUser", Date.now() - start);
      throw new DatabaseError("Failed to find leads by assigned user", { entity: this.entityName, operation: "findByAssignedUser", cause: error });
    }
  }

  async findFollowUpNeeded() {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(and(lte((schema.leads as any).followUpDate, new Date()) as any, isNull((schema.leads as any).convertedToProjectId) as any, isNull((schema.leads as any).convertedToEventId) as any) as any);
      trackQuery(this.entityName, "findFollowUpNeeded", Date.now() - start);
      return results as typeof schema.leads.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findFollowUpNeeded", Date.now() - start);
      throw new DatabaseError("Failed to find leads needing follow up", { entity: this.entityName, operation: "findFollowUpNeeded", cause: error });
    }
  }
}

export class LeadActivitiesRepository extends BaseRepository<typeof schema.leadActivities> {
  constructor() {
    super(schema.leadActivities, "leadActivity");
  }

  async findByLeadId(leadId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.leadActivities as any).leadId, leadId) as any);
      trackQuery(this.entityName, "findByLeadId", Date.now() - start);
      return results as typeof schema.leadActivities.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByLeadId", Date.now() - start);
      throw new DatabaseError("Failed to find lead activities by lead id", { entity: this.entityName, operation: "findByLeadId", cause: error });
    }
  }
}

export class LeadNotesRepository extends BaseRepository<typeof schema.leadNotes> {
  constructor() {
    super(schema.leadNotes, "leadNote");
  }

  async findByLeadId(leadId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.leadNotes as any).leadId, leadId) as any);
      trackQuery(this.entityName, "findByLeadId", Date.now() - start);
      return results as typeof schema.leadNotes.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByLeadId", Date.now() - start);
      throw new DatabaseError("Failed to find lead notes by lead id", { entity: this.entityName, operation: "findByLeadId", cause: error });
    }
  }
}

export class AbandonedLeadsRepository extends BaseRepository<typeof schema.abandonedLeads> {
  constructor() {
    super(schema.abandonedLeads, "abandonedLead");
  }

  async findByEmail(email: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.abandonedLeads as any).email, email) as any);
      trackQuery(this.entityName, "findByEmail", Date.now() - start);
      return results as typeof schema.abandonedLeads.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByEmail", Date.now() - start);
      throw new DatabaseError("Failed to find abandoned leads by email", { entity: this.entityName, operation: "findByEmail", cause: error });
    }
  }
}
