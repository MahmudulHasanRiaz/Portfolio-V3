import { getDb, categories, tags, postCategories, postTags } from "@repo/database";
import { eq, asc, inArray } from "drizzle-orm";
import type { ContentTypeName } from "./types";

export interface CategoryData {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  type: string | null;
}

export interface TagData {
  id: string;
  name: string;
  slug: string | null;
}

export class CategoryService {
  async list(type?: string): Promise<CategoryData[]> {
    const db = getDb();
    const conditions = type ? [eq(categories.type, type)] : undefined;
    const results = await db
      .select()
      .from(categories)
      .where(conditions ? conditions[0] : undefined)
      .orderBy(asc(categories.name));
    return results as unknown as CategoryData[];
  }

  async getById(id: string): Promise<CategoryData | null> {
    const db = getDb();
    const [result] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    return (result as unknown as CategoryData) || null;
  }

  async create(data: { name: string; slug?: string; description?: string; type?: string }): Promise<CategoryData> {
    const db = getDb();
    const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const [result] = await db
      .insert(categories)
      .values({ name: data.name, slug, description: data.description || null, type: data.type || null })
      .returning();
    return result as unknown as CategoryData;
  }

  async update(
    id: string,
    data: { name?: string; slug?: string; description?: string; type?: string },
  ): Promise<CategoryData> {
    const db = getDb();
    const [result] = await db
      .update(categories)
      .set(data)
      .where(eq(categories.id, id))
      .returning();
    if (!result) throw new Error("Category not found");
    return result as unknown as CategoryData;
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.delete(categories).where(eq(categories.id, id));
  }
}

export class TagService {
  async list(): Promise<TagData[]> {
    const db = getDb();
    const results = await db.select().from(tags).orderBy(asc(tags.name));
    return results as unknown as TagData[];
  }

  async getById(id: string): Promise<TagData | null> {
    const db = getDb();
    const [result] = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
    return (result as unknown as TagData) || null;
  }

  async create(data: { name: string; slug?: string }): Promise<TagData> {
    const db = getDb();
    const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const [result] = await db.insert(tags).values({ name: data.name, slug }).returning();
    return result as unknown as TagData;
  }

  async update(id: string, data: { name?: string; slug?: string }): Promise<TagData> {
    const db = getDb();
    const [result] = await db.update(tags).set(data).where(eq(tags.id, id)).returning();
    if (!result) throw new Error("Tag not found");
    return result as unknown as TagData;
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.delete(tags).where(eq(tags.id, id));
  }
}

export class ContentTaxonomyService {
  async setCategories(contentType: ContentTypeName, contentId: string, categoryIds: string[]): Promise<void> {
    const db = getDb();
    const junctionMap: Record<string, { table: any; entityIdField: string; categoryIdField: string }> = {
      posts: { table: postCategories, entityIdField: "postId", categoryIdField: "categoryId" },
    };

    const config = junctionMap[contentType];
    if (!config) return;

    const entityField = config.table[config.entityIdField];

    await db.delete(config.table).where(eq(entityField, contentId));

    if (categoryIds.length > 0) {
      await db.insert(config.table).values(
        categoryIds.map((catId) => ({
          [config.entityIdField]: contentId,
          [config.categoryIdField]: catId,
        })),
      );
    }
  }

  async setTags(contentType: ContentTypeName, contentId: string, tagIds: string[]): Promise<void> {
    const db = getDb();
    const junctionMap: Record<string, { table: any; entityIdField: string; tagIdField: string }> = {
      posts: { table: postTags, entityIdField: "postId", tagIdField: "tagId" },
    };

    const config = junctionMap[contentType];
    if (!config) return;

    const entityField = config.table[config.entityIdField];

    await db.delete(config.table).where(eq(entityField, contentId));

    if (tagIds.length > 0) {
      await db.insert(config.table).values(
        tagIds.map((tagId) => ({
          [config.entityIdField]: contentId,
          [config.tagIdField]: tagId,
        })),
      );
    }
  }

  async getCategories(contentType: ContentTypeName, contentId: string): Promise<CategoryData[]> {
    const db = getDb();
    const junctionMap: Record<string, { table: any; entityIdField: string; categoryIdField: string }> = {
      posts: { table: postCategories, entityIdField: "postId", categoryIdField: "categoryId" },
    };

    const config = junctionMap[contentType];
    if (!config) return [];

    const entityField = config.table[config.entityIdField];

    const rows = await db
      .select({ categoryId: config.table[config.categoryIdField] })
      .from(config.table)
      .where(eq(entityField, contentId));

    const catIds = rows.map((r: any) => r.categoryId);
    if (catIds.length === 0) return [];

    return (await db
      .select()
      .from(categories)
      .where(inArray(categories.id, catIds))) as unknown as CategoryData[];
  }

  async getTags(contentType: ContentTypeName, contentId: string): Promise<TagData[]> {
    const db = getDb();
    const junctionMap: Record<string, { table: any; entityIdField: string; tagIdField: string }> = {
      posts: { table: postTags, entityIdField: "postId", tagIdField: "tagId" },
    };

    const config = junctionMap[contentType];
    if (!config) return [];

    const entityField = config.table[config.entityIdField];

    const rows = await db
      .select({ tagId: config.table[config.tagIdField] })
      .from(config.table)
      .where(eq(entityField, contentId));

    const tagIds = rows.map((r: any) => r.tagId);
    if (tagIds.length === 0) return [];

    return (await db
      .select()
      .from(tags)
      .where(inArray(tags.id, tagIds))) as unknown as TagData[];
  }
}
