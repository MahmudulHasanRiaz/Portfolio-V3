CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100),
	"slug" varchar(255) NOT NULL,
	"description" text,
	"color" varchar(7),
	"icon" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "expense_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "finance_expenses" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "finance_expenses" ADD COLUMN "exchange_rate" numeric;--> statement-breakpoint
ALTER TABLE "finance_expenses" ADD COLUMN "amount_bdt" numeric;--> statement-breakpoint
ALTER TABLE "finance_payments" ADD COLUMN "exchange_rate" numeric;--> statement-breakpoint
ALTER TABLE "finance_payments" ADD COLUMN "amount_bdt" numeric;--> statement-breakpoint
ALTER TABLE "finance_invoices" ADD COLUMN "total_bdt" numeric;--> statement-breakpoint
ALTER TABLE "finance_invoices" ADD COLUMN "exchange_rate" numeric;
