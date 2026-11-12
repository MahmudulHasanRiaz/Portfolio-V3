import { pgTable, uuid, text, varchar, boolean, timestamp, jsonb, date } from "drizzle-orm/pg-core";
import { contentStatus } from "../enums";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  // Bangla twins (0018): optional — the public API falls back to English
  // when a *_bn field is empty. Never required, never seeded.
  titleBn: text("title_bn"),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  summary: text("summary"),
  summaryBn: text("summary_bn"),
  description: text("description"),
  descriptionBn: text("description_bn"),
  thumbnail: text("thumbnail"),
  coverImage: text("cover_image"),
  // Media system (0010): thumbnail is an image or a video; videos is an
  // array of video URLs; galleryImages is an array of image URLs shown
  // besides the thumbnail. isPreview marks dummy preview rows (0011).
  thumbnailType: varchar("thumbnail_type", { length: 10 }).default("image"),
  thumbnailUrl: text("thumbnail_url"),
  thumbnailVideoUrl: text("thumbnail_video_url"),
  thumbnailAutoplay: boolean("thumbnail_autoplay").default(false),
  videos: jsonb("videos").default([]),
  galleryImages: jsonb("gallery_images").default([]),
  isPreview: boolean("is_preview").default(false),
  industry: varchar("industry", { length: 100 }),
  clientName: text("client_name"),
  projectUrl: text("project_url"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: contentStatus("status"),
  isFeatured: boolean("is_featured"),
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
