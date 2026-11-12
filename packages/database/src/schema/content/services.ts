import { pgTable, uuid, text, varchar, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { contentStatus } from "../enums";

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  // Bangla twins (0018): optional — the public API falls back to English
  // when a *_bn field is empty. Never required, never seeded. (No services
  // type exists in the Public Content API yet — these columns are ready for
  // the follow-up that adds it; see the bilingual PR report.)
  titleBn: text("title_bn"),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  summary: text("summary"),
  summaryBn: text("summary_bn"),
  description: text("description"),
  descriptionBn: text("description_bn"),
  icon: text("icon"),
  priceRange: text("price_range"),
  // Media system (0020): same thumbnail shape as posts/projects/case
  // studies, so the admin thumbnail picker works for services too. No
  // videos/galleryImages columns — services have no media gallery.
  thumbnailType: varchar("thumbnail_type", { length: 10 }).default("image"),
  thumbnailUrl: text("thumbnail_url"),
  thumbnailVideoUrl: text("thumbnail_video_url"),
  thumbnailAutoplay: boolean("thumbnail_autoplay").default(false),
  isFeatured: boolean("is_featured"),
  status: contentStatus("status"),
  sortOrder: integer("sort_order"),
  locale: varchar("locale", { length: 10 }),
  translationGroup: uuid("translation_group"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogImage: text("og_image"),
  canonicalUrl: text("canonical_url"),
  keywords: text("keywords"),
  indexable: boolean("indexable"),
  followLinks: boolean("follow_links"),
  archiveAllowed: boolean("archive_allowed"),
  canonicalOverride: text("canonical_override"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
