-- Seed the 8 REAL releases the user provided (5 Spotify singles + 3 YouTube videos).
-- Idempotent: releases use ON CONFLICT (slug) DO NOTHING; platform rows use NOT EXISTS.
-- Ya Nabi rule: "Ya Nabi Salam Alaika" is an ordinary row here (is_featured = false);
-- the homepage query excludes it by title when picking latest/featured, so it can
-- never surface as a spotlight. Spotify singles carry NO per-track platform row:
-- track URLs were never provided and are never invented (the Spotify artist page
-- is linked from the profile). Singles use Jan 1 of their release year because the
-- exact day is unknown — the user corrects these from admin.
-- Video canonical URLs + YouTube platform rows are the verified youtu.be links
-- (channel: Melodians 2.0, NOT the user's own channel).

INSERT INTO "releases" ("id", "title", "slug", "type", "release_format", "release_date", "is_featured", "status") VALUES
  ('10000000-0000-4000-8000-000000000001', 'Ya Nabi Salam Alaika', 'ya-nabi-salam-alaika', 'nasheed', 'Single', '2025-01-01', false, 'published'),
  ('10000000-0000-4000-8000-000000000002', 'Amar Vaiyer Rokto', 'amar-vaiyer-rokto', 'nasheed', 'Single', '2021-01-01', false, 'published'),
  ('10000000-0000-4000-8000-000000000003', 'Afgan Tomake Janai Salam', 'afgan-tomake-janai-salam', 'nasheed', 'Single', '2021-01-01', false, 'published'),
  ('10000000-0000-4000-8000-000000000004', 'EID UL FATAH AFGAN', 'eid-ul-fatah-afgan', 'nasheed', 'Single', '2021-01-01', false, 'published'),
  ('10000000-0000-4000-8000-000000000005', 'Kudrat Mai Banaya', 'kudrat-mai-banaya', 'nasheed', 'Single', '2021-01-01', false, 'published'),
  ('10000000-0000-4000-8000-000000000006', 'Akheri Somoy', 'akheri-somoy', 'nasheed', 'Video', '2023-04-07', true, 'published'),
  ('10000000-0000-4000-8000-000000000007', 'Lab Pe Aati Hai Dua', 'lab-pe-aati-hai-dua', 'nasheed', 'Video', '2023-06-05', true, 'published'),
  ('10000000-0000-4000-8000-000000000008', 'Madina Jabo', 'madina-jabo', 'nasheed', 'Video', '2023-06-28', false, 'published')
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint

UPDATE "releases" SET "canonical_url" = 'https://youtu.be/J5F8vbZ6SF4' WHERE "slug" = 'akheri-somoy';
--> statement-breakpoint

UPDATE "releases" SET "canonical_url" = 'https://youtu.be/7OuutfZJL1s' WHERE "slug" = 'lab-pe-aati-hai-dua';
--> statement-breakpoint

UPDATE "releases" SET "canonical_url" = 'https://youtu.be/9qAfJ7XLRZA' WHERE "slug" = 'madina-jabo';
--> statement-breakpoint

INSERT INTO "release_platforms" ("release_id", "platform_name", "platform_url")
SELECT '10000000-0000-4000-8000-000000000006', 'YouTube', 'https://youtu.be/J5F8vbZ6SF4'
WHERE NOT EXISTS (SELECT 1 FROM "release_platforms" WHERE "release_id" = '10000000-0000-4000-8000-000000000006' AND "platform_name" = 'YouTube');
--> statement-breakpoint

INSERT INTO "release_platforms" ("release_id", "platform_name", "platform_url")
SELECT '10000000-0000-4000-8000-000000000007', 'YouTube', 'https://youtu.be/7OuutfZJL1s'
WHERE NOT EXISTS (SELECT 1 FROM "release_platforms" WHERE "release_id" = '10000000-0000-4000-8000-000000000007' AND "platform_name" = 'YouTube');
--> statement-breakpoint

INSERT INTO "release_platforms" ("release_id", "platform_name", "platform_url")
SELECT '10000000-0000-4000-8000-000000000008', 'YouTube', 'https://youtu.be/9qAfJ7XLRZA'
WHERE NOT EXISTS (SELECT 1 FROM "release_platforms" WHERE "release_id" = '10000000-0000-4000-8000-000000000008' AND "platform_name" = 'YouTube');
