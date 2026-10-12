import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { relative, sep } from "node:path";

const draftRoute = await readFile(new URL("../app/api/editor/drafts/route.js", import.meta.url), "utf8");
const revisionRoute = await readFile(new URL("../app/api/editor/revisions/route.js", import.meta.url), "utf8");
const writeHandlers = await readFile(new URL("../lib/editor-write-handlers.js", import.meta.url), "utf8");
const editorAuth = await readFile(new URL("../lib/editor-auth.js", import.meta.url), "utf8");
const editorAuthorizer = await readFile(new URL("../lib/editor-authorizer.js", import.meta.url), "utf8");
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

test("production editor authorizer uses uncached sessions and current owner allowlist", () => {
  assert.match(editorAuth, /authorizeEditor\s*=\s*createEditorAuthorizer\(\{/);
  assert.match(editorAuth, /getAdminUserIds:\(\)=>parseEditorAdminUserIds\(process\.env\.EDITOR_ADMIN_USER_IDS\)/);
  assert.match(editorAuthorizer, /getSession:\(\)=>getFreshEditorAuthSession\(getAuth\(\)\)/);
  assert.match(editorAuthorizer, /resolveEditorAuthorization\(\{[\s\S]*origin,expectedOrigin,[\s\S]*fetchSite:[^\n]*adminUserIds/);
});

test("draft, first revision, and audit are inserted atomically after validation and rate limiting", () => {
  assert.match(draftRoute, /createEditorDraftHandler\(\{[\s\S]*authorizeEditor,/);
  assert.match(writeHandlers, /WITH draft AS \([\s\S]*first_revision AS \([\s\S]*actor AS \([\s\S]*audit AS \([\s\S]*SELECT draft\.id, draft\.slug/);
  assert.match(writeHandlers, /story\.draft\.created/);
  assert.match(writeHandlers,/await authorizeEditor\(request\)/);
  assert.match(writeHandlers,/INSERT INTO system\.audit_events\(actor_id,event/);
  assert.match(writeHandlers,/INSERT INTO identity\.users\(external_auth_id,display_name\)/);
  assert.match(writeHandlers,/reserveEditorWrite\(\{ sql, actorId: auth\.user\.id \}\)/);
  assert.ok(writeHandlers.indexOf("await authorizeEditor(request)") < writeHandlers.indexOf("await readJsonBody(request)"));
  assert.ok(writeHandlers.indexOf("await readJsonBody(request)") < writeHandlers.indexOf("!validate(body.value)"));
  assert.ok(writeHandlers.indexOf("!validate(body.value)") < writeHandlers.indexOf("reserveEditorWrite("));
  assert.ok(writeHandlers.indexOf("reserveEditorWrite(") < writeHandlers.indexOf("WITH draft AS"));
  assert.match(writeHandlers, /SELECT \$\{auth\.user\.id\},\$\{auth\.user\.name\} FROM first_revision LIMIT 1/);
});

test("revision allocation locks the draft and audits only an inserted revision", () => {
  assert.match(revisionRoute, /createEditorRevisionHandler\(\{[\s\S]*authorizeEditor,/);
  assert.match(writeHandlers, /WITH target AS MATERIALIZED \([\s\S]*SELECT id FROM archive\.stories[\s\S]*FOR UPDATE/);
  assert.match(writeHandlers, /MAX\(r\.revision\),0\)\+1/);
  assert.match(writeHandlers, /story\.revision\.created/);
  assert.match(writeHandlers, /JOIN audit ON audit\.entity_id=inserted\.story_id/);
  assert.match(writeHandlers,/INSERT INTO system\.audit_events\(actor_id,event/);
  assert.match(writeHandlers,/INSERT INTO identity\.users\(external_auth_id,display_name\)/);
  assert.match(writeHandlers,/SELECT \$\{auth\.user\.id\},\$\{auth\.user\.name\} FROM inserted LIMIT 1/);
});

test("revision rows cannot cascade away with their story", () => {
  assert.match(schema, /storyId:uuid\("story_id"\)\.notNull\(\)\.references\(\(\)=>stories\.id,\{onDelete:"restrict"\}\)/);
  assert.match(retentionMigration, /DROP CONSTRAINT IF EXISTS "story_revisions_story_id_fkey"/);
  assert.match(retentionMigration, /DROP CONSTRAINT IF EXISTS "story_revisions_story_id_stories_id_fk"/);
  assert.match(retentionMigration, /ON DELETE restrict/);
});

test("every API write route delegates only to guarded editor POST handlers", async () => {
  const routes = await listRouteFiles();
  const inspected = await Promise.all(routes.map(async (path) => ({
    name: relative(new URL("../app/api/", import.meta.url).pathname, path.pathname).split(sep).join("/"),
    source: await readFile(path, "utf8"),
  })));
  const routeWriters = inspected.filter(({ source }) =>
    /\b(?:INSERT INTO|UPDATE\s+[a-z_]|DELETE FROM|TRUNCATE\s|db\.(?:insert|update|delete))\b/i.test(source));
  assert.deepEqual(routeWriters, [], "API route modules must not contain unreviewed write SQL");
  assert.match(draftRoute, /export const POST = createEditorDraftHandler\(\{\s*authorizeEditor,/);
  assert.match(revisionRoute, /export const POST = createEditorRevisionHandler\(\{\s*authorizeEditor,/);

  for (const { name, source } of inspected) {
    const methods = [...source.matchAll(/export\s+(?:async\s+function\s+(POST|PUT|PATCH|DELETE)\s*\(|const\s+(POST|PUT|PATCH|DELETE)\s*=)/g)]
      .map((match) => match[1] ?? match[2]);
    if (name === "editor/drafts/route.js" || name === "editor/revisions/route.js") {
      assert.deepEqual(methods, ["POST"]);
    } else {
      assert.deepEqual(methods, [], `${name} must not add an unguarded write method`);
    }
  }
});
