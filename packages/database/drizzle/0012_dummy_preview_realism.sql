-- 0012 — rewrite the dummy preview rows (0011) so they read as
-- Mahmudul Hasan Riaz's own work, and remove the visible fake tells.
--
-- The 0011 seed used generic businesses (ShopKart, ClinicFlow, Northwind)
-- plus Google demo videos (one of them a cartoon) and .example.com links.
-- The user asked: even as demo, the content must fully match Riaz — his
-- domains (ERP/CRM, WooCommerce/WordPress, Shopify, e-commerce for
-- Bangladeshi businesses), his market (Dhaka), and all three of his
-- identities (Software Engineer, Entrepreneur, Islamic Artist / Hafiz-Alem).
--
-- Scope: ONLY rows with is_preview = true and the dummy slugs/UUIDs.
-- Real rows are never touched. Idempotent: plain UPDATE assignments +
-- guarded INSERTs (ON CONFLICT DO NOTHING / NOT EXISTS), safe to re-run.
-- DUMMY DATA ONLY — delete all of it later with:
--   DELETE FROM <table> WHERE is_preview = true;
-- The two dummy projects keep their 0011 UUIDs, so the case studies
-- (linked by project_id) need no relinking.

-- ─── Projects ──────────────────────────────────────────────────────────
-- ShopKart -> StyleNest: a Dhaka fashion house's WooCommerce store.
-- WooCommerce + fraud blocking + bKash is Riaz's proven work (WooMate).
UPDATE "projects"
SET "title" = 'StyleNest — Fashion E-commerce & Inventory (WooCommerce)',
    "slug" = 'stylenest-fashion-ecommerce',
    "summary" = 'A fast WooCommerce storefront for a Dhaka fashion house: bKash checkout, COD fraud checks and live inventory in one place.',
    "description" = 'StyleNest ran a slow WooCommerce store with heavy cash-on-delivery fraud: fake orders, repeated numbers, and stock that never matched the shop floor. Riaz rebuilt the storefront for speed, added phone verification before dispatch, and blocked repeat offenders by phone, IP and device. bKash and card checkout work side by side, and inventory syncs with the physical store so the website never sells what the shop does not have.',
    "thumbnail" = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80&auto=format&fit=crop',
    "cover_image" = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80&auto=format&fit=crop',
    "industry" = 'fashion',
    "client_name" = 'StyleNest',
    "project_url" = NULL,
    "thumbnail_type" = 'image',
    "thumbnail_url" = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80&auto=format&fit=crop',
    "thumbnail_video_url" = NULL,
    "thumbnail_autoplay" = false,
    "videos" = '[]'::jsonb,
    "gallery_images" = '["https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&q=80&auto=format&fit=crop", "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80&auto=format&fit=crop", "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&auto=format&fit=crop"]'::jsonb
WHERE "slug" = 'shopkart-ecommerce-platform' AND "is_preview" = true;
--> statement-breakpoint

-- ClinicFlow -> PharmaTrack: a pharmacy-chain ERP in Next.js.
-- ERP/CRM for Bangladeshi retail is Riaz's core (Jannat Fashion ERP).
UPDATE "projects"
SET "title" = 'PharmaTrack — Pharmacy Chain ERP (Next.js)',
    "slug" = 'pharmatrack-pharmacy-erp',
    "summary" = 'A Next.js ERP for an 18-branch pharmacy chain in Dhaka: batch and expiry tracking, branch stock and supplier orders in one dashboard.',
    "description" = 'PharmaTrack ran on paper registers across eighteen branches: nobody knew what was expiring, what was out of stock, or what to order. Riaz built one Next.js ERP with batch and expiry alerts, branch-wise stock, supplier purchase orders and daily sales reports. Managers see every branch from one dashboard, and pharmacists get warned before stock expires instead of after.',
    "thumbnail" = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&auto=format&fit=crop',
    "cover_image" = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&auto=format&fit=crop',
    "industry" = 'pharmacy',
    "client_name" = 'PharmaTrack',
    "project_url" = NULL,
    "thumbnail_type" = 'image',
    "thumbnail_url" = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&auto=format&fit=crop',
    "thumbnail_video_url" = NULL,
    "thumbnail_autoplay" = false,
    "videos" = '[]'::jsonb,
    "gallery_images" = '["https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80&auto=format&fit=crop", "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80&auto=format&fit=crop", "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80&auto=format&fit=crop"]'::jsonb
