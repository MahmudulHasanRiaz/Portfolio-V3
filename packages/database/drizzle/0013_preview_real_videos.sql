-- 0013 — put REAL stock videos into the dummy preview rows (0012 set
-- videos to [] after dropping the Google demo clips).
-- Footage is Pexels stock (HD mp4, direct links, curl-verified 200):
--   shopping: a woman paying by card on a laptop (video 5981981)
--   office:   a team collaborating around a laptop (video 8631874)
-- The doctor/patient clip (video 6129936) was fetched too, but it is NOT
-- used: no dummy project matches a doctor-patient scene, and mismatched
-- footage is itself a fake tell.
-- Scope: ONLY is_preview rows with the dummy slugs. Idempotent, safe
-- to re-run. DUMMY DATA ONLY — delete later with:
--   DELETE FROM <table> WHERE is_preview = true;

-- StyleNest: the shopping clip becomes the thumbnail VIDEO (autoplay, muted
-- per browser rules; the store photo stays as the poster) and the project's
-- video. This exercises the video-thumbnail path with real footage.
UPDATE "projects"
SET "thumbnail_type" = 'video',
    "thumbnail_video_url" = 'https://videos.pexels.com/video-files/5981981/5981981-hd_1366_720_25fps.mp4',
    "thumbnail_autoplay" = true,
    "videos" = '["https://videos.pexels.com/video-files/5981981/5981981-hd_1366_720_25fps.mp4"]'::jsonb
WHERE "slug" = 'stylenest-fashion-ecommerce' AND "is_preview" = true;
--> statement-breakpoint

-- PharmaTrack: the office-team clip as the project's video (detail page).
-- Thumbnail stays the dashboard image.
UPDATE "projects"
SET "videos" = '["https://videos.pexels.com/video-files/8631874/8631874-hd_1280_720_25fps.mp4"]'::jsonb
WHERE "slug" = 'pharmatrack-pharmacy-erp' AND "is_preview" = true;
