import { BaseRepository } from "./base";
import { DatabaseError } from "../errors";
import { trackQuery } from "../utils/query-timing";
import * as schema from "../schema";
import { eq, and, desc } from "drizzle-orm";

export class SettingsRepository extends BaseRepository<typeof schema.settings> {
  constructor() {
    super(schema.settings, "setting");
  }

  async findByKey(key: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.settings as any).key, key) as any)
        .limit(1);
      trackQuery(this.entityName, "findByKey", Date.now() - start);
      return (result as typeof schema.settings.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findByKey", Date.now() - start);
      throw new DatabaseError("Failed to find setting by key", { entity: this.entityName, operation: "findByKey", cause: error });
    }
  }

  async findByGroup(group: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.settings as any).group, group) as any);
      trackQuery(this.entityName, "findByGroup", Date.now() - start);
      return results as typeof schema.settings.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByGroup", Date.now() - start);
      throw new DatabaseError("Failed to find settings by group", { entity: this.entityName, operation: "findByGroup", cause: error });
    }
  }
}

export class AuditLogsRepository extends BaseRepository<typeof schema.auditLogs> {
  constructor() {
    super(schema.auditLogs, "auditLog");
  }

  async findByEntity(entityType: string, entityId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(and(eq((schema.auditLogs as any).entityType, entityType) as any, eq((schema.auditLogs as any).entityId, entityId) as any) as any);
      trackQuery(this.entityName, "findByEntity", Date.now() - start);
      return results as typeof schema.auditLogs.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByEntity", Date.now() - start);
      throw new DatabaseError("Failed to find audit logs by entity", { entity: this.entityName, operation: "findByEntity", cause: error });
    }
  }

  async findByActor(actorId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.auditLogs as any).actorId, actorId) as any);
      trackQuery(this.entityName, "findByActor", Date.now() - start);
      return results as typeof schema.auditLogs.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByActor", Date.now() - start);
      throw new DatabaseError("Failed to find audit logs by actor", { entity: this.entityName, operation: "findByActor", cause: error });
    }
  }
}

export class ContentRevisionsRepository extends BaseRepository<typeof schema.contentRevisions> {
  constructor() {
    super(schema.contentRevisions, "contentRevision");
  }

  async findByEntity(entityType: string, entityId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(and(eq((schema.contentRevisions as any).entityType, entityType) as any, eq((schema.contentRevisions as any).entityId, entityId) as any) as any)
        .orderBy(desc((schema.contentRevisions as any).revisionNumber));
      trackQuery(this.entityName, "findByEntity", Date.now() - start);
      return results as typeof schema.contentRevisions.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByEntity", Date.now() - start);
      throw new DatabaseError("Failed to find content revisions by entity", { entity: this.entityName, operation: "findByEntity", cause: error });
    }
  }

  async findLatestVersion(entityType: string, entityId: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(and(eq((schema.contentRevisions as any).entityType, entityType) as any, eq((schema.contentRevisions as any).entityId, entityId) as any) as any)
        .orderBy(desc((schema.contentRevisions as any).revisionNumber))
        .limit(1);
      trackQuery(this.entityName, "findLatestVersion", Date.now() - start);
      return (result as typeof schema.contentRevisions.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findLatestVersion", Date.now() - start);
      throw new DatabaseError("Failed to find latest content revision", { entity: this.entityName, operation: "findLatestVersion", cause: error });
    }
  }
}
