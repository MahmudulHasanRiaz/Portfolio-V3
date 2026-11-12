-- Platforms (0025).
--
-- New table for the 17 platform rows the Astro public site renders
-- (All-platforms page, Combined music chips, footer primaries, WhatsApp
-- contact). Previously hardcoded in the Astro site's src/data/site.ts
-- PLATFORMS array; the DB is now the source of truth and the admin
-- panel (D1b) edits these rows.
--
-- Seed: the live PLATFORMS copy VERBATIM from Portfolio-Public main
-- 0af172bb src/data/site.ts — names, URLs, handles, Simple Icons slugs
-- (incl. the wikimedia: logo URLs), groups, subtitles and notes.
-- name_bn / subtitle_bn stay NULL: the live copy has no Bangla for
-- platforms yet; an admin writes them later. is_primary marks the 5
-- FOOTER_PRIMARIES rows (LinkedIn, WhatsApp, Facebook Professional,
-- GitHub, YouTube, in that order); sort_order is the PLATFORMS order.
--
-- Safe on a fresh or existing DB: CREATE TABLE IF NOT EXISTS; fixed
-- UUIDs (30000000 range) + ON CONFLICT (id) DO NOTHING, so a second
-- run inserts zero rows and never touches an admin-edited row.

CREATE TABLE IF NOT EXISTS "platforms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "name_bn" text,
  "url" text NOT NULL,
  "handle" text,
  "group" text NOT NULL,
  "icon" text,
  "subtitle" text,
  "subtitle_bn" text,
  "note" text,
  "is_primary" boolean DEFAULT false,
  "sort_order" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
