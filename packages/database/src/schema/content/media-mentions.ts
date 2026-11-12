import { pgTable, uuid, text, varchar, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { contentStatus } from "../enums";
import { ventures } from "../entrepreneur/ventures";

export const mediaMentions = pgTable("media_mentions", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  slug: varchar("slug", { length: 255 }).unique(),
  sourceName: text("source_name"),
  sourceUrl: text("source_url"),
  publishedDate: date("published_date"),
  summary: text("summary"),
  isFeatured: boolean("is_featured"),
  status: contentStatus("status"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogImage: text("og_image"),
  canonicalUrl: text("canonical_url"),
  keywords: text("keywords"),
  createdBy: uuid("created_by"),
  ventureId: uuid("venture_id").references(() => ventures.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
