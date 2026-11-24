-- Education + Skills pages (0039, PR #22).
--
-- Skills reuse the existing `technologies` table — three new nullable
-- columns, additive only, no backfill, no seed values:
--   proficiency   integer NULL (0–100, optional; NULL = no bar shown)
--   journey_stage varchar(30) NULL — 'software' | 'graphic_design' |
--                 'digital_marketing'; NULL is treated as 'software'
--                 (all 45 existing rows keep NULL)
--   is_visible    boolean NULL — hide a skill from the Skills page
--                 without deleting it; NULL = visible
--
-- Education is a NEW table `education_entries`. It starts EMPTY — the
-- user's own education history has not been supplied, so no rows are
-- seeded here; he enters his real entries in the admin panel.
-- A NULL end_date means ongoing / present.
--
-- The API auto-applies these statements at runtime via
-- ensureEducationSkills() in apps/api/src/lib/ensure-schema.ts
-- (the same code-level auto-apply pattern as 0036/0037/0038) — the
-- statements below are the record / source of truth, kept in sync
-- with the ensure function. Re-runnable (IF NOT EXISTS) and additive
-- only.
ALTER TABLE "technologies" ADD COLUMN IF NOT EXISTS "proficiency" integer;
ALTER TABLE "technologies" ADD COLUMN IF NOT EXISTS "journey_stage" varchar(30);
ALTER TABLE "technologies" ADD COLUMN IF NOT EXISTS "is_visible" boolean;

CREATE TABLE IF NOT EXISTS "education_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "degree" text,
  "degree_bn" text,
  "institution" text,
  "institution_bn" text,
  "field_of_study" text,
  "start_date" date,
  "end_date" date,
  "grade" text,
  "description" text,
  "description_bn" text,
  "sort_order" integer,
  "is_visible" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
