ALTER TABLE "proposal_documents" ADD COLUMN "rejected_at" timestamp;--> statement-breakpoint
ALTER TABLE "proposal_documents" ADD COLUMN "rejection_reason" text;
