-- 0033 — Bangla (bn) values for the public settings + stats labels.
--
-- THE LAST TWO GAPS in the Bangla fill. Everything else in the Leg B
-- list was already filled on main and is deliberately NOT repeated here:
--   * services / projects / case studies / posts / releases / ventures
--     *_bn — migration 0024 (PR #93), all rows.
--   * site_copy / site_copy_bn (250 EN / 247 BN keys) — migration 0030.
--   * stats EN labels aligned to the live site copy — migration 0031
--     (but 0031 set no label_bn; that is half of THIS migration).
--   * technologies name_bn / use_bn columns — migration 0032, values
--     explicitly deferred to the admin (proper-noun names are identical
--     in Bangla; only PHP has a `use` value).
--
-- SOURCE OF TRUTH — Portfolio-Public src/i18n/bn.ts (main), VERBATIM:
-- heroHeadline / heroDescription / knowMeHeadline / knowMeSub, and the
-- stat labels (statYears / statProjects / statClients / statReleases).
-- No re-translation, nothing invented.
--
-- API SHAPE (apps/dashboard/src/lib/public-content.ts getPublicSettings):
--   * settings keys hero_headline_bn / hero_description_bn /
--     know_me_headline_bn / know_me_sub_bn (jsonb strings, same
--     to_jsonb('...'::text) shape as the English rows seeded by 0018)
--     surface as bn.heroHeadline / bn.heroDescription / bn.knowMeHeadline
--     / bn.knowMeSub — only populated fields are included, so an empty
--     twin falls back to English.
--   * homepage_sections "stats" row content items[i].label_bn surface
--     as bn.statsLabels, positional over the stats row, present only
--     when at least one label_bn is set. EN labels after 0031 are
--     "Years Experience" / "Projects" / "Clients" / "Releases".
--   * Admin-editable after this lands: Settings → Brand / Identity
--     (brand-identity/page.tsx) has fields for all four *_bn keys,
--     written via PUT /api/settings/site-copy; the stats label_bn
--     values are editable from the homepage-sections admin UI.
--
-- DELIBERATELY NOT SEEDED (never invent his own words):
--   * designations_bn — no English `designations` row is seeded anywhere
--     (the admin profile UI writes it); the API overlays BN positionally
--     over the EN list, so a BN-only seed would be inert. Admin writes
--     both sides.
--   * Release tune / lyricist BN (credits tune_bn / lyricist_bn) — the
--     values do not exist anywhere. Testimonials — none exist.
--   * Know Me bio BN (aboutP1 / aboutP2 / aboutP3) — 0030 records the
--     Bangla bio as an unreviewed draft ("must not be baked in"); it
--     stays for the user to review.
--   * platforms subtitle_bn / clients name_bn — 0025 / 0027 defer these
--     to the admin (names are proper nouns, identical in Bangla).
--
-- SAFETY: settings INSERTs use ON CONFLICT ("key") DO NOTHING — an
-- admin-written Bangla value is never overwritten. Stats updates use
-- jsonb_set on one path only, guarded per item on the EN label (the
-- post-0031 label, or the pre-0031 seed label if 0031 has not applied
-- yet) AND on label_bn IS NULL — an admin-edited label or label_bn is
-- never touched. Re-runnable: a second run matches zero rows.
-- No schema change, no DELETE, no seed run.

-- ─── Settings BN (4) ────────────────────────────────────────────────
-- SE hero headline (bn.ts heroHeadline, verbatim).
INSERT INTO "settings" ("key", "value", "group", "description")
VALUES ('hero_headline_bn', to_jsonb('আমি এমন প্রোডাক্ট বানাই, যার ওপর মানুষ প্রতিদিন ভরসা করে।'::text), 'brand', 'SE hero headline (Bangla) — public homepage. English twin key: hero_headline.')
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
-- SE hero description (bn.ts heroDescription, verbatim).
INSERT INTO "settings" ("key", "value", "group", "description")
VALUES ('hero_description_bn', to_jsonb('বাংলাদেশ আর বিশ্বের বিজনেসের জন্য ERP, ই-কমার্স আর SaaS সিস্টেম — বাস্তব চাপে টিকে থাকার মতো করে বানানো।'::text), 'brand', 'SE hero description (Bangla) — public homepage. English twin key: hero_description.')
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
-- Know Me hero headline (bn.ts knowMeHeadline, verbatim).
INSERT INTO "settings" ("key", "value", "group", "description")
VALUES ('know_me_headline_bn', to_jsonb('সফটওয়্যার ইঞ্জিনিয়ার, উদ্যোক্তা ও নাশিদ শিল্পী — এক মানুষ, পাঁচটি পরিচয়।'::text), 'brand', 'Know Me hero headline (Bangla) — public homepage. English twin key: know_me_headline.')
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
-- Know Me hero sub (bn.ts knowMeSub, verbatim).
INSERT INTO "settings" ("key", "value", "group", "description")
VALUES ('know_me_sub_bn', to_jsonb('মাহমুদুল হাসান রিয়াজ — একজন হাফিজ-আলেম, যিনি ERP ও ই-কমার্স সফটওয়্যার বানান, তিনটা উদ্যোগ শুরু করেছেন, আর বিশ্বজুড়ে শ্রোতাদের সঙ্গে নাশিদ, তিলাওয়াত ও বক্তব্য শেয়ার করেন।'::text), 'brand', 'Know Me hero sub (Bangla) — public homepage. English twin key: know_me_sub.')
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

-- ─── Stats label_bn (4, positional) ─────────────────────────────────
-- Item 0: "Years Experience" -> "বছরের অভিজ্ঞতা" (bn.ts statYears).
UPDATE "homepage_sections" SET "content" = jsonb_set("content", '{items,0,label_bn}', '"বছরের অভিজ্ঞতা"'::jsonb) WHERE "section_key" = 'stats' AND "content"->'items'->0->>'label' IN ('Years Experience', 'Years of Experience') AND "content"->'items'->0->>'label_bn' IS NULL;
--> statement-breakpoint
-- Item 1: "Projects" -> "প্রজেক্ট" (bn.ts statProjects).
UPDATE "homepage_sections" SET "content" = jsonb_set("content", '{items,1,label_bn}', '"প্রজেক্ট"'::jsonb) WHERE "section_key" = 'stats' AND "content"->'items'->1->>'label' IN ('Projects', 'Projects Delivered') AND "content"->'items'->1->>'label_bn' IS NULL;
--> statement-breakpoint
-- Item 2: "Clients" -> "ক্লায়েন্ট" (bn.ts statClients).
UPDATE "homepage_sections" SET "content" = jsonb_set("content", '{items,2,label_bn}', '"ক্লায়েন্ট"'::jsonb) WHERE "section_key" = 'stats' AND "content"->'items'->2->>'label' IN ('Clients', 'Happy Clients') AND "content"->'items'->2->>'label_bn' IS NULL;
--> statement-breakpoint
-- Item 3: "Releases" -> "রিলিজ" (bn.ts statReleases).
UPDATE "homepage_sections" SET "content" = jsonb_set("content", '{items,3,label_bn}', '"রিলিজ"'::jsonb) WHERE "section_key" = 'stats' AND "content"->'items'->3->>'label' IN ('Releases', 'Releases Published') AND "content"->'items'->3->>'label_bn' IS NULL;
