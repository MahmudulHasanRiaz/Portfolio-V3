import { pgTable, uuid, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { resourceType, contentStatus } from "../enums";

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  slug: varchar("slug", { length: 255 }).unique(),
  type: resourceType("type"),
  description: text("description"),
  content: text("content"),
  fileUrl: text("file_url"),
  isFeatured: boolean("is_featured"),
  status: contentStatus("status"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogImage: text("og_image"),
  canonicalUrl: text("canonical_url"),
  keywords: text("keywords"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