WHERE "slug" = 'clinicflow-management-system' AND "is_preview" = true;
--> statement-breakpoint

-- ─── Case studies (retitled + rewritten to match the new projects) ─────
UPDATE "case_studies"
SET "title" = 'StyleNest: COD Fraud Down 71% After Phone Verification',
    "slug" = 'stylenest-case-study',
    "challenge" = 'StyleNest sold mostly cash-on-delivery, and fake orders were eating the margin: couriers returned parcels, the shop paid return shipping, and genuine customers waited behind fraud. The store was also slow on mobile, so real buyers dropped off before checkout.',
    "research" = 'We audited three months of orders and found the pattern fast: a small set of phone numbers and devices placed most fake orders, and most genuine buyers abandoned at the same step — a checkout that asked for too much before payment. Page speed on low-end phones was over five seconds.',
    "strategy" = 'We kept WooCommerce and fixed what mattered: phone verification before dispatch, a blocklist by phone, IP and device, a three-step checkout with bKash, and image + caching work that brought mobile load under two seconds. Nothing exotic — basic hygiene, applied consistently.',
    "results" = 'Fake COD orders fell 71 percent in the first month. Confirmed orders ship the same day now, return shipping cost dropped by two thirds, and checkout conversion rose 38 percent. The store survived an Eid flash sale at three times normal traffic without slowing down.',
    "metrics" = '{"fraudOrderReduction": "-71%", "pageLoad": "1.4s", "codConfirmation": "92%", "conversionUplift": "+38%"}'::jsonb,
    "thumbnail_url" = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80&auto=format&fit=crop',
    "gallery_images" = '["https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&q=80&auto=format&fit=crop", "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80&auto=format&fit=crop"]'::jsonb
WHERE "slug" = 'shopkart-case-study' AND "is_preview" = true;
--> statement-breakpoint

UPDATE "case_studies"
SET "title" = 'PharmaTrack: Expiry Losses Down 64% with One Dashboard',
    "slug" = 'pharmatrack-case-study',
    "challenge" = 'Eighteen branches kept stock on paper registers. Expired medicine was discovered after the loss, fast-moving items ran out without warning, and head office ordered blind: too much of what did not sell, too little of what did.',
    "research" = 'We shadowed pharmacists across four branches for two weeks and traced every stock-out and expiry write-off. The pattern was simple: no branch could see what the others held, and nobody was warned before a batch expired.',
    "strategy" = 'We built one Next.js ERP for all branches: batch and expiry tracking with alerts thirty days out, branch-wise stock with transfers, supplier purchase orders, and a daily sales report the owner reads in two minutes. No branch works blind anymore.',
    "results" = 'Expiry losses fell 64 percent within a quarter. Stock-outs dropped 41 percent because branches transfer to each other instead of ordering fresh, and ordering takes half the time it used to. All eighteen branches run on the same dashboard.',
    "metrics" = '{"expiryLossReduction": "-64%", "stockOutReduction": "-41%", "branchesOnboarded": "18", "orderTimeSaved": "-55%"}'::jsonb,
    "thumbnail_url" = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&auto=format&fit=crop',
    "gallery_images" = '["https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80&auto=format&fit=crop", "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80&auto=format&fit=crop"]'::jsonb
WHERE "slug" = 'clinicflow-case-study' AND "is_preview" = true;
--> statement-breakpoint

