CREATE TABLE "system"."editor_write_controls" (
	"singleton_id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"writes_frozen" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "system"."editor_write_controls" ("singleton_id", "writes_frozen")
VALUES ('global', false);
