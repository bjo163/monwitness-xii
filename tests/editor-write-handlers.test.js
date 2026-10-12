import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import test from "node:test";
import { createEditorDraftHandler, createEditorRevisionHandler } from "../lib/editor-write-handlers.js";
import { reserveEditorWrite } from "../lib/editor-write-limit.js";
import { isEditorWriteFrozen, setEditorWriteFreezeState } from "../lib/editor-write-freeze.js";

const migrations = await Promise.all([
  readFile(new URL("../drizzle/0000_0000_initial_v11.sql", import.meta.url), "utf8"),
  readFile(new URL("../drizzle/0001_initial_v11.sql", import.meta.url), "utf8"),
  readFile(new URL("../drizzle/0002_editor_write_limits.sql", import.meta.url), "utf8"),
  readFile(new URL("../drizzle/0003_editor_write_controls.sql", import.meta.url), "utf8"),
  readFile(new URL("../drizzle/0004_editor_write_control_audit.sql", import.meta.url), "utf8"),
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
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify(value),
  });
}

test("editor write freeze reads the singleton control and fails closed if it is missing", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  for (const migration of migrations) await db.exec(migration);
  const sql = taggedQuery(db);
  const initial = await db.query("SELECT singleton_id,writes_frozen,changed_by,change_reason FROM system.editor_write_controls");
  assert.deepEqual(initial.rows, [{ singleton_id: "global", writes_frozen: false, changed_by: "migration", change_reason: "initialization" }]);
  assert.equal(await isEditorWriteFrozen({ sql }), false);
  assert.equal(await setEditorWriteFreezeState({ sql, frozen: true, operator: "on-call", reason: "INC-104" }), true);
  assert.equal(await isEditorWriteFrozen({ sql }), true);
  const audit = await db.query("SELECT changed_by,change_reason FROM system.editor_write_controls WHERE singleton_id='global'");
  assert.deepEqual(audit.rows[0], { changed_by: "on-call", change_reason: "INC-104" });
  await assert.rejects(setEditorWriteFreezeState({ sql, frozen: false, operator: "", reason: "resume" }), /operator reference is required/);
  await assert.rejects(setEditorWriteFreezeState({ sql, frozen: false, operator: "on-call\nforged-entry", reason: "resume" }), /operator reference must not contain control characters/);
  await assert.rejects(setEditorWriteFreezeState({ sql, frozen: false, operator: "on-call", reason: "INC-104\tforged-entry" }), /change reason must not contain control characters/);
  assert.equal(await setEditorWriteFreezeState({ sql, frozen: false, operator: "on-call", reason: "INC-104-resolved" }), false);
  assert.equal(await isEditorWriteFrozen({ sql }), false);
  await sql`DELETE FROM system.editor_write_controls WHERE singleton_id='global'`;
  await assert.rejects(isEditorWriteFrozen({ sql }), /Editor write control row is unavailable/);
});

test("frozen editor draft and revision handlers stop before auth, quota, and database access", async () => {
  let authCalls = 0;
  let quotaCalls = 0;
  let databaseCalls = 0;
  const dependencies = {
    isWriteFrozen: () => true,
    authorizeEditor: async () => { authCalls += 1; return { ok: true, user: { id: "owner", name: "Owner" } }; },
    reserveEditorWrite: async () => { quotaCalls += 1; return { allowed: true }; },
    getSql: () => { databaseCalls += 1; return async () => []; },
  };
  const draftResponse = await createEditorDraftHandler(dependencies)(post("/api/editor/drafts", {
    slug: "frozen-draft", title: "Paused", body: "Must not write",
  }));
  const revisionResponse = await createEditorRevisionHandler(dependencies)(post("/api/editor/revisions", {
    slug: "existing-draft", body: "Must not write",
  }));

  for (const response of [draftResponse, revisionResponse]) {
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { error: "Editor writes are paused" });
  }
  assert.equal(authCalls, 2);
  assert.equal(quotaCalls, 0);
  assert.equal(databaseCalls, 2);
});

