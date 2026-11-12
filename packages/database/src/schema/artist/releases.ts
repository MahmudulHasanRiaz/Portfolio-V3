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
  ogImage: text("og_image"),
  canonicalUrl: text("canonical_url"),
  keywords: text("keywords"),
  lyrics: text("lyrics"),
  credits: jsonb("credits"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
