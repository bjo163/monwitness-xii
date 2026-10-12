import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { evidence, mediaAssets, stories, storyRevisions } from "../db/schema.js";
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
  assert.match(backupRunbook, /synthetic dataset included one published index, one private draft, two revisions, media, evidence, and all five migration ledger rows/);
  assert.match(backupRunbook, /does not prove Neon snapshot recovery, provider Auth recovery, production data restoration, scheduled retention, or cutover\/rollback/);
  assert.match(backupRunbook, /This repository does not currently provide a verified write-stop mechanism for any persistent database/);
  assert.match(backupRunbook, /If writes cannot be proven stopped, do not claim a freeze or proceed with destructive recovery\/cutover/);
  assert.match(backupRunbook, /have not been applied to any database, so this CLI is not presently an incident control for Neon/);
  assert.match(backupRunbook, /DB-03 remains open/);
});
