import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";

const initial = await readFile(new URL("../drizzle/0000_0000_initial_v11.sql", import.meta.url), "utf8");
const retention = await readFile(new URL("../drizzle/0001_initial_v11.sql", import.meta.url), "utf8");
const writeLimits = await readFile(new URL("../drizzle/0002_editor_write_limits.sql", import.meta.url), "utf8");
const writeControls = await readFile(new URL("../drizzle/0003_editor_write_controls.sql", import.meta.url), "utf8");
const writeControlAudit = await readFile(new URL("../drizzle/0004_editor_write_control_audit.sql", import.meta.url), "utf8");

test("15-story populated baseline, full migration apply, and reverse DDL execute in PostgreSQL", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());

  await db.exec(initial);
  const baseline = await db.query(`
    SELECT count(*)::int AS tables
    FROM information_schema.tables
    WHERE table_type='BASE TABLE' AND table_schema IN
      ('identity','archive','scripture','research','intelligence','characters','aetherion','cab','system')
  `);
  assert.equal(baseline.rows[0].tables, 16);

  await db.query(`
    INSERT INTO archive.stories(slug,title,season,synopsis,status,experience_type,original_source_status)
    SELECT
      'dev-baseline-' || lpad(n::text,2,'0'),
      'Synthetic Development Story ' || n,
      'V11 rehearsal',
      'Synthetic editorial index only.',
      'published',
      'comic',
      'source_needed'
    FROM generate_series(1,15) AS n
  `);
  const populatedBaseline = await db.query(`
    SELECT count(*)::int AS stories,
      count(*) FILTER (WHERE status='published')::int AS published,
      count(*) FILTER (WHERE original_source_status='source_needed')::int AS source_needed,
      (SELECT count(*)::int FROM archive.story_revisions) AS revisions
    FROM archive.stories
  `);
  assert.deepEqual(populatedBaseline.rows[0], { stories: 15, published: 15, source_needed: 15, revisions: 0 });

  const fkBefore = await db.query(`
    SELECT conname, confdeltype FROM pg_constraint
    WHERE conrelid='archive.story_revisions'::regclass AND contype='f'
  `);
  assert.equal(fkBefore.rows.length, 1);
  assert.equal(fkBefore.rows[0].confdeltype, "c");

  await db.exec(retention);
  await db.exec(writeLimits);
  await db.exec(writeControls);
  await db.exec(writeControlAudit);
  const rateLimitColumns = await db.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='system' AND table_name='editor_write_limits'
    ORDER BY ordinal_position
  `);
  assert.deepEqual(rateLimitColumns.rows.map((row) => row.column_name), ["actor_id", "window_started_at", "request_count"]);
  const fkAfter = await db.query(`
    SELECT conname, confdeltype FROM pg_constraint
    WHERE conrelid='archive.story_revisions'::regclass AND contype='f'
  `);
  assert.equal(fkAfter.rows.length, 1);
  assert.equal(fkAfter.rows[0].confdeltype, "r");
  const populatedAfterApply = await db.query(`
    SELECT count(*)::int AS stories,
      count(*) FILTER (WHERE status='published')::int AS published,
      count(*) FILTER (WHERE original_source_status='source_needed')::int AS source_needed,
      (SELECT count(*)::int FROM archive.story_revisions) AS revisions
    FROM archive.stories
  `);
  assert.deepEqual(populatedAfterApply.rows[0], { stories: 15, published: 15, source_needed: 15, revisions: 0 });

  const authored = await db.query(`
    WITH actor AS (
      INSERT INTO identity.users(external_auth_id,display_name)
      VALUES ($1,$2)
      ON CONFLICT (external_auth_id) DO UPDATE SET
        display_name=COALESCE(EXCLUDED.display_name,identity.users.display_name)
      RETURNING id
    ), draft AS (
      INSERT INTO archive.stories(slug,title,status,original_source_status)
      VALUES ($3,$4,'draft','source_needed') RETURNING id,slug
    ), revision AS (
      INSERT INTO archive.story_revisions(story_id,revision,body,source_type,notes)
      SELECT id,1,$5,'user_original','Original draft' FROM draft RETURNING story_id
    ), audit AS (
      INSERT INTO system.audit_events(actor_id,event,entity,entity_id,payload)
      SELECT actor.id,'story.draft.created','archive.stories',draft.id,
        jsonb_build_object('slug',draft.slug,'revision',1)
      FROM draft JOIN revision ON revision.story_id=draft.id CROSS JOIN actor
      RETURNING entity_id
    ) SELECT draft.id,draft.slug FROM draft JOIN audit ON audit.entity_id=draft.id
  `, ["managed-auth-editor-1", "Test Editor", "pglite-authored-draft", "Authored draft", "Original words"]);
  assert.equal(authored.rows.length,1);
  const attribution=await db.query(`
    SELECT users.external_auth_id,events.event,events.entity_id,revision.body
    FROM system.audit_events events
    JOIN identity.users users ON users.id=events.actor_id
    JOIN archive.stories stories ON stories.id=events.entity_id
    JOIN archive.story_revisions revision ON revision.story_id=stories.id
    WHERE stories.slug=$1
  `,["pglite-authored-draft"]);
  assert.deepEqual(attribution.rows[0],{
    external_auth_id:"managed-auth-editor-1",event:"story.draft.created",
    entity_id:authored.rows[0].id,body:"Original words",
  });

  const initializedFreezeControl = await db.query(`
    SELECT singleton_id, writes_frozen, changed_by, change_reason
    FROM system.editor_write_controls
  `);
  assert.deepEqual(initializedFreezeControl.rows, [{
    singleton_id: "global", writes_frozen: false, changed_by: "migration", change_reason: "initialization",
  }]);
  await db.query(`
    UPDATE system.editor_write_controls
    SET writes_frozen=true, changed_by='synthetic-operator', change_reason='rollback rehearsal'
    WHERE singleton_id='global'
  `);
  await db.query(`
    INSERT INTO system.editor_write_limits(actor_id,request_count)
    VALUES ('synthetic-operator',3)
  `);

  const publicStory = await db.query(`
    INSERT INTO archive.stories(slug,title,season,synopsis,status,experience_type,original_source_status)
    VALUES ($1,$2,$3,$4,'published','comic','source_needed') RETURNING slug
  `, ["public-editorial-index", "Public Index", "Season 1", "A short public synopsis."]);
  const privateStory = await db.query(`
    INSERT INTO archive.stories(slug,title,synopsis,status,original_source_status)
    VALUES ($1,$2,$3,'draft','source_needed') RETURNING id,slug
  `, ["private-draft-fixture", "Private Draft Secret", "Unpublished private synopsis."]);
  await db.query(
    "INSERT INTO archive.story_revisions(story_id,revision,body,source_type,notes) VALUES ($1,1,$2,'user_original',$3)",
    [privateStory.rows[0].id, "Confidential original source text.", "Private author notes."],
  );
  const publicList = await db.query(`
    SELECT slug,title,season,synopsis,experience_type FROM archive.stories
    WHERE status='published' ORDER BY created_at DESC LIMIT 100
  `);
  assert.equal(publicList.rows.length, 16);
  assert.ok(publicList.rows.some((row) => row.slug === publicStory.rows[0].slug));
  assert.deepEqual(Object.keys(publicList.rows[0]).sort(), ["experience_type","season","slug","synopsis","title"]);
  assert.doesNotMatch(JSON.stringify(publicList.rows), /Private Draft Secret|Confidential original|Private author notes/);
  const privatePublicDetail = await db.query(
    "SELECT slug,title,season,synopsis,experience_type FROM archive.stories WHERE slug=$1 AND status='published' LIMIT 1",
    [privateStory.rows[0].slug],
  );
  assert.equal(privatePublicDetail.rows.length, 0);

  const restrictedStory = await db.query(
    "INSERT INTO archive.stories(slug,title) VALUES ($1,$2) RETURNING id",
    ["pglite-restrict-test", "Restriction test"],
  );
  await db.query(
    "INSERT INTO archive.story_revisions(story_id,revision,body) VALUES ($1,1,$2)",
    [restrictedStory.rows[0].id, "must be retained"],
  );
  await assert.rejects(
    db.query("DELETE FROM archive.stories WHERE id=$1", [restrictedStory.rows[0].id]),
    /violates RESTRICT setting of foreign key constraint/,
  );

  const retainedAppRows = await db.query(`
    SELECT
      (SELECT count(*)::int FROM archive.stories) AS stories,
      (SELECT count(*)::int FROM archive.story_revisions) AS revisions,
      (SELECT count(*)::int FROM system.audit_events) AS audit_events
  `);
  assert.deepEqual(retainedAppRows.rows[0], { stories: 19, revisions: 3, audit_events: 1 });

  // Exercise the reverse DDL order for local rehearsal only. The project has no
  // production downgrade scripts; this guards the reviewed destructive steps.
  await db.exec(`
    ALTER TABLE system.editor_write_controls DROP COLUMN change_reason;
    ALTER TABLE system.editor_write_controls DROP COLUMN changed_by;
  `);
  const rolledBackAuditColumns = await db.query(`
    SELECT writes_frozen FROM system.editor_write_controls WHERE singleton_id='global'
  `);
  assert.deepEqual(rolledBackAuditColumns.rows, [{ writes_frozen: true }]);
  await db.exec(`
    DROP TABLE system.editor_write_controls;
    DROP TABLE system.editor_write_limits;
  `);

  await db.exec(`
    ALTER TABLE archive.story_revisions DROP CONSTRAINT story_revisions_story_id_stories_id_fk;
    ALTER TABLE archive.story_revisions
      ADD CONSTRAINT story_revisions_story_id_fkey
      FOREIGN KEY (story_id) REFERENCES archive.stories(id)
      ON DELETE CASCADE ON UPDATE NO ACTION;
  `);
  const fkRolledBack = await db.query(`
    SELECT conname, confdeltype FROM pg_constraint
    WHERE conrelid='archive.story_revisions'::regclass AND contype='f'
  `);
  assert.equal(fkRolledBack.rows.length, 1);
  assert.equal(fkRolledBack.rows[0].conname, "story_revisions_story_id_fkey");
  assert.equal(fkRolledBack.rows[0].confdeltype, "c");
  const afterFeatureRollback = await db.query(`
    SELECT
      (SELECT count(*)::int FROM archive.stories) AS stories,
      (SELECT count(*)::int FROM archive.story_revisions) AS revisions,
      (SELECT count(*)::int FROM system.audit_events) AS audit_events,
      (SELECT count(*)::int FROM archive.stories WHERE slug LIKE 'dev-baseline-%' AND status='published' AND original_source_status='source_needed') AS baseline_stories
  `);
  assert.deepEqual(afterFeatureRollback.rows[0], { stories: 19, revisions: 3, audit_events: 1, baseline_stories: 15 });
  await db.query("DELETE FROM archive.stories WHERE id=$1", [restrictedStory.rows[0].id]);
  const revisions = await db.query(
    "SELECT count(*)::int AS total FROM archive.story_revisions WHERE story_id=$1",
    [restrictedStory.rows[0].id],
  );
  assert.equal(revisions.rows[0].total, 0);

  const drizzleClient = new PGlite();
  t.after(() => drizzleClient.close());
  const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));
  const migrationConfig = { migrationsFolder };
  const expectedLedger = readMigrationFiles(migrationConfig).map(({ hash, folderMillis }) => ({
    hash,
    created_at: folderMillis,
  }));
  assert.equal(expectedLedger.length, 5);

  await migrate(drizzle(drizzleClient), migrationConfig);
  const appliedLedger = await drizzleClient.query(`
    SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at
  `);
  assert.deepEqual(appliedLedger.rows, expectedLedger);

  await migrate(drizzle(drizzleClient), migrationConfig);
  const rerunLedger = await drizzleClient.query(`
    SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at
  `);
  assert.deepEqual(rerunLedger.rows, expectedLedger, "re-running Drizzle must not duplicate migration ledger entries");
});
