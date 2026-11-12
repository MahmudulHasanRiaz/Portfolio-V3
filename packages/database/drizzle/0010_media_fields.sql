-- Media system fields for projects, case studies and blog posts (0010).
-- Adds per-content thumbnail (image or video), multi-video and image-gallery
-- columns, plus an is_preview marker used by the dummy preview seed (0011)
-- so preview rows can be listed and deleted without touching real rows.
-- Safe on a DB that already has rows: every new column is nullable or has a
-- default; nothing is dropped, renamed or altered. Re-runnable: ADD COLUMN
-- IF NOT EXISTS + guarded check constraints.
-- Column shapes (videos / gallery_images are arrays of URL strings):
--   videos:         '["https://...mp4", ...]'  (one or many videos per post)
--   gallery_images: '["https://...jpg", ...]'  (image gallery besides the thumbnail)
-- The thumbnail itself is either an image (thumbnail_url) or a video
-- (thumbnail_video_url, autoplay per thumbnail_autoplay; autoplay implies
-- muted in the browser).

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "thumbnail_type" varchar(10) NOT NULL DEFAULT 'image';
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "thumbnail_url" text;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "thumbnail_video_url" text;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "thumbnail_autoplay" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "videos" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "gallery_images" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "is_preview" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_thumbnail_type_check') THEN
    ALTER TABLE "projects" ADD CONSTRAINT "projects_thumbnail_type_check" CHECK ("thumbnail_type" IN ('image', 'video'));
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN IF NOT EXISTS "thumbnail_type" varchar(10) NOT NULL DEFAULT 'image';
--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN IF NOT EXISTS "thumbnail_url" text;
--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN IF NOT EXISTS "thumbnail_video_url" text;
--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN IF NOT EXISTS "thumbnail_autoplay" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN IF NOT EXISTS "videos" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN IF NOT EXISTS "gallery_images" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "case_studies" ADD COLUMN IF NOT EXISTS "is_preview" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'case_studies_thumbnail_type_check') THEN
    ALTER TABLE "case_studies" ADD CONSTRAINT "case_studies_thumbnail_type_check" CHECK ("thumbnail_type" IN ('image', 'video'));
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "thumbnail_type" varchar(10) NOT NULL DEFAULT 'image';
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "thumbnail_url" text;
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "thumbnail_video_url" text;
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "thumbnail_autoplay" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "videos" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "gallery_images" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "is_preview" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_thumbnail_type_check') THEN
    ALTER TABLE "posts" ADD CONSTRAINT "posts_thumbnail_type_check" CHECK ("thumbnail_type" IN ('image', 'video'));
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "is_preview" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "ventures" ADD COLUMN IF NOT EXISTS "is_preview" boolean NOT NULL DEFAULT false;
