-- 0015 — relevant YouTube videos for the dummy preview rows (user, 2026-11-07:
-- "video add korar khetre youtube theke relevant any video add korte paro").
-- The media renderer now handles YouTube links (youtube-nocookie iframe)
-- next to direct mp4 files, so each item keeps its real stock clip AND a
-- relevant YouTube video. Every ID was verified live (YouTube oEmbed 200)
-- before it was stored:
--   * StyleNest (WooCommerce fashion store): Hostinger "WooCommerce Tutorial
--     (2026) — Full Setup Guide" — a full store built step by step.
--   * PharmaTrack (pharmacy ERP): "Enterprise Resource Planning (ERP) in
--     15 minutes" — what an ERP is and how it unifies a business.
--   * Nasheed post: his OWN video "Madina Jabo" (Melodians 2.0 channel) —
--     the post is about recording/sharing nasheed, so his own nasheed is
--     the relevant video. (Ya Nabi is never used as a video anywhere.)
-- Scope: ONLY is_preview rows with the dummy slugs. Idempotent (sets the
-- same array on re-run). DUMMY rows — delete later with:
--   DELETE FROM <table> WHERE is_preview = true;

UPDATE "projects"
SET "videos" = '["https://videos.pexels.com/video-files/5981981/5981981-hd_1366_720_25fps.mp4", "https://www.youtube.com/watch?v=dPUjUIXnbc4"]'::jsonb
WHERE "slug" = 'stylenest-fashion-ecommerce' AND "is_preview" = true;
--> statement-breakpoint

UPDATE "projects"
SET "videos" = '["https://videos.pexels.com/video-files/8631874/8631874-hd_1280_720_25fps.mp4", "https://www.youtube.com/watch?v=gBXJ_PhlADQ"]'::jsonb
WHERE "slug" = 'pharmatrack-pharmacy-erp' AND "is_preview" = true;
--> statement-breakpoint

UPDATE "posts"
SET "videos" = '["https://youtu.be/9qAfJ7XLRZA"]'::jsonb
WHERE "slug" = 'nasheed-without-music-recording' AND "is_preview" = true;
