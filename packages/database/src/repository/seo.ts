import { BaseRepository } from "./base";
import { DatabaseError } from "../errors";
import { trackQuery } from "../utils/query-timing";
import * as schema from "../schema";
import { eq, and } from "drizzle-orm";

export class SeoMetaRepository extends BaseRepository<typeof schema.seoMeta> {
  constructor() {
    super(schema.seoMeta, "seoMeta");
  }

  async findByEntity(entityType: string, entityId: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(and(eq((schema.seoMeta as any).entityType, entityType) as any, eq((schema.seoMeta as any).entityId, entityId) as any) as any)
        .limit(1);
      trackQuery(this.entityName, "findByEntity", Date.now() - start);
      return (result as typeof schema.seoMeta.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findByEntity", Date.now() - start);
      throw new DatabaseError("Failed to find seo meta by entity", { entity: this.entityName, operation: "findByEntity", cause: error });
    }
  }
}

export class SlugRedirectsRepository extends BaseRepository<typeof schema.slugRedirects> {
  constructor() {
    super(schema.slugRedirects, "slugRedirect");
  }

  async findBySource(sourceSlug: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.slugRedirects as any).sourceSlug, sourceSlug) as any)
        .limit(1);
      trackQuery(this.entityName, "findBySource", Date.now() - start);
      return (result as typeof schema.slugRedirects.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findBySource", Date.now() - start);
      throw new DatabaseError("Failed to find slug redirect by source", { entity: this.entityName, operation: "findBySource", cause: error });
    }
  }

  async findActive() {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.slugRedirects as any).isActive, true) as any);
      trackQuery(this.entityName, "findActive", Date.now() - start);
      return results as typeof schema.slugRedirects.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findActive", Date.now() - start);
      throw new DatabaseError("Failed to find active slug redirects", { entity: this.entityName, operation: "findActive", cause: error });
    }
  }
}
