import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const draftRoute = await readFile(new URL("../app/api/editor/drafts/route.js", import.meta.url), "utf8");
const revisionRoute = await readFile(new URL("../app/api/editor/revisions/route.js", import.meta.url), "utf8");
const schema = await readFile(new URL("../db/schema.js", import.meta.url), "utf8");
const retentionMigration = await readFile(new URL("../drizzle/0001_initial_v11.sql", import.meta.url), "utf8");

test("draft, first revision, and audit are inserted by one SQL statement", () => {
  assert.match(draftRoute, /WITH actor AS \([\s\S]*draft AS \([\s\S]*first_revision AS \([\s\S]*audit AS \([\s\S]*SELECT draft\.id, draft\.slug/);
  assert.match(draftRoute, /story\.draft\.created/);
  assert.match(draftRoute,/await authorizeEditor\(request\)/);
  assert.match(draftRoute,/INSERT INTO system\.audit_events\(actor_id,event/);
  assert.match(draftRoute,/INSERT INTO identity\.users\(external_auth_id,display_name\)/);
  assert.match(draftRoute,/reserveEditorWrite\(\{sql,actorId:auth\.user\.id\}\)/);
  assert.match(draftRoute,/status:429,headers:\{"Retry-After"/);
});

test("revision allocation locks the draft row and writes audit with the revision", () => {
  assert.match(revisionRoute, /SELECT id FROM archive\.stories[\s\S]*FOR UPDATE/);
  assert.match(revisionRoute, /MAX\(r\.revision\),0\)\+1/);
  assert.match(revisionRoute, /story\.revision\.created/);
  assert.match(revisionRoute, /JOIN audit ON audit\.entity_id=inserted\.story_id/);
  assert.match(revisionRoute,/await authorizeEditor\(request\)/);
  assert.match(revisionRoute,/INSERT INTO system\.audit_events\(actor_id,event/);
  assert.match(revisionRoute,/INSERT INTO identity\.users\(external_auth_id,display_name\)/);
  assert.match(revisionRoute,/reserveEditorWrite\(\{sql,actorId:auth\.user\.id\}\)/);
  assert.match(revisionRoute,/status:429,headers:\{"Retry-After"/);
});

test("revision rows cannot cascade away with their story", () => {
  assert.match(schema, /storyId:uuid\("story_id"\)\.notNull\(\)\.references\(\(\)=>stories\.id,\{onDelete:"restrict"\}\)/);
  assert.match(retentionMigration, /DROP CONSTRAINT IF EXISTS "story_revisions_story_id_fkey"/);
  assert.match(retentionMigration, /DROP CONSTRAINT IF EXISTS "story_revisions_story_id_stories_id_fk"/);
  assert.match(retentionMigration, /ON DELETE restrict/);
});
