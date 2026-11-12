-- Project + case-study tags (0028).
--
-- The Public Content API hardcoded `tags: []` for projects and case
-- studies because no join tables existed — only posts had post_tags.
-- This migration adds project_tags + case_study_tags following the
-- existing post_tags pattern EXACTLY (two uuid columns, composite
-- primary key, no foreign keys — post_tags has none either).
--
-- Seed: the tags from the live .md frontmatter on Portfolio-Public main
-- 0af172bb (src/content/projects/*.md, src/content/case-studies/*.md),
-- VERBATIM. Tag rows are created by name when missing (slug = the shared
-- slugify of the name); join rows link by slug OR exact title, so the
-- seed lands even if a row's slug differs from the .md slug (the 0023
-- lesson: never assume a DB slug from a file). ON CONFLICT DO NOTHING
-- makes every statement re-runnable.
--
-- Projects:
--   ecomate: SaaS, ERP, E-commerce
--   jannat-fashion-erp: Next.js, ERP, E-commerce
--   pharmatrack-pharmacy-erp: ERP, Pharmacy
--   stylenest-fashion-ecommerce: WooCommerce, E-commerce, Fraud
--   surgicalx: WordPress, E-commerce
--   woomate-lite: WordPress, Plugin
-- Case studies:
--   jannat-fashion-erp-case-study: Next.js, ERP, E-commerce
--   pharmatrack-case-study: Next.js, ERP, Pharmacy
--   stylenest-case-study: WooCommerce, E-commerce

CREATE TABLE IF NOT EXISTS "project_tags" (
  "project_id" uuid,
  "tag_id" uuid,
  CONSTRAINT "project_tags_project_id_tag_id_pk" PRIMARY KEY("project_id", "tag_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_study_tags" (
  "case_study_id" uuid,
  "tag_id" uuid,
  CONSTRAINT "case_study_tags_case_study_id_tag_id_pk" PRIMARY KEY("case_study_id", "tag_id")
);
--> statement-breakpoint
INSERT INTO "tags" ("id", "name", "slug") SELECT '30000000-0000-4000-8000-000000000201', 'SaaS', 'saas' WHERE NOT EXISTS (SELECT 1 FROM "tags" WHERE "name" = 'SaaS');
--> statement-breakpoint
INSERT INTO "tags" ("id", "name", "slug") SELECT '30000000-0000-4000-8000-000000000202', 'ERP', 'erp' WHERE NOT EXISTS (SELECT 1 FROM "tags" WHERE "name" = 'ERP');
--> statement-breakpoint
INSERT INTO "tags" ("id", "name", "slug") SELECT '30000000-0000-4000-8000-000000000203', 'E-commerce', 'e-commerce' WHERE NOT EXISTS (SELECT 1 FROM "tags" WHERE "name" = 'E-commerce');
--> statement-breakpoint
INSERT INTO "tags" ("id", "name", "slug") SELECT '30000000-0000-4000-8000-000000000204', 'Next.js', 'nextjs' WHERE NOT EXISTS (SELECT 1 FROM "tags" WHERE "name" = 'Next.js');
--> statement-breakpoint
INSERT INTO "tags" ("id", "name", "slug") SELECT '30000000-0000-4000-8000-000000000205', 'Pharmacy', 'pharmacy' WHERE NOT EXISTS (SELECT 1 FROM "tags" WHERE "name" = 'Pharmacy');
--> statement-breakpoint
INSERT INTO "tags" ("id", "name", "slug") SELECT '30000000-0000-4000-8000-000000000206', 'WooCommerce', 'woocommerce' WHERE NOT EXISTS (SELECT 1 FROM "tags" WHERE "name" = 'WooCommerce');
--> statement-breakpoint
INSERT INTO "tags" ("id", "name", "slug") SELECT '30000000-0000-4000-8000-000000000207', 'Fraud', 'fraud' WHERE NOT EXISTS (SELECT 1 FROM "tags" WHERE "name" = 'Fraud');
--> statement-breakpoint
INSERT INTO "tags" ("id", "name", "slug") SELECT '30000000-0000-4000-8000-000000000208', 'WordPress', 'wordpress' WHERE NOT EXISTS (SELECT 1 FROM "tags" WHERE "name" = 'WordPress');
--> statement-breakpoint
INSERT INTO "tags" ("id", "name", "slug") SELECT '30000000-0000-4000-8000-000000000209', 'Plugin', 'plugin' WHERE NOT EXISTS (SELECT 1 FROM "tags" WHERE "name" = 'Plugin');
--> statement-breakpoint
INSERT INTO "project_tags" ("project_id", "tag_id") SELECT p."id", t."id" FROM "projects" p CROSS JOIN "tags" t WHERE (p."slug" = 'ecomate' OR p."title" = 'EcoMate') AND t."name" = 'SaaS' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "project_tags" ("project_id", "tag_id") SELECT p."id", t."id" FROM "projects" p CROSS JOIN "tags" t WHERE (p."slug" = 'ecomate' OR p."title" = 'EcoMate') AND t."name" = 'ERP' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "project_tags" ("project_id", "tag_id") SELECT p."id", t."id" FROM "projects" p CROSS JOIN "tags" t WHERE (p."slug" = 'ecomate' OR p."title" = 'EcoMate') AND t."name" = 'E-commerce' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "project_tags" ("project_id", "tag_id") SELECT p."id", t."id" FROM "projects" p CROSS JOIN "tags" t WHERE (p."slug" = 'jannat-fashion-erp' OR p."title" = 'Jannat Fashion ERP') AND t."name" = 'Next.js' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "project_tags" ("project_id", "tag_id") SELECT p."id", t."id" FROM "projects" p CROSS JOIN "tags" t WHERE (p."slug" = 'jannat-fashion-erp' OR p."title" = 'Jannat Fashion ERP') AND t."name" = 'ERP' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "project_tags" ("project_id", "tag_id") SELECT p."id", t."id" FROM "projects" p CROSS JOIN "tags" t WHERE (p."slug" = 'jannat-fashion-erp' OR p."title" = 'Jannat Fashion ERP') AND t."name" = 'E-commerce' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "project_tags" ("project_id", "tag_id") SELECT p."id", t."id" FROM "projects" p CROSS JOIN "tags" t WHERE (p."slug" = 'pharmatrack-pharmacy-erp' OR p."title" = 'PharmaTrack') AND t."name" = 'ERP' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "project_tags" ("project_id", "tag_id") SELECT p."id", t."id" FROM "projects" p CROSS JOIN "tags" t WHERE (p."slug" = 'pharmatrack-pharmacy-erp' OR p."title" = 'PharmaTrack') AND t."name" = 'Pharmacy' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "project_tags" ("project_id", "tag_id") SELECT p."id", t."id" FROM "projects" p CROSS JOIN "tags" t WHERE (p."slug" = 'stylenest-fashion-ecommerce' OR p."title" = 'StyleNest') AND t."name" = 'WooCommerce' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "project_tags" ("project_id", "tag_id") SELECT p."id", t."id" FROM "projects" p CROSS JOIN "tags" t WHERE (p."slug" = 'stylenest-fashion-ecommerce' OR p."title" = 'StyleNest') AND t."name" = 'E-commerce' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "project_tags" ("project_id", "tag_id") SELECT p."id", t."id" FROM "projects" p CROSS JOIN "tags" t WHERE (p."slug" = 'stylenest-fashion-ecommerce' OR p."title" = 'StyleNest') AND t."name" = 'Fraud' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "project_tags" ("project_id", "tag_id") SELECT p."id", t."id" FROM "projects" p CROSS JOIN "tags" t WHERE (p."slug" = 'surgicalx' OR p."title" = 'SurgicalX') AND t."name" = 'WordPress' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "project_tags" ("project_id", "tag_id") SELECT p."id", t."id" FROM "projects" p CROSS JOIN "tags" t WHERE (p."slug" = 'surgicalx' OR p."title" = 'SurgicalX') AND t."name" = 'E-commerce' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "project_tags" ("project_id", "tag_id") SELECT p."id", t."id" FROM "projects" p CROSS JOIN "tags" t WHERE (p."slug" = 'woomate-lite' OR p."title" = 'WooMate Lite') AND t."name" = 'WordPress' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "project_tags" ("project_id", "tag_id") SELECT p."id", t."id" FROM "projects" p CROSS JOIN "tags" t WHERE (p."slug" = 'woomate-lite' OR p."title" = 'WooMate Lite') AND t."name" = 'Plugin' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "case_study_tags" ("case_study_id", "tag_id") SELECT c."id", t."id" FROM "case_studies" c CROSS JOIN "tags" t WHERE (c."slug" = 'jannat-fashion-erp-case-study' OR c."title" = 'Jannat Fashion ERP') AND t."name" = 'Next.js' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "case_study_tags" ("case_study_id", "tag_id") SELECT c."id", t."id" FROM "case_studies" c CROSS JOIN "tags" t WHERE (c."slug" = 'jannat-fashion-erp-case-study' OR c."title" = 'Jannat Fashion ERP') AND t."name" = 'ERP' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "case_study_tags" ("case_study_id", "tag_id") SELECT c."id", t."id" FROM "case_studies" c CROSS JOIN "tags" t WHERE (c."slug" = 'jannat-fashion-erp-case-study' OR c."title" = 'Jannat Fashion ERP') AND t."name" = 'E-commerce' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "case_study_tags" ("case_study_id", "tag_id") SELECT c."id", t."id" FROM "case_studies" c CROSS JOIN "tags" t WHERE (c."slug" = 'pharmatrack-case-study' OR c."title" = 'PharmaTrack: Expiry Losses Down 64% with One Dashboard') AND t."name" = 'Next.js' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "case_study_tags" ("case_study_id", "tag_id") SELECT c."id", t."id" FROM "case_studies" c CROSS JOIN "tags" t WHERE (c."slug" = 'pharmatrack-case-study' OR c."title" = 'PharmaTrack: Expiry Losses Down 64% with One Dashboard') AND t."name" = 'ERP' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "case_study_tags" ("case_study_id", "tag_id") SELECT c."id", t."id" FROM "case_studies" c CROSS JOIN "tags" t WHERE (c."slug" = 'pharmatrack-case-study' OR c."title" = 'PharmaTrack: Expiry Losses Down 64% with One Dashboard') AND t."name" = 'Pharmacy' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "case_study_tags" ("case_study_id", "tag_id") SELECT c."id", t."id" FROM "case_studies" c CROSS JOIN "tags" t WHERE (c."slug" = 'stylenest-case-study' OR c."title" = 'StyleNest: COD Fraud Down 71% After Phone Verification') AND t."name" = 'WooCommerce' ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "case_study_tags" ("case_study_id", "tag_id") SELECT c."id", t."id" FROM "case_studies" c CROSS JOIN "tags" t WHERE (c."slug" = 'stylenest-case-study' OR c."title" = 'StyleNest: COD Fraud Down 71% After Phone Verification') AND t."name" = 'E-commerce' ON CONFLICT DO NOTHING;
