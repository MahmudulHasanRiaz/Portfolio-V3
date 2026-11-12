import { BaseRepository } from "./base";
import { DatabaseError } from "../errors";
import { trackQuery } from "../utils/query-timing";
import * as schema from "../schema";
import { eq, and } from "drizzle-orm";

export class ProposalTemplatesRepository extends BaseRepository<typeof schema.proposalTemplates> {
  constructor() {
    super(schema.proposalTemplates, "proposalTemplate");
  }

  async findByProjectCategory(projectCategoryId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.proposalTemplates as any).projectCategoryId, projectCategoryId) as any);
      trackQuery(this.entityName, "findByProjectCategory", Date.now() - start);
      return results as typeof schema.proposalTemplates.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByProjectCategory", Date.now() - start);
      throw new DatabaseError("Failed to find proposal templates by project category", { entity: this.entityName, operation: "findByProjectCategory", cause: error });
    }
  }

  async findByType(type: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(and(eq((schema.proposalTemplates as any).type, type) as any, eq((schema.proposalTemplates as any).isActive, true) as any) as any);
      trackQuery(this.entityName, "findByType", Date.now() - start);
      return results as typeof schema.proposalTemplates.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByType", Date.now() - start);
      throw new DatabaseError("Failed to find proposal templates by type", { entity: this.entityName, operation: "findByType", cause: error });
    }
  }
}

export class ProposalDocumentsRepository extends BaseRepository<typeof schema.proposalDocuments> {
  constructor() {
    super(schema.proposalDocuments, "proposalDocument");
  }

  async findByProject(projectId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.proposalDocuments as any).projectId, projectId) as any);
      trackQuery(this.entityName, "findByProject", Date.now() - start);
      return results as typeof schema.proposalDocuments.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByProject", Date.now() - start);
      throw new DatabaseError("Failed to find proposal documents by project", { entity: this.entityName, operation: "findByProject", cause: error });
    }
  }

  async findByStatus(status: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.proposalDocuments as any).status, status) as any);
      trackQuery(this.entityName, "findByStatus", Date.now() - start);
      return results as typeof schema.proposalDocuments.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByStatus", Date.now() - start);
      throw new DatabaseError("Failed to find proposal documents by status", { entity: this.entityName, operation: "findByStatus", cause: error });
    }
  }
}
