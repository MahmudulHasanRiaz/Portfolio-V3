import { pgTable, uuid, text, varchar, boolean, timestamp, date, jsonb, integer } from "drizzle-orm/pg-core";
import { contentStatus, ventureStatus } from "../enums";

export const ventures = pgTable("ventures", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  // Bangla twins (0018): optional — the public API falls back to English
  // when a *_bn field is empty. Never required, never seeded.
  nameBn: text("name_bn"),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  descriptionBn: text("description_bn"),
  logo: text("logo"),
  website: text("website"),
  foundedDate: date("founded_date"),
  // Founded year only (0035): some ventures have a known founding year
  // but no exact date. Never fake a date as 01/01 — a year-only venture
  // stores foundedYear and leaves foundedDate NULL; saving one clears
  // the other (enforced in the venture profile form). The public API
  // exposes foundedYear and uses `${foundedYear}-01-01` for ordering
  // only, never for display.
  foundedYear: integer("founded_year"),
  contentStatus: contentStatus("content_status").default("draft"),
  coverImage: text("cover_image"),
  socialLinks: jsonb("social_links"),
  metrics: jsonb("metrics"),
  // Media system (0010): thumbnail is an image or a video; videos is an
  // array of video URLs; galleryImages is an array of image URLs shown
  // besides the thumbnail. Columns added by 0017 (ventures were missed
  // by 0010, which only added is_preview here).
  thumbnailType: varchar("thumbnail_type", { length: 10 }).default("image"),
  thumbnailUrl: text("thumbnail_url"),
  thumbnailVideoUrl: text("thumbnail_video_url"),
  thumbnailAutoplay: boolean("thumbnail_autoplay").default(false),
  videos: jsonb("videos").default([]),
  galleryImages: jsonb("gallery_images").default([]),
  teamSize: integer("team_size"),
  industry: text("industry"),
  stage: text("stage"),
  location: text("location"),
  // Short description + sort order (0029): the Combined section's
  // venture mini-rows render a SHORT one-liner (not the long
  // description) in VENTURE_ORDER. short_description_bn is the Bangla
  // twin (0018 pattern). Seeded verbatim from the live VENTURE_SHORT /
  // VENTURE_SHORT_BN / VENTURE_ORDER maps (Portfolio-Public
  // src/components/Combined.astro).
  shortDescription: text("short_description"),
  shortDescriptionBn: text("short_description_bn"),
  sortOrder: integer("sort_order"),
  status: ventureStatus("status").default("active"),
  isFeatured: boolean("is_featured").default(false),
  // isPreview (0010) marks dummy preview rows (0011).
  isPreview: boolean("is_preview").default(false),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogImage: text("og_image"),
  canonicalUrl: text("canonical_url"),
  keywords: text("keywords"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
