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
  ogImage: text("og_image"),
  canonicalUrl: text("canonical_url"),
  keywords: text("keywords"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
