-- 0024 — Bangla (bn) values for every live content row.
--
-- The *_bn columns and the API `bn` overlay exist since 0018 / PR #76,
-- but no Bangla VALUE was ever saved: the live API returned 0 `bn` keys,
-- so the public site in Bangla mode rendered English everywhere. This
-- migration seeds faithful Bangla translations of the live English copy
-- (the values the Public Content API actually returns) into the *_bn
-- columns, so the API emits a `bn` overlay for every item.
--
-- SOURCE OF TRUTH — the DB rows, as established from main:
--   * services (5): apps/dashboard/src/lib/homepage-seed.ts SERVICE_ROWS
--     (identical to the 0022 live copy; summary = description in the DB).
--     SLUG NOTE (verified 2026-11-09 via the live API + migration 0023):
--     the DB slugs for ERP/CRM and WordPress were NOT the build-time
--     slugs — slugify() strips "/" without a hyphen, so the rows were
--     `erpcrm-development` and
--     `wordpress-website-and-themeplugin-development`. Migration 0023
--     renamed them to `erp-crm-development` / `wordpress-development`.
--     This migration covers BOTH the old and the new slug for those two
--     services, so it seeds correctly whichever order the two migrations
--     apply in (a rename carries the *_bn values along).
--   * projects (6): homepage-seed.ts PROJECT_ROWS (4 real) + 0011/0012
--     (StyleNest, PharmaTrack dummy rows, as rewritten by 0012).
--   * case studies: 0012 (StyleNest, PharmaTrack) + homepage-seed.ts
--     CASE_STUDY_ROWS (Jannat Fashion ERP Scale, Automated Fraud Order
--     Blocking). The build-time .md Jannat case study
--     (slug jannat-fashion-erp-case-study) has no DB seed on main, so its
--     UPDATE below is a no-op unless an admin created that row.
--   * posts (6): 0011 (3) + 0012 (Nasheed Without Music) + homepage-seed.ts
--     POST_ROWS (2). The build-time-only post inside-woomate-lite has no
--     DB seed on main; its UPDATE is a no-op unless the row exists.
--   * releases (8): titles from 0009. The DB `description` is NULL for
--     all 8 (0009 never set it; homepage-seed skips rows that exist), so
--     the live site renders the build-time .md descriptions — the
--     description_bn values below translate THOSE, guarded by
--     `description IS NULL`, so a real admin-written description is
--     never paired with a mismatched Bangla text. Ya Nabi has no known
--     description anywhere: its description_bn is left empty on purpose.
--   * ventures (6): 0011/0012 (HisabKit, CloudDesk, SkillBridge) +
--     homepage-seed.ts VENTURE_ROWS (EcoMate, WooMate Lite, DevPulse BD).
--
-- API-vs-.md DISCREPANCIES (API copy wins; translated here, noted):
--   * Project descriptions in the DB (seed) are the LONG versions; the
--     Portfolio-Public .md descriptions are shorter rewrites (EcoMate,
--     Jannat, SurgicalX, WooMate Lite). StyleNest / PharmaTrack .md
--     descriptions are only the FIRST SENTENCE of the DB description.
--   * The nasheed post's DB excerpt/content (0012) differ from its .md
--     rewrite; the DB values are translated here.
--   * The .md `bn:` frontmatter already carries Bangla for some items,
--     but parts of it are corrupt (broken য-ফলা: "হয", "বানিযেছি",
--     "মেযাদ", literal replacement chars) — the values below are fresh,
--     correct Bangla, and the live merge prefers live `bn` over
--     build-time `bn` where non-empty, so these replace the corrupt copy.
--
-- TRANSLATION RULES (standing): faithful modern mixed Bangla — প্রজেক্ট
-- (not প্রকল্প), সার্ভিস (not সেবা), বিজনেস (not ব্যবসা), বানানো (not
-- তৈরি করা); নাশিদ / তিলাওয়াত / উদ্যোগ / হাফিজ-আলেম / পাবলিক ফিগার /
-- সফটওয়্যার ইঞ্জিনিয়ার / ক্লায়েন্ট / ঢাকা kept as-is; proper nouns,
-- brand names, tech names, platform names, code, URLs kept as-is;
-- numbers/dates kept as-is. Nothing invented: no new claims, numbers
-- or facts. Release tune/lyricist are NOT seeded (do not exist);
-- testimonials are NOT seeded (none exist); Know Me / hero settings
-- Bangla is NOT seeded here (another track owns that copy).
--
-- SAFETY: every UPDATE is guarded by `<col>_bn IS NULL` — an admin's
-- Bangla is never overwritten. Re-runnable: a second run matches zero
-- rows. No schema change, no DELETE, no seed run. Applies on the next
-- Portainer redeploy; the live `bn`-key check is owed after it lands.

