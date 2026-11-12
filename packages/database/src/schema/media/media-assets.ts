import { pgTable, uuid, varchar, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename"),
  originalName: text("original_name"),
  path: text("path"),
  type: varchar("type", { length: 50 }),
  size: integer("size"),
  width: integer("width"),
  height: integer("height"),
  altText: text("alt_text"),
  slug: varchar("slug", { length: 255 }).unique(),
  folderId: uuid("folder_id"),
  variants: jsonb("variants"),
  uploadedBy: uuid("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});
