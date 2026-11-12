import { pgTable, uuid, text, varchar, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { postStatus } from "../enums";

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  // Bangla twin (0018): optional — the public API falls back to English
  // when a *_bn field is empty. Never required, never seeded.
  titleBn: text("title_bn"),
  slug: varchar("slug", { length: 255 }).unique(),
  excerpt: text("excerpt"),
  excerptBn: text("excerpt_bn"),
  content: text("content"),
  contentBn: text("content_bn"),
  coverImage: text("cover_image"),
  // Media system (0010): same shape as projects. isPreview marks dummy
  // preview rows (0011).
  thumbnailType: varchar("thumbnail_type", { length: 10 }).default("image"),
  thumbnailUrl: text("thumbnail_url"),
  thumbnailVideoUrl: text("thumbnail_video_url"),
  thumbnailAutoplay: boolean("thumbnail_autoplay").default(false),
  videos: jsonb("videos").default([]),
  galleryImages: jsonb("gallery_images").default([]),
  isPreview: boolean("is_preview").default(false),
  authorId: uuid("author_id"),
  isFeatured: boolean("is_featured"),
  status: postStatus("status"),
  publishAt: timestamp("publish_at"),
  unpublishAt: timestamp("unpublish_at"),
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
