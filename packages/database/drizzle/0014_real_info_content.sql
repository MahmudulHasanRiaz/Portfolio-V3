-- 0014 — ground the dummy preview content in Riaz's REAL info.
-- User rule (2026-11-07): use the real info Muse knows, he gave, or his
-- profiles show; where it is not known, invent it RELATED to him.
-- Real facts used here (all from his own data — never invented):
--   * EcoMate clients: Fixed Plus and Avelto (single-tenant SaaS ERP /
--     e-commerce, per-client Docker, inventory / POS / multi-branch / HR).
--   * WooMate Lite: WordPress plugin for Bangladeshi WooCommerce — fraud
--     blocking, 4 courier integrations, IP / phone / device blocking.
--   * Jannat Fashion ERP: Next.js ERP, 2,000–5,000 orders/day, multi-store
--     WooCommerce, payroll + accounting, fraud blocking, SR portal,
--     wholesale.
--   * GitHub profile: "Software Engineer | Nasheed Artist | Entrepreneur",
--     Dhaka, Bangladesh; blog riaz.com.bd; hello@riaz.com.bd.
-- No invented person is attached to a real company: the two new
-- testimonials are attributed to the companies (role), not to a made-up
-- name. The Jannat case study inserts ONLY if the real Jannat project
-- row exists (lookup by title); otherwise it inserts nothing.
-- Scope: new rows are all is_preview = true. Idempotent: ON CONFLICT
-- DO NOTHING / NOT EXISTS guards. DUMMY rows — delete later with:
--   DELETE FROM <table> WHERE is_preview = true;

-- ─── Testimonials from his real EcoMate clients ────────────────────────
INSERT INTO "testimonials" ("id", "author_name", "author_title", "author_avatar", "content", "source_type", "project_id", "rating", "is_featured", "status", "display_order", "is_preview")
SELECT '20000000-0000-4000-8000-000000000035', 'Fixed Plus', 'EcoMate ERP Client — E-commerce Operations', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80&auto=format&fit=crop', 'EcoMate runs our inventory, POS and branches from one place. Each branch sees its own stock, head office sees everything — and because it is our own single-tenant setup, our data stays ours.', 'freelance_client', NULL, 5, true, 'approved', 5, true
WHERE NOT EXISTS (SELECT 1 FROM "testimonials" WHERE "author_name" = 'Fixed Plus');
--> statement-breakpoint

INSERT INTO "testimonials" ("id", "author_name", "author_title", "author_avatar", "content", "source_type", "project_id", "rating", "is_featured", "status", "display_order", "is_preview")
SELECT '20000000-0000-4000-8000-000000000036', 'Avelto', 'EcoMate ERP Client — Retail Operations', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&q=80&auto=format&fit=crop', 'We moved from spreadsheets to EcoMate and the daily reconciliation that took hours now takes minutes. HR, inventory and sales in one dashboard — our team actually uses it every day.', 'freelance_client', NULL, 5, false, 'approved', 6, true
WHERE NOT EXISTS (SELECT 1 FROM "testimonials" WHERE "author_name" = 'Avelto');
--> statement-breakpoint

