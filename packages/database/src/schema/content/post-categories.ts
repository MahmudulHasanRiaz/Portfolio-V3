import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";

export const postCategories = pgTable("post_categories", {
  postId: uuid("post_id"),
  categoryId: uuid("category_id"),
}, (table) => ({
  pk: primaryKey({ columns: [table.postId, table.categoryId] }),
}));
