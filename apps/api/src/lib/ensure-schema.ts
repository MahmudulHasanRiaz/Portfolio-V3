// Auto-applied schema ensures (code-level migrations).
//
// The user does not want manual migrations. Additive, idempotent
// column additions that a deployed API version needs are therefore
// applied by the API itself, lazily, the first time a request touches
// the table — instead of by a migration script run by hand.
//
// Pattern (follow it for future additive columns):
//   1. Keep the SQL migration file in packages/database/drizzle/
//      (e.g. 0036_client_logo_display_mode.sql) as the record /
//      source of truth — do NOT delete it.
//   2. Add one `ensureXxx` function here that runs the same
//      `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` via
//      db.execute(). The statement must be idempotent (IF NOT
//      EXISTS), additive only, and safe for existing rows (nullable,
//      no default, no backfill).
//   3. Call it — AWAITED — at the top of every handler that reads or
//      writes the column, before the first query. A module-level
//      promise guards it so the DDL runs at most once per Worker
//      isolate; a failed attempt clears the guard so the next request
//      retries instead of failing forever.
//   4. Never use this for destructive changes (DROP, ALTER TYPE,
//      backfills, data migrations) — those still need a reviewed,
//      manual migration.
import { sql } from "drizzle-orm";
import type { ApiDb } from "../db";

// 0036 (packages/database/drizzle/0036_client_logo_display_mode.sql):
// `logo_display_mode` on `clients` — how a set logo renders.
// Nullable, no default; existing rows keep NULL (= "logo" default).
let clientsLogoDisplayMode: Promise<void> | null = null;

/** Create the `logo_display_mode` column if it does not exist yet.
 *  Idempotent and safe under concurrency (IF NOT EXISTS). Await this
 *  before any query that reads or writes the column. */
export function ensureClientsLogoDisplayMode(db: ApiDb): Promise<void> {
  if (!clientsLogoDisplayMode) {
    clientsLogoDisplayMode = (async () => {
      try {
        await db.execute(
          sql`ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "logo_display_mode" text`,
        );
      } catch (err) {
        // A transient failure (e.g. DB unreachable) must not poison
        // the isolate: clear the guard so the next request retries.
        clientsLogoDisplayMode = null;
        throw err;
      }
    })();
  }
  return clientsLogoDisplayMode;
}

// 0037 (packages/database/drizzle/0037_venture_categories.sql):
// `venture_categories` + `venture_category_assignments` — the tables
// the Drizzle schema and the drizzle snapshot define but no migration
// ever created, so GET /api/admin/ventures/categories 500'd
// ("relation does not exist") and a venture list filtered by
// categoryId (which joins the assignments table) would too.
// Both tables are created here, categories first (assignments has
// FKs to it and to ventures). Idempotent (IF NOT EXISTS), additive
// only, safe under concurrency; existing rows are untouched (there
// are none — the tables never existed). Await this before any query
// that reads or writes either table.
let ventureCategoriesTables: Promise<void> | null = null;

export function ensureVentureCategories(db: ApiDb): Promise<void> {
  if (!ventureCategoriesTables) {
    ventureCategoriesTables = (async () => {
      try {
        await db.execute(sql`CREATE TABLE IF NOT EXISTS "venture_categories" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "name" text,
          "slug" varchar(255) NOT NULL,
          "description" text,
          "created_at" timestamp with time zone DEFAULT now(),
          CONSTRAINT "venture_categories_slug_unique" UNIQUE("slug")
        )`);
        await db.execute(sql`CREATE TABLE IF NOT EXISTS "venture_category_assignments" (
          "venture_id" uuid NOT NULL,
          "category_id" uuid NOT NULL,
          CONSTRAINT "venture_category_assignments_venture_id_category_id_pk" PRIMARY KEY("venture_id", "category_id"),
          CONSTRAINT "venture_category_assignments_venture_id_ventures_id_fk" FOREIGN KEY ("venture_id") REFERENCES "ventures"("id") ON DELETE cascade ON UPDATE no action,
          CONSTRAINT "venture_category_assignments_category_id_venture_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "venture_categories"("id") ON DELETE cascade ON UPDATE no action
        )`);
      } catch (err) {
        // A transient failure must not poison the isolate: clear the
        // guard so the next request retries.
        ventureCategoriesTables = null;
        throw err;
      }
    })();
  }
  return ventureCategoriesTables;
}

// 0039 (packages/database/drizzle/0039_education_skills.sql):
// `proficiency` / `journey_stage` / `is_visible` on `technologies`
// (Skills page) + the new `education_entries` table (Education
// page). All nullable / additive only; existing technology rows keep
// NULL (proficiency unset, journey_stage = 'software', visible).
// The education table starts EMPTY — no seed rows, the user enters
// his real entries in the admin. Await this before any query that
// reads or writes the new columns or the new table.
let educationSkillsSchema: Promise<void> | null = null;

