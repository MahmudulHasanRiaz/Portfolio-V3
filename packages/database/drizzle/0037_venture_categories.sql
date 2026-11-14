-- Venture categories (0037).
--
-- The Drizzle schema (packages/database/src/schema/entrepreneur/
-- venture-categories.ts and venture-category-assignments.ts) AND the
-- drizzle snapshot (meta/0036_snapshot.json) both define these two
-- tables, but no migration SQL ever created them in the database —
-- so GET /api/admin/ventures/categories (and any venture list filtered
-- by categoryId, which joins venture_category_assignments) failed with
-- a 500 ("relation does not exist"). The Admin Ventures list itself
-- kept working because it only joins the assignments table when a
-- categoryId filter is passed.
--
-- The API auto-applies this file's statements at runtime via
-- ensureVentureCategories() in apps/api/src/lib/ensure-schema.ts
-- (the same code-level auto-apply pattern as 0036) — the statements
-- below are the record / source of truth, kept in sync with the
-- ensure function. Re-runnable (IF NOT EXISTS) and additive only:
-- venture_categories first (assignments references it), then
-- venture_category_assignments with its composite PK and FKs.
CREATE TABLE IF NOT EXISTS "venture_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text,
  "slug" varchar(255) NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "venture_categories_slug_unique" UNIQUE("slug")
);
CREATE TABLE IF NOT EXISTS "venture_category_assignments" (
  "venture_id" uuid NOT NULL,
  "category_id" uuid NOT NULL,
  CONSTRAINT "venture_category_assignments_venture_id_category_id_pk" PRIMARY KEY("venture_id", "category_id"),
  CONSTRAINT "venture_category_assignments_venture_id_ventures_id_fk" FOREIGN KEY ("venture_id") REFERENCES "ventures"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "venture_category_assignments_category_id_venture_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "venture_categories"("id") ON DELETE cascade ON UPDATE no action
);
