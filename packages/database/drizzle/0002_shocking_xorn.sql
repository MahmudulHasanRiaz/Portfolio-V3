CREATE TABLE "release_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid,
	"platform_name" varchar(100),
	"video_url" text,
	"title" text,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "search_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" text NOT NULL,
	"entity_type" varchar(50),
	"result_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "media_mentions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "media_mentions" ADD COLUMN "venture_id" uuid;--> statement-breakpoint
ALTER TABLE "ventures" ADD COLUMN "content_status" "content_status" DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "ventures" ADD COLUMN "cover_image" text;--> statement-breakpoint
ALTER TABLE "ventures" ADD COLUMN "social_links" jsonb;--> statement-breakpoint
ALTER TABLE "ventures" ADD COLUMN "metrics" jsonb;--> statement-breakpoint
ALTER TABLE "ventures" ADD COLUMN "team_size" integer;--> statement-breakpoint
ALTER TABLE "ventures" ADD COLUMN "industry" text;--> statement-breakpoint
ALTER TABLE "ventures" ADD COLUMN "stage" text;--> statement-breakpoint
ALTER TABLE "ventures" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "content_status" "content_status" DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "media" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "highlights" jsonb;--> statement-breakpoint
ALTER TABLE "releases" ADD COLUMN "release_format" varchar(50);--> statement-breakpoint
ALTER TABLE "release_lyrics" ADD COLUMN "status" varchar(20) DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "search_synonyms" ADD COLUMN "is_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "media_mentions" ADD CONSTRAINT "media_mentions_venture_id_ventures_id_fk" FOREIGN KEY ("venture_id") REFERENCES "public"."ventures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_search_index_entity" ON "search_index" USING btree ("entity_type","entity_id");--> statement-breakpoint
ALTER TABLE "search_index" ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(content, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(summary, '')), 'C')
) STORED;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_search_index_fts" ON "search_index" USING GIN ("search_vector");