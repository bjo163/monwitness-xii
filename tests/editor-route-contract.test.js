import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const draftRoute = await readFile(new URL("../app/api/editor/drafts/route.js", import.meta.url), "utf8");
const revisionRoute = await readFile(new URL("../app/api/editor/revisions/route.js", import.meta.url), "utf8");
const schema = await readFile(new URL("../db/schema.js", import.meta.url), "utf8");
const retentionMigration = await readFile(new URL("../drizzle/0001_initial_v11.sql", import.meta.url), "utf8");

test("draft, first revision, and audit are inserted by one SQL statement", () => {
  assert.match(draftRoute, /WITH draft AS \([\s\S]*first_revision AS \([\s\S]*audit AS \([\s\S]*SELECT draft\.id, draft\.slug/);
  assert.match(draftRoute, /story\.draft\.created/);
});

test("revision allocation locks the draft row and writes audit with the revision", () => {
  assert.match(revisionRoute, /SELECT id FROM archive\.stories[\s\S]*FOR UPDATE/);
  assert.match(revisionRoute, /MAX\(r\.revision\),0\)\+1/);
  assert.match(revisionRoute, /story\.revision\.created/);
  assert.match(revisionRoute, /JOIN audit ON audit\.entity_id=inserted\.story_id/);
});

test("revision rows cannot cascade away with their story", () => {
  assert.match(schema, /storyId:uuid\("story_id"\)\.notNull\(\)\.references\(\(\)=>stories\.id,\{onDelete:"restrict"\}\)/);
  assert.match(retentionMigration, /ON DELETE restrict/);
});
