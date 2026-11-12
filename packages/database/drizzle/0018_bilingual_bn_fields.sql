-- 0018 — Bangla (bn) fields for every configurable content field.
--
-- Bilingual model (Portfolio-V2 bilingual round, 2026-11-08): every API item
-- gains an optional nested `bn` object with the SAME field names as the
-- English top level, carrying the Bangla strings where set. The Astro public
-- site falls back to English for any field missing from `bn`, so Bangla
-- columns are all NULLABLE and never required.
--
-- STORAGE CHOICE — per-field `*_bn` TEXT columns (not a translations JSONB):
-- the existing schema is column-per-field throughout (title, summary,
-- description, ...), so a `title_bn` next to `title` is the most obvious,
-- queryable and Drizzle-type-safe shape, and it follows migration 0017's
-- ADD COLUMN IF NOT EXISTS pattern exactly. Two deliberate exceptions,
-- where the English value already lives in a jsonb (no new column):
--   * release lyrics — Bangla lyrics live in release_lyrics.translations
--     as the "bn" key (that jsonb exists precisely for translations; the
--     legacy releases.lyrics column is never populated, so no lyrics_bn
--     column is added here).
--   * release credits (tune / lyricist) — Bangla lives in releases.credits
--     as "tune_bn" / "lyricist_bn" keys (credits is already a jsonb).
--   * stats labels — Bangla lives in the homepage_sections "stats" row
--     content as "label_bn" per item (that row is the stats home).
-- Tags are NOT translated (filters/identifiers — left as-is).
--
-- Safe on a DB that already has rows: every new column is nullable text;
-- nothing is dropped, renamed or altered. Re-runnable: ADD COLUMN IF NOT
-- EXISTS + INSERT ... ON CONFLICT DO NOTHING.
--
-- SEED — hero / Know Me English copy as settings rows. The Astro public
-- site hardcodes this copy today (astro-public/src/data/site.ts PROFILE);
-- seeding the EXACT same strings (verbatim, 2026-11-08) makes the admin
-- panel the source of truth with zero copy change. ON CONFLICT DO NOTHING
-- means an admin edit is never overwritten by re-running this migration.
-- The Bangla twins (hero_headline_bn etc.) are NOT seeded — empty means
-- the public site falls back to English, and Bangla copy is the admin's
-- (or the user's) to write, never invented here.
-- No row is seeded for default_language: the code default is "en" and the
-- API returns "en" while the row is missing.

ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "title_bn" text;
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "excerpt_bn" text;
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "content_bn" text;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "title_bn" text;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "summary_bn" text;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "description_bn" text;
--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN IF NOT EXISTS "title_bn" text;
--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN IF NOT EXISTS "challenge_bn" text;
--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN IF NOT EXISTS "research_bn" text;
--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN IF NOT EXISTS "strategy_bn" text;
--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN IF NOT EXISTS "results_bn" text;
--> statement-breakpoint
ALTER TABLE "ventures" ADD COLUMN IF NOT EXISTS "name_bn" text;
--> statement-breakpoint
ALTER TABLE "ventures" ADD COLUMN IF NOT EXISTS "description_bn" text;
--> statement-breakpoint
ALTER TABLE "releases" ADD COLUMN IF NOT EXISTS "title_bn" text;
--> statement-breakpoint
ALTER TABLE "releases" ADD COLUMN IF NOT EXISTS "description_bn" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "title_bn" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "summary_bn" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "description_bn" text;
--> statement-breakpoint
INSERT INTO "settings" ("key", "value", "group", "description")
VALUES
  ('hero_headline', to_jsonb('I build products people rely on every day.'::text), 'brand', 'SE hero headline (English) — public homepage. Bangla twin key: hero_headline_bn.'),
  ('hero_description', to_jsonb('ERP, e-commerce and SaaS systems for businesses in Bangladesh and beyond — designed to hold up at real-world scale.'::text), 'brand', 'SE hero description (English) — public homepage. Bangla twin key: hero_description_bn.'),
  ('know_me_headline', to_jsonb('Software engineer, entrepreneur and nasheed artist — one person, five callings.'::text), 'brand', 'Know Me hero headline (English) — public homepage. Bangla twin key: know_me_headline_bn.'),
  ('know_me_sub', to_jsonb('Mahmudul Hasan Riaz — a Hafiz-Alem who builds ERP and e-commerce software, founded three ventures, and shares nasheed, tilawat and lectures with listeners around the world.'::text), 'brand', 'Know Me hero sub (English) — public homepage. Bangla twin key: know_me_sub_bn.')
ON CONFLICT ("key") DO NOTHING;
