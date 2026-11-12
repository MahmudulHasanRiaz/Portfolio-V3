import { BaseRepository } from "./base";
import { DatabaseError } from "../errors";
import { trackQuery } from "../utils/query-timing";
import * as schema from "../schema";
import { eq, isNotNull, isNull } from "drizzle-orm";

export class MediaAssetsRepository extends BaseRepository<typeof schema.mediaAssets> {
  constructor() {
    super(schema.mediaAssets, "mediaAsset");
  }

  async findByFolder(folderId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.mediaAssets as any).folderId, folderId) as any);
      trackQuery(this.entityName, "findByFolder", Date.now() - start);
      return results as typeof schema.mediaAssets.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByFolder", Date.now() - start);
      throw new DatabaseError("Failed to find media assets by folder", { entity: this.entityName, operation: "findByFolder", cause: error });
    }
  }

  async findDeleted() {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(isNotNull((schema.mediaAssets as any).deletedAt) as any);
      trackQuery(this.entityName, "findDeleted", Date.now() - start);
      return results as typeof schema.mediaAssets.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findDeleted", Date.now() - start);
      throw new DatabaseError("Failed to find deleted media assets", { entity: this.entityName, operation: "findDeleted", cause: error });
    }
  }
}

export class MediaFoldersRepository extends BaseRepository<typeof schema.mediaFolders> {
  constructor() {
    super(schema.mediaFolders, "mediaFolder");
  }

  async findByParent(parentId: string | null) {
    const start = Date.now();
    try {
      const where = parentId
        ? eq((schema.mediaFolders as any).parentId, parentId)
        : isNull((schema.mediaFolders as any).parentId);
      const results = await this.db
        .select()
        .from(this.table)
        .where(where as any);
      trackQuery(this.entityName, "findByParent", Date.now() - start);
      return results as typeof schema.mediaFolders.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByParent", Date.now() - start);
      throw new DatabaseError("Failed to find media folders by parent", { entity: this.entityName, operation: "findByParent", cause: error });
    }
  }
}