-- ─── Ventures ──────────────────────────────────────────────────────────
-- Northwind Commerce is Microsoft's famous sample dataset — anyone
-- technical recognises it as fake instantly. Rename to HisabKit:
-- billing/invoicing for Bangladeshi SMEs (Riaz's ERP/accounting domain).
UPDATE "ventures"
SET "name" = 'HisabKit',
    "slug" = 'hisabkit',
    "description" = 'Billing, invoicing and hisab for Bangladeshi SMEs: Bangla invoices, bKash records and VAT-ready reports without the enterprise price.',
    "website" = NULL,
    "industry" = 'fintech',
    "stage" = 'early'
WHERE "slug" = 'northwind-commerce' AND "is_preview" = true
  AND NOT EXISTS (SELECT 1 FROM "ventures" WHERE "slug" = 'hisabkit');
--> statement-breakpoint

-- CloudDesk / SkillBridge: names are generic-plausible for his ventures;
-- only the .example.com websites go.
UPDATE "ventures"
SET "website" = NULL
WHERE "slug" IN ('clouddesk', 'skillbridge') AND "is_preview" = true;
--> statement-breakpoint

-- ─── Testimonials (clients Riaz actually serves) ───────────────────────
UPDATE "testimonials"
SET "author_title" = 'Owner, StyleNest',
    "content" = 'Riaz rebuilt our WooCommerce store and COD fraud fell within weeks. Phone verification, bKash checkout and a dashboard our team actually uses — clear communication the whole way, on time.'
WHERE "author_name" = 'Tanvir Rahman' AND "is_preview" = true;
--> statement-breakpoint

UPDATE "testimonials"
SET "author_title" = 'Operations Manager, PharmaTrack',
    "content" = 'Expiry losses dropped sharply once every branch could see the same stock. The team learned the whole ERP in a single afternoon — batch alerts alone paid for the project.'
WHERE "author_name" = 'Nusrat Jahan' AND "is_preview" = true;
--> statement-breakpoint

UPDATE "testimonials"
SET "author_title" = 'Founder, HisabKit'
WHERE "author_name" = 'Arif Hossain' AND "is_preview" = true;
--> statement-breakpoint

-- Artist identity: a testimonial from an event organiser (nasheed
-- performance). No real person's name is claimed — generic organiser.
INSERT INTO "testimonials" ("id", "author_name", "author_title", "author_avatar", "content", "source_type", "project_id", "rating", "is_featured", "status", "display_order", "is_preview")
SELECT '20000000-0000-4000-8000-000000000034', 'Imran Hossain', 'Event Organizer, Islamic Conference Dhaka', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80&auto=format&fit=crop', 'His nasheed performance opened our conference — no music, just voice and meaning, and the whole hall was silent. Professional and punctual, easy to work with from booking to stage.', 'event_organizer', NULL, 5, false, 'approved', 4, true
WHERE NOT EXISTS (SELECT 1 FROM "testimonials" WHERE "author_name" = 'Imran Hossain' AND "content" LIKE 'His nasheed performance opened our conference%');
--> statement-breakpoint

-- ─── Blog: one artist-identity post (the other three already match him) ─
INSERT INTO "posts" ("id", "title", "slug", "excerpt", "content", "cover_image", "is_featured", "status", "publish_at", "thumbnail_type", "thumbnail_url", "thumbnail_video_url", "thumbnail_autoplay", "videos", "gallery_images", "is_preview") VALUES
  ('20000000-0000-4000-8000-000000000044', 'Nasheed Without Music: How I Record and Share', 'nasheed-without-music-recording', 'No instruments, no backing track — just voice, lyrics and meaning. How I record nasheed at home and share it with listeners.', 'No instruments, no backing track — just voice, lyrics and meaning. That is the whole point of the nasheed I perform, and it shapes every recording decision I make.

## A simple setup, used well

I record with one good microphone in a quiet room, close to soft furnishings that tame the echo. No studio, no mixing desk — a clean vocal take matters more than expensive gear. I record each line twice and keep the better one.

## Editing for clarity, not effects

The edit is light: remove breath noise between lines, balance the volume, and stop. No reverb tricks, no pitch correction. If a line does not sound right sung plainly, I sing it again instead of fixing it in software.

## Sharing it with listeners

Finished recordings go to streaming platforms and YouTube, where people find them by the nasheed itself rather than by me. A listener in Dhaka and a listener abroad hear the same voice, the same words — that is enough.', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80&auto=format&fit=crop', false, 'published', '2026-11-05 10:00:00', 'image', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80&auto=format&fit=crop', NULL, false, '[]'::jsonb, '["https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&q=80&auto=format&fit=crop", "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80&auto=format&fit=crop"]'::jsonb, true)
ON CONFLICT ("slug") DO NOTHING;
