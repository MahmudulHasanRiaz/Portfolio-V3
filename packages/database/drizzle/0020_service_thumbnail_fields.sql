-- Thumbnail fields for services (0020).
--
-- Services were the only content type without the media-system thumbnail
-- columns (posts, projects and case studies got them in 0010), so the
-- admin thumbnail picker had nothing to save to and the service forms had
-- no thumbnail field at all. Adds the same four columns, same shape and
-- defaults as the other content types. No videos/galleryImages — services
-- have no media gallery.
--
-- Safe on a DB that already has rows: all four columns are nullable (or
-- defaulted), no backfill needed. Re-runnable: ADD COLUMN IF NOT EXISTS.

ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "thumbnail_type" varchar(10) DEFAULT 'image';
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "thumbnail_url" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "thumbnail_video_url" text;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "thumbnail_autoplay" boolean DEFAULT false;
