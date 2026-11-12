CREATE TYPE "public"."attendance_status" AS ENUM('attended', 'did_not_attend');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'sending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."deliverable_status" AS ENUM('pending', 'submitted', 'approved', 'revision_requested');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('inquiry', 'negotiating', 'confirmed', 'logistics_finalized', 'completed', 'declined', 'cancelled', 'archived');--> statement-breakpoint
CREATE TYPE "public"."expense_source_type" AS ENUM('freelance_project', 'artist_event', 'general');--> statement-breakpoint
CREATE TYPE "public"."form_field_type" AS ENUM('text', 'email', 'phone', 'textarea', 'select', 'radio', 'checkbox', 'date', 'file', 'url', 'number');--> statement-breakpoint
CREATE TYPE "public"."freelance_project_status" AS ENUM('draft', 'in_progress', 'under_review', 'revision_requested', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost', 'archived');--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('pending', 'in_progress', 'completed', 'approved');--> statement-breakpoint
CREATE TYPE "public"."payment_method_type" AS ENUM('mobile_banking', 'bank', 'cash', 'international');--> statement-breakpoint
CREATE TYPE "public"."payment_source_type" AS ENUM('freelance_project', 'artist_event');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('advance', 'installment', 'final', 'full');--> statement-breakpoint
CREATE TYPE "public"."portal_sender_type" AS ENUM('admin', 'client');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('draft', 'review', 'scheduled', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('active', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."proposal_document_status" AS ENUM('draft', 'sent', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."proposal_type" AS ENUM('proposal', 'contract');--> statement-breakpoint
CREATE TYPE "public"."release_type" AS ENUM('nasheed', 'tilawat', 'acting', 'podcast', 'interview', 'documentary');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('guide', 'checklist', 'template', 'download');--> statement-breakpoint
CREATE TYPE "public"."sla_response_status" AS ENUM('within_sla', 'warning', 'breached');--> statement-breakpoint
CREATE TYPE "public"."subscriber_status" AS ENUM('pending', 'verified', 'active', 'unsubscribed', 'bounced', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."testimonial_source_type" AS ENUM('freelance_client', 'event_organizer', 'collaborator', 'general');--> statement-breakpoint
CREATE TYPE "public"."testimonial_status" AS ENUM('pending_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."venture_status" AS ENUM('active', 'paused', 'acquired', 'closed');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false,
	"name" text,
	"avatar_url" text,
	"phone" varchar(50),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"group" varchar(50),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(500) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"provider" varchar(50),
	"provider_account_id" varchar(255),
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"token" varchar(500),
	"type" varchar(50),
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "person_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text,
	"headline" text,
	"bio_short" text,
	"bio_long" text,
	"profile_image" text,
	"cover_image" text,
	"location" text,
	"email" text,
	"phone" text,
	"website" text,
	"resume_url" text,
	"press_kit_url" text,
	"social_links" jsonb,
	"streaming_links" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "developer_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"years_experience" integer,
	"skills" jsonb,
	"certifications" jsonb,
	"resume_text" text
);
--> statement-breakpoint
CREATE TABLE "entrepreneur_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"founder_story" text,
	"business_philosophy" text,
	"mission_statement" text,
	"vision_statement" text
);
--> statement-breakpoint
CREATE TABLE "artist_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"artist_name" text,
	"biography" text,
	"genre" text,
	"booking_info" text
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"slug" varchar(255) NOT NULL,
	"content" text,
	"template" varchar(100),
	"status" "content_status",
	"locale" varchar(10),
	"translation_group" uuid,
	"meta_title" text,
	"meta_description" text,
	"og_image" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "homepage_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_key" varchar(100) NOT NULL,
	"is_visible" boolean DEFAULT true,
	"sort_order" integer,
	"content" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "homepage_sections_section_key_unique" UNIQUE("section_key")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"slug" varchar(255) NOT NULL,
	"summary" text,
	"description" text,
	"icon" text,
	"price_range" text,
	"is_featured" boolean,
	"status" "content_status",
	"sort_order" integer,
	"locale" varchar(10),
	"translation_group" uuid,
	"meta_title" text,
	"meta_description" text,
	"og_image" text,
	"canonical_url" text,
	"keywords" text,
	"indexable" boolean,
	"follow_links" boolean,
	"archive_allowed" boolean,
	"canonical_override" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "service_faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid,
	"question" text,
	"answer" text,
	"sort_order" integer
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"slug" varchar(255) NOT NULL,
	"summary" text,
	"description" text,
	"thumbnail" text,
	"cover_image" text,
	"industry" varchar(100),
	"client_name" text,
	"project_url" text,
	"start_date" date,
	"end_date" date,
	"status" "content_status",
	"is_featured" boolean,
	"locale" varchar(10),
	"translation_group" uuid,
	"meta_title" text,
	"meta_description" text,
	"og_image" text,
	"canonical_url" text,
	"keywords" text,
	"indexable" boolean,
	"follow_links" boolean,
	"archive_allowed" boolean,
	"canonical_override" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "technologies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100),
	"category" varchar(50),
	"icon" text,
	"sort_order" integer
);
--> statement-breakpoint
CREATE TABLE "project_technologies" (
	"project_id" uuid,
	"technology_id" uuid,
	CONSTRAINT "project_technologies_project_id_technology_id_pk" PRIMARY KEY("project_id","technology_id")
);
--> statement-breakpoint
CREATE TABLE "case_studies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"title" text,
	"slug" varchar(255),
	"challenge" text,
	"research" text,
	"strategy" text,
	"results" text,
	"metrics" jsonb,
	"is_featured" boolean,
	"status" "content_status",
	"meta_title" text,
	"meta_description" text,
	"og_image" text,
	"canonical_url" text,
	"keywords" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "case_studies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"slug" varchar(255),
	"excerpt" text,
	"content" text,
	"cover_image" text,
	"author_id" uuid,
	"is_featured" boolean,
	"status" "post_status",
	"publish_at" timestamp,
	"unpublish_at" timestamp,
	"locale" varchar(10),
	"translation_group" uuid,
	"meta_title" text,
	"meta_description" text,
	"og_image" text,
	"canonical_url" text,
	"keywords" text,
	"indexable" boolean,
	"follow_links" boolean,
	"archive_allowed" boolean,
	"canonical_override" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100),
	"slug" varchar(255),
	"description" text,
	"type" varchar(50),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100),
	"slug" varchar(255),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "post_categories" (
	"post_id" uuid,
	"category_id" uuid,
	CONSTRAINT "post_categories_post_id_category_id_pk" PRIMARY KEY("post_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
	"post_id" uuid,
	"tag_id" uuid,
	CONSTRAINT "post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"slug" varchar(255),
	"type" "resource_type",
	"description" text,
	"content" text,
	"file_url" text,
	"is_featured" boolean,
	"status" "content_status",
	"meta_title" text,
	"meta_description" text,
	"og_image" text,
	"canonical_url" text,
	"keywords" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "resources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "media_mentions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"slug" varchar(255),
	"source_name" text,
	"source_url" text,
	"published_date" date,
	"summary" text,
	"is_featured" boolean,
	"status" "content_status",
	"meta_title" text,
	"meta_description" text,
	"og_image" text,
	"canonical_url" text,
	"keywords" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "media_mentions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text,
	"answer" text,
	"sort_order" integer,
	"entity_type" varchar(50),
	"entity_id" uuid
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_name" text,
	"author_title" text,
	"author_avatar" text,
	"content" text,
	"source_type" "testimonial_source_type",
	"project_id" uuid,
	"event_id" uuid,
	"rating" integer,
	"is_featured" boolean,
	"status" "testimonial_status",
	"display_order" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "homepage_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer,
	"snapshot_json" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ventures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"logo" text,
	"website" text,
	"founded_date" date,
	"status" "venture_status" DEFAULT 'active',
	"is_featured" boolean DEFAULT false,
	"meta_title" text,
	"meta_description" text,
	"og_image" text,
	"canonical_url" text,
	"keywords" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "ventures_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venture_id" uuid,
	"name" text,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"launch_date" date,
	"url" text,
	"status" "product_status" DEFAULT 'active',
	"is_featured" boolean DEFAULT false,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "venture_products" (
	"venture_id" uuid,
	"product_id" uuid,
	CONSTRAINT "venture_products_venture_id_product_id_pk" PRIMARY KEY("venture_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"slug" varchar(255) NOT NULL,
	"type" "release_type",
	"cover_image" text,
	"description" text,
	"release_date" date,
	"is_featured" boolean DEFAULT false,
	"status" "content_status" DEFAULT 'draft',
	"meta_title" text,
	"meta_description" text,
	"og_image" text,
	"canonical_url" text,
	"keywords" text,
	"lyrics" text,
	"credits" jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "releases_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "release_platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid,
	"platform_name" varchar(100),
	"platform_url" text
);
--> statement-breakpoint
CREATE TABLE "release_lyrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid,
	"lyrics_text" text,
	"lyrics_language" varchar(10),
	"translations" jsonb,
	CONSTRAINT "release_lyrics_release_id_unique" UNIQUE("release_id")
);
--> statement-breakpoint
CREATE TABLE "project_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100),
	"slug" varchar(255) NOT NULL,
	"description" text,
	"color" varchar(7),
	"icon" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "project_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "projects_freelance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"client_id" uuid,
	"category_id" uuid,
	"status" "freelance_project_status" DEFAULT 'draft',
	"description" text,
	"scope_notes" text,
	"start_date" date,
	"expected_end_date" date,
	"actual_end_date" date,
	"total_agreed_amount" numeric,
	"currency" varchar(10),
	"is_paid_project" boolean DEFAULT false,
	"assigned_to" uuid[],
	"subcontractors" jsonb,
	"tags" text[],
	"portal_access_enabled" boolean DEFAULT false,
	"portal_token" varchar(255),
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "projects_freelance_portal_token_unique" UNIQUE("portal_token")
);
--> statement-breakpoint
CREATE TABLE "project_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"title" text,
	"description" text,
	"due_date" date,
	"status" "milestone_status" DEFAULT 'pending',
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_deliverables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"milestone_id" uuid,
	"title" text,
	"file_url" text,
	"notes" text,
	"status" "deliverable_status" DEFAULT 'pending',
	"client_feedback" text,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "project_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"actor_id" uuid,
	"action" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100),
	"slug" varchar(255) NOT NULL,
	"description" text,
	"color" varchar(7),
	"icon" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "event_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "artist_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"category_id" uuid,
	"organizer_name" text,
	"organizer_contact" text,
	"organizer_id" uuid,
	"event_date" date,
	"event_time" time,
	"duration_minutes" integer,
	"venue_name" text,
	"venue_address" text,
	"city" text,
	"country" text,
	"status" "event_status" DEFAULT 'inquiry',
	"is_paid" boolean DEFAULT false,
	"agreed_fee" numeric,
	"currency" varchar(10),
	"cancellation_reason" text,
	"attendance_status" "attendance_status",
	"notes" text,
	"is_public" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_logistics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid,
	"travel_required" boolean DEFAULT false,
	"travel_notes" text,
	"accommodation_required" boolean DEFAULT false,
	"accommodation_notes" text,
	"sound_requirements" text,
	"technical_rider" text,
	"green_room_required" boolean DEFAULT false,
	"additional_notes" text,
	CONSTRAINT "event_logistics_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "event_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid,
	"actor_id" uuid,
	"action" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "artist_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date,
	"is_available" boolean DEFAULT true,
	"note" text,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "artist_availability_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100),
	"type" "payment_method_type",
	"is_active" boolean,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "finance_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" "payment_source_type",
	"source_id" uuid,
	"client_id" uuid,
	"amount" numeric,
	"currency" varchar(10),
	"payment_method_id" uuid,
	"payment_date" date,
	"payment_type" "payment_type",
	"notes" text,
	"invoice_id" uuid,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "finance_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" "expense_source_type",
	"source_id" uuid,
	"category" text,
	"description" text,
	"amount" numeric,
	"currency" varchar(10),
	"payment_method_id" uuid,
	"expense_date" date,
	"receipt_url" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "finance_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" varchar(50),
	"source_type" "payment_source_type",
	"source_id" uuid,
	"client_id" uuid,
	"line_items" jsonb,
	"subtotal" numeric,
	"discount" numeric,
	"total" numeric,
	"currency" varchar(10),
	"status" "invoice_status",
	"issued_date" date,
	"due_date" date,
	"notes" text,
	"pdf_url" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "finance_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "portal_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"portal_token" varchar(500),
	"client_email" text,
	"password_hash" text,
	"last_accessed_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "portal_sessions_project_id_unique" UNIQUE("project_id"),
	CONSTRAINT "portal_sessions_portal_token_unique" UNIQUE("portal_token")
);
--> statement-breakpoint
CREATE TABLE "portal_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"sender_type" "portal_sender_type",
	"sender_id" uuid,
	"message" text,
	"attachments" jsonb,
	"is_read" boolean,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "proposal_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"project_category_id" uuid,
	"client_type" text,
	"type" "proposal_type",
	"content" text,
	"variables" jsonb,
	"is_active" boolean,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "proposal_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid,
	"project_id" uuid,
	"client_id" uuid,
	"resolved_content" text,
	"status" "proposal_document_status",
	"pdf_url" text,
	"sent_at" timestamp,
	"accepted_at" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text,
	"email" varchar(255),
	"phone" varchar(50),
	"company" text,
	"country" varchar(100),
	"budget" text,
	"timeline" text,
	"project_type" text,
	"inquiry_type" varchar(50),
	"message" text,
	"lead_source" varchar(50),
	"status" "lead_status" DEFAULT 'new',
	"assigned_user_id" uuid,
	"follow_up_date" date,
	"follow_up_notes" text,
	"converted_to_project_id" uuid,
	"converted_to_event_id" uuid,
	"utm_source" varchar(255),
	"utm_medium" varchar(255),
	"utm_campaign" varchar(255),
	"utm_content" varchar(255),
	"utm_term" varchar(255),
	"sla_minutes" integer DEFAULT 15,
	"first_response_at" timestamp with time zone,
	"response_status" "sla_response_status",
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lead_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"activity_type" text,
	"description" text,
	"metadata" jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lead_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"note" text,
	"is_internal" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "abandoned_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"source_page" text,
	"metadata" jsonb,
	"captured_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"slug" varchar(255),
	"form_type" varchar(50),
	"description" text,
	"is_active" boolean,
	"success_message" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "forms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid,
	"label" text,
	"field_type" "form_field_type",
	"is_required" boolean,
	"placeholder" text,
	"description" text,
	"options" jsonb,
	"validation_rules" jsonb,
	"sort_order" integer
);
--> statement-breakpoint
CREATE TABLE "form_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid,
	"data" jsonb,
	"lead_id" uuid,
	"spam_score" real,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "form_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid,
	"date" date,
	"views" integer,
	"starts" integer,
	"submissions" integer,
	"abandonments" integer,
	"conversion_rate" real
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255),
	"name" text,
	"language" varchar(10),
	"segments" text[],
	"status" "subscriber_status",
	"source" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "subscriber_segments" (
	"subscriber_id" uuid,
	"segment" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "subscriber_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscriber_id" uuid,
	"token" varchar(500),
	"expires_at" timestamp,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "subscriber_verifications_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text,
	"content" text,
	"segments" text[],
	"scheduled_at" timestamp,
	"status" "campaign_status",
	"sent_count" integer,
	"open_count" integer,
	"click_count" integer,
	"unsubscribe_count" integer,
	"bounce_count" integer,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"sent_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "search_index" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"title" text,
	"content" text,
	"summary" text,
	"url" text,
	"thumbnail" text,
	"published_at" timestamp,
	"content_type" varchar(50),
	"locale" varchar(10)
);
--> statement-breakpoint
CREATE TABLE "search_synonyms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term" varchar(255),
	"synonyms" text[]
);
--> statement-breakpoint
CREATE TABLE "seo_meta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"meta_title" text,
	"meta_description" text,
	"og_image" text,
	"canonical_url" text,
	"keywords" text,
	"indexable" boolean,
	"follow_links" boolean,
	"no_archive" boolean,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "slug_redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_slug" varchar(255),
	"destination_url" text,
	"redirect_type" integer,
	"entity_type" varchar(50),
	"is_active" boolean,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text,
	"original_name" text,
	"path" text,
	"type" varchar(50),
	"size" integer,
	"width" integer,
	"height" integer,
	"alt_text" text,
	"folder_id" uuid,
	"variants" jsonb,
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "media_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"parent_id" uuid,
	"path" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(255),
	"value" jsonb,
	"group" varchar(100),
	"description" text,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"metadata" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"revision_number" integer,
	"content_snapshot" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" varchar(50),
	"source_id" uuid,
	"event_type" varchar(50),
	"title" text,
	"description" text,
	"event_date" date,
	"icon" text,
	"url" text,
	"sort_order" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developer_profiles" ADD CONSTRAINT "developer_profiles_id_person_profiles_id_fk" FOREIGN KEY ("id") REFERENCES "public"."person_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entrepreneur_profiles" ADD CONSTRAINT "entrepreneur_profiles_id_person_profiles_id_fk" FOREIGN KEY ("id") REFERENCES "public"."person_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD CONSTRAINT "artist_profiles_id_person_profiles_id_fk" FOREIGN KEY ("id") REFERENCES "public"."person_profiles"("id") ON DELETE no action ON UPDATE no action;