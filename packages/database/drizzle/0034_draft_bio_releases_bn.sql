-- 0034 — Draft content, saved: Know Me bio BN + 7 release descriptions/credits.
--
-- SOURCE OF TRUTH — ~/workspace/bn-draft/drafts.md (research agent draft,
-- user-reviewed 2026-11-10), VERBATIM. Nothing re-translated, nothing
-- invented. The Public side carries the same texts in bn.ts (aboutP1-3)
-- and src/content/releases/*.md (expanded descriptions, Akheri credits,
-- exact Spotify dates) as the build-time fallback.
--
-- WHAT LANDS HERE:
--   * site_copy_bn aboutP1 / aboutP2 / aboutP3 — the polished Bangla
--     Know Me bio. 0030 deliberately left these keys OUT of site_copy_bn
--     ("unreviewed draft"); the draft is now reviewed, so they are saved
--     here. Live, site_copy_bn wins over the bn.ts dict (applySiteCopy).
--   * releases description + description_bn — the EXPANDED texts (old
--     sentence + release date/platform/credit sentence). The DB
--     `description` is NULL today (0009 never set it; 0024 confirms),
--     and `description_bn` holds the SHORT 0024 text.
--   * releases.credits for akheri-somoy ONLY — Tune: Iqbal Mahmud,
--     Lyricist: Mamun Misbah (+ tune_bn / lyricist_bn), from the
--     YouTube video description ("Composer: Iqbal Mahmud" /
--     "Lyricist: Mamun Misbah").
--   * release_date for the 4 Spotify singles — exact dates verified
--     from Spotify (0009 seeded the 2021-01-01 placeholder).
--
-- DELIBERATELY LEFT EMPTY (never invent):
--   * Tune / lyricist for the other 6 releases — NOT FOUND anywhere
--     (Madina Jabo video page 429; Lab Pe Aati Hai Dua description has
--     no composer/lyricist credit; Spotify track pages carry no
--     credits). The © holders (ISMAIL RAFIQ, Shahnur Shaheen,
--     Muhaddis Rafiqullah Afsari) and the Allama Iqbal lead for
--     Lab Pe Aati Hai Dua are UNCONFIRMED — not stored.
--   * Ya Nabi Salam Alaika — out of scope, untouched.
--   * COMMERCIANS CEO / madrasa education facts (about.me) — NOT in
--     the bio; user approval needed before they go in.
--   * Testimonials — none exist.
--
-- SAFETY (same pattern as 0024 / 0033): every statement is guarded so
-- an admin-written value is never overwritten, and a second run
-- matches zero rows (idempotent). No schema change, no DELETE.
--   * site_copy_bn: jsonb_set only where the key is absent/empty.
--   * description: only where NULL/empty OR exactly the old build-time
--     sentence (an admin who copied the .md text still gets the
--     expansion; any other text is left alone).
--   * description_bn: only where NULL/empty OR exactly the short 0024
--     text, AND the EN side is one of the known values (NULL, old, or
--     the expanded text this migration just set) — so an admin-written
--     EN description is never paired with a mismatched Bangla text.
--   * credits keys: jsonb_set only where that key is absent.
--   * release_date: only where it is still the 2021-01-01 placeholder.

-- ─── Know Me bio BN (site_copy_bn aboutP1/P2/P3) ───────────────────────
-- aboutP1 (drafts.md §a, verbatim).
UPDATE "settings" SET "value" = jsonb_set("value", '{aboutP1}', to_jsonb('মাহমুদুল হাসান রিয়াজ ঢাকার একজন সফটওয়্যার ইঞ্জিনিয়ার। তিনি বাংলাদেশ আর বিশ্বের বিজনেসের জন্য ERP, ই-কমার্স আর SaaS সিস্টেম বানান।'::text)) WHERE "key" = 'site_copy_bn' AND ("value"->>'aboutP1' IS NULL OR "value"->>'aboutP1' = '');
--> statement-breakpoint
-- aboutP2 (drafts.md §a, verbatim).
UPDATE "settings" SET "value" = jsonb_set("value", '{aboutP2}', to_jsonb('তিনি একজন উদ্যোক্তা আর পাবলিক ফিগারও — বাংলাদেশি বিজনেসের আসল সমস্যার সমাধান হয়, এমন কোম্পানি গড়ছেন; আর সরাসরি ও অনলাইনে কথা বলেন, শেখান, শেয়ার করেন।'::text)) WHERE "key" = 'site_copy_bn' AND ("value"->>'aboutP2' IS NULL OR "value"->>'aboutP2' = '');
--> statement-breakpoint
-- aboutP3 (drafts.md §a, verbatim).
UPDATE "settings" SET "value" = jsonb_set("value", '{aboutP3}', to_jsonb('নাশিদ শিল্পী ও হাফিজ-আলেম হিসেবে তিনি বাদ্যযন্ত্র ছাড়া নাশিদ রেকর্ড করেন — শুধু কণ্ঠ, কথা আর অর্থ।'::text)) WHERE "key" = 'site_copy_bn' AND ("value"->>'aboutP3' IS NULL OR "value"->>'aboutP3' = '');
--> statement-breakpoint

-- ─── Release descriptions EN + BN (expanded) ───────────────────────────
-- madina-jabo: description (guard: NULL/empty or old .md sentence).
UPDATE "releases" SET "description" = 'A nasheed of longing for Madina — the yearning to visit the Prophet''s city, sung with devotion and without instruments. Released as a video on YouTube (Melodians) on 28 June 2023.' WHERE "slug" = 'madina-jabo' AND ("description" IS NULL OR "description" = '' OR "description" = 'A nasheed of longing for Madina — the yearning to visit the Prophet''s city, sung with devotion and without instruments.');
--> statement-breakpoint
-- madina-jabo: description_bn (guard: NULL/empty or short 0024 text; EN side must be a known value).
UPDATE "releases" SET "description_bn" = 'মদিনার জন্য ব্যাকুলতার নাশিদ — নবীজির শহর দেখার আকাঙ্ক্ষা, ভক্তি ভরে, বাদ্যযন্ত্র ছাড়া গাওয়া। ২০২৩ সালের ২৮ জুন Melodians-এর YouTube চ্যানেলে ভিডিও হিসেবে রিলিজ হয়েছে।' WHERE "slug" = 'madina-jabo' AND ("description_bn" IS NULL OR "description_bn" = '' OR "description_bn" = 'মদিনার জন্য ব্যাকুলতার নাশিদ — নবীজির শহর দেখার আকাঙ্ক্ষা, ভক্তি ভরে, সংগীত ছাড়া গাওয়া।') AND ("description" IS NULL OR "description" = 'A nasheed of longing for Madina — the yearning to visit the Prophet''s city, sung with devotion and without instruments.' OR "description" = 'A nasheed of longing for Madina — the yearning to visit the Prophet''s city, sung with devotion and without instruments. Released as a video on YouTube (Melodians) on 28 June 2023.');
--> statement-breakpoint
-- lab-pe-aati-hai-dua: description (guard: NULL/empty or old .md sentence).
UPDATE "releases" SET "description" = 'The beloved Urdu dua, rendered as a heartfelt naat — a prayer for a life of light, knowledge and service. Released as a video on YouTube (Melodians) on 5 June 2023, sung by Riaz, and also streaming on Spotify, Apple Music, Amazon Music and Deezer.' WHERE "slug" = 'lab-pe-aati-hai-dua' AND ("description" IS NULL OR "description" = '' OR "description" = 'The beloved Urdu dua, rendered as a heartfelt naat — a prayer for a life of light, knowledge and service.');
--> statement-breakpoint
-- lab-pe-aati-hai-dua: description_bn (guard: NULL/empty or short 0024 text; EN side must be a known value).
UPDATE "releases" SET "description_bn" = 'প্রিয় উর্দু দুয়াটি, একটা আন্তরিক নাত হিসেবে — আলো, জ্ঞান আর মানুষের পাশে থাকার জীবনের জন্য প্রার্থনা। ২০২৩ সালের ৫ জুন Melodians-এর YouTube চ্যানেলে ভিডিও হিসেবে রিলিজ হয়েছে, গেয়েছেন রিয়াজ; Spotify, Apple Music, Amazon Music আর Deezer-এও শোনা যায়।' WHERE "slug" = 'lab-pe-aati-hai-dua' AND ("description_bn" IS NULL OR "description_bn" = '' OR "description_bn" = 'প্রিয় উর্দু দুয়াটি, একটা আন্তরিক নাত হিসেবে — আলো, জ্ঞান আর মানুষের পাশে থাকার জীবনের জন্য প্রার্থনা।') AND ("description" IS NULL OR "description" = 'The beloved Urdu dua, rendered as a heartfelt naat — a prayer for a life of light, knowledge and service.' OR "description" = 'The beloved Urdu dua, rendered as a heartfelt naat — a prayer for a life of light, knowledge and service. Released as a video on YouTube (Melodians) on 5 June 2023, sung by Riaz, and also streaming on Spotify, Apple Music, Amazon Music and Deezer.');
--> statement-breakpoint
-- akheri-somoy: description (guard: NULL/empty or old .md sentence).
UPDATE "releases" SET "description" = 'A reflective nasheed on the final moments of life and preparing the heart to meet Allah. Released as a video on YouTube (Melodians) on 7 April 2023, with lyrics by Mamun Misbah and composition by Iqbal Mahmud.' WHERE "slug" = 'akheri-somoy' AND ("description" IS NULL OR "description" = '' OR "description" = 'A reflective nasheed on the final moments of life and preparing the heart to meet Allah.');
--> statement-breakpoint
-- akheri-somoy: description_bn (guard: NULL/empty or short 0024 text; EN side must be a known value).
UPDATE "releases" SET "description_bn" = 'জীবনের শেষ মুহূর্ত নিয়ে একটি ভাবনামূলক নাশিদ — আল্লাহর সঙ্গে সাক্ষাতের জন্য হৃদয় প্রস্তুত করা। ২০২৩ সালের ৭ এপ্রিল Melodians-এর YouTube চ্যানেলে ভিডিও হিসেবে রিলিজ হয়েছে; কথা লিখেছেন মামুন মিসবাহ, সুর করেছেন ইকবাল মাহমুদ।' WHERE "slug" = 'akheri-somoy' AND ("description_bn" IS NULL OR "description_bn" = '' OR "description_bn" = 'জীবনের শেষ মুহূর্ত নিয়ে একটি ভাবনামূলক নাশিদ — আল্লাহর সঙ্গে সাক্ষাতের জন্য হৃদয় প্রস্তুত করা।') AND ("description" IS NULL OR "description" = 'A reflective nasheed on the final moments of life and preparing the heart to meet Allah.' OR "description" = 'A reflective nasheed on the final moments of life and preparing the heart to meet Allah. Released as a video on YouTube (Melodians) on 7 April 2023, with lyrics by Mamun Misbah and composition by Iqbal Mahmud.');
--> statement-breakpoint
-- amar-vaiyer-rokto: description (guard: NULL/empty or old .md sentence).
UPDATE "releases" SET "description" = 'A tribute in the spirit of Ekushey — remembering the language martyrs and the price paid for Bangla. Released as a single on Spotify on 9 July 2021 — audio only, not on YouTube.' WHERE "slug" = 'amar-vaiyer-rokto' AND ("description" IS NULL OR "description" = '' OR "description" = 'A tribute in the spirit of Ekushey — remembering the language martyrs and the price paid for Bangla.');
--> statement-breakpoint
-- amar-vaiyer-rokto: description_bn (guard: NULL/empty or short 0024 text; EN side must be a known value).
UPDATE "releases" SET "description_bn" = 'একুশের চেতনায় একটি শ্রদ্ধাঞ্জলি — ভাষা শহীদদের স্মরণ, এবং বাংলার জন্য দেওয়া মূল্য। ২০২১ সালের ৯ জুলাই Spotify-এ সিঙ্গেল হিসেবে রিলিজ হয়েছে — শুধু অডিও, YouTube-এ নেই।' WHERE "slug" = 'amar-vaiyer-rokto' AND ("description_bn" IS NULL OR "description_bn" = '' OR "description_bn" = 'একুশের চেতনায় একটি শ্রদ্ধাঞ্জলি — ভাষা শহীদদের স্মরণ, এবং বাংলার জন্য দেওয়া মূল্য।') AND ("description" IS NULL OR "description" = 'A tribute in the spirit of Ekushey — remembering the language martyrs and the price paid for Bangla.' OR "description" = 'A tribute in the spirit of Ekushey — remembering the language martyrs and the price paid for Bangla. Released as a single on Spotify on 9 July 2021 — audio only, not on YouTube.');
--> statement-breakpoint
-- afgan-tomake-janai-salam: description (guard: NULL/empty or old .md sentence).
UPDATE "releases" SET "description" = 'A salute to the resilience and faith of the Afghan people. Released as a single on Spotify on 27 December 2021 — audio only, not on YouTube.' WHERE "slug" = 'afgan-tomake-janai-salam' AND ("description" IS NULL OR "description" = '' OR "description" = 'A salute to the resilience and faith of the Afghan people.');
--> statement-breakpoint
-- afgan-tomake-janai-salam: description_bn (guard: NULL/empty or short 0024 text; EN side must be a known value).
UPDATE "releases" SET "description_bn" = 'আফগান জনগণের সহনশীলতা ও ঈমানের প্রতি সালাম। ২০২১ সালের ২৭ ডিসেম্বর Spotify-এ সিঙ্গেল হিসেবে রিলিজ হয়েছে — শুধু অডিও, YouTube-এ নেই।' WHERE "slug" = 'afgan-tomake-janai-salam' AND ("description_bn" IS NULL OR "description_bn" = '' OR "description_bn" = 'আফগান জনগণের সহনশীলতা ও ঈমানের প্রতি সালাম।') AND ("description" IS NULL OR "description" = 'A salute to the resilience and faith of the Afghan people.' OR "description" = 'A salute to the resilience and faith of the Afghan people. Released as a single on Spotify on 27 December 2021 — audio only, not on YouTube.');
--> statement-breakpoint
-- eid-ul-fatah-afgan: description (guard: NULL/empty or old .md sentence).
UPDATE "releases" SET "description" = 'An Eid nasheed marking gratitude, victory and renewal. Released as a single on Spotify on 16 August 2021 — audio only, not on YouTube.' WHERE "slug" = 'eid-ul-fatah-afgan' AND ("description" IS NULL OR "description" = '' OR "description" = 'An Eid nasheed marking gratitude, victory and renewal.');
--> statement-breakpoint
-- eid-ul-fatah-afgan: description_bn (guard: NULL/empty or short 0024 text; EN side must be a known value).
UPDATE "releases" SET "description_bn" = 'কৃতজ্ঞতা, বিজয় ও নবজাগরণের ঈদ নাশিদ। ২০২১ সালের ১৬ আগস্ট Spotify-এ সিঙ্গেল হিসেবে রিলিজ হয়েছে — শুধু অডিও, YouTube-এ নেই।' WHERE "slug" = 'eid-ul-fatah-afgan' AND ("description_bn" IS NULL OR "description_bn" = '' OR "description_bn" = 'কৃতজ্ঞতা, বিজয় ও নবজাগরণের ঈদ নাশিদ।') AND ("description" IS NULL OR "description" = 'An Eid nasheed marking gratitude, victory and renewal.' OR "description" = 'An Eid nasheed marking gratitude, victory and renewal. Released as a single on Spotify on 16 August 2021 — audio only, not on YouTube.');
--> statement-breakpoint
-- kudrat-mai-banaya: description (guard: NULL/empty or old .md sentence).
UPDATE "releases" SET "description" = 'A nasheed in praise of Allah''s power and creation in all things. Released as a single on Spotify on 16 April 2021 — audio only, not on YouTube.' WHERE "slug" = 'kudrat-mai-banaya' AND ("description" IS NULL OR "description" = '' OR "description" = 'A nasheed in praise of Allah''s power and creation in all things.');
--> statement-breakpoint
-- kudrat-mai-banaya: description_bn (guard: NULL/empty or short 0024 text; EN side must be a known value).
UPDATE "releases" SET "description_bn" = 'সবকিছুতে আল্লাহর কুদরত ও সৃষ্টির প্রশংসায় একটি নাশিদ। ২০২১ সালের ১৬ এপ্রিল Spotify-এ সিঙ্গেল হিসেবে রিলিজ হয়েছে — শুধু অডিও, YouTube-এ নেই।' WHERE "slug" = 'kudrat-mai-banaya' AND ("description_bn" IS NULL OR "description_bn" = '' OR "description_bn" = 'সবকিছুতে আল্লাহর কুদরত ও সৃষ্টির প্রশংসায় একটি নাশিদ।') AND ("description" IS NULL OR "description" = 'A nasheed in praise of Allah''s power and creation in all things.' OR "description" = 'A nasheed in praise of Allah''s power and creation in all things. Released as a single on Spotify on 16 April 2021 — audio only, not on YouTube.');
--> statement-breakpoint

-- ─── Akheri Somoy credits (only release with verified credits) ─────────
-- Tune: Iqbal Mahmud — YouTube description "Composer: Iqbal Mahmud".
UPDATE "releases" SET "credits" = jsonb_set(COALESCE("credits", '{}'::jsonb), '{tune}', '"Iqbal Mahmud"'::jsonb) WHERE "slug" = 'akheri-somoy' AND ("credits" IS NULL OR "credits"->>'tune' IS NULL);
--> statement-breakpoint
-- Lyricist: Mamun Misbah — YouTube description "Lyricist: Mamun Misbah".
UPDATE "releases" SET "credits" = jsonb_set(COALESCE("credits", '{}'::jsonb), '{lyricist}', '"Mamun Misbah"'::jsonb) WHERE "slug" = 'akheri-somoy' AND ("credits" IS NULL OR "credits"->>'lyricist' IS NULL);
--> statement-breakpoint
-- Tune (Bangla).
UPDATE "releases" SET "credits" = jsonb_set(COALESCE("credits", '{}'::jsonb), '{tune_bn}', '"ইকবাল মাহমুদ"'::jsonb) WHERE "slug" = 'akheri-somoy' AND ("credits" IS NULL OR "credits"->>'tune_bn' IS NULL);
--> statement-breakpoint
-- Lyricist (Bangla).
UPDATE "releases" SET "credits" = jsonb_set(COALESCE("credits", '{}'::jsonb), '{lyricist_bn}', '"মামুন মিসবাহ"'::jsonb) WHERE "slug" = 'akheri-somoy' AND ("credits" IS NULL OR "credits"->>'lyricist_bn' IS NULL);
--> statement-breakpoint

-- ─── Spotify single dates (guard: still the 2021-01-01 placeholder) ───
-- amar-vaiyer-rokto: 2021-01-01 -> 2021-07-09 (Spotify verified).
UPDATE "releases" SET "release_date" = '2021-07-09' WHERE "slug" = 'amar-vaiyer-rokto' AND "release_date" = '2021-01-01';
--> statement-breakpoint
-- afgan-tomake-janai-salam: 2021-01-01 -> 2021-12-27 (Spotify verified).
UPDATE "releases" SET "release_date" = '2021-12-27' WHERE "slug" = 'afgan-tomake-janai-salam' AND "release_date" = '2021-01-01';
--> statement-breakpoint
-- eid-ul-fatah-afgan: 2021-01-01 -> 2021-08-16 (Spotify verified).
UPDATE "releases" SET "release_date" = '2021-08-16' WHERE "slug" = 'eid-ul-fatah-afgan' AND "release_date" = '2021-01-01';
--> statement-breakpoint
-- kudrat-mai-banaya: 2021-01-01 -> 2021-04-16 (Spotify verified).
UPDATE "releases" SET "release_date" = '2021-04-16' WHERE "slug" = 'kudrat-mai-banaya' AND "release_date" = '2021-01-01';
