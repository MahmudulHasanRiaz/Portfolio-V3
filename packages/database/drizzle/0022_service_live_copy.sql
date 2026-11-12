-- Services live copy (0022).
--
-- The Public Content API now serves services, and the Astro site merges
-- live rows over its build-time SERVICES copy (live wins where it has a
-- value). But the services table still holds the generic seed copy from
-- homepage-seed.ts (short placeholder descriptions, Lucide icon names
-- that the site does not use for WordPress/Shopify) while the live site
-- carries the real preview copy (richer descriptions, wordpress/shopify
-- brand icons). Without this correction the first live merge would
-- REGRESS the services section and the service modal to the seed copy.
--
-- This migration aligns the DB rows with the live site copy — but ONLY
-- where a row still holds the exact seed default. Every UPDATE is
-- guarded per column (WHERE <col> = '<seed default>'), so a row an
-- admin already edited is never touched. Re-runnable: a second run
-- matches zero rows.
--
-- Also fixes the WordPress slug: the seed slugified the long title to
-- "wordpress-website-and-theme-plugin-development" while the site uses
-- "wordpress-development" — the live merge matches on slug, so the
-- WordPress row would never merge. Renamed last, guarded by NOT EXISTS
-- so it never collides with a row that already has the short slug.

-- ERP/CRM Development: description + summary to the live site copy.
UPDATE "services" SET "description" = 'Custom ERP and CRM systems that run the whole business — orders, inventory, accounts, payroll and teams.' WHERE "slug" = 'erp-crm-development' AND "description" = 'ERP and CRM systems built around your business processes.';
--> statement-breakpoint
UPDATE "services" SET "summary" = 'Custom ERP and CRM systems that run the whole business — orders, inventory, accounts, payroll and teams.' WHERE "slug" = 'erp-crm-development' AND "summary" = 'ERP and CRM systems built around your business processes.';
--> statement-breakpoint
-- Custom Website Development: description + summary to the live site copy.
UPDATE "services" SET "description" = 'Fast, reliable websites and web apps built with modern stacks — Next.js, React and TypeScript.' WHERE "slug" = 'custom-website-development' AND "description" = 'Websites designed and built from scratch for your needs.';
--> statement-breakpoint
UPDATE "services" SET "summary" = 'Fast, reliable websites and web apps built with modern stacks — Next.js, React and TypeScript.' WHERE "slug" = 'custom-website-development' AND "summary" = 'Websites designed and built from scratch for your needs.';
--> statement-breakpoint
-- Ecommerce Consultancy: description + summary + icon (ShoppingCart -> TrendingUp, the site's icon).
UPDATE "services" SET "description" = 'E-commerce systems and strategy for Bangladeshi businesses — stores, payments, delivery and fraud control.' WHERE "slug" = 'ecommerce-consultancy' AND "description" = 'Guidance on setting up and growing an online store.';
--> statement-breakpoint
UPDATE "services" SET "summary" = 'E-commerce systems and strategy for Bangladeshi businesses — stores, payments, delivery and fraud control.' WHERE "slug" = 'ecommerce-consultancy' AND "summary" = 'Guidance on setting up and growing an online store.';
--> statement-breakpoint
UPDATE "services" SET "icon" = 'TrendingUp' WHERE "slug" = 'ecommerce-consultancy' AND "icon" = 'ShoppingCart';
--> statement-breakpoint
-- WordPress Website and Theme/Plugin Development: description + summary + icon (LayoutTemplate -> wordpress brand icon).
UPDATE "services" SET "description" = 'WordPress sites, themes and plugins — including WooCommerce tools for Bangladeshi stores.' WHERE "slug" = 'wordpress-website-and-theme-plugin-development' AND "description" = 'WordPress sites, themes, and plugins — custom-built.';
--> statement-breakpoint
UPDATE "services" SET "summary" = 'WordPress sites, themes and plugins — including WooCommerce tools for Bangladeshi stores.' WHERE "slug" = 'wordpress-website-and-theme-plugin-development' AND "summary" = 'WordPress sites, themes, and plugins — custom-built.';
--> statement-breakpoint
UPDATE "services" SET "icon" = 'wordpress' WHERE "slug" = 'wordpress-website-and-theme-plugin-development' AND "icon" = 'LayoutTemplate';
--> statement-breakpoint
-- Shopify Development: description + summary + icon (Store -> shopify brand icon).
UPDATE "services" SET "description" = 'Shopify stores and custom development for brands that sell online.' WHERE "slug" = 'shopify-development' AND "description" = 'Shopify stores built and customized for selling online.';
--> statement-breakpoint
UPDATE "services" SET "summary" = 'Shopify stores and custom development for brands that sell online.' WHERE "slug" = 'shopify-development' AND "summary" = 'Shopify stores built and customized for selling online.';
--> statement-breakpoint
UPDATE "services" SET "icon" = 'shopify' WHERE "slug" = 'shopify-development' AND "icon" = 'Store';
--> statement-breakpoint
-- WordPress slug: long seed slug -> the short slug the site uses, so the
-- live merge matches the row. Runs last (after the updates above, which
-- target the old slug). Skipped if a row already has the short slug.
UPDATE "services" SET "slug" = 'wordpress-development' WHERE "slug" = 'wordpress-website-and-theme-plugin-development' AND NOT EXISTS (SELECT 1 FROM "services" "s2" WHERE "s2"."slug" = 'wordpress-development');
