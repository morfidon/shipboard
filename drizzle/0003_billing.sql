ALTER TABLE "organization" ADD COLUMN "plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "plan_status" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_stripe_customer_id_unique" UNIQUE("stripe_customer_id");