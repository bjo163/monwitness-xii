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
  assert.deepEqual(publicList.rows.map((row) => row.slug), [publicStory.rows[0].slug]);
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
