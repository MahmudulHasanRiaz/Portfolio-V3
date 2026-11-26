-- Bangla SEO fields (0043).
--
-- EN and BN detail pages shared one Meta Title / Description, so every
-- BN detail page showed the English meta (or the English fallback
-- title). `meta_title_bn` / `meta_description_bn` give each item a
-- separate Bangla meta title + description, entered in the admin SEO
-- section next to the English fields. The BN detail pages read the BN
-- field with fallback to the EN field; the seo_meta override table is
-- untouched (it stays EN-only — a BN page falls back to the overridden
-- EN value when no BN value is set).
-- The columns are nullable with no default: existing rows keep NULL
-- and render exactly as before (BN pages show the EN meta). No other
-- table touched — services and pages have no BN detail page, so their
-- BN meta would be dead input.
-- Re-runnable (IF NOT EXISTS) and additive only. The API
-- auto-applies this at runtime via ensureBnSeoFields() in
-- apps/api/src/lib/ensure-schema.ts (the same code-level auto-apply
-- pattern as 0036–0042) — this file is the record / source of truth,
-- kept in sync with the ensure function.
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "meta_title_bn" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "meta_description_bn" text;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "meta_title_bn" text;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "meta_description_bn" text;
ALTER TABLE "case_studies" ADD COLUMN IF NOT EXISTS "meta_title_bn" text;
ALTER TABLE "case_studies" ADD COLUMN IF NOT EXISTS "meta_description_bn" text;
ALTER TABLE "ventures" ADD COLUMN IF NOT EXISTS "meta_title_bn" text;
ALTER TABLE "ventures" ADD COLUMN IF NOT EXISTS "meta_description_bn" text;
ALTER TABLE "releases" ADD COLUMN IF NOT EXISTS "meta_title_bn" text;
ALTER TABLE "releases" ADD COLUMN IF NOT EXISTS "meta_description_bn" text;
