import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import test from "node:test";
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
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify(value),
  });
}

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
  };
  const draftHandler = createEditorDraftHandler(dependencies);
  const revisionHandler = createEditorRevisionHandler(dependencies);

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
  assert.equal((await createRateLimitedDraft("rate-story-two")).status, 201);
  const rateLimitedResponse = await createRateLimitedDraft("rate-story-three");
  assert.equal(rateLimitedResponse.status, 429);
  assert.ok(Number(rateLimitedResponse.headers.get("retry-after")) >= 1);

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
});
