-- Services slug fix (0023).
--
-- Migration 0022 aligned the DB service rows with the live site copy, but it
-- assumed the DB slugs matched the build-time slugs in the Astro site. They
-- did not: the actual DB slugs (verified against the live Public Content API)
-- are "erpcrm-development" and "wordpress-website-and-themeplugin-development",
-- so 0022's ERP/CRM and WordPress updates matched zero rows and the two rows
-- still hold the old seed copy. If the Astro site deployed now, its
-- getServices() merge (match on slug) would APPEND both rows as live-only
-- extras — seven services instead of five — and the ERP/CRM copy would
-- regress to the seed text.
--
-- This migration fixes the two rows against their ACTUAL current slugs and
-- values, then renames the slugs to the build-time ones the site uses, so
-- the live merge matches. Every UPDATE is guarded per column (WHERE <col> =
-- '<current value>'), so a row an admin already edited is never touched.
-- Re-runnable: a second run matches zero rows. Compatible with 0022 running
-- before or after (0022's guards match zero rows once this fix has run).

-- ERP/CRM Development: description + summary to the live site copy.
UPDATE "services" SET "description" = 'Custom ERP and CRM systems that run the whole business — orders, inventory, accounts, payroll and teams.' WHERE "slug" = 'erpcrm-development' AND "description" = 'ERP and CRM systems built around your business processes.';
--> statement-breakpoint
UPDATE "services" SET "summary" = 'Custom ERP and CRM systems that run the whole business — orders, inventory, accounts, payroll and teams.' WHERE "slug" = 'erpcrm-development' AND "summary" = 'ERP and CRM systems built around your business processes.';
--> statement-breakpoint
-- WordPress Website and Theme/Plugin Development: description + summary + icon (LayoutTemplate -> wordpress brand icon).
UPDATE "services" SET "description" = 'WordPress sites, themes and plugins — including WooCommerce tools for Bangladeshi stores.' WHERE "slug" = 'wordpress-website-and-themeplugin-development' AND "description" = 'WordPress sites, themes, and plugins — custom-built.';
--> statement-breakpoint
UPDATE "services" SET "summary" = 'WordPress sites, themes and plugins — including WooCommerce tools for Bangladeshi stores.' WHERE "slug" = 'wordpress-website-and-themeplugin-development' AND "summary" = 'WordPress sites, themes, and plugins — custom-built.';
--> statement-breakpoint
UPDATE "services" SET "icon" = 'wordpress' WHERE "slug" = 'wordpress-website-and-themeplugin-development' AND "icon" = 'LayoutTemplate';
--> statement-breakpoint
-- Slug renames: actual DB slugs -> the build-time slugs the site merges on.
-- Run last (after the updates above, which target the old slugs). Skipped if
-- a row already has the target slug.
UPDATE "services" SET "slug" = 'erp-crm-development' WHERE "slug" = 'erpcrm-development' AND NOT EXISTS (SELECT 1 FROM "services" "s2" WHERE "s2"."slug" = 'erp-crm-development');
--> statement-breakpoint
UPDATE "services" SET "slug" = 'wordpress-development' WHERE "slug" = 'wordpress-website-and-themeplugin-development' AND NOT EXISTS (SELECT 1 FROM "services" "s2" WHERE "s2"."slug" = 'wordpress-development');
