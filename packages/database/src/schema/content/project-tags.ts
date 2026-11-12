import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";

// Project tags join (0028) — follows the existing postTags pattern
// exactly (two uuid columns, composite primary key, no foreign keys).
export const projectTags = pgTable("project_tags", {
  projectId: uuid("project_id"),
  tagId: uuid("tag_id"),
}, (table) => ({
  pk: primaryKey({ columns: [table.projectId, table.tagId] }),
}));
