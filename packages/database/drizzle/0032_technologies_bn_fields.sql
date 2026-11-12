-- Technologies: Bangla name + use columns (0032).
--
-- D1a documented this gap explicitly: the technologies table had NO
-- *_bn columns, so the admin form had no Bangla fields and the Public
-- Content API emitted no bn overlay for tech names / `use` text — the
-- only directory table without Bangla twins (platforms and clients
-- follow the PR #76 EN + BN pattern since 0018).
--
-- This migration adds the two nullable columns. No seed values: every
-- existing row keeps NULL, so the API falls back to English until an
-- admin fills the Bangla text from the form. Re-runnable (IF NOT
-- EXISTS) and additive only — nothing else is touched.
ALTER TABLE "technologies" ADD COLUMN IF NOT EXISTS "name_bn" text;
--> statement-breakpoint
ALTER TABLE "technologies" ADD COLUMN IF NOT EXISTS "use_bn" text;
