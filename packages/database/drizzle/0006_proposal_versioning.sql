ALTER TABLE "proposal_documents" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "proposal_documents" ADD COLUMN "parent_document_id" uuid;
