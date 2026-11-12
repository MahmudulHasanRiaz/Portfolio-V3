-- Website integrations (0021).
--
-- Admin-managed Bearer tokens for the public website (Astro). Replaces the
-- cobbled-together connection (optional env-var token, API URL duplicated
-- in wrangler.jsonc + the Cloudflare dashboard, fragile loader env
-- resolution). One row per integration: the public site sends its token as
-- `Authorization: Bearer <token>`; the dashboard hashes it (SHA-256) and
-- looks it up here. Only the hash is stored — the full token is shown once
-- at creation/regeneration and never again.
--
-- Safe on a fresh or existing DB: CREATE TABLE IF NOT EXISTS, no backfill
-- (no rows exist yet), unique index on token_hash so a token maps to at
-- most one integration. Re-runnable.

CREATE TABLE IF NOT EXISTS "website_integrations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "token_hash" varchar(64) NOT NULL,
  "token_prefix" varchar(16) NOT NULL,
  "is_active" boolean DEFAULT true,
  "last_used_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "website_integrations_token_hash_unique" ON "website_integrations" ("token_hash");
