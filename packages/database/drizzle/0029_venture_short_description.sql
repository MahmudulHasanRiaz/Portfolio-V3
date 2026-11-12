-- Venture short descriptions + sort order (0029).
--
-- The Astro public site's Combined section renders venture mini-rows
-- with SHORT one-line descriptions and a fixed order (HisabKit,
-- CloudDesk, SkillBridge), previously hardcoded in
-- src/components/Combined.astro as VENTURE_SHORT / VENTURE_SHORT_BN /
-- VENTURE_ORDER. The ventures table had neither column; the API's long
-- descriptions got cut off mid-sentence in the mini-row.
--
-- Seed: VENTURE_SHORT + VENTURE_SHORT_BN VERBATIM from Portfolio-Public
-- main 0af172bb src/components/Combined.astro, plus sort_order from
-- VENTURE_ORDER (hisabkit 1, clouddesk 2, skillbridge 3).
--
-- Every UPDATE is guarded per column (WHERE <col> IS NULL, the 0022
-- guarded-seed pattern), so a row an admin already edited is never
-- touched. Re-runnable: a second run matches zero rows.

ALTER TABLE "ventures" ADD COLUMN IF NOT EXISTS "short_description" text;
--> statement-breakpoint
ALTER TABLE "ventures" ADD COLUMN IF NOT EXISTS "short_description_bn" text;
--> statement-breakpoint
ALTER TABLE "ventures" ADD COLUMN IF NOT EXISTS "sort_order" integer;
--> statement-breakpoint
UPDATE "ventures" SET "short_description" = 'Accounting toolkit for small Bangladeshi businesses.' WHERE "slug" = 'hisabkit' AND "short_description" IS NULL;
--> statement-breakpoint
UPDATE "ventures" SET "short_description_bn" = 'ছোট বাংলাদেশি বিজনেসের জন্য হিসাব রাখার টুলকিট।' WHERE "slug" = 'hisabkit' AND "short_description_bn" IS NULL;
--> statement-breakpoint
UPDATE "ventures" SET "sort_order" = 1 WHERE "slug" = 'hisabkit' AND "sort_order" IS NULL;
--> statement-breakpoint
UPDATE "ventures" SET "short_description" = 'Remote-work tools for distributed teams.' WHERE "slug" = 'clouddesk' AND "short_description" IS NULL;
--> statement-breakpoint
UPDATE "ventures" SET "short_description_bn" = 'দূরবর্তী দলের জন্য রিমোট-ওয়ার্ক টুল।' WHERE "slug" = 'clouddesk' AND "short_description_bn" IS NULL;
--> statement-breakpoint
UPDATE "ventures" SET "sort_order" = 2 WHERE "slug" = 'clouddesk' AND "sort_order" IS NULL;
--> statement-breakpoint
UPDATE "ventures" SET "short_description" = 'Connecting skilled freelancers with local businesses.' WHERE "slug" = 'skillbridge' AND "short_description" IS NULL;
--> statement-breakpoint
UPDATE "ventures" SET "short_description_bn" = 'দক্ষ ফ্রিল্যান্সারদের সঙ্গে লোকাল বিজনেসের সংযোগ।' WHERE "slug" = 'skillbridge' AND "short_description_bn" IS NULL;
--> statement-breakpoint
UPDATE "ventures" SET "sort_order" = 3 WHERE "slug" = 'skillbridge' AND "sort_order" IS NULL;
