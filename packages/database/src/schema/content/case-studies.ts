import { pgTable, uuid, text, varchar, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { contentStatus } from "../enums";

export const caseStudies = pgTable("case_studies", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id"),
  title: text("title"),
  // Bangla twins (0018): optional — the public API falls back to English
  // when a *_bn field is empty. Never required, never seeded.
  titleBn: text("title_bn"),
  slug: varchar("slug", { length: 255 }).unique(),
  challenge: text("challenge"),
  challengeBn: text("challenge_bn"),
  research: text("research"),
  researchBn: text("research_bn"),
  strategy: text("strategy"),
  strategyBn: text("strategy_bn"),
  results: text("results"),
  resultsBn: text("results_bn"),
  metrics: jsonb("metrics"),
  // Media system (0010): same shape as projects. isPreview marks dummy
  // preview rows (0011).
  thumbnailType: varchar("thumbnail_type", { length: 10 }).default("image"),
  thumbnailUrl: text("thumbnail_url"),
  thumbnailVideoUrl: text("thumbnail_video_url"),
  thumbnailAutoplay: boolean("thumbnail_autoplay").default(false),
  videos: jsonb("videos").default([]),
  galleryImages: jsonb("gallery_images").default([]),
  isPreview: boolean("is_preview").default(false),
  isFeatured: boolean("is_featured"),
  status: contentStatus("status"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  // Bangla SEO (0043): separate BN meta title / description — the BN
  // detail pages read these with fallback to the EN fields above.
  // Nullable, no default; empty = the BN page shows the EN meta.
  metaTitleBn: text("meta_title_bn"),
  metaDescriptionBn: text("meta_description_bn"),
  ogImage: text("og_image"),
  canonicalUrl: text("canonical_url"),
  keywords: text("keywords"),
  // Per-item search indexing (0038): NULL = indexable (the default).
  // The admin edit form flips this per item; the public site renders
  // noindex + drops the item from the sitemap when false. The global
  // search_indexing_enabled switch stays the master.
  indexable: boolean("indexable"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
