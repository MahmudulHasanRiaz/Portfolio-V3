import { BaseRepository } from "./base";
import { DatabaseError } from "../errors";
import { trackQuery } from "../utils/query-timing";
import * as schema from "../schema";
import { eq, and, isNotNull } from "drizzle-orm";

export class ProjectCategoriesRepository extends BaseRepository<typeof schema.projectCategories> {
  constructor() {
    super(schema.projectCategories, "projectCategory");
  }

  async findBySlug(slug: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.projectCategories as any).slug, slug) as any)
        .limit(1);
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      return (result as typeof schema.projectCategories.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      throw new DatabaseError("Failed to find project category by slug", { entity: this.entityName, operation: "findBySlug", cause: error });
    }
  }
}

export class FreelanceProjectsRepository extends BaseRepository<typeof schema.projectsFreelance> {
  constructor() {
    super(schema.projectsFreelance, "freelanceProject");
  }

  async findByStatus(status: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.projectsFreelance as any).status, status) as any);
      trackQuery(this.entityName, "findByStatus", Date.now() - start);
      return results as typeof schema.projectsFreelance.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByStatus", Date.now() - start);
      throw new DatabaseError("Failed to find freelance projects by status", { entity: this.entityName, operation: "findByStatus", cause: error });
    }
  }

  async findByClientId(clientId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.projectsFreelance as any).clientId, clientId) as any);
      trackQuery(this.entityName, "findByClientId", Date.now() - start);
      return results as typeof schema.projectsFreelance.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByClientId", Date.now() - start);
      throw new DatabaseError("Failed to find freelance projects by client id", { entity: this.entityName, operation: "findByClientId", cause: error });
    }
  }

  async findWithPortalAccess() {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(and(eq((schema.projectsFreelance as any).portalAccessEnabled, true) as any, isNotNull((schema.projectsFreelance as any).portalToken) as any) as any);
      trackQuery(this.entityName, "findWithPortalAccess", Date.now() - start);
      return results as typeof schema.projectsFreelance.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findWithPortalAccess", Date.now() - start);
      throw new DatabaseError("Failed to find freelance projects with portal access", { entity: this.entityName, operation: "findWithPortalAccess", cause: error });
    }
  }
}