-- ─── Blog posts built on his real products ────────────────────────────
INSERT INTO "posts" ("id", "title", "slug", "excerpt", "content", "cover_image", "is_featured", "status", "publish_at", "thumbnail_type", "thumbnail_url", "thumbnail_video_url", "thumbnail_autoplay", "videos", "gallery_images", "is_preview") VALUES
  ('20000000-0000-4000-8000-000000000047', 'Inside WooMate Lite: Blocking Fake Orders in WooCommerce', 'inside-woomate-lite-blocking-fake-orders', 'Fake COD orders cost Bangladeshi stores real money. How WooMate Lite stops them — phone, IP and device checks, plus four courier integrations.', 'Cash-on-delivery is how most Bangladeshi customers pay, and it is also how fake orders bleed a store: couriers return parcels, the shop pays return shipping, and genuine customers wait behind fraud. WooMate Lite was built for exactly this problem.

## Block by phone, IP and device

The plugin checks every order against the signals that matter: the phone number, the IP address and the device. A repeat offender blocked once stays blocked across all three — a new number alone is not enough to slip through again.

## Couriers, connected

Four courier integrations mean the fraud check happens where the order is created, not after dispatch. An order that fails the check never reaches the courier, so the shop never pays to ship a parcel that comes straight back.

## Built for Bangladeshi WooCommerce

Every rule in WooMate Lite comes from real Bangladeshi stores: COD-first checkout, Bangla phone formats, and the courier workflows those stores actually use. Fraud defence is not exotic — it is basic hygiene, applied consistently.', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80&auto=format&fit=crop', true, 'published', '2026-11-06 10:00:00', 'image', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80&auto=format&fit=crop', NULL, false, '[]'::jsonb, '["https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80&auto=format&fit=crop", "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&auto=format&fit=crop"]'::jsonb, true),
  ('20000000-0000-4000-8000-000000000048', '2,000 to 5,000 Orders a Day: What Jannat Fashion ERP Taught Me', 'jannat-fashion-erp-orders-a-day', 'One Next.js ERP now runs a fashion retailer\u2019s orders, inventory, payroll and wholesale — from 2,000 to 5,000 orders a day.', 'Jannat Fashion ERP started as one problem: a fashion retailer doing thousands of orders a day across multiple WooCommerce stores, with orders, inventory, payroll and wholesale living in different places. The fix was one Next.js ERP that holds all of it.

## One queue for every store

Orders from every store land in a single queue. Packing, delivery and accounts all work from the same list, so nothing is counted twice and nothing slips through. At 2,000 to 5,000 orders a day, a single queue is not a nice-to-have — it is the only way the day stays manageable.

## Fraud checks before dispatch

Every order passes fraud blocking before it ships — the same phone, IP and device checks that WooMate Lite uses. Fake COD orders never reach the courier, which matters most on the days the order count spikes.

## Payroll, accounts and wholesale in the same system

Payroll and accounting run from the same data as sales, so the month-end close matches the daily numbers. Sales reps work through their own SR portal, and wholesale buyers order through a wholesale module instead of phone calls and notebooks. One system, one source of truth.', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&auto=format&fit=crop', true, 'published', '2026-11-07 10:00:00', 'image', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&auto=format&fit=crop', NULL, false, '[]'::jsonb, '["https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80&auto=format&fit=crop", "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&auto=format&fit=crop"]'::jsonb, true)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint

-- ─── Case study for his real flagship project (inserts only if found) ──
INSERT INTO "case_studies" ("id", "project_id", "title", "slug", "challenge", "research", "strategy", "results", "metrics", "is_featured", "status", "thumbnail_type", "thumbnail_url", "thumbnail_video_url", "thumbnail_autoplay", "videos", "gallery_images", "is_preview")
SELECT '20000000-0000-4000-8000-000000000013', p."id", 'Jannat Fashion ERP: 5,000 Orders a Day on One Next.js Dashboard', 'jannat-fashion-erp-case-study', 'A fashion retailer doing thousands of orders a day across multiple WooCommerce stores, with orders, inventory, payroll and wholesale living in different places. Manual handling broke at volume: orders were counted twice, fraud slipped through, and month-end never matched the daily numbers.', 'We mapped how orders flowed from each WooCommerce store into packing, delivery and accounts — and where the manual steps broke when the order count spiked. Two pain points stood out: no single queue for orders, and no fraud check before dispatch.', 'One Next.js ERP: orders from every store in a single queue, fraud checks before dispatch, payroll and accounts inside the same system, an SR portal for sales reps and a wholesale module for bulk buyers. The ERP holds the whole business, not just the storefront.', 'The ERP now handles 2,000 to 5,000 orders a day across the stores. Fraud orders are blocked before dispatch, payroll runs from the same data as sales, and wholesale buyers order through their own portal instead of phone calls.', '{"ordersPerDay": "2,000–5,000", "stores": "Multi-store", "fraudChecks": "Phone + IP + device"}'::jsonb, true, 'published', 'image', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&auto=format&fit=crop', NULL, false, '[]'::jsonb, '["https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80&auto=format&fit=crop", "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&auto=format&fit=crop"]'::jsonb, true
FROM "projects" p
WHERE p."title" ILIKE '%Jannat%' AND p."is_preview" = false
  AND NOT EXISTS (SELECT 1 FROM "case_studies" WHERE "slug" = 'jannat-fashion-erp-case-study')
LIMIT 1
ON CONFLICT ("slug") DO NOTHING;
