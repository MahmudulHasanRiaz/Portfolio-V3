-- Per-item search indexing (0038).
--
-- The `indexable` column already exists on projects / posts /
-- services (their schemas carried it from the start); case studies,
-- ventures and releases never got one, so a per-item indexing toggle
-- had nowhere to live for those three types. This adds the same
-- nullable boolean to all three:
--   NULL  — indexable (the default; existing rows keep NULL)
--   true  — indexable
--   false — excluded from indexing: the public detail page renders
--           noindex,nofollow and the sitemap drops the item.
-- The global `search_indexing_enabled` setting stays the master:
-- global OFF means nothing indexes regardless of this column.
-- The API auto-applies these statements at runtime via
-- ensurePerItemIndexing() in apps/api/src/lib/ensure-schema.ts
-- (the same code-level auto-apply pattern as 0036/0037) — the
-- statements below are the record / source of truth, kept in sync
-- with the ensure function. Re-runnable (IF NOT EXISTS) and additive
-- only; no seed values, no backfill.
ALTER TABLE "case_studies" ADD COLUMN IF NOT EXISTS "indexable" boolean;
ALTER TABLE "ventures" ADD COLUMN IF NOT EXISTS "indexable" boolean;
ALTER TABLE "releases" ADD COLUMN IF NOT EXISTS "indexable" boolean;
