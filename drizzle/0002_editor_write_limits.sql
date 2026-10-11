CREATE TABLE "system"."editor_write_limits" (
	"actor_id" text PRIMARY KEY NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL
);
