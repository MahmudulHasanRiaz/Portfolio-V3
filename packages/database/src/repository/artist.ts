import { BaseRepository } from "./base";
import { DatabaseError } from "../errors";
import { trackQuery } from "../utils/query-timing";
import * as schema from "../schema";
import { eq } from "drizzle-orm";

export class ReleasesRepository extends BaseRepository<typeof schema.releases> {
  constructor() {
    super(schema.releases, "release");
  }

  async findBySlug(slug: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.releases as any).slug, slug) as any)
        .limit(1);
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      return (result as typeof schema.releases.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findBySlug", Date.now() - start);
      throw new DatabaseError("Failed to find release by slug", { entity: this.entityName, operation: "findBySlug", cause: error });
    }
  }

  async findAllFeatured() {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.releases as any).isFeatured, true) as any);
      trackQuery(this.entityName, "findAllFeatured", Date.now() - start);
      return results as typeof schema.releases.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findAllFeatured", Date.now() - start);
      throw new DatabaseError("Failed to find featured releases", { entity: this.entityName, operation: "findAllFeatured", cause: error });
    }
  }

  async findByType(type: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.releases as any).type, type) as any);
      trackQuery(this.entityName, "findByType", Date.now() - start);
      return results as typeof schema.releases.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByType", Date.now() - start);
      throw new DatabaseError("Failed to find releases by type", { entity: this.entityName, operation: "findByType", cause: error });
    }
  }
}

export class ReleasePlatformsRepository extends BaseRepository<typeof schema.releasePlatforms> {
  constructor() {
    super(schema.releasePlatforms, "releasePlatform");
  }

  async findByReleaseId(releaseId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.releasePlatforms as any).releaseId, releaseId) as any);
      trackQuery(this.entityName, "findByReleaseId", Date.now() - start);
      return results as typeof schema.releasePlatforms.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByReleaseId", Date.now() - start);
      throw new DatabaseError("Failed to find release platforms by release id", { entity: this.entityName, operation: "findByReleaseId", cause: error });
    }
  }
}

export class ReleaseLyricsRepository extends BaseRepository<typeof schema.releaseLyrics> {
  constructor() {
    super(schema.releaseLyrics, "releaseLyrics");
  }

  async findByReleaseId(releaseId: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.releaseLyrics as any).releaseId, releaseId) as any)
        .limit(1);
      trackQuery(this.entityName, "findByReleaseId", Date.now() - start);
      return (result as typeof schema.releaseLyrics.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findByReleaseId", Date.now() - start);
      throw new DatabaseError("Failed to find release lyrics by release id", { entity: this.entityName, operation: "findByReleaseId", cause: error });
    }
  }
}
