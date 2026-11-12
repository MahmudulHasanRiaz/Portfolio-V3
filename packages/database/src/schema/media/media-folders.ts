import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const mediaFolders = pgTable("media_folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  parentId: uuid("parent_id"),
  path: text("path"),
  createdAt: timestamp("created_at").defaultNow(),
});
