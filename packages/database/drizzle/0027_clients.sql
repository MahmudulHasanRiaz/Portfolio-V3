-- Clients (0027).
--
-- New table for the client wall the Astro public site renders
-- (src/components/ClientsWall.astro). Previously hardcoded in the Astro
-- site's src/data/site.ts CLIENTS array; the DB is now the source of
-- truth and the admin panel (D1b) edits these rows.
--
-- Seed: the live CLIENTS copy VERBATIM from Portfolio-Public main
-- 0af172bb src/data/site.ts — Fixed Plus, Avelto. logo_url / website
-- stay NULL (the live copy has neither yet; an admin adds them later),
-- name_bn stays NULL (no Bangla copy in live).
--
-- Safe on a fresh or existing DB: CREATE TABLE IF NOT EXISTS; fixed
-- UUIDs (30000000 range) + ON CONFLICT (id) DO NOTHING, so a second
-- run inserts zero rows and never touches an admin-edited row.

CREATE TABLE IF NOT EXISTS "clients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "name_bn" text,
  "logo_url" text,
  "website" text,
  "sort_order" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
INSERT INTO "clients" ("id", "name", "sort_order") VALUES ('30000000-0000-4000-8000-000000000101', 'Fixed Plus', 1) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "clients" ("id", "name", "sort_order") VALUES ('30000000-0000-4000-8000-000000000102', 'Avelto', 2) ON CONFLICT ("id") DO NOTHING;