INSERT INTO "platforms" ("id", "name", "url", "handle", "group", "icon", "subtitle", "note", "is_primary", "sort_order") VALUES ('30000000-0000-4000-8000-000000000001', 'YouTube', 'https://www.youtube.com/@MahmudRiazBD', '@MahmudRiazBD', 'music', 'youtube', 'Nasheed channel — @MahmudRiazBD', NULL, true, 1) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "platforms" ("id", "name", "url", "handle", "group", "icon", "subtitle", "note", "is_primary", "sort_order") VALUES ('30000000-0000-4000-8000-000000000002', 'Spotify', 'https://open.spotify.com/artist/6nRAJg1qLQq3hwlWGtyVap', NULL, 'music', 'spotify', 'Artist profile — the nasheed singles', NULL, false, 2) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "platforms" ("id", "name", "url", "handle", "group", "icon", "subtitle", "note", "is_primary", "sort_order") VALUES ('30000000-0000-4000-8000-000000000003', 'Apple Music', 'https://music.apple.com/us/artist/mahmudul-hasan-riaz/1727545988', NULL, 'music', 'applemusic', 'Artist profile — the nasheed singles', NULL, false, 3) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "platforms" ("id", "name", "url", "handle", "group", "icon", "subtitle", "note", "is_primary", "sort_order") VALUES ('30000000-0000-4000-8000-000000000004', 'Deezer', 'https://www.deezer.com/artist/251928172', NULL, 'music', 'deezer', 'Artist profile — the nasheed singles', NULL, false, 4) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "platforms" ("id", "name", "url", "handle", "group", "icon", "subtitle", "note", "is_primary", "sort_order") VALUES ('30000000-0000-4000-8000-000000000005', 'Boomplay', 'https://www.boomplay.com/artists/84197326', NULL, 'music', 'wikimedia:https://upload.wikimedia.org/wikipedia/commons/0/0d/Boomplay_Music_Logo.png', 'Artist profile — the nasheed singles', NULL, false, 5) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "platforms" ("id", "name", "url", "handle", "group", "icon", "subtitle", "note", "is_primary", "sort_order") VALUES ('30000000-0000-4000-8000-000000000006', 'JioSaavn', 'https://www.jiosaavn.com/artist/mahmudul-hasan-riaz-songs/kxedaLEBozo_', NULL, 'music', 'wikimedia:https://upload.wikimedia.org/wikipedia/commons/e/ed/JioSaavn_Logo.svg', 'Artist profile — the nasheed singles', NULL, false, 6) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "platforms" ("id", "name", "url", "handle", "group", "icon", "subtitle", "note", "is_primary", "sort_order") VALUES ('30000000-0000-4000-8000-000000000007', 'SoundCloud', 'https://soundcloud.com/mahmudulhasanriazbd', NULL, 'music', 'soundcloud', 'Artist profile — the nasheed singles', NULL, false, 7) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "platforms" ("id", "name", "url", "handle", "group", "icon", "subtitle", "note", "is_primary", "sort_order") VALUES ('30000000-0000-4000-8000-000000000008', 'Facebook', 'https://www.facebook.com/MahmudulHasanRiazBD', 'MahmudulHasanRiazBD', 'social', 'facebook', 'Personal profile — MahmudulHasanRiazBD', 'Personal', false, 8) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "platforms" ("id", "name", "url", "handle", "group", "icon", "subtitle", "note", "is_primary", "sort_order") VALUES ('30000000-0000-4000-8000-000000000009', 'Facebook', 'https://www.facebook.com/MahmudulHasanRiaz.Official', 'MahmudulHasanRiaz.Official', 'social', 'facebook', 'Professional page — MahmudulHasanRiaz.Official', 'Professional', true, 9) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "platforms" ("id", "name", "url", "handle", "group", "icon", "subtitle", "note", "is_primary", "sort_order") VALUES ('30000000-0000-4000-8000-000000000010', 'WhatsApp', 'https://wa.me/8801601701567', NULL, 'social', 'whatsapp', 'Direct chat — message him any time', NULL, true, 10) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "platforms" ("id", "name", "url", "handle", "group", "icon", "subtitle", "note", "is_primary", "sort_order") VALUES ('30000000-0000-4000-8000-000000000011', 'Instagram', 'https://www.instagram.com/mahmudulhasanriazbd', '@mahmudulhasanriazbd', 'social', 'instagram', 'Photos and updates — @mahmudulhasanriazbd', NULL, false, 11) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "platforms" ("id", "name", "url", "handle", "group", "icon", "subtitle", "note", "is_primary", "sort_order") VALUES ('30000000-0000-4000-8000-000000000012', 'TikTok', 'https://www.tiktok.com/@mahmudulhasanriazbd', '@mahmudulhasanriazbd', 'social', 'tiktok', 'Short videos — @mahmudulhasanriazbd', NULL, false, 12) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "platforms" ("id", "name", "url", "handle", "group", "icon", "subtitle", "note", "is_primary", "sort_order") VALUES ('30000000-0000-4000-8000-000000000013', 'Threads', 'https://www.threads.net/@mahmudulhasanriazbd', '@mahmudulhasanriazbd', 'social', 'threads', 'Posts and conversation — @mahmudulhasanriazbd', NULL, false, 13) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "platforms" ("id", "name", "url", "handle", "group", "icon", "subtitle", "note", "is_primary", "sort_order") VALUES ('30000000-0000-4000-8000-000000000014', 'Telegram', 'https://t.me/mahmudulhasanriazbd', NULL, 'social', 'telegram', 'Channel — @mahmudulhasanriazbd', NULL, false, 14) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "platforms" ("id", "name", "url", "handle", "group", "icon", "subtitle", "note", "is_primary", "sort_order") VALUES ('30000000-0000-4000-8000-000000000015', 'X', 'https://x.com/MahmudRiazBD', '@MahmudRiazBD', 'social', 'x', 'Updates and posts — @MahmudRiazBD', NULL, false, 15) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "platforms" ("id", "name", "url", "handle", "group", "icon", "subtitle", "note", "is_primary", "sort_order") VALUES ('30000000-0000-4000-8000-000000000016', 'LinkedIn', 'https://www.linkedin.com/in/mahmudulhasanriaz', NULL, 'professional', 'wikimedia:https://upload.wikimedia.org/wikipedia/commons/8/81/LinkedIn_icon.svg', 'Professional profile — in/mahmudulhasanriaz', NULL, true, 16) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "platforms" ("id", "name", "url", "handle", "group", "icon", "subtitle", "note", "is_primary", "sort_order") VALUES ('30000000-0000-4000-8000-000000000017', 'GitHub', 'https://github.com/MahmudulHasanRiaz', NULL, 'professional', 'github', 'Code profile — MahmudulHasanRiaz', NULL, true, 17) ON CONFLICT ("id") DO NOTHING;
