-- 0016 — seed the content the Public Content API needs so it returns
-- complete rows for the Astro public site (ASTRO_HYBRID_PLAN.md §7).
--
-- Root cause: the API returns incomplete rows because the DB lacks data —
-- the 4 real projects have no thumbnail, no start_date, and are missing
-- some tech links; the 4 audio singles have no platform rows. The Astro
-- merge preserves build-time fields when the live row is empty, but the
-- admin panel must be the source of truth, so the DB is seeded here.
--
-- The design is FIXED (React preview "Portfolio UI" is the target). This
-- migration only fills content so the design renders — it never changes
-- the design, and it never overwrites real data:
--   * Thumbnails are set ONLY where thumbnail_url AND thumbnail AND
--     cover_image are all NULL (a real screenshot is never overwritten).
--   * start_date is set ONLY where it is NULL (a real date is never
--     overwritten). The dates below are display-order values that put the
--     flagship first (Jannat, EcoMate, SurgicalX, WooMate Lite, then the
--     two dummies); the exact real start dates are unknown and can be
--     corrected from admin.
--   * Tech links are added, never removed. Technology rows are created
--     only when the name does not already exist.
--   * release_platforms rows are added only when the (release, platform)
--     pair does not already exist. Ya Nabi is NEVER touched.
-- Idempotent: every statement is guarded (IS NULL / NOT EXISTS /
-- ON CONFLICT DO NOTHING). Safe to re-run. No DELETE. No schema change.
--
-- Values (all verified, never invented):
--   * Thumbnails + techs: the Astro build-time content
--     (astro-public/src/content/projects/*.md) — the same Unsplash URLs
--     and tech lists the preview renders.
--   * Spotify track URLs: verified per-track links (user-provided).
--   * Release UUIDs: migration 0009 (10000000-0000-4000-8000-…0001–0008).

-- ─── 1. Project thumbnails (4 real projects) ───────────────────────────
-- API reads thumbnail_url ?? thumbnail ?? cover_image. Set all three to
-- the same Unsplash URL so every reader gets the thumbnail.
UPDATE "projects"
SET "thumbnail_url" = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80&auto=format&fit=crop',
    "thumbnail" = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80&auto=format&fit=crop',
    "cover_image" = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80&auto=format&fit=crop'
WHERE "slug" = 'ecomate'
  AND "thumbnail_url" IS NULL AND "thumbnail" IS NULL AND "cover_image" IS NULL;
--> statement-breakpoint

UPDATE "projects"
SET "thumbnail_url" = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&auto=format&fit=crop',
    "thumbnail" = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&auto=format&fit=crop',
    "cover_image" = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&auto=format&fit=crop'
WHERE "slug" = 'jannat-fashion-erp'
  AND "thumbnail_url" IS NULL AND "thumbnail" IS NULL AND "cover_image" IS NULL;
--> statement-breakpoint

UPDATE "projects"
SET "thumbnail_url" = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80&auto=format&fit=crop',
    "thumbnail" = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80&auto=format&fit=crop',
    "cover_image" = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80&auto=format&fit=crop'
WHERE "slug" = 'surgicalx'
  AND "thumbnail_url" IS NULL AND "thumbnail" IS NULL AND "cover_image" IS NULL;
--> statement-breakpoint

UPDATE "projects"
SET "thumbnail_url" = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80&auto=format&fit=crop',
    "thumbnail" = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80&auto=format&fit=crop',
    "cover_image" = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80&auto=format&fit=crop'
WHERE "slug" = 'woomate-lite'
  AND "thumbnail_url" IS NULL AND "thumbnail" IS NULL AND "cover_image" IS NULL;
--> statement-breakpoint

-- ─── 2. Project techs (add the build-time techs missing from the DB) ────
-- The DB already links some techs (e.g. EcoMate has Next.js/React/
-- PostgreSQL/Docker; Jannat has Next.js/PostgreSQL). Only the missing
-- ones are added here; nothing is removed.
-- Ensure the technology rows exist (by name; no unique constraint is
-- assumed, so NOT EXISTS is used).
INSERT INTO "technologies" ("name")
SELECT 'TypeScript'
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'TypeScript');
--> statement-breakpoint

INSERT INTO "technologies" ("name")
SELECT 'React'
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'React');
--> statement-breakpoint

INSERT INTO "technologies" ("name")
SELECT 'WooCommerce'
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'WooCommerce');
--> statement-breakpoint

INSERT INTO "technologies" ("name")
SELECT 'PHP'
WHERE NOT EXISTS (SELECT 1 FROM "technologies" WHERE "name" = 'PHP');
--> statement-breakpoint

-- Link the missing techs (PK on (project_id, technology_id) makes
-- ON CONFLICT DO NOTHING safe to re-run).
-- EcoMate is missing TypeScript.
INSERT INTO "project_technologies" ("project_id", "technology_id")
SELECT p."id", t."id"
FROM "projects" p JOIN "technologies" t ON t."name" = 'TypeScript'
WHERE p."slug" = 'ecomate'
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Jannat is missing React, TypeScript and WooCommerce.
INSERT INTO "project_technologies" ("project_id", "technology_id")
SELECT p."id", t."id"
FROM "projects" p JOIN "technologies" t ON t."name" = 'React'
WHERE p."slug" = 'jannat-fashion-erp'
ON CONFLICT DO NOTHING;
--> statement-breakpoint

INSERT INTO "project_technologies" ("project_id", "technology_id")
SELECT p."id", t."id"
FROM "projects" p JOIN "technologies" t ON t."name" = 'TypeScript'
WHERE p."slug" = 'jannat-fashion-erp'
ON CONFLICT DO NOTHING;
--> statement-breakpoint

INSERT INTO "project_technologies" ("project_id", "technology_id")
SELECT p."id", t."id"
FROM "projects" p JOIN "technologies" t ON t."name" = 'WooCommerce'
WHERE p."slug" = 'jannat-fashion-erp'
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- WooMate Lite is missing PHP.
INSERT INTO "project_technologies" ("project_id", "technology_id")
SELECT p."id", t."id"
FROM "projects" p JOIN "technologies" t ON t."name" = 'PHP'
WHERE p."slug" = 'woomate-lite'
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- ─── 3. Project order (start_date) ─────────────────────────────────────
-- The API's publishedAt is start_date ?? created_at, and the Astro site
-- sorts by publishedAt desc. The 4 real projects have start_date NULL
-- (their publishedAt is the created_at stamp 2026-10-29, milliseconds
-- apart, so the order came out backwards: WooMate first, Jannat last).
-- Set distinct start_dates so the flagship order is:
-- Jannat, EcoMate, SurgicalX, WooMate Lite, StyleNest, PharmaTrack.
-- Only rows with start_date NULL are set (a real date is never changed).
UPDATE "projects" SET "start_date" = '2026-06-01'
WHERE "slug" = 'jannat-fashion-erp' AND "start_date" IS NULL;
--> statement-breakpoint

UPDATE "projects" SET "start_date" = '2026-05-01'
WHERE "slug" = 'ecomate' AND "start_date" IS NULL;
--> statement-breakpoint

UPDATE "projects" SET "start_date" = '2026-04-01'
WHERE "slug" = 'surgicalx' AND "start_date" IS NULL;
--> statement-breakpoint

UPDATE "projects" SET "start_date" = '2026-03-01'
WHERE "slug" = 'woomate-lite' AND "start_date" IS NULL;
--> statement-breakpoint

-- The two dummies already have start_dates (0011): StyleNest 2026-01-15,
-- PharmaTrack 2026-02-01 — which would put PharmaTrack before StyleNest.
-- StyleNest is a dummy (is_preview = true), so its date is moved to
-- 2026-02-15 to keep the preview order (StyleNest, then PharmaTrack).
UPDATE "projects" SET "start_date" = '2026-02-15'
WHERE "slug" = 'stylenest-fashion-ecommerce' AND "is_preview" = true;
--> statement-breakpoint

-- ─── 4. Spotify platform rows for the 4 audio singles ──────────────────
-- Verified per-track Spotify URLs. The 3 video releases already have
-- YouTube rows (0009). Ya Nabi (…0001) is deliberately NOT given a
-- platform row here and is never touched.
INSERT INTO "release_platforms" ("release_id", "platform_name", "platform_url")
SELECT '10000000-0000-4000-8000-000000000002', 'Spotify', 'https://open.spotify.com/track/7gHEEFVdBHNaGRpJYWmhXD'
WHERE NOT EXISTS (
  SELECT 1 FROM "release_platforms"
  WHERE "release_id" = '10000000-0000-4000-8000-000000000002' AND "platform_name" = 'Spotify'
);
--> statement-breakpoint

INSERT INTO "release_platforms" ("release_id", "platform_name", "platform_url")
SELECT '10000000-0000-4000-8000-000000000003', 'Spotify', 'https://open.spotify.com/track/4oVaaEgB6u5pvJ1uqu4Aku'
WHERE NOT EXISTS (
  SELECT 1 FROM "release_platforms"
  WHERE "release_id" = '10000000-0000-4000-8000-000000000003' AND "platform_name" = 'Spotify'
);
--> statement-breakpoint

INSERT INTO "release_platforms" ("release_id", "platform_name", "platform_url")
SELECT '10000000-0000-4000-8000-000000000004', 'Spotify', 'https://open.spotify.com/track/7JTHMNqnpjucJxcLgqLUE8'
WHERE NOT EXISTS (
  SELECT 1 FROM "release_platforms"
  WHERE "release_id" = '10000000-0000-4000-8000-000000000004' AND "platform_name" = 'Spotify'
);
--> statement-breakpoint

INSERT INTO "release_platforms" ("release_id", "platform_name", "platform_url")
SELECT '10000000-0000-4000-8000-000000000005', 'Spotify', 'https://open.spotify.com/track/2IueAsnwbSIFDU2wyOt5YI'
WHERE NOT EXISTS (
  SELECT 1 FROM "release_platforms"
  WHERE "release_id" = '10000000-0000-4000-8000-000000000005' AND "platform_name" = 'Spotify'
);
