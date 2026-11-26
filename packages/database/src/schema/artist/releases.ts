import { pgTable, uuid, text, varchar, boolean, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { contentStatus, releaseType } from "../enums";

export const releases = pgTable("releases", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  // Bangla twins (0018): optional — the public API falls back to English
  // when a *_bn field is empty. Never required, never seeded.
  // No lyrics_bn column: Bangla lyrics live in release_lyrics.translations
  // under the "bn" key (see release-lyrics.ts). No tune_bn/lyricist_bn
  // columns either: Bangla credits live in credits jsonb as "tune_bn" /
  // "lyricist_bn" keys.
  titleBn: text("title_bn"),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  type: releaseType("type"),
  releaseFormat: varchar("release_format", { length: 50 }),
  coverImage: text("cover_image"),
  description: text("description"),
  descriptionBn: text("description_bn"),
  releaseDate: date("release_date"),
  isFeatured: boolean("is_featured").default(false),
  status: contentStatus("status").default("draft"),
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
  lyrics: text("lyrics"),
  credits: jsonb("credits"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
