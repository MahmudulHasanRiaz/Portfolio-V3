-- Stats live copy + hero chips (0031).
--
-- The homepage_sections "stats" row still holds the original seed copy
-- ("Years of Experience" / "Projects Delivered" / "Happy Clients" /
-- "Releases Published") while the live site carries the shorter preview
-- copy ("Years Experience" / "Projects" / "Clients" / "Releases") in
-- src/data/site.ts STATS and the i18n dict. The API deliberately did
-- not emit the EN stats labels until now (see getPublicSettings), so
-- wiring the row as-is would REGRESS the stats section to the seed
-- copy on the next Astro deploy.
--
-- This migration aligns the DB row with the live site copy — but ONLY
-- where an item still holds the exact seed default. Every UPDATE is
-- guarded per item (jsonb_set on that item's "label" path, WHERE that
-- item's label = '<seed default>'), so a row an admin already edited
-- is never touched, and label_bn / value / any other key in the item
-- is never touched (jsonb_set replaces one path only). Re-runnable: a
-- second run matches zero rows. Rows that do not exist, or whose items
-- are missing / reordered, match nothing and are left alone.
--
-- Hero chips (re-audit row 11): the hero floating chips ("80+ Projects
-- shipped" / "2,000–5,000 Orders handled daily") are hardcoded in
-- Hero.astro. Chip 1 derives cleanly from the live stats row
-- (stats[1] = 80+ Projects) — single source of truth, no new key.
-- Chip 2 does NOT derive cleanly: no ordersPerDay metric exists
-- anywhere structured — projects expose no metrics in the Public
-- Content API, case-study / venture metrics are unseeded, and the
-- "2,000–5,000" range lives only in prose (project / case-study
-- descriptions). Parsing prose is not a derivation. So the range gets
-- an explicit settings key, "hero_chips": a jsonb array of the two
-- chip NUMBERS, positional [projects, orders], seeded VERBATIM from
-- the live Hero.astro copy (suffixes stay in the Astro i18n dict, so
-- Bangla keeps working). ON CONFLICT DO NOTHING — an admin-set value
-- is never overwritten. The Astro side reads it as settings.heroChips
-- and falls back to the live stats value / build-time number when the
-- key is absent.

-- Stats item 0: "Years of Experience" -> "Years Experience".
UPDATE "homepage_sections" SET "content" = jsonb_set("content", '{items,0,label}', '"Years Experience"'::jsonb) WHERE "section_key" = 'stats' AND "content"->'items'->0->>'label' = 'Years of Experience';
--> statement-breakpoint
-- Stats item 1: "Projects Delivered" -> "Projects".
UPDATE "homepage_sections" SET "content" = jsonb_set("content", '{items,1,label}', '"Projects"'::jsonb) WHERE "section_key" = 'stats' AND "content"->'items'->1->>'label' = 'Projects Delivered';
--> statement-breakpoint
-- Stats item 2: "Happy Clients" -> "Clients".
UPDATE "homepage_sections" SET "content" = jsonb_set("content", '{items,2,label}', '"Clients"'::jsonb) WHERE "section_key" = 'stats' AND "content"->'items'->2->>'label' = 'Happy Clients';
--> statement-breakpoint
-- Stats item 3: "Releases Published" -> "Releases".
UPDATE "homepage_sections" SET "content" = jsonb_set("content", '{items,3,label}', '"Releases"'::jsonb) WHERE "section_key" = 'stats' AND "content"->'items'->3->>'label' = 'Releases Published';
--> statement-breakpoint
-- Hero chips seed: the two chip numbers, positional [projects, orders],
-- verbatim from the live Hero.astro copy. Insert only when absent.
INSERT INTO "settings" ("key", "value", "group", "description")
VALUES ('hero_chips', '["80+", "2,000–5,000"]'::jsonb, 'brand', 'Hero floating-chip numbers, positional [projects, orders] — public homepage. Admin-editable; Astro falls back to the live stats value / build-time number when absent.')
ON CONFLICT DO NOTHING;