test("database write freeze blocks both handlers and closes the preflight race", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  for (const migration of migrations) await db.exec(migration);
  const sql = taggedQuery(db);
  const dependencies = {
    authorizeEditor: async () => ({ ok: true, user: { id: "freeze-owner", name: "Owner" } }),
    reserveEditorWrite: (options) => reserveEditorWrite({ ...options, limit: 20 }),
    getSql: () => sql,
    isWriteFrozen: isEditorWriteFrozen,
  };
  const draftHandler = createEditorDraftHandler(dependencies);
  const revisionHandler = createEditorRevisionHandler(dependencies);

  const initialDraft = await draftHandler(post("/api/editor/drafts", {
    slug: "before-freeze", title: "Before freeze", body: "First immutable revision",
  }));
  assert.equal(initialDraft.status, 201);
  await sql`UPDATE system.editor_write_controls
    SET writes_frozen=true, updated_at=now(), changed_by='test-operator', change_reason='incident-test'
    WHERE singleton_id='global'`;
  assert.equal(await isEditorWriteFrozen({ sql }), true);

  const beforeFreezeState = await db.query(`
    SELECT
      (SELECT count(*)::int FROM archive.stories) AS stories,
      (SELECT count(*)::int FROM archive.story_revisions) AS revisions,
      (SELECT count(*)::int FROM system.audit_events) AS events,
      (SELECT sum(request_count)::int FROM system.editor_write_limits) AS reserved
  `);
  const pausedDraft = await draftHandler(post("/api/editor/drafts", {
    slug: "during-freeze", title: "During freeze", body: "Must not write",
  }));
  const pausedRevision = await revisionHandler(post("/api/editor/revisions", {
    slug: "before-freeze", body: "Must not revise",
  }));
  for (const response of [pausedDraft, pausedRevision]) {
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { error: "Editor writes are paused" });
  }
  const afterFrozenState = await db.query(`
    SELECT
      (SELECT count(*)::int FROM archive.stories) AS stories,
      (SELECT count(*)::int FROM archive.story_revisions) AS revisions,
      (SELECT count(*)::int FROM system.audit_events) AS events,
      (SELECT sum(request_count)::int FROM system.editor_write_limits) AS reserved
  `);
  assert.deepEqual(afterFrozenState.rows[0], beforeFreezeState.rows[0]);

  await sql`UPDATE system.editor_write_controls
    SET writes_frozen=false, updated_at=now(), changed_by='test-operator', change_reason='resume-test'
    WHERE singleton_id='global'`;
  let racedFreeze = false;
  const racingDraftHandler = createEditorDraftHandler({
    ...dependencies,
    reserveEditorWrite: async (options) => {
      const reservation = await reserveEditorWrite({ ...options, limit: 20 });
      racedFreeze = true;
      await sql`UPDATE system.editor_write_controls
        SET writes_frozen=true, updated_at=now(), changed_by='test-operator', change_reason='race-test'
        WHERE singleton_id='global'`;
      return reservation;
    },
  });
  const racedDraft = await racingDraftHandler(post("/api/editor/drafts", {
    slug: "freeze-race", title: "Freeze race", body: "Must be blocked by mutation guard",
  }));
  assert.equal(racedFreeze, true);
  assert.equal(racedDraft.status, 503);
  assert.deepEqual(await racedDraft.json(), { error: "Editor writes are paused" });
  const racedState = await db.query(`
    SELECT
      (SELECT count(*)::int FROM archive.stories WHERE slug='freeze-race') AS stories,
      (SELECT count(*)::int FROM archive.story_revisions revisions JOIN archive.stories stories ON stories.id=revisions.story_id WHERE stories.slug='freeze-race') AS revisions,
      (SELECT count(*)::int FROM system.audit_events events JOIN archive.stories stories ON stories.id=events.entity_id WHERE stories.slug='freeze-race') AS events,
      (SELECT writes_frozen FROM system.editor_write_controls WHERE singleton_id='global') AS frozen
  `);
  assert.deepEqual(racedState.rows[0], { stories: 0, revisions: 0, events: 0, frozen: true });
});

