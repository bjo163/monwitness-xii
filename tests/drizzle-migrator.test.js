import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

test("Drizzle migrator applies the journal in order and records an idempotent ledger", async (t) => {
  const client = new PGlite();
  const db = drizzle(client);
  t.after(() => client.close());

  const config = { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) };
  await migrate(db, config);

  const firstPass = await client.query("SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at");
  assert.equal(firstPass.rows.length, 3);

  const tables = await client.query(`
    SELECT count(*)::int AS total FROM information_schema.tables
    WHERE table_type='BASE TABLE' AND table_schema IN
      ('identity','archive','scripture','research','intelligence','characters','aetherion','cab','system')
  `);
  assert.equal(tables.rows[0].total, 17);

  const foreignKey = await client.query(`
    SELECT confdeltype FROM pg_constraint
    WHERE conrelid='archive.story_revisions'::regclass AND contype='f'
  `);
  assert.equal(foreignKey.rows.length, 1);
  assert.equal(foreignKey.rows[0].confdeltype, "r");

  await migrate(db, config);
  const secondPass = await client.query("SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at");
  assert.deepEqual(secondPass.rows, firstPass.rows);
});
