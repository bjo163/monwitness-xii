import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import test from "node:test";
import { createEditorAuthorizer } from "../lib/editor-authorizer.js";
import { createEditorDraftHandler, createEditorRevisionHandler } from "../lib/editor-write-handlers.js";
import { reserveEditorWrite } from "../lib/editor-write-limit.js";

const migrations = await Promise.all([
  readFile(new URL("../drizzle/0000_0000_initial_v11.sql", import.meta.url), "utf8"),
  readFile(new URL("../drizzle/0001_initial_v11.sql", import.meta.url), "utf8"),
  readFile(new URL("../drizzle/0002_editor_write_limits.sql", import.meta.url), "utf8"),
]);

function taggedQuery(db) {
  return (strings, ...values) => {
    const query = strings.reduce((result, segment, index) => result + segment + (index < values.length ? `$${index + 1}` : ""), "");
    return db.query(query, values).then((result) => result.rows);
  };
}

function post(path, value) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost", "sec-fetch-site": "same-origin" },
    body: JSON.stringify(value),
  });
}

test("real editor authorization composition rejects writes after a provider role revocation", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  for (const migration of migrations) await db.exec(migration);

  let role = "admin";
  let sessionLookups = 0;
  const authorizeEditor = createEditorAuthorizer({
    isAuthConfigured: () => true,
    getAdminUserIds: () => new Set(["owner-1"]),
    getAuth: () => ({
      getSession: async (options) => {
        sessionLookups += 1;
        assert.deepEqual(options, { query: { disableCookieCache: "true" } });
        return { data: { user: { id: "owner-1", name: "Owner", role } }, error: null };
      },
    }),
  });
  const sql = taggedQuery(db);
  const dependencies = { authorizeEditor, reserveEditorWrite, getSql: () => sql };
  const createDraft = createEditorDraftHandler(dependencies);
  const appendRevision = createEditorRevisionHandler(dependencies);

  const created = await createDraft(post("/api/editor/drafts", {
    slug: "revocable-editor", title: "Revocation fixture", body: "First revision",
  }));
  assert.equal(created.status, 201);
  assert.equal(sessionLookups, 1);

  role = "user";
  const revokedWrite = await appendRevision(post("/api/editor/revisions", {
    slug: "revocable-editor", body: "Must not be written after revocation",
  }));
  assert.equal(revokedWrite.status, 403);
  assert.equal(sessionLookups, 2);

  const state = await db.query(`
    SELECT
      (SELECT count(*)::int FROM archive.story_revisions) AS revisions,
      (SELECT count(*)::int FROM system.audit_events) AS audit_events,
      (SELECT request_count::int FROM system.editor_write_limits WHERE actor_id='owner-1') AS reserved_writes,
      (SELECT count(*)::int FROM identity.users WHERE external_auth_id='owner-1') AS actor_rows
  `);
  assert.deepEqual(state.rows[0], { revisions: 1, audit_events: 1, reserved_writes: 1, actor_rows: 1 });
});
