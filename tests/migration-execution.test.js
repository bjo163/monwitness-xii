import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const initial = await readFile(new URL("../drizzle/0000_0000_initial_v11.sql", import.meta.url), "utf8");
const retention = await readFile(new URL("../drizzle/0001_initial_v11.sql", import.meta.url), "utf8");

test("fresh baseline, retention migration, and FK rollback execute in PostgreSQL", async (t) => {
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

  const fkBefore = await db.query(`
    SELECT conname, confdeltype FROM pg_constraint
    WHERE conrelid='archive.story_revisions'::regclass AND contype='f'
  `);
  assert.equal(fkBefore.rows.length, 1);
  assert.equal(fkBefore.rows[0].confdeltype, "c");

  await db.exec(retention);
  const fkAfter = await db.query(`
    SELECT conname, confdeltype FROM pg_constraint
    WHERE conrelid='archive.story_revisions'::regclass AND contype='f'
  `);
  assert.equal(fkAfter.rows.length, 1);
  assert.equal(fkAfter.rows[0].confdeltype, "r");

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
  await db.query("DELETE FROM archive.stories WHERE id=$1", [restrictedStory.rows[0].id]);
  const revisions = await db.query(
    "SELECT count(*)::int AS total FROM archive.story_revisions WHERE story_id=$1",
    [restrictedStory.rows[0].id],
  );
  assert.equal(revisions.rows[0].total, 0);
});
