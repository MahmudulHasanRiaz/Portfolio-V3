import { BaseRepository } from "./base";
import { DatabaseError } from "../errors";
import { trackQuery } from "../utils/query-timing";
import * as schema from "../schema";
import { eq } from "drizzle-orm";

export class PortalSessionsRepository extends BaseRepository<typeof schema.portalSessions> {
  constructor() {
    super(schema.portalSessions, "portalSession");
  }

  async findByToken(token: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.portalSessions as any).portalToken, token) as any)
        .limit(1);
      trackQuery(this.entityName, "findByToken", Date.now() - start);
      return (result as typeof schema.portalSessions.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findByToken", Date.now() - start);
      throw new DatabaseError("Failed to find portal session by token", { entity: this.entityName, operation: "findByToken", cause: error });
    }
  }

  async findByProject(projectId: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.portalSessions as any).projectId, projectId) as any)
        .limit(1);
      trackQuery(this.entityName, "findByProject", Date.now() - start);
      return (result as typeof schema.portalSessions.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findByProject", Date.now() - start);
      throw new DatabaseError("Failed to find portal session by project", { entity: this.entityName, operation: "findByProject", cause: error });
    }
  }
}

export class PortalMessagesRepository extends BaseRepository<typeof schema.portalMessages> {
  constructor() {
    super(schema.portalMessages, "portalMessage");
  }

  async findByProject(projectId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.portalMessages as any).projectId, projectId) as any);
      trackQuery(this.entityName, "findByProject", Date.now() - start);
      return results as typeof schema.portalMessages.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByProject", Date.now() - start);
      throw new DatabaseError("Failed to find portal messages by project", { entity: this.entityName, operation: "findByProject", cause: error });
    }
  }
}
