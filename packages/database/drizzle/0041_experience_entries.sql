-- Experience page (0041, PR #35).
--
-- A NEW table `experience_entries` for the dedicated Experience page
-- (/experience). It starts EMPTY — the user's work history has NOT
-- been supplied, so no rows are seeded here; he enters his real
-- entries in the admin panel. Two kinds of entries, woven into one
-- timeline in time order:
--   type = 'role'    — a job / org role: title = the role, organisation
--                       = the employer
--   type = 'project' — a project-basis engagement: title = the project
--                       name, organisation = the client, project_slug
--                       links to the live project detail page
-- A NULL end_date means ongoing / present.
--
-- The API auto-applies this statement at runtime via
-- ensureExperienceEntries() in apps/api/src/lib/ensure-schema.ts
-- (the same code-level auto-apply pattern as 0036/0037/0038/0039/0040)
-- — the statement below is the record / source of truth, kept in sync
-- with the ensure function. Re-runnable (IF NOT EXISTS) and additive
-- only.
CREATE TABLE IF NOT EXISTS "experience_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" varchar(20),
  "title" text,
  "title_bn" text,
  "organisation" text,
  "organisation_bn" text,
  "start_date" date,
  "end_date" date,
  "description" text,
  "description_bn" text,
  "project_slug" text,
  "sort_order" integer,
  "is_visible" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