export function ensureEducationSkills(db: ApiDb): Promise<void> {
  if (!educationSkillsSchema) {
    educationSkillsSchema = (async () => {
      try {
        await db.execute(
          sql`ALTER TABLE "technologies" ADD COLUMN IF NOT EXISTS "proficiency" integer`,
        );
        await db.execute(
          sql`ALTER TABLE "technologies" ADD COLUMN IF NOT EXISTS "journey_stage" varchar(30)`,
        );
        await db.execute(
          sql`ALTER TABLE "technologies" ADD COLUMN IF NOT EXISTS "is_visible" boolean`,
        );
        await db.execute(sql`CREATE TABLE IF NOT EXISTS "education_entries" (
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
        )`);
      } catch (err) {
        // A transient failure must not poison the isolate: clear the
        // guard so the next request retries.
        educationSkillsSchema = null;
        throw err;
      }
    })();
  }
  return educationSkillsSchema;
}

// 0038 (packages/database/drizzle/0038_per_item_indexing.sql):
// `indexable` on `case_studies`, `ventures` and `releases` — the
// per-item search-indexing toggle. Projects / posts / services
// already carry this column (their schemas defined it from the
// start); these three types never had one. Nullable, no default;
// existing rows keep NULL (= indexable). The admin edit form flips
// it per item; the public site renders noindex + drops the item from
// the sitemap when false. Await this before any query that reads or
// writes the column on any of the three tables — a Drizzle select
// from a table whose column does not exist yet fails, so every
// handler that touches one of these tables must await it first.
let perItemIndexingColumns: Promise<void> | null = null;

export function ensurePerItemIndexing(db: ApiDb): Promise<void> {
  if (!perItemIndexingColumns) {
    perItemIndexingColumns = (async () => {
      try {
        await db.execute(
          sql`ALTER TABLE "case_studies" ADD COLUMN IF NOT EXISTS "indexable" boolean`,
        );
        await db.execute(
          sql`ALTER TABLE "ventures" ADD COLUMN IF NOT EXISTS "indexable" boolean`,
        );
        await db.execute(
          sql`ALTER TABLE "releases" ADD COLUMN IF NOT EXISTS "indexable" boolean`,
        );
      } catch (err) {
        // A transient failure must not poison the isolate: clear the
        // guard so the next request retries.
        perItemIndexingColumns = null;
        throw err;
      }
    })();
  }
  return perItemIndexingColumns;
}

// 0040 (packages/database/drizzle/0040_client_logo_tone.sql):
// `logo_tone` on `clients` — which the logo IS: "dark" (black text /
// dark shapes, rendered on a LIGHT tile in both themes) or "light"
// (white/light logo, rendered on a DARK tile in both themes).
// Nullable, no default; existing rows keep NULL (= "dark"). Await
// this before any query that reads or writes the column.
let clientsLogoTone: Promise<void> | null = null;

/** Create the `logo_tone` column if it does not exist yet.
 *  Idempotent and safe under concurrency (IF NOT EXISTS). Await this
 *  before any query that reads or writes the column. */
export function ensureClientsLogoTone(db: ApiDb): Promise<void> {
  if (!clientsLogoTone) {
    clientsLogoTone = (async () => {
      try {
        await db.execute(
          sql`ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "logo_tone" text`,
        );
      } catch (err) {
        // A transient failure (e.g. DB unreachable) must not poison
        // the isolate: clear the guard so the next request retries.
        clientsLogoTone = null;
        throw err;
      }
    })();
  }
  return clientsLogoTone;
}

// 0041 (packages/database/drizzle/0041_experience_entries.sql):
// The new `experience_entries` table (Experience page, PR #35) —
// one river timeline weaving role entries (job at an organisation)
// and project entries (project-basis engagement for a client, linked
// to the live project detail page via project_slug). The table starts
// EMPTY — the user's work history has not been supplied, so no rows
// are ever seeded; he enters his real entries in the admin. A NULL
// end_date means ongoing / present. Await this before any query that
// reads or writes the table.
let experienceEntriesTable: Promise<void> | null = null;

export function ensureExperienceEntries(db: ApiDb): Promise<void> {
  if (!experienceEntriesTable) {
    experienceEntriesTable = (async () => {
      try {
        await db.execute(sql`CREATE TABLE IF NOT EXISTS "experience_entries" (
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
        )`);
      } catch (err) {
        // A transient failure must not poison the isolate: clear the
        // guard so the next request retries.
        experienceEntriesTable = null;
        throw err;
      }
    })();
  }
  return experienceEntriesTable;
}
