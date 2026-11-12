-- SEO slug for media assets (0019).
--
-- A URL-friendly, human-editable identifier per asset (e.g. "jannat-erp-hero").
-- The admin can change it when needed; it is unique across media_assets so it
-- can be used as a stable public reference / search key alongside the file
-- name and alt text.
--
-- Safe on a DB that already has rows: the column is nullable, the backfill
-- only touches rows where slug IS NULL, and the unique index is created
-- after de-duplication. Re-runnable: ADD COLUMN IF NOT EXISTS +
-- CREATE UNIQUE INDEX IF NOT EXISTS.
--
-- Backfill: slugify the stored filename (lowercase, non-alphanumerics become
-- a single "-", leading/trailing "-" trimmed). Rows that would collide after
-- slugification get a short id suffix so the unique index can be created.

ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "slug" varchar(255);
--> statement-breakpoint
UPDATE "media_assets"
SET "slug" = NULLIF(
  TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(COALESCE("filename", '')), '[^a-z0-9]+', '-', 'g')),
  ''
)
WHERE "slug" IS NULL AND "filename" IS NOT NULL;
--> statement-breakpoint
UPDATE "media_assets" a
SET "slug" = LEFT(a."slug", 240) || '-' || LEFT(a."id"::text, 8)
WHERE a."id" IN (
  SELECT "id" FROM (
    SELECT "id",
      ROW_NUMBER() OVER (PARTITION BY "slug" ORDER BY "created_at" NULLS LAST, "id") AS "rn"
    FROM "media_assets"
    WHERE "slug" IS NOT NULL
  ) s WHERE s."rn" > 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "media_assets_slug_unique" ON "media_assets" ("slug");
