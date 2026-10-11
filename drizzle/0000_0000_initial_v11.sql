CREATE SCHEMA "aetherion";
--> statement-breakpoint
CREATE SCHEMA "archive";
--> statement-breakpoint
CREATE SCHEMA "cab";
--> statement-breakpoint
CREATE SCHEMA "characters";
--> statement-breakpoint
CREATE SCHEMA "identity";
--> statement-breakpoint
CREATE SCHEMA "intelligence";
--> statement-breakpoint
CREATE SCHEMA "research";
--> statement-breakpoint
CREATE SCHEMA "scripture";
--> statement-breakpoint
CREATE SCHEMA "system";
--> statement-breakpoint
CREATE TABLE "intelligence"."analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evidence_id" uuid,
	"engine" text NOT NULL,
	"version" text NOT NULL,
	"output" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reviewer_id" uuid,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system"."audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"event" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cab"."decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"actor_id" uuid,
	"decision" text NOT NULL,
	"rationale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research"."evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid,
	"source_label" text NOT NULL,
	"source_url" text,
	"claim" text NOT NULL,
	"status" text DEFAULT 'unverified' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aetherion"."levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer NOT NULL,
	"realm_id" uuid,
	"title" text NOT NULL,
	"unlocked" boolean DEFAULT false NOT NULL,
	"criteria" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "levels_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "archive"."media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid,
	"kind" text NOT NULL,
	"storage_key" text NOT NULL,
	"credit" text,
	"rights" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cab"."tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cab"."missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"story_id" uuid,
	"title" text NOT NULL,
	"objective" text,
	"risk_assessment" text,
	"approval_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters"."personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"characterization" text,
	"fictional" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "aetherion"."player_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"level_id" uuid NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cab"."projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"owner_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aetherion"."realms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "realms_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "scripture"."references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradition" text NOT NULL,
	"work" text NOT NULL,
	"chapter" text,
	"verse" text,
	"edition" text,
	"language" text,
	"content" text,
	"license" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "archive"."stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"season" text,
	"synopsis" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"experience_type" text DEFAULT 'comic' NOT NULL,
	"original_source_status" text DEFAULT 'source_needed' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "archive"."story_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"body" text NOT NULL,
	"source_type" text DEFAULT 'editorial' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_auth_id" text,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_external_auth_id_unique" UNIQUE("external_auth_id")
);
--> statement-breakpoint
ALTER TABLE "intelligence"."analyses" ADD CONSTRAINT "analyses_evidence_id_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "research"."evidence"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence"."analyses" ADD CONSTRAINT "analyses_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system"."audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cab"."decisions" ADD CONSTRAINT "decisions_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "cab"."missions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cab"."decisions" ADD CONSTRAINT "decisions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research"."evidence" ADD CONSTRAINT "evidence_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "archive"."stories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aetherion"."levels" ADD CONSTRAINT "levels_realm_id_realms_id_fk" FOREIGN KEY ("realm_id") REFERENCES "aetherion"."realms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archive"."media_assets" ADD CONSTRAINT "media_assets_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "archive"."stories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cab"."tasks" ADD CONSTRAINT "tasks_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "cab"."missions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cab"."missions" ADD CONSTRAINT "missions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "cab"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cab"."missions" ADD CONSTRAINT "missions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "archive"."stories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aetherion"."player_progress" ADD CONSTRAINT "player_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aetherion"."player_progress" ADD CONSTRAINT "player_progress_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "aetherion"."levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cab"."projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archive"."story_revisions" ADD CONSTRAINT "story_revisions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "archive"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "missions_project_idx" ON "cab"."missions" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_player_level" ON "aetherion"."player_progress" USING btree ("user_id","level_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_revision_unique" ON "archive"."story_revisions" USING btree ("story_id","revision");