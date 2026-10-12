import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { relative, sep } from "node:path";

const draftRoute = await readFile(new URL("../app/api/editor/drafts/route.js", import.meta.url), "utf8");
const revisionRoute = await readFile(new URL("../app/api/editor/revisions/route.js", import.meta.url), "utf8");
const schema = await readFile(new URL("../db/schema.js", import.meta.url), "utf8");
const retentionMigration = await readFile(new URL("../drizzle/0001_initial_v11.sql", import.meta.url), "utf8");
const apiRoot = new URL("../app/api/", import.meta.url);

async function listRouteFiles(directory = apiRoot) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) return listRouteFiles(path);
    return /^route\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [path] : [];
  }));
  return nested.flat();
}

test("draft, first revision, and audit are inserted by one SQL statement", () => {
  assert.match(draftRoute, /WITH actor AS \([\s\S]*draft AS \([\s\S]*first_revision AS \([\s\S]*audit AS \([\s\S]*SELECT draft\.id, draft\.slug/);
  assert.match(draftRoute, /story\.draft\.created/);
  assert.match(draftRoute,/await authorizeEditor\(request\)/);
  assert.match(draftRoute,/INSERT INTO system\.audit_events\(actor_id,event/);
  assert.match(draftRoute,/INSERT INTO identity\.users\(external_auth_id,display_name\)/);
  assert.match(draftRoute,/reserveEditorWrite\(\{sql,actorId:auth\.user\.id\}\)/);
  assert.match(draftRoute,/status:429,headers:\{"Retry-After"/);
  assert.ok(draftRoute.indexOf("await authorizeEditor(request)") < draftRoute.indexOf("await readJsonBody(request)"));
  assert.ok(draftRoute.indexOf("await readJsonBody(request)") < draftRoute.indexOf("validateDraft(input)"));
  assert.ok(draftRoute.indexOf("validateDraft(input)") < draftRoute.indexOf("reserveEditorWrite("));
  assert.ok(draftRoute.indexOf("reserveEditorWrite(") < draftRoute.indexOf("WITH actor AS"));
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
  assert.ok(revisionRoute.indexOf("await authorizeEditor(request)") < revisionRoute.indexOf("await readJsonBody(request)"));
  assert.ok(revisionRoute.indexOf("await readJsonBody(request)") < revisionRoute.indexOf("validateRevision(input)"));
  assert.ok(revisionRoute.indexOf("validateRevision(input)") < revisionRoute.indexOf("reserveEditorWrite("));
  assert.ok(revisionRoute.indexOf("reserveEditorWrite(") < revisionRoute.indexOf("WITH actor AS"));
});

test("revision rows cannot cascade away with their story", () => {
  assert.match(schema, /storyId:uuid\("story_id"\)\.notNull\(\)\.references\(\(\)=>stories\.id,\{onDelete:"restrict"\}\)/);
  assert.match(retentionMigration, /DROP CONSTRAINT IF EXISTS "story_revisions_story_id_fkey"/);
  assert.match(retentionMigration, /DROP CONSTRAINT IF EXISTS "story_revisions_story_id_stories_id_fk"/);
  assert.match(retentionMigration, /ON DELETE restrict/);
});

test("every API data writer is an editor POST protected by the owner allowlist", async () => {
  const routes = await listRouteFiles();
  const inspected = await Promise.all(routes.map(async (path) => ({
    name: relative(new URL("../app/api/", import.meta.url).pathname, path.pathname).split(sep).join("/"),
    source: await readFile(path, "utf8"),
  })));
  const writers = inspected.filter(({ source }) =>
    /\b(?:INSERT INTO|UPDATE\s+[a-z_]|DELETE FROM|TRUNCATE\s|db\.(?:insert|update|delete))\b/i.test(source));
  assert.deepEqual(writers.map(({ name }) => name).sort(), [
    "editor/drafts/route.js",
    "editor/revisions/route.js",
  ]);
  for (const { name, source } of inspected) {
    const methods = [...source.matchAll(/export\s+(?:async\s+function\s+(POST|PUT|PATCH|DELETE)\s*\(|const\s+(POST|PUT|PATCH|DELETE)\s*=)/g)]
      .map((match) => match[1] ?? match[2]);
    if (name === "editor/drafts/route.js" || name === "editor/revisions/route.js") {
      assert.deepEqual(methods, ["POST"]);
      assert.match(source, /await authorizeEditor\(request\)/);
      assert.ok(source.indexOf("await authorizeEditor(request)") < source.indexOf("WITH actor AS"));
    } else {
      assert.deepEqual(methods, [], `${name} must not add an unguarded write method`);
    }
  }
});
