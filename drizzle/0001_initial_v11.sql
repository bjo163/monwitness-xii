ALTER TABLE "archive"."story_revisions" DROP CONSTRAINT "story_revisions_story_id_fkey";
--> statement-breakpoint
ALTER TABLE "archive"."story_revisions" ADD CONSTRAINT "story_revisions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "archive"."stories"("id") ON DELETE restrict ON UPDATE no action;
