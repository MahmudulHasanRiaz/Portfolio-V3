import { pgTable, uuid, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { contentStatus } from "../enums";

export const pages = pgTable("pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  content: text("content"),
  template: varchar("template", { length: 100 }),
  status: contentStatus("status"),
  locale: varchar("locale", { length: 10 }),
  translationGroup: uuid("translation_group"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogImage: text("og_image"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
