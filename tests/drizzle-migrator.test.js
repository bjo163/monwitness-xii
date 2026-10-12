import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { hasMigrationLedgerDrift } from "../lib/migration-ledger-verification.js";

test("Drizzle migrator applies the journal in order and validates its ledger", async (t) => {
  const client = new PGlite();
  const db = drizzle(client);
  t.after(() => client.close());

  const config = { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) };
  await migrate(db, config);

  const firstPass = await client.query("SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at");
  assert.equal(firstPass.rows.length, 3);
  const expectedEntries = readMigrationFiles(config).map(({ hash, folderMillis }) => ({ hash, created_at: folderMillis }));
  assert.equal(hasMigrationLedgerDrift({ present: true, actualEntries: firstPass.rows, expectedEntries }), false);
  assert.equal(hasMigrationLedgerDrift({
    present: true,
    actualEntries: firstPass.rows.map((entry, index) => index === 1 ? { ...entry, hash: "stale-hash" } : entry),
    expectedEntries,
  }), true);
  assert.equal(hasMigrationLedgerDrift({
    present: true,
    actualEntries: firstPass.rows.map((entry, index) => index === 1 ? { ...entry, created_at: entry.created_at + 1 } : entry),
    expectedEntries,
  }), true);
  assert.equal(hasMigrationLedgerDrift({
    present: true, actualEntries: firstPass.rows, expectedEntries, baselineReconciliation: true,
  }), true);

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
