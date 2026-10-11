import { pgSchema, uuid, text, timestamp, integer, boolean, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";

export const identity = pgSchema("identity");
export const archive = pgSchema("archive");
export const scripture = pgSchema("scripture");
export const research = pgSchema("research");
export const intelligence = pgSchema("intelligence");
export const characters = pgSchema("characters");
export const aetherion = pgSchema("aetherion");
export const cab = pgSchema("cab");
export const system = pgSchema("system");

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const id = () => uuid("id").primaryKey().defaultRandom();

export const users = identity.table("users", {
  id: id(), externalAuthId: text("external_auth_id").unique(),
  displayName: text("display_name"), createdAt: createdAt()
});
export const stories = archive.table("stories", {
  id: id(), slug: text("slug").notNull().unique(), title: text("title").notNull(),
  season: text("season"), synopsis: text("synopsis"), status: text("status").notNull().default("draft"),
  experienceType: text("experience_type").notNull().default("comic"),
  originalSourceStatus: text("original_source_status").notNull().default("source_needed"),
  metadata: jsonb("metadata").notNull().default({}), createdAt: createdAt(),
  updatedAt: timestamp("updated_at", {withTimezone:true}).notNull().defaultNow()
});
export const storyRevisions = archive.table("story_revisions", {
 id:id(), storyId:uuid("story_id").notNull().references(()=>stories.id,{onDelete:"cascade"}),
 revision:integer("revision").notNull(), body:text("body").notNull(),
 sourceType:text("source_type").notNull().default("editorial"),
 notes:text("notes"), createdAt:createdAt()
}, t=>[uniqueIndex("story_revision_unique").on(t.storyId,t.revision)]);
export const mediaAssets = archive.table("media_assets", {
 id:id(), storyId:uuid("story_id").references(()=>stories.id,{onDelete:"set null"}),
 kind:text("kind").notNull(), storageKey:text("storage_key").notNull(),
 credit:text("credit"), rights:text("rights"), createdAt:createdAt()
});
export const referenceTexts = scripture.table("references", {
 id:id(), tradition:text("tradition").notNull(), work:text("work").notNull(),
 chapter:text("chapter"), verse:text("verse"), edition:text("edition"),
 language:text("language"), content:text("content"), license:text("license"), createdAt:createdAt()
});
export const evidence = research.table("evidence", {
 id:id(), storyId:uuid("story_id").references(()=>stories.id,{onDelete:"set null"}),
 sourceLabel:text("source_label").notNull(), sourceUrl:text("source_url"),
 claim:text("claim").notNull(), status:text("status").notNull().default("unverified"),
 notes:text("notes"), createdAt:createdAt()
});
export const analyses = intelligence.table("analyses", {
 id:id(), evidenceId:uuid("evidence_id").references(()=>evidence.id,{onDelete:"set null"}),
 engine:text("engine").notNull(), version:text("version").notNull(),
 output:jsonb("output").notNull().default({}), reviewerId:uuid("reviewer_id").references(()=>users.id),
 reviewStatus:text("review_status").notNull().default("pending"), createdAt:createdAt()
});
export const personas = characters.table("personas", {
 id:id(), slug:text("slug").notNull().unique(), name:text("name").notNull(),
 characterization:text("characterization"), fictional:boolean("fictional").notNull().default(true),
 createdAt:createdAt()
});
export const realms = aetherion.table("realms", {
 id:id(), number:integer("number").notNull().unique(), title:text("title").notNull(), createdAt:createdAt()
});
export const levels = aetherion.table("levels", {
 id:id(), number:integer("number").notNull().unique(), realmId:uuid("realm_id").references(()=>realms.id),
 title:text("title").notNull(), unlocked:boolean("unlocked").notNull().default(false),
 criteria:jsonb("criteria").notNull().default({}), createdAt:createdAt()
});
export const playerProgress = aetherion.table("player_progress", {
 id:id(), userId:uuid("user_id").notNull().references(()=>users.id),
 levelId:uuid("level_id").notNull().references(()=>levels.id),
 score:integer("score").notNull().default(0), completed:boolean("completed").notNull().default(false),
 createdAt:createdAt()
},t=>[uniqueIndex("unique_player_level").on(t.userId,t.levelId)]);
export const projects = cab.table("projects", {
 id:id(), title:text("title").notNull(), ownerId:uuid("owner_id").references(()=>users.id),
 status:text("status").notNull().default("draft"), createdAt:createdAt()
});
export const missions = cab.table("missions", {
 id:id(), projectId:uuid("project_id").references(()=>projects.id),
 storyId:uuid("story_id").references(()=>stories.id), title:text("title").notNull(),
 objective:text("objective"), riskAssessment:text("risk_assessment"),
 approvalStatus:text("approval_status").notNull().default("draft"),
 createdAt:createdAt()
},t=>[index("missions_project_idx").on(t.projectId)]);
export const missionTasks = cab.table("tasks",{
 id:id(), missionId:uuid("mission_id").notNull().references(()=>missions.id),
 title:text("title").notNull(), status:text("status").notNull().default("todo"), createdAt:createdAt()
});
export const decisions = cab.table("decisions", {
 id:id(), missionId:uuid("mission_id").notNull().references(()=>missions.id),
 actorId:uuid("actor_id").references(()=>users.id), decision:text("decision").notNull(),
 rationale:text("rationale"), createdAt:createdAt()
});
export const auditEvents = system.table("audit_events", {
 id:id(), actorId:uuid("actor_id").references(()=>users.id),
 event:text("event").notNull(), entity:text("entity").notNull(),
 entityId:uuid("entity_id"), payload:jsonb("payload").notNull().default({}),
 createdAt:createdAt()
});
