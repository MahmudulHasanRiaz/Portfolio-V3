-- Media system fields for ventures (0017).
-- Same shape as 0010 (projects / case studies / posts): the thumbnail is
-- an image or a video, plus multi-video and image-gallery columns.
-- is_preview already exists on ventures (added by 0010), so it is NOT
-- added here.
-- Safe on a DB that already has rows: every new column is nullable or has a
-- default; nothing is dropped, renamed or altered. Re-runnable: ADD COLUMN
-- IF NOT EXISTS + guarded check constraint.
-- Column shapes (videos / gallery_images are arrays of URL strings):
--   videos:         '["https://...mp4", ...]'  (one or many videos)
--   gallery_images: '["https://...jpg", ...]'  (image gallery besides the thumbnail)
-- The thumbnail itself is either an image (thumbnail_url) or a video
-- (thumbnail_video_url, autoplay per thumbnail_autoplay; autoplay implies
-- muted in the browser).

ALTER TABLE "ventures" ADD COLUMN IF NOT EXISTS "thumbnail_type" varchar(10) NOT NULL DEFAULT 'image';
--> statement-breakpoint
ALTER TABLE "ventures" ADD COLUMN IF NOT EXISTS "thumbnail_url" text;
--> statement-breakpoint
ALTER TABLE "ventures" ADD COLUMN IF NOT EXISTS "thumbnail_video_url" text;
--> statement-breakpoint
ALTER TABLE "ventures" ADD COLUMN IF NOT EXISTS "thumbnail_autoplay" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "ventures" ADD COLUMN IF NOT EXISTS "videos" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "ventures" ADD COLUMN IF NOT EXISTS "gallery_images" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventures_thumbnail_type_check') THEN
    ALTER TABLE "ventures" ADD CONSTRAINT "ventures_thumbnail_type_check" CHECK ("thumbnail_type" IN ('image', 'video'));
  END IF;
END $$;