test("actual editor handlers preserve atomic writes, authorization, rate limits, and revision concurrency", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  for (const migration of migrations) await db.exec(migration);
  const sql = taggedQuery(db);
  let authorization = { ok: true, user: { id: "owner-1", name: "Owner" } };
  const dependencies = {
    authorizeEditor: async () => authorization,
    reserveEditorWrite: (options) => reserveEditorWrite({ ...options, limit: 2 }),
    getSql: () => sql,
    isWriteFrozen: isEditorWriteFrozen,
  };
  const draftHandler = createEditorDraftHandler(dependencies);
  const revisionHandler = createEditorRevisionHandler(dependencies);

  const forgedPublication = await draftHandler(post("/api/editor/drafts", {
    slug: "forged-source-approval", title: "Must remain uncreated", body: "Attempted promotion",
    status: "published", originalSourceStatus: "source_verified", rightsVerified: true,
  }));
  assert.equal(forgedPublication.status, 400);
  const forgedRows = await db.query("SELECT count(*)::int AS count FROM archive.stories WHERE slug='forged-source-approval'");
  assert.equal(forgedRows.rows[0].count, 0);
  const draftResponse = await draftHandler(post("/api/editor/drafts", {
    slug: "fixture-story", title: "Fixture story", season: "Issue 1", synopsis: "Editorial index only", body: "Original draft body",
  }));
  assert.equal(draftResponse.status, 201);
  assert.deepEqual(await draftResponse.json(), {
    id: (await db.query("SELECT id FROM archive.stories WHERE slug='fixture-story'")).rows[0].id,
    slug: "fixture-story",
    status: "draft",
  });

  const firstState = await db.query(`
    SELECT stories.original_source_status, revisions.revision, revisions.body, revisions.source_type,
      users.external_auth_id, events.event, events.payload
    FROM archive.stories stories
    JOIN archive.story_revisions revisions ON revisions.story_id=stories.id
    JOIN system.audit_events events ON events.entity_id=stories.id
    JOIN identity.users users ON users.id=events.actor_id
    WHERE stories.slug='fixture-story'
  `);
  assert.deepEqual(firstState.rows[0], {
    original_source_status: "source_needed",
    revision: 1,
    body: "Original draft body",
    source_type: "user_original",
    external_auth_id: "owner-1",
    event: "story.draft.created",
    payload: { slug: "fixture-story", revision: 1 },
  });

  const revisionResponse = await revisionHandler(post("/api/editor/revisions", {
    slug: "fixture-story", body: "Second editorial revision", notes: "Copy edit",
  }));
  assert.equal(revisionResponse.status, 201);
  assert.deepEqual(await revisionResponse.json(), { slug: "fixture-story", revision: 2 });

  const revisionState = await db.query(`
    SELECT revision, body, source_type FROM archive.story_revisions
    WHERE story_id=(SELECT id FROM archive.stories WHERE slug='fixture-story') ORDER BY revision
  `);
  assert.deepEqual(revisionState.rows, [
    { revision: 1, body: "Original draft body", source_type: "user_original" },
    { revision: 2, body: "Second editorial revision", source_type: "editorial" },
  ]);
  const eventCount = await db.query("SELECT count(*)::int AS count FROM system.audit_events WHERE entity_id=(SELECT id FROM archive.stories WHERE slug='fixture-story')");
  assert.equal(eventCount.rows[0].count, 2);

  authorization = { ok: true, user: { id: "owner-missing-target", name: "Owner" } };
  const missingResponse = await revisionHandler(post("/api/editor/revisions", { slug: "missing-story", body: "No write" }));
  assert.equal(missingResponse.status, 404);
  const orphanActor = await db.query("SELECT count(*)::int AS count FROM identity.users WHERE external_auth_id='owner-missing-target'");
  assert.equal(orphanActor.rows[0].count, 0);

  authorization = { ok: true, user: { id: "owner-duplicate", name: "Owner" } };
  const duplicateResponse = await draftHandler(post("/api/editor/drafts", {
    slug: "fixture-story", title: "Duplicate", body: "Must not replace the original",
  }));
  assert.equal(duplicateResponse.status, 409);

  await db.exec("ALTER TABLE system.audit_events ADD CONSTRAINT reject_test_audit CHECK (false) NOT VALID");
  authorization = { ok: true, user: { id: "owner-atomic-failure", name: "Owner" } };
  const failedDraftResponse = await draftHandler(post("/api/editor/drafts", {
    slug: "atomic-failure", title: "Must roll back", body: "This insert will fail at audit",
  }));
  assert.equal(failedDraftResponse.status, 503);
  const rolledBack = await db.query(`
    SELECT (SELECT count(*)::int FROM archive.stories WHERE slug='atomic-failure') AS stories,
      (SELECT count(*)::int FROM archive.story_revisions revisions JOIN archive.stories stories ON stories.id=revisions.story_id WHERE stories.slug='atomic-failure') AS revisions,
      (SELECT count(*)::int FROM identity.users WHERE external_auth_id='owner-atomic-failure') AS actors
  `);
  assert.deepEqual(rolledBack.rows[0], { stories: 0, revisions: 0, actors: 0 });
  await db.exec("ALTER TABLE system.audit_events DROP CONSTRAINT reject_test_audit");

  const limiterBeforeDeniedRequest = await db.query("SELECT count(*)::int AS count FROM system.editor_write_limits");
  authorization = { ok: false, status: 403, message: "Editor administrator access is not assigned" };
  const deniedResponse = await draftHandler(new Request("http://localhost/api/editor/drafts", {
    method: "POST", headers: { "content-type": "application/json" }, body: "not json",
  }));
  assert.equal(deniedResponse.status, 403);
  const limiterAfterDeniedRequest = await db.query("SELECT count(*)::int AS count FROM system.editor_write_limits");
  assert.equal(limiterAfterDeniedRequest.rows[0].count, limiterBeforeDeniedRequest.rows[0].count);

  authorization = { ok: true, user: { id: "owner-rate-limited", name: "Owner" } };
  const createRateLimitedDraft = (slug) => draftHandler(post("/api/editor/drafts", { slug, title: slug, body: "Rate limit fixture" }));
  assert.equal((await createRateLimitedDraft("rate-story-one")).status, 201);
  const rateLimitedRevision = await revisionHandler(post("/api/editor/revisions", {
    slug: "rate-story-one", body: "Second shared-quota write",
  }));
  assert.equal(rateLimitedRevision.status, 201);
  const rateLimitedResponse = await createRateLimitedDraft("rate-story-two");
  assert.equal(rateLimitedResponse.status, 429);
  assert.ok(Number(rateLimitedResponse.headers.get("retry-after")) >= 1);
  assert.equal(rateLimitedResponse.headers.get("cache-control"), "no-store");
  const rejectedRateLimitedDraft = await db.query("SELECT count(*)::int AS count FROM archive.stories WHERE slug='rate-story-two'");
  assert.equal(rejectedRateLimitedDraft.rows[0].count, 0);
  const rateLimitedRevisionResponse = await revisionHandler(post("/api/editor/revisions", {
    slug: "rate-story-one", body: "Must not append after quota exhaustion",
  }));
  assert.equal(rateLimitedRevisionResponse.status, 429);
  assert.ok(Number(rateLimitedRevisionResponse.headers.get("retry-after")) >= 1);
  assert.equal(rateLimitedRevisionResponse.headers.get("cache-control"), "no-store");
  const unchangedRateLimitedRevisions = await db.query(`
    SELECT count(*)::int AS count FROM archive.story_revisions
    WHERE story_id=(SELECT id FROM archive.stories WHERE slug='rate-story-one')
  `);
  assert.equal(unchangedRateLimitedRevisions.rows[0].count, 2);

  let unavailableLimiterCalls = 0;
  const databaseUnavailableHandler = createEditorDraftHandler({
    authorizeEditor: async () => ({ ok: true, user: { id: "owner-db-unavailable", name: "Owner" } }),
    reserveEditorWrite: async () => { unavailableLimiterCalls += 1; return { allowed: true }; },
    getSql: () => null,
  });
  const databaseUnavailableResponse = await databaseUnavailableHandler(post("/api/editor/drafts", {
    slug: "db-unavailable", title: "Unavailable", body: "No writes without a database",
  }));
  assert.equal(databaseUnavailableResponse.status, 503);
  assert.deepEqual(await databaseUnavailableResponse.json(), { error: "Database unavailable" });
  assert.equal(unavailableLimiterCalls, 0);

  const limiterUnavailableHandler = createEditorDraftHandler({
    authorizeEditor: async () => ({ ok: true, user: { id: "owner-limiter-unavailable", name: "Owner" } }),
    reserveEditorWrite: async () => { throw new Error("limiter store unavailable"); },
    getSql: () => sql,
  });
  const limiterUnavailableResponse = await limiterUnavailableHandler(post("/api/editor/drafts", {
    slug: "limiter-unavailable", title: "Unavailable", body: "No writes without rate protection",
  }));
  assert.equal(limiterUnavailableResponse.status, 503);
  assert.deepEqual(await limiterUnavailableResponse.json(), { error: "Write protection unavailable" });
  const unavailableActors = await db.query(`
    SELECT count(*)::int AS count FROM identity.users
    WHERE external_auth_id IN ('owner-db-unavailable', 'owner-limiter-unavailable')
  `);
  assert.equal(unavailableActors.rows[0].count, 0);

  const finalCounts = await db.query(`
    SELECT (SELECT count(*)::int FROM archive.stories WHERE slug='fixture-story') AS stories,
      (SELECT count(*)::int FROM archive.story_revisions WHERE story_id=(SELECT id FROM archive.stories WHERE slug='fixture-story')) AS revisions,
      (SELECT count(*)::int FROM system.audit_events WHERE entity_id=(SELECT id FROM archive.stories WHERE slug='fixture-story')) AS events
  `);
  assert.deepEqual(finalCounts.rows[0], { stories: 1, revisions: 2, events: 2 });

  const concurrentDependencies = {
    ...dependencies,
    reserveEditorWrite: (options) => reserveEditorWrite({ ...options, limit: 10 }),
  };
  const concurrentDraftHandler = createEditorDraftHandler(concurrentDependencies);
  const concurrentRevisionHandler = createEditorRevisionHandler(concurrentDependencies);
  authorization = { ok: true, user: { id: "owner-concurrent", name: "Owner" } };
  const concurrentDraftResponse = await concurrentDraftHandler(post("/api/editor/drafts", {
    slug: "concurrent-story", title: "Concurrent story", body: "First revision",
  }));
  assert.equal(concurrentDraftResponse.status, 201);

  const concurrentResponses = await Promise.all([
    concurrentRevisionHandler(post("/api/editor/revisions", { slug: "concurrent-story", body: "Parallel edit A" })),
    concurrentRevisionHandler(post("/api/editor/revisions", { slug: "concurrent-story", body: "Parallel edit B" })),
  ]);
  const concurrentStatuses = concurrentResponses.map((response) => response.status).sort((a, b) => a - b);
  assert.ok(
    JSON.stringify(concurrentStatuses) === JSON.stringify([201, 201]) ||
    JSON.stringify(concurrentStatuses) === JSON.stringify([201, 409]),
    `concurrent revision results must be success/success or success/retry-conflict, got ${concurrentStatuses}`,
  );
  const concurrentState = await db.query(`
    SELECT revisions.revision, count(events.id)::int AS audit_events
    FROM archive.story_revisions revisions
    JOIN archive.stories stories ON stories.id=revisions.story_id
    LEFT JOIN system.audit_events events ON events.entity_id=stories.id
    WHERE stories.slug='concurrent-story'
    GROUP BY revisions.revision ORDER BY revisions.revision
  `);
  assert.deepEqual(concurrentState.rows.map((row) => row.revision),
    concurrentStatuses[1] === 201 ? [1, 2, 3] : [1, 2]);
  assert.ok(concurrentState.rows.every((row) => row.audit_events === concurrentState.rows.length));

  const conflictHandler = createEditorRevisionHandler({
    authorizeEditor: async () => ({ ok: true, user: { id: "owner-conflict", name: "Owner" } }),
    reserveEditorWrite: async () => ({ allowed: true }),
    getSql: () => async () => {
      const conflict = new Error("unique revision conflict");
      conflict.code = "23505";
      throw conflict;
    },
  });
  const conflictResponse = await conflictHandler(post("/api/editor/revisions", {
    slug: "concurrent-story", body: "Retry after unique conflict",
  }));
  assert.equal(conflictResponse.status, 409);
  assert.deepEqual(await conflictResponse.json(), { error: "Concurrent revision; retry" });

  const unavailableHandler = createEditorRevisionHandler({
    authorizeEditor: async () => ({ ok: true, user: { id: "owner-revision-unavailable", name: "Owner" } }),
    reserveEditorWrite: async () => ({ allowed: true }),
    getSql: () => async () => { throw new Error("private database diagnostic"); },
  });
  const unavailableResponse = await unavailableHandler(post("/api/editor/revisions", {
    slug: "concurrent-story", body: "Database failure must not expose diagnostics",
  }));
  assert.equal(unavailableResponse.status, 503);
  assert.deepEqual(await unavailableResponse.json(), { error: "Write unavailable" });
  const failedRevisionActor = await db.query("SELECT count(*)::int AS count FROM identity.users WHERE external_auth_id='owner-revision-unavailable'");
  assert.equal(failedRevisionActor.rows[0].count, 0);
});
