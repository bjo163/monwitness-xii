import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/pglite/migrator";
import { auditEvents, editorWriteControls, editorWriteLimits, evidence, mediaAssets, stories, storyRevisions } from "../db/schema.js";
import { listPublicEpisodes } from "../lib/public-archive-query.js";
import { hasMigrationLedgerDrift } from "../lib/migration-ledger-verification.js";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { readFile } from "node:fs/promises";

const backupRunbook = await readFile(new URL("../docs/BACKUP_RESTORE_RUNBOOK_V11.md", import.meta.url), "utf8");

test("PGlite data-directory backup restores representative Archive state and invariants", async (t) => {
  const source = new PGlite();
  t.after(() => source.close());
  const sourceDb = drizzle(source);
  const migrationConfig = { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) };
  await migrate(sourceDb, migrationConfig);

  const [published] = await sourceDb.insert(stories).values({
    slug: "restore-published-fixture",
    title: "Recovered Public Index",
    season: "Recovery test",
    synopsis: "Synthetic metadata fixture for isolated recovery verification.",
    status: "published",
    experienceType: "comic",
    originalSourceStatus: "source_needed",
    metadata: { privateNote: "synthetic private metadata" },
  }).returning({ id: stories.id });
  const [draft] = await sourceDb.insert(stories).values({
    slug: "restore-private-draft-fixture",
    title: "Recovered Private Draft",
    synopsis: "Synthetic private draft fixture.",
    status: "draft",
    originalSourceStatus: "source_needed",
  }).returning({ id: stories.id });
  await sourceDb.insert(storyRevisions).values([
    { storyId: published.id, revision: 1, body: "Synthetic manuscript v1", sourceType: "editorial", notes: "Synthetic review note" },
    { storyId: draft.id, revision: 1, body: "Synthetic private draft body", sourceType: "editorial", notes: "Synthetic draft note" },
  ]);
  await sourceDb.insert(mediaAssets).values({
    storyId: published.id, kind: "poster", storageKey: "synthetic/recovery-fixture.png", credit: "synthetic credit", rights: "synthetic pending",
  });
  await sourceDb.insert(evidence).values({
    storyId: published.id, sourceLabel: "Synthetic evidence", sourceUrl: "https://example.invalid/fixture", claim: "Synthetic evidence claim",
  });
  await sourceDb.update(editorWriteControls).set({
    writesFrozen: true, changedBy: "synthetic-recovery-operator", changeReason: "synthetic recovery rehearsal",
  }).where(eq(editorWriteControls.singletonId, "global"));
  await sourceDb.insert(editorWriteLimits).values({
    actorId: "synthetic-recovery-operator", requestCount: 3, windowStartedAt: new Date("2026-10-12T00:00:00.000Z"),
  });
  await sourceDb.insert(auditEvents).values({
    event: "synthetic.recovery-checkpoint", entity: "archive.story", entityId: published.id,
    payload: { fixture: true, purpose: "restore verification" },
  });

  const snapshot = await source.dumpDataDir("gzip");
  const restored = await PGlite.create({ loadDataDir: snapshot });
  t.after(() => restored.close());
  const restoredDb = drizzle(restored);

  const archiveState = await restored.query(`
    SELECT count(*)::int AS stories,
      count(*) FILTER (WHERE status = 'published')::int AS published,
      count(*) FILTER (WHERE status = 'draft')::int AS drafts
    FROM archive.stories
  `);
  assert.deepEqual(archiveState.rows[0], { stories: 2, published: 1, drafts: 1 });
  const relatedRows = await restored.query(`
    SELECT
      (SELECT count(*)::int FROM archive.story_revisions) AS revisions,
      (SELECT count(*)::int FROM archive.media_assets) AS media,
      (SELECT count(*)::int FROM research.evidence) AS evidence
  `);
  assert.deepEqual(relatedRows.rows[0], { revisions: 2, media: 1, evidence: 1 });
  const controlsAndAudit = await restored.query(`
    SELECT
      (SELECT count(*)::int FROM system.editor_write_controls) AS controls,
      (SELECT writes_frozen FROM system.editor_write_controls WHERE singleton_id = 'global') AS writes_frozen,
      (SELECT changed_by FROM system.editor_write_controls WHERE singleton_id = 'global') AS changed_by,
      (SELECT count(*)::int FROM system.editor_write_limits WHERE actor_id = 'synthetic-recovery-operator') AS operator_limits,
      (SELECT request_count FROM system.editor_write_limits WHERE actor_id = 'synthetic-recovery-operator') AS request_count,
      (SELECT count(*)::int FROM system.audit_events WHERE event = 'synthetic.recovery-checkpoint') AS audit_events,
      (SELECT payload FROM system.audit_events WHERE event = 'synthetic.recovery-checkpoint') AS audit_payload
  `);
  assert.deepEqual(controlsAndAudit.rows[0], {
    controls: 1,
    writes_frozen: true,
    changed_by: "synthetic-recovery-operator",
    operator_limits: 1,
    request_count: 3,
    audit_events: 1,
    audit_payload: { fixture: true, purpose: "restore verification" },
  });

  const ledger = await restored.query("SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at");
  const expectedMigrations = readMigrationFiles(migrationConfig).map(({ hash, folderMillis }) => ({ hash, created_at: folderMillis }));
  assert.equal(hasMigrationLedgerDrift({ present: true, actualEntries: ledger.rows, expectedEntries: expectedMigrations }), false);

  const publicRows = await listPublicEpisodes(restoredDb, stories);
  assert.equal(publicRows.length, 1);
  assert.equal(publicRows[0].slug, "restore-published-fixture");
  assert.deepEqual(Object.keys(publicRows[0]).sort(), ["experienceType", "season", "slug", "synopsis", "title"]);
  await assert.rejects(
    restored.query("DELETE FROM archive.stories WHERE id = $1", [published.id]),
    /violates RESTRICT setting of foreign key constraint/,
  );
});

test("backup runbook states the current synthetic restore coverage and its limits", () => {
  assert.match(backupRunbook, /synthetic dataset included one published index, one private draft, two revisions, media, evidence, all five migration ledger rows.*a frozen editor-write control.*an editor quota counter.*an audit event/);
  assert.match(backupRunbook, /does not prove Neon snapshot recovery, provider Auth recovery, production data restoration, scheduled retention, or cutover\/rollback/);
  assert.match(backupRunbook, /This repository does not currently provide a verified write-stop mechanism for any persistent database/);
  assert.match(backupRunbook, /If writes cannot be proven stopped, do not claim a freeze or proceed with destructive recovery\/cutover/);
  assert.match(backupRunbook, /have not been applied to any database, so this CLI is not presently an incident control for Neon/);
  assert.match(backupRunbook, /DB-03 remains open/);
});
