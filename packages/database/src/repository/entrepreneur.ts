import { BaseRepository } from "./base";
import { DatabaseError } from "../errors";
import { trackQuery } from "../utils/query-timing";
import * as schema from "../schema";
import { eq } from "drizzle-orm";

export class VenturesRepository extends BaseRepository<typeof schema.ventures> {
  constructor() {
    super(schema.ventures, "venture");
  }

  async findBySlug(slug: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.ventures as any).slug, slug) as any)
        .limit(1);
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      return (result as typeof schema.ventures.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      throw new DatabaseError("Failed to find venture by slug", { entity: this.entityName, operation: "findBySlug", cause: error });
    }
  }

  async findAllFeatured() {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.ventures as any).isFeatured, true) as any);
      trackQuery(this.entityName, "findAllFeatured", Date.now() - start);
      return results as typeof schema.ventures.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findAllFeatured", Date.now() - start);
      throw new DatabaseError("Failed to find featured ventures", { entity: this.entityName, operation: "findAllFeatured", cause: error });
    }
  }
}

export class ProductsRepository extends BaseRepository<typeof schema.products> {
  constructor() {
    super(schema.products, "product");
  }

  async findBySlug(slug: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.products as any).slug, slug) as any)
        .limit(1);
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      return (result as typeof schema.products.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      throw new DatabaseError("Failed to find product by slug", { entity: this.entityName, operation: "findBySlug", cause: error });
    }
  }

  async findByVentureId(ventureId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.products as any).ventureId, ventureId) as any);
      trackQuery(this.entityName, "findByVentureId", Date.now() - start);
      return results as typeof schema.products.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByVentureId", Date.now() - start);
      throw new DatabaseError("Failed to find products by venture id", { entity: this.entityName, operation: "findByVentureId", cause: error });
    }
  }
}