-- ─── Services (5) ───────────────────────────────────────────────────
-- ERP/CRM Development
UPDATE "services" SET "title_bn" = 'ERP/CRM ডেভেলপমেন্ট' WHERE "slug" = 'erp-crm-development' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "summary_bn" = 'কাস্টম ERP আর CRM সিস্টেম, যা পুরো বিজনেসটা চালায় — অর্ডার, ইনভেন্টরি, অ্যাকাউন্টস, পে-রোল আর টিম।' WHERE "slug" = 'erp-crm-development' AND "summary_bn" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "description_bn" = 'কাস্টম ERP আর CRM সিস্টেম, যা পুরো বিজনেসটা চালায় — অর্ডার, ইনভেন্টরি, অ্যাকাউন্টস, পে-রোল আর টিম।' WHERE "slug" = 'erp-crm-development' AND "description_bn" IS NULL;
--> statement-breakpoint
-- ERP/CRM Development — pre-0023 DB slug (slugify strips "/"):
-- same values, so this migration seeds correctly even if 0023 has not
-- applied yet. One of the two slug blocks is a no-op.
UPDATE "services" SET "title_bn" = 'ERP/CRM ডেভেলপমেন্ট' WHERE "slug" = 'erpcrm-development' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "summary_bn" = 'কাস্টম ERP আর CRM সিস্টেম, যা পুরো বিজনেসটা চালায় — অর্ডার, ইনভেন্টরি, অ্যাকাউন্টস, পে-রোল আর টিম।' WHERE "slug" = 'erpcrm-development' AND "summary_bn" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "description_bn" = 'কাস্টম ERP আর CRM সিস্টেম, যা পুরো বিজনেসটা চালায় — অর্ডার, ইনভেন্টরি, অ্যাকাউন্টস, পে-রোল আর টিম।' WHERE "slug" = 'erpcrm-development' AND "description_bn" IS NULL;
--> statement-breakpoint
-- Custom Website Development
UPDATE "services" SET "title_bn" = 'কাস্টম ওয়েবসাইট ডেভেলপমেন্ট' WHERE "slug" = 'custom-website-development' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "summary_bn" = 'দ্রুত আর নির্ভরযোগ্য ওয়েবসাইট আর ওয়েব অ্যাপ, আধুনিক স্ট্যাক দিয়ে বানানো — Next.js, React আর TypeScript।' WHERE "slug" = 'custom-website-development' AND "summary_bn" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "description_bn" = 'দ্রুত আর নির্ভরযোগ্য ওয়েবসাইট আর ওয়েব অ্যাপ, আধুনিক স্ট্যাক দিয়ে বানানো — Next.js, React আর TypeScript।' WHERE "slug" = 'custom-website-development' AND "description_bn" IS NULL;
--> statement-breakpoint
-- Ecommerce Consultancy
UPDATE "services" SET "title_bn" = 'ইকমার্স কনসালট্যান্সি' WHERE "slug" = 'ecommerce-consultancy' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "summary_bn" = 'বাংলাদেশি বিজনেসের জন্য ই-কমার্স সিস্টেম আর স্ট্র্যাটেজি — স্টোর, পেমেন্ট, ডেলিভারি আর ফ্রড কন্ট্রোল।' WHERE "slug" = 'ecommerce-consultancy' AND "summary_bn" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "description_bn" = 'বাংলাদেশি বিজনেসের জন্য ই-কমার্স সিস্টেম আর স্ট্র্যাটেজি — স্টোর, পেমেন্ট, ডেলিভারি আর ফ্রড কন্ট্রোল।' WHERE "slug" = 'ecommerce-consultancy' AND "description_bn" IS NULL;
--> statement-breakpoint
-- WordPress Website and Theme/Plugin Development (0023 renamed this slug
-- from wordpress-website-and-themeplugin-development to
-- wordpress-development; 0022's rename had matched 0 rows)
UPDATE "services" SET "title_bn" = 'WordPress ওয়েবসাইট ও থিম/প্লাগইন ডেভেলপমেন্ট' WHERE "slug" = 'wordpress-development' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "summary_bn" = 'WordPress সাইট, থিম আর প্লাগইন — বাংলাদেশি স্টোরের জন্য WooCommerce টুলসসহ।' WHERE "slug" = 'wordpress-development' AND "summary_bn" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "description_bn" = 'WordPress সাইট, থিম আর প্লাগইন — বাংলাদেশি স্টোরের জন্য WooCommerce টুলসসহ।' WHERE "slug" = 'wordpress-development' AND "description_bn" IS NULL;
--> statement-breakpoint
-- WordPress — pre-0023 DB slug (slugify strips "/"): same values,
-- so this migration seeds correctly even if 0023 has not applied.
UPDATE "services" SET "title_bn" = 'WordPress ওয়েবসাইট ও থিম/প্লাগইন ডেভেলপমেন্ট' WHERE "slug" = 'wordpress-website-and-themeplugin-development' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "summary_bn" = 'WordPress সাইট, থিম আর প্লাগইন — বাংলাদেশি স্টোরের জন্য WooCommerce টুলসসহ।' WHERE "slug" = 'wordpress-website-and-themeplugin-development' AND "summary_bn" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "description_bn" = 'WordPress সাইট, থিম আর প্লাগইন — বাংলাদেশি স্টোরের জন্য WooCommerce টুলসসহ।' WHERE "slug" = 'wordpress-website-and-themeplugin-development' AND "description_bn" IS NULL;
--> statement-breakpoint
-- Shopify Development
UPDATE "services" SET "title_bn" = 'Shopify ডেভেলপমেন্ট' WHERE "slug" = 'shopify-development' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "summary_bn" = 'অনলাইনে বিক্রি করে এমন ব্র্যান্ডের জন্য Shopify স্টোর আর কাস্টম ডেভেলপমেন্ট।' WHERE "slug" = 'shopify-development' AND "summary_bn" IS NULL;
--> statement-breakpoint
UPDATE "services" SET "description_bn" = 'অনলাইনে বিক্রি করে এমন ব্র্যান্ডের জন্য Shopify স্টোর আর কাস্টম ডেভেলপমেন্ট।' WHERE "slug" = 'shopify-development' AND "description_bn" IS NULL;
--> statement-breakpoint

-- ─── Projects (6) ───────────────────────────────────────────────────
-- Jannat Fashion ERP
UPDATE "projects" SET "title_bn" = 'Jannat Fashion ERP' WHERE "slug" = 'jannat-fashion-erp' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "projects" SET "summary_bn" = 'জান্নাত ফ্যাশনের জন্য ফুল-স্ট্যাক ERP, দিনে 2,000–5,000 অর্ডার প্রসেস করে।' WHERE "slug" = 'jannat-fashion-erp' AND "summary_bn" IS NULL;
--> statement-breakpoint
UPDATE "projects" SET "description_bn" = 'জান্নাত ফ্যাশনের জন্য ফুল-স্ট্যাক ERP, দিনে 2,000–5,000 অর্ডার প্রসেস করে — মাল্টি-স্টোর WooCommerce ইন্টিগ্রেশন, অ্যাডভান্সড রোল-বেইজড ইউজার ম্যানেজমেন্টসহ বিজনেস অনুযায়ী অ্যাকসেস, পে-রোল, অ্যাকাউন্টিং আর খরচ, ফ্রড-অর্ডার ব্লকিং, কুরিয়ার সাকসেস রেশিও, SR পোর্টাল আর পাইকারি ম্যানেজমেন্ট।' WHERE "slug" = 'jannat-fashion-erp' AND "description_bn" IS NULL;
--> statement-breakpoint
-- EcoMate
UPDATE "projects" SET "title_bn" = 'EcoMate' WHERE "slug" = 'ecomate' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "projects" SET "summary_bn" = 'সিঙ্গেল-টেন্যান্ট SaaS ERP আর ই-কমার্স স্যুট, প্রতিটা ক্লায়েন্টের জন্য আলাদা ডেপ্লয় করা হয়।' WHERE "slug" = 'ecomate' AND "summary_bn" IS NULL;
--> statement-breakpoint
UPDATE "projects" SET "description_bn" = 'সিঙ্গেল-টেন্যান্ট SaaS ERP আর ই-কমার্স স্যুট, Docker দিয়ে প্রতিটা ক্লায়েন্টের জন্য আলাদা ডেপ্লয় করা — বিন লোকেশন পর্যন্ত অ্যাডভান্সড ইনভেন্টরি, POS, মাল্টি-ব্রাঞ্চ আর শোরুম ম্যানেজমেন্ট, প্রফিট ব্রেকডাউনসহ বিজনেস অ্যানালিটিক্স, স্মার্ট অ্যাটেনডেন্সসহ ফুল HR, আর মোবাইল স্ক্যান প্যাকিং। Fixed Plus আর Avelto-সহ বিভিন্ন ব্র্যান্ডের জন্য ডেপ্লয় করা হয়েছে।' WHERE "slug" = 'ecomate' AND "description_bn" IS NULL;
--> statement-breakpoint
-- SurgicalX
UPDATE "projects" SET "title_bn" = 'SurgicalX' WHERE "slug" = 'surgicalx' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "projects" SET "summary_bn" = 'Flatsome থিম দিয়ে বানানো একটা আধুনিক WordPress ই-কমার্স ওয়েবসাইট।' WHERE "slug" = 'surgicalx' AND "summary_bn" IS NULL;
--> statement-breakpoint
UPDATE "projects" SET "description_bn" = 'Flatsome থিম দিয়ে WordPress-এ বানানো একটা আধুনিক ই-কমার্স ওয়েবসাইট।' WHERE "slug" = 'surgicalx' AND "description_bn" IS NULL;
--> statement-breakpoint
-- WooMate Lite
UPDATE "projects" SET "title_bn" = 'WooMate Lite' WHERE "slug" = 'woomate-lite' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "projects" SET "summary_bn" = 'বাংলাদেশি বিজনেসের জন্য WooCommerce-এ দরকারি সবকিছু আনা একটা WordPress প্লাগইন।' WHERE "slug" = 'woomate-lite' AND "summary_bn" IS NULL;
--> statement-breakpoint
UPDATE "projects" SET "description_bn" = 'বাংলাদেশি বিজনেসের জন্য WooCommerce-এ দরকারি সবকিছু আনা একটা WordPress প্লাগইন — ফ্রড-অর্ডার ব্লকিং, কুরিয়ার সাকসেস রেশিওসহ 4টি কুরিয়ার ইন্টিগ্রেশন, IP, ফোন আর ডিভাইস ব্লকিং, রেশিও-বেইজড অর্ডার রেস্ট্রিকশন, আর সার্ভার-সাইড ও Meta ট্র্যাকিং।' WHERE "slug" = 'woomate-lite' AND "description_bn" IS NULL;
--> statement-breakpoint
-- StyleNest (DB title is the long form; the .md title is the short name)
UPDATE "projects" SET "title_bn" = 'StyleNest — ফ্যাশন ই-কমার্স ও ইনভেন্টরি (WooCommerce)' WHERE "slug" = 'stylenest-fashion-ecommerce' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "projects" SET "summary_bn" = 'ঢাকার একটা ফ্যাশন হাউসের জন্য দ্রুত WooCommerce স্টোরফ্রন্ট: বিকাশ চেকআউট, COD ফ্রড চেক আর লাইভ ইনভেন্টরি — সব এক জায়গায়।' WHERE "slug" = 'stylenest-fashion-ecommerce' AND "summary_bn" IS NULL;
--> statement-breakpoint
UPDATE "projects" SET "description_bn" = 'StyleNest-এর ধীর WooCommerce স্টোরে ক্যাশ-অন-ডেলিভারি ফ্রড ছিল ভারী: ভুয়া অর্ডার, বারবার একই নম্বর, আর স্টক যা দোকানের সঙ্গে কখনো মিলত না। Riaz স্টোরফ্রন্টটা গতি বাড়িয়ে নতুন করে বানিয়েছেন, ডিসপ্যাচের আগে ফোন ভেরিফিকেশন যোগ করেছেন, আর ফোন, IP আর ডিভাইস দিয়ে বারবার ফ্রড করা নম্বরগুলো ব্লক করেছেন। বিকাশ আর কার্ড চেকআউট পাশাপাশি চলে, আর ইনভেন্টরি ফিজিক্যাল স্টোরের সঙ্গে সিংক হয় — তাই ওয়েবসাইট কখনো এমন কিছু বিক্রি করে না যা দোকানে নেই।' WHERE "slug" = 'stylenest-fashion-ecommerce' AND "description_bn" IS NULL;
--> statement-breakpoint
-- PharmaTrack (DB title is the long form; the .md title is the short name)
UPDATE "projects" SET "title_bn" = 'PharmaTrack — ফার্মেসি চেইন ERP (Next.js)' WHERE "slug" = 'pharmatrack-pharmacy-erp' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "projects" SET "summary_bn" = 'ঢাকার 18 শাখার ফার্মেসি চেইনের জন্য একটা Next.js ERP: ব্যাচ আর মেয়াদ ট্র্যাকিং, শাখা অনুযায়ী স্টক আর সাপ্লায়ার অর্ডার — সব এক ড্যাশবোর্ডে।' WHERE "slug" = 'pharmatrack-pharmacy-erp' AND "summary_bn" IS NULL;
--> statement-breakpoint
UPDATE "projects" SET "description_bn" = 'PharmaTrack আঠারোটা শাখায় কাগজের রেজিস্টারে চলত: কী মেয়াদ শেষ হচ্ছে, কী স্টক শেষ, কী অর্ডার করতে হবে — কেউ জানত না। Riaz একটাই Next.js ERP বানিয়েছেন — ব্যাচ আর মেয়াদ অ্যালার্ট, শাখা অনুযায়ী স্টক, সাপ্লায়ার পারচেজ অর্ডার আর ডেইলি সেলস রিপোর্টসহ। ম্যানেজাররা এক ড্যাশবোর্ড থেকে সব শাখা দেখতে পান, আর ফার্মাসিস্টরা স্টক মেয়াদ শেষ হওয়ার আগেই সতর্কবার্তা পান, পরে নয়।' WHERE "slug" = 'pharmatrack-pharmacy-erp' AND "description_bn" IS NULL;
--> statement-breakpoint

-- ─── Case studies ───────────────────────────────────────────────────
-- StyleNest: COD Fraud Down 71% After Phone Verification
UPDATE "case_studies" SET "title_bn" = 'StyleNest: ফোন ভেরিফিকেশনের পর COD ফ্রড 71% কমেছে' WHERE "slug" = 'stylenest-case-study' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "case_studies" SET "challenge_bn" = 'StyleNest বেশিরভাগ ক্যাশ-অন-ডেলিভারিতে বিক্রি করত, আর ভুয়া অর্ডার মার্জিন খেয়ে ফেলছিল: কুরিয়ার পার্সেল ফেরত আনত, দোকান ফেরত শিপিংয়ের খরচ দিত, আর আসল কাস্টমাররা ফ্রডের পেছনে অপেক্ষা করত। মোবাইলে স্টোরটাও স্লো ছিল, তাই আসল ক্রেতারা চেকআউটের আগেই চলে যেত।' WHERE "slug" = 'stylenest-case-study' AND "challenge_bn" IS NULL;
--> statement-breakpoint
UPDATE "case_studies" SET "research_bn" = 'আমরা তিন মাসের অর্ডার অডিট করে প্যাটার্নটা দ্রুত ধরতে পারলাম: অল্প কিছু ফোন নম্বর আর ডিভাইস থেকে বেশিরভাগ ভুয়া অর্ডার আসত, আর বেশিরভাগ আসল ক্রেতা একই ধাপে গিয়ে ছেড়ে দিত — এমন একটা চেকআউট, যা পেমেন্টের আগেই অনেক কিছু চাইত। কমদামি ফোনে পেজ স্পিড ছিল পাঁচ সেকেন্ডের বেশি।' WHERE "slug" = 'stylenest-case-study' AND "research_bn" IS NULL;
--> statement-breakpoint
UPDATE "case_studies" SET "strategy_bn" = 'আমরা WooCommerce রেখেই যা জরুরি, সেটাই ঠিক করেছি: ডিসপ্যাচের আগে ফোন ভেরিফিকেশন, ফোন, IP আর ডিভাইস দিয়ে ব্লকলিস্ট, বিকাশসহ তিন ধাপের চেকআউট, আর ছবি ও ক্যাশিংয়ের কাজ — যা মোবাইল লোড দুই সেকেন্ডের নিচে নামিয়ে এনেছে। অসাধারণ কিছু নয় — বেসিক জিনিসগুলো ঠিকঠাক করা, ধারাবাহিকভাবে।' WHERE "slug" = 'stylenest-case-study' AND "strategy_bn" IS NULL;
--> statement-breakpoint
UPDATE "case_studies" SET "results_bn" = 'প্রথম মাসেই ভুয়া COD অর্ডার 71% কমেছে। কনফার্মড অর্ডার এখন একই দিনে পাঠানো হয়, ফেরত শিপিংয়ের খরচ কমেছে দুই-তৃতীয়াংশ, আর চেকআউট কনভার্সন বেড়েছে 38%। ঈদের ফ্ল্যাশ সেলে স্বাভাবিকের তিন গুণ ট্র্যাফিকেও স্টোরটা স্লো হয়নি।' WHERE "slug" = 'stylenest-case-study' AND "results_bn" IS NULL;
--> statement-breakpoint
-- PharmaTrack: Expiry Losses Down 64% with One Dashboard
UPDATE "case_studies" SET "title_bn" = 'PharmaTrack: এক ড্যাশবোর্ডে মেয়াদোত্তীর্ণ ক্ষতি 64% কমেছে' WHERE "slug" = 'pharmatrack-case-study' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "case_studies" SET "challenge_bn" = 'আঠারোটা শাখা কাগজের রেজিস্টারে স্টক রাখত। মেয়াদোত্তীর্ণ ওষুধ ধরা পড়ত ক্ষতির পরে, দ্রুত চলে এমন প্রোডাক্ট আগাম সতর্কবার্তা ছাড়াই শেষ হয়ে যেত, আর হেড অফিস অর্ডার করত আন্দাজে: যা বিক্রি হয় না, সেটা বেশি; যা হয়, সেটা কম।' WHERE "slug" = 'pharmatrack-case-study' AND "challenge_bn" IS NULL;
--> statement-breakpoint
UPDATE "case_studies" SET "research_bn" = 'আমরা চারটি শাখায় দুই সপ্তাহ ধরে ফার্মাসিস্টদের কাজ দেখেছি, আর প্রতিটা স্টক-আউট আর মেয়াদোত্তীর্ণ লেখা-অফের কারণ খুঁজেছি। প্যাটার্নটা ছিল সহজ: কোনো শাখাই দেখতে পেত না অন্য শাখায় কী আছে, আর ব্যাচের মেয়াদ শেষ হওয়ার আগে কেউ সতর্ক করত না।' WHERE "slug" = 'pharmatrack-case-study' AND "research_bn" IS NULL;
--> statement-breakpoint
UPDATE "case_studies" SET "strategy_bn" = 'আমরা সব শাখার জন্য একটা Next.js ERP বানিয়েছি: ত্রিশ দিন আগের অ্যালার্টসহ ব্যাচ আর মেয়াদ ট্র্যাকিং, ট্রান্সফারসহ শাখা অনুযায়ী স্টক, সাপ্লায়ার পারচেজ অর্ডার, আর একটা ডেইলি সেলস রিপোর্ট, যা মালিক দুই মিনিটে পড়ে ফেলেন। কোনো শাখা আর আন্দাজে কাজ করে না।' WHERE "slug" = 'pharmatrack-case-study' AND "strategy_bn" IS NULL;
--> statement-breakpoint
UPDATE "case_studies" SET "results_bn" = 'এক কোয়ার্টারেই মেয়াদোত্তীর্ণ ক্ষতি 64% কমেছে। স্টক-আউট কমেছে 41%, কারণ শাখাগুলো নতুন করে অর্ডার না দিয়ে একে অপরের কাছে ট্রান্সফার করে, আর অর্ডার করতে সময় লাগে আগের অর্ধেক। আঠারোটা শাখাই একই ড্যাশবোর্ডে চলে।' WHERE "slug" = 'pharmatrack-case-study' AND "results_bn" IS NULL;
--> statement-breakpoint
-- Jannat Fashion ERP Scale (homepage-seed row; no research field in the seed)
UPDATE "case_studies" SET "title_bn" = 'Jannat Fashion ERP স্কেল' WHERE "slug" = 'jannat-fashion-erp-scale' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "case_studies" SET "challenge_bn" = 'মাল্টি-স্টোর WooCommerce-এ দিনে 2,000–5,000 অর্ডার প্রসেস করতে গিয়ে সিংক দেরি হচ্ছিল, আর ইনভেন্টরি মিলছিল না।' WHERE "slug" = 'jannat-fashion-erp-scale' AND "challenge_bn" IS NULL;
--> statement-breakpoint
UPDATE "case_studies" SET "strategy_bn" = 'আলাদা একটা Next.js + PostgreSQL ERP বানানো হয়েছে, BullMQ কিউ ওয়ার্কার আর Redis ক্যাশিংসহ।' WHERE "slug" = 'jannat-fashion-erp-scale' AND "strategy_bn" IS NULL;
--> statement-breakpoint
UPDATE "case_studies" SET "results_bn" = 'ইনভেন্টরি সিংক এখন প্রায় সঙ্গে সঙ্গে হয়, আর কুরিয়ার ডেলিভারি অ্যাকুরেসি 99.8%।' WHERE "slug" = 'jannat-fashion-erp-scale' AND "results_bn" IS NULL;
--> statement-breakpoint
-- Automated Fraud Order Blocking (homepage-seed row; no research field in the seed)
UPDATE "case_studies" SET "title_bn" = 'অটোমেটেড ফ্রড অর্ডার ব্লকিং' WHERE "slug" = 'automated-fraud-order-blocking' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "case_studies" SET "challenge_bn" = 'ভুয়া অর্ডার আর বেশি ডেলিভারি রিটার্ন রেশিও বাংলাদেশি ই-কমার্স মার্চেন্টদের মার্জিন কমিয়ে দিচ্ছিল।' WHERE "slug" = 'automated-fraud-order-blocking' AND "challenge_bn" IS NULL;
--> statement-breakpoint
UPDATE "case_studies" SET "strategy_bn" = 'অ্যালগরিদমিক ফ্রড ডিটেকশন বানানো হয়েছে, যা কুরিয়ার সাকসেস রেশিও, IP, ফোন আর ডিভাইস ফিঙ্গারপ্রিন্ট যাচাই করে।' WHERE "slug" = 'automated-fraud-order-blocking' AND "strategy_bn" IS NULL;
--> statement-breakpoint
UPDATE "case_studies" SET "results_bn" = 'ডেপ্লয় করার প্রথম মাসেই ভুয়া অর্ডার 70%-এর বেশি কমেছে।' WHERE "slug" = 'automated-fraud-order-blocking' AND "results_bn" IS NULL;
--> statement-breakpoint
-- Jannat Fashion ERP (build-time .md case study; no DB seed on main —
-- no-op unless an admin created this row with the .md copy)
UPDATE "case_studies" SET "title_bn" = 'Jannat Fashion ERP' WHERE "slug" = 'jannat-fashion-erp-case-study' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "case_studies" SET "challenge_bn" = 'জান্নাত ফ্যাশন একাধিক WooCommerce স্টোর জুড়ে দিনে 2,000 থেকে 5,000 অর্ডার নেয়। অর্ডার, ফ্রড, পে-রোল, অ্যাকাউন্টিং আর পাইকারি ছড়িয়ে ছিল এমন সব টুলে, যেগুলো একে অপরের সঙ্গে কথা বলত না।' WHERE "slug" = 'jannat-fashion-erp-case-study' AND "challenge_bn" IS NULL;
--> statement-breakpoint
UPDATE "case_studies" SET "strategy_bn" = 'একটা Next.js ERP, যা প্রতিটা স্টোরের অর্ডার একটাই ফ্লোতে আনে — ফ্রড ব্লক, পে-রোল আর অ্যাকাউন্টিং, SR পোর্টাল আর পাইকারিসহ একই সিস্টেমে।' WHERE "slug" = 'jannat-fashion-erp-case-study' AND "strategy_bn" IS NULL;
--> statement-breakpoint
UPDATE "case_studies" SET "results_bn" = 'পুরো অপারেশন এখন একটা সিস্টেমেই চলে — অর্ডার, স্টোর, ফ্রড চেক, পে-রোল আর পাইকারি।' WHERE "slug" = 'jannat-fashion-erp-case-study' AND "results_bn" IS NULL;
--> statement-breakpoint

-- ─── Posts ──────────────────────────────────────────────────────────
-- Building Fast E-commerce Sites with Next.js
UPDATE "posts" SET "title_bn" = 'Next.js দিয়ে দ্রুত ই-কমার্স সাইট বানানো' WHERE "slug" = 'building-fast-ecommerce-sites-with-nextjs' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "posts" SET "excerpt_bn" = 'গতিই একটা ফিচার: সার্ভার কম্পোনেন্ট, ছবি অপটিমাইজেশন আর এজ ক্যাশিং কীভাবে একটা স্টোরকে স্লো কানেকশনেও তাৎক্ষণিক মনে হয়।' WHERE "slug" = 'building-fast-ecommerce-sites-with-nextjs' AND "excerpt_bn" IS NULL;
--> statement-breakpoint
UPDATE "posts" SET "content_bn" = 'গতি এমন একটা ফিচার, যা কাস্টমার সবার আগে লক্ষ করে, আর সবার আগে যেটার জন্য শাস্তি দেয়। এক সেকেন্ডে লোড হওয়া একটা স্টোর মনে হয় তাৎক্ষণিক; একই স্টোর চার সেকেন্ডে মনে হয় ভাঙা।

## সার্ভার কম্পোনেন্টই ভারী কাজটা করে

Next.js সার্ভার কম্পোনেন্ট প্রোডাক্ট পেজ সার্ভারে রেন্ডার করতে দেয়, আর যেসব অংশ কখনো বদলায় না — প্রোডাক্ট গ্রিড, ফিল্টার, ফুটার — সেগুলোর জন্য প্রায় কোনো JavaScript পাঠায় না। যেসব অংশ ইন্টারঅ্যাক্টিভ — কার্ট, সার্চ, চেকআউট — সেগুলো তার ওপরে হাইড্রেট হয়। ফলে পেজ দ্রুত পেইন্ট হয়, আবার ইন্টারঅ্যাক্টিভও থাকে।

## ছবি আর ক্যাশিং বাকি কাজটা শেষ করে

স্টোর পেজের বেশিরভাগ ওজনই ছবি। অটোমেটিক ছবি অপটিমাইজেশন প্রতিটা ছবি ডিভাইসের দরকার অনুযায়ী সাইজে দেয়, আর এজ ক্যাশিং মানে বারবার ভিজিটে অরিজিনে প্রায় হাতই পড়ে না। সার্ভার কম্পোনেন্টের সঙ্গে মিলিয়ে, এটুকুই সাধারণত একটা ধীর স্টোরকে দুই সেকেন্ডের নিচে নামাতে যথেষ্ট।' WHERE "slug" = 'building-fast-ecommerce-sites-with-nextjs' AND "content_bn" IS NULL;
--> statement-breakpoint
-- A Practical Guide to WooCommerce Security for Bangladeshi Stores
UPDATE "posts" SET "title_bn" = 'বাংলাদেশি স্টোরের জন্য WooCommerce সিকিউরিটির প্র্যাকটিক্যাল গাইড' WHERE "slug" = 'woocommerce-security-guide-bangladesh' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "posts" SET "excerpt_bn" = 'ফ্রড অর্ডার, ভুয়া অ্যাকাউন্ট আর ব্রুট-ফোর্স লগইন: প্রতিটা WooCommerce স্টোর যেসব আক্রমণের মুখে পড়ে, আর যেসব ডিফেন্স আসলেই কাজ করে।' WHERE "slug" = 'woocommerce-security-guide-bangladesh' AND "excerpt_bn" IS NULL;
--> statement-breakpoint
UPDATE "posts" SET "content_bn" = 'বাংলাদেশের প্রতিটা WooCommerce স্টোর একই আক্রমণের মুখে পড়ে: ক্যাশ-অন-ডেলিভারি ফ্রড অর্ডার, বট দিয়ে বানানো ভুয়া অ্যাকাউন্ট, আর wp-admin-এর বিরুদ্ধে ব্রুট-ফোর্স লগইন চেষ্টা। সমাধানগুলো অসাধারণ কিছু নয় — বেসিক পরিচ্ছন্নতা, ধারাবাহিকভাবে প্রয়োগ করা।

## পাঠানোর আগেই ফ্রড আটকান

সবচেয়ে সস্তা ফ্রড ডিফেন্স হলো ফোন চেক: ক্যাশ-অন-ডেলিভারি অর্ডার ডিসপ্যাচ করার আগে নম্বরটা কনফার্ম করুন, আর ফোন, IP আর ডিভাইস দিয়ে বারবার ফ্রড করা নম্বরগুলো ফ্ল্যাগ করুন। ছোট একটা ব্লকলিস্ট আসল কাস্টমারদের না ছুঁয়েই বেশিরভাগ বারবার করা ফ্রড থামিয়ে দেয়।

## লগইন আর চেকআউট শক্ত করুন

লগইন চেষ্টা সীমিত করুন, শক্ত পাসওয়ার্ড বাধ্যতামূলক করুন, আর WordPress, WooCommerce আর প্রতিটা প্লাগইন আপডেটেড রাখুন। আমরা যেসব হ্যাক হওয়া স্টোর দেখেছি, তার বেশিরভাগই দুই বছর আগের প্লাগইন ভার্সন চালাচ্ছিল। আপডেট বিরক্তিকর — আর এটাই আসল খেলা।' WHERE "slug" = 'woocommerce-security-guide-bangladesh' AND "content_bn" IS NULL;
--> statement-breakpoint
-- From Idea to Launch: How I Plan a New Product
UPDATE "posts" SET "title_bn" = 'আইডিয়া থেকে লঞ্চ: আমি নতুন প্রোডাক্ট যেভাবে প্ল্যান করি' WHERE "slug" = 'from-idea-to-launch-product-planning' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "posts" SET "excerpt_bn" = 'প্রোডাক্ট শুরু হয় এক পেজের ব্রিফ দিয়ে, কোডবেইজ দিয়ে নয়। এক লাইন কোড লেখার আগে আমি যেসব প্ল্যানিং ধাপ ব্যবহার করি।' WHERE "slug" = 'from-idea-to-launch-product-planning' AND "excerpt_bn" IS NULL;
--> statement-breakpoint
UPDATE "posts" SET "content_bn" = 'বেশিরভাগ প্রোডাক্ট প্ল্যানিংয়ে ব্যর্থ হয়, কোডে নয়। কিছু লেখার আগে আমি এক পেজের একটা ব্রিফ লিখি: প্রোডাক্টটা কার জন্য, কোন একটা সমস্যা এটা সমাধান করে, আর নব্বই দিনে সফলতা কেমন দেখাবে। ব্রিফটা এক পেজে না আঁটলে, আইডিয়াটা এখনো তৈরি নয়।

## সবচেয়ে ছোট লঞ্চটা প্ল্যান করুন

প্রথম ভার্সনটা অল্প কিছু আসল ইউজারের জন্য একটা কাজ ভালোভাবে করবে। বাকি সব পরের তালিকায় যাবে। ছোট একটা লঞ্চ এক সপ্তাহে যা শেখায়, বড় লঞ্চ এক কোয়ার্টারে তা শেখায় না — কারণ আসল ইউজাররা জানিয়ে দেয় কোনটা আসলে জরুরি।

## শিপ করুন, মাপুন, সিদ্ধান্ত নিন

প্রথম দিন থেকেই অ্যানালিটিক্স চালু রেখে লঞ্চ করুন, ইউজাররা আসলে কী করে সেটা দেখুন, আর সেটাই ঠিক করুক পরের ফিচার কোনটা। প্ল্যানিং একবার শেষ করে ফেলার মতো ডকুমেন্ট নয় — এটা একটা লুপ, যা প্রতিটা রিলিজের পরে চালাতে হয়।' WHERE "slug" = 'from-idea-to-launch-product-planning' AND "content_bn" IS NULL;
--> statement-breakpoint
-- Nasheed Without Music: How I Record and Share (DB copy from 0012)
UPDATE "posts" SET "title_bn" = 'সংগীত ছাড়া নাশিদ: আমি যেভাবে রেকর্ড করি ও শেয়ার করি' WHERE "slug" = 'nasheed-without-music-recording' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "posts" SET "excerpt_bn" = 'কোনো বাদ্যযন্ত্র নেই, কোনো ব্যাকিং ট্র্যাক নেই — শুধু কণ্ঠ, লিরিক্স আর অর্থ। আমি ঘরে বসে নাশিদ যেভাবে রেকর্ড করি আর শ্রোতাদের সঙ্গে শেয়ার করি।' WHERE "slug" = 'nasheed-without-music-recording' AND "excerpt_bn" IS NULL;
--> statement-breakpoint
UPDATE "posts" SET "content_bn" = 'কোনো বাদ্যযন্ত্র নেই, কোনো ব্যাকিং ট্র্যাক নেই — শুধু কণ্ঠ, লিরিক্স আর অর্থ। আমি যে নাশিদ পরিবেশন করি, তার পুরো বিষয় এটাই, আর এটা আমার প্রতিটা রেকর্ডিং সিদ্ধান্তকে ঠিক করে দেয়।

## সাধারণ একটা সেটআপ, ভালোভাবে ব্যবহার করা

আমি একটা ভালো মাইক্রোফোন দিয়ে নীরব একটা ঘরে রেকর্ড করি, নরম আসবাবের কাছাকাছি — যা প্রতিধ্বনি কমিয়ে দেয়। কোনো স্টুডিও নেই, কোনো মিক্সিং ডেস্ক নেই — দামি গিয়ারের চেয়ে পরিষ্কার একটা ভোকাল টেকই বেশি জরুরি। প্রতিটা লাইন দুবার রেকর্ড করি, আর ভালোটা রাখি।

## ইফেক্টের জন্য নয়, পরিষ্কার শোনার জন্য এডিট

এডিটটা হালকা: লাইনের মাঝে শ্বাসের শব্দ সরিয়ে ফেলা, ভলিউম সমান করা — আর থামা। কোনো রিভার্বের কারসাজি নেই, কোনো পিচ কারেকশন নেই। কোনো লাইন খালি গলায় ঠিক না শোনালে, সফটওয়্যারে ঠিক করার বদলে আবার গাই।

## শ্রোতাদের সঙ্গে শেয়ার করা

শেষ করা রেকর্ডিং যায় স্ট্রিমিং প্ল্যাটফর্ম আর YouTube-এ, যেখানে মানুষ নাশিদটা দিয়েই খুঁজে পায়, আমাকে দিয়ে নয়। ঢাকার একজন শ্রোতা আর বিদেশের একজন শ্রোতা একই কণ্ঠ, একই কথা শোনে — সেটুকুই যথেষ্ট।' WHERE "slug" = 'nasheed-without-music-recording' AND "content_bn" IS NULL;
--> statement-breakpoint
-- Shipping Reliable Web Platforms Solo (homepage-seed row)
UPDATE "posts" SET "title_bn" = 'একা নির্ভরযোগ্য ওয়েব প্ল্যাটফর্ম শিপ করা' WHERE "slug" = 'shipping-reliable-web-platforms-solo' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "posts" SET "excerpt_bn" = 'বড় টিম ছাড়া কীভাবে প্রোডাকশন-গ্রেড ওয়েব প্ল্যাটফর্ম ডিজাইন, বানানো আর রক্ষণাবেক্ষণ করবেন।' WHERE "slug" = 'shipping-reliable-web-platforms-solo' AND "excerpt_bn" IS NULL;
--> statement-breakpoint
UPDATE "posts" SET "content_bn" = 'আজকের ওয়েবে বানানো মানে অভাবনীয় লিভারেজ পাওয়া। আধুনিক টুলচেইন আর অটোমেটেড ওয়ার্কফ্লো দিয়ে একজন ইঞ্জিনিয়ার এমন সিস্টেম বানাতে পারেন, যা হাজার হাজার ইউজারকে নির্ভরযোগ্যভাবে সার্ভ করে।' WHERE "slug" = 'shipping-reliable-web-platforms-solo' AND "content_bn" IS NULL;
--> statement-breakpoint
-- Why Courier Success Ratios Matter for BD E-commerce (homepage-seed row)
UPDATE "posts" SET "title_bn" = 'BD ই-কমার্সের জন্য কুরিয়ার সাকসেস রেশিও কেন জরুরি' WHERE "slug" = 'why-courier-success-ratios-matter-for-bd-e-commerce' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "posts" SET "excerpt_bn" = 'ডিসপ্যাচের আগে অ্যালগরিদমিক ভেরিফিকেশন দিয়ে RTO (Return to Origin) কমানো।' WHERE "slug" = 'why-courier-success-ratios-matter-for-bd-e-commerce' AND "excerpt_bn" IS NULL;
--> statement-breakpoint
UPDATE "posts" SET "content_bn" = 'প্রতিটা ফেরত পার্সেলের খরচ হয় টাকা আর লজিস্টিক্স ঝামেলা। চেকআউটে কুরিয়ার সাকসেস রেশিও ভেরিফিকেশন যোগ করলে ডেলিভারি ফুলফিলমেন্ট নাটকীয়ভাবে ভালো হয়।' WHERE "slug" = 'why-courier-success-ratios-matter-for-bd-e-commerce' AND "content_bn" IS NULL;
--> statement-breakpoint
-- Inside WooMate Lite: Blocking Fake Orders in WooCommerce
-- (build-time .md post; no DB seed on main — no-op unless the row exists)
UPDATE "posts" SET "title_bn" = 'WooMate Lite-এর ভেতরে: WooCommerce-এ ভুয়া অর্ডার আটকানো' WHERE "slug" = 'inside-woomate-lite-blocking-fake-orders' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "posts" SET "excerpt_bn" = 'ভুয়া ক্যাশ-অন-ডেলিভারি অর্ডার চুপচাপ খেয়ে ফেলে বাংলাদেশি স্টোরের কুরিয়ার বাজেট। WooMate Lite চেকআউটেই তা আটকায় — কীভাবে, দেখুন।' WHERE "slug" = 'inside-woomate-lite-blocking-fake-orders' AND "excerpt_bn" IS NULL;
--> statement-breakpoint
UPDATE "posts" SET "content_bn" = 'বাংলাদেশের প্রতিটা WooCommerce স্টোর ভুয়া অর্ডারটা চেনে: একটা নাম, একটা ফোন নম্বর যেটা কেউ ধরে না, আর এমন একটা ঠিকানা যেখানে যাওয়া যায় না। অর্ডারটা প্যাক হয়, কুরিয়ার শহরের ওপারে বয়ে নিয়ে যাওয়ার টাকা পায় — আর দাবি না করা পার্সেল ফেরত আনার টাকাও পায়।

## টাকাটা কোথায় লিক হয়

ক্যাশ-অন-ডেলিভারি দিয়েই বাংলাদেশ অনলাইনে কেনাকাটা করে, আর সেটা এভাবেই থাকা উচিত — কাস্টমাররা এটাতেই আস্থা রাখে। কিন্তু COD মানে স্টোর কিছু আয় করার আগেই ডেলিভারির টাকা দেয়, তাই প্রতিটা ভুয়া অর্ডার একটা ছোট, নীরব ক্ষতি। ব্যস্ত এক মাসে গুণ করলে, এটা আসল অর্ডারের মার্জিন নীরবে খেয়ে ফেলে।

## WooMate Lite যা করে

WooMate Lite হলো সেই WordPress প্লাগইন, যা আমি ঠিক এটার জন্যই বানিয়েছি। এটা চেকআউটে অর্ডার ভেরিফাই করে, আর ভুয়া অর্ডার যেসব প্যাটার্ন রেখে যায়, সেগুলো ফ্ল্যাগ করে — তাই পাঠানোর আগে স্টোর মালিক কনফার্ম করতে পারেন। চেকটা হয় সেই এক মুহূর্তে, যখন এর খরচ শূন্য।

এটা বানানো হয়েছে এখানকার ই-কমার্স যেভাবে চলে, ঠিক সেভাবে: প্রথমে ক্যাশ-অন-ডেলিভারি, অর্ডারে অর্ডারে অর্জিত আস্থা। আসল কাস্টমাররা কয়েক সেকেন্ডে পার হয়ে যায়; দেওয়া-আর-হারিয়ে-যাওয়া অর্ডারগুলো দরজাতেই আটকে যায়।' WHERE "slug" = 'inside-woomate-lite-blocking-fake-orders' AND "content_bn" IS NULL;
--> statement-breakpoint

-- ─── Releases (8) ───────────────────────────────────────────────────
-- Titles from 0009. Descriptions: the DB `description` is NULL (see
-- header), so description_bn translates the build-time .md descriptions
-- the live site actually renders, guarded by `description IS NULL`.
-- Ya Nabi has no known description anywhere — left empty on purpose.
-- Tune/lyricist are NOT seeded (they do not exist — never invent).
-- Ya Nabi Salam Alaika
UPDATE "releases" SET "title_bn" = 'ইয়া নবী সালাম আলাইকা' WHERE "slug" = 'ya-nabi-salam-alaika' AND "title_bn" IS NULL;
--> statement-breakpoint
-- Amar Vaiyer Rokto
UPDATE "releases" SET "title_bn" = 'আমার ভাইয়ের রক্ত' WHERE "slug" = 'amar-vaiyer-rokto' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "releases" SET "description_bn" = 'একুশের চেতনায় একটি শ্রদ্ধাঞ্জলি — ভাষা শহীদদের স্মরণ, এবং বাংলার জন্য দেওয়া মূল্য।' WHERE "slug" = 'amar-vaiyer-rokto' AND "description_bn" IS NULL AND "description" IS NULL;
--> statement-breakpoint
-- Afgan Tomake Janai Salam
UPDATE "releases" SET "title_bn" = 'আফগান তোমাকে জানাই সালাম' WHERE "slug" = 'afgan-tomake-janai-salam' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "releases" SET "description_bn" = 'আফগান জনগণের সহনশীলতা ও ঈমানের প্রতি সালাম।' WHERE "slug" = 'afgan-tomake-janai-salam' AND "description_bn" IS NULL AND "description" IS NULL;
--> statement-breakpoint
-- EID UL FATAH AFGAN
UPDATE "releases" SET "title_bn" = 'ঈদ উল ফাতাহ আফগান' WHERE "slug" = 'eid-ul-fatah-afgan' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "releases" SET "description_bn" = 'কৃতজ্ঞতা, বিজয় ও নবজাগরণের ঈদ নাশিদ।' WHERE "slug" = 'eid-ul-fatah-afgan' AND "description_bn" IS NULL AND "description" IS NULL;
--> statement-breakpoint
-- Kudrat Mai Banaya
UPDATE "releases" SET "title_bn" = 'কুদরত মাই বানায়া' WHERE "slug" = 'kudrat-mai-banaya' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "releases" SET "description_bn" = 'সবকিছুতে আল্লাহর কুদরত ও সৃষ্টির প্রশংসায় একটি নাশিদ।' WHERE "slug" = 'kudrat-mai-banaya' AND "description_bn" IS NULL AND "description" IS NULL;
--> statement-breakpoint
-- Akheri Somoy
UPDATE "releases" SET "title_bn" = 'আখেরি সময়' WHERE "slug" = 'akheri-somoy' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "releases" SET "description_bn" = 'জীবনের শেষ মুহূর্ত নিয়ে একটি ভাবনামূলক নাশিদ — আল্লাহর সঙ্গে সাক্ষাতের জন্য হৃদয় প্রস্তুত করা।' WHERE "slug" = 'akheri-somoy' AND "description_bn" IS NULL AND "description" IS NULL;
--> statement-breakpoint
-- Lab Pe Aati Hai Dua
UPDATE "releases" SET "title_bn" = 'লাব পে আতি হ্যায় দুয়া' WHERE "slug" = 'lab-pe-aati-hai-dua' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "releases" SET "description_bn" = 'প্রিয় উর্দু দুয়াটি, একটা আন্তরিক নাত হিসেবে — আলো, জ্ঞান আর মানুষের পাশে থাকার জীবনের জন্য প্রার্থনা।' WHERE "slug" = 'lab-pe-aati-hai-dua' AND "description_bn" IS NULL AND "description" IS NULL;
--> statement-breakpoint
-- Madina Jabo
UPDATE "releases" SET "title_bn" = 'মদিনা যাবো' WHERE "slug" = 'madina-jabo' AND "title_bn" IS NULL;
--> statement-breakpoint
UPDATE "releases" SET "description_bn" = 'মদিনার জন্য ব্যাকুলতার নাশিদ — নবীজির শহর দেখার আকাঙ্ক্ষা, ভক্তি ভরে, সংগীত ছাড়া গাওয়া।' WHERE "slug" = 'madina-jabo' AND "description_bn" IS NULL AND "description" IS NULL;
--> statement-breakpoint

-- ─── Ventures (6) ───────────────────────────────────────────────────
-- HisabKit
UPDATE "ventures" SET "name_bn" = 'HisabKit' WHERE "slug" = 'hisabkit' AND "name_bn" IS NULL;
--> statement-breakpoint
UPDATE "ventures" SET "description_bn" = 'বাংলাদেশি SME-দের জন্য বিলিং, ইনভয়েসিং আর হিসাব: বাংলা ইনভয়েস, বিকাশ রেকর্ড আর VAT-প্রস্তুত রিপোর্ট — এন্টারপ্রাইজ দাম ছাড়াই।' WHERE "slug" = 'hisabkit' AND "description_bn" IS NULL;
--> statement-breakpoint
-- CloudDesk
UPDATE "ventures" SET "name_bn" = 'CloudDesk' WHERE "slug" = 'clouddesk' AND "name_bn" IS NULL;
--> statement-breakpoint
UPDATE "ventures" SET "description_bn" = 'ছোট টিমের জন্য হালকা ক্লাউড ওয়ার্কস্পেস: ডকস, টাস্ক আর ফাইল — এন্টারপ্রাইজ জটিলতা বা এন্টারপ্রাইজ দাম ছাড়াই।' WHERE "slug" = 'clouddesk' AND "description_bn" IS NULL;
--> statement-breakpoint
-- SkillBridge
UPDATE "ventures" SET "name_bn" = 'SkillBridge' WHERE "slug" = 'skillbridge' AND "name_bn" IS NULL;
--> statement-breakpoint
UPDATE "ventures" SET "description_bn" = 'জুনিয়র ডেভেলপারদের পেইড, মেন্টর করা আসল প্রোডাক্ট প্রজেক্টের সঙ্গে যুক্ত করে এমন একটা স্কিল-আর-চাকরির সেতু, যাতে তারা শিপ করে শিখতে পারে।' WHERE "slug" = 'skillbridge' AND "description_bn" IS NULL;
--> statement-breakpoint
-- EcoMate (venture row from homepage-seed; no .md copy)
UPDATE "ventures" SET "name_bn" = 'EcoMate' WHERE "slug" = 'ecomate' AND "name_bn" IS NULL;
--> statement-breakpoint
UPDATE "ventures" SET "description_bn" = 'সিঙ্গেল-টেন্যান্ট SaaS ERP আর ই-কমার্স স্যুট, Docker দিয়ে প্রতিটা ক্লায়েন্টের জন্য আলাদা ডেপ্লয় করা।' WHERE "slug" = 'ecomate' AND "description_bn" IS NULL;
--> statement-breakpoint
-- WooMate Lite (venture row from homepage-seed; no .md copy)
UPDATE "ventures" SET "name_bn" = 'WooMate Lite' WHERE "slug" = 'woomate-lite' AND "name_bn" IS NULL;
--> statement-breakpoint
UPDATE "ventures" SET "description_bn" = 'বাংলাদেশি বিজনেসের জন্য WooCommerce-এ দরকারি সবকিছু আনা WordPress প্লাগইন — ফ্রড ব্লকিং, কুরিয়ার ইন্টিগ্রেশন।' WHERE "slug" = 'woomate-lite' AND "description_bn" IS NULL;
--> statement-breakpoint
-- DevPulse BD (venture row from homepage-seed; no .md copy)
UPDATE "ventures" SET "name_bn" = 'DevPulse BD' WHERE "slug" = 'devpulse-bd' AND "name_bn" IS NULL;
--> statement-breakpoint
UPDATE "ventures" SET "description_bn" = 'আধুনিক ওয়েব প্ল্যাটফর্মের জন্য সফটওয়্যার টুলিং আর ডেভেলপার রিসোর্স উদ্যোগ।' WHERE "slug" = 'devpulse-bd' AND "description_bn" IS NULL;
