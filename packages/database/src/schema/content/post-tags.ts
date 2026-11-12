import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";

export const postTags = pgTable("post_tags", {
  postId: uuid("post_id"),
  tagId: uuid("tag_id"),
}, (table) => ({
  pk: primaryKey({ columns: [table.postId, table.tagId] }),
}));
