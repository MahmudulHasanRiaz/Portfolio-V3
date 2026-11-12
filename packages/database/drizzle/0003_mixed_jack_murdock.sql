CREATE TABLE "visitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anonymous_id" varchar(255) NOT NULL,
	"first_visit" timestamp with time zone DEFAULT now(),
	"last_visit" timestamp with time zone DEFAULT now(),
	"visit_count" integer DEFAULT 1,
	"user_agent" text,
	"referrer" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "visitors_anonymous_id_unique" UNIQUE("anonymous_id")
);
--> statement-breakpoint
CREATE TABLE "visitor_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" uuid NOT NULL,
	"start_time" timestamp with time zone DEFAULT now(),
	"end_time" timestamp with time zone,
	"landing_page" text,
	"referrer" text,
	"is_active" boolean DEFAULT true,
	"utm_source" varchar(255),
	"utm_medium" varchar(255),
	"utm_campaign" varchar(255),
	"utm_content" varchar(255),
	"utm_term" varchar(255),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" uuid,
	"session_id" uuid,
	"path" text NOT NULL,
	"title" text,
	"referrer" text,
	"timestamp" timestamp with time zone DEFAULT now(),
	"utm_source" varchar(255),
	"utm_medium" varchar(255),
	"utm_campaign" varchar(255),
	"utm_content" varchar(255),
	"utm_term" varchar(255),
	"lead_id" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
