import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { hasSchemaDrift } from "../lib/schema-verification-status.js";
import { hasMigrationLedgerDrift } from "../lib/migration-ledger-verification.js";

const verifier = await readFile(new URL("../scripts/verify-schema.mjs", import.meta.url), "utf8");
const migrationJournal = JSON.parse(await readFile(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"));
const verifySchemaScript = fileURLToPath(new URL("../scripts/verify-schema.mjs", import.meta.url));

test("schema verifier covers table, column, default, key, and index drift", () => {
  assert.match(verifier, /_journal\.json/);
  assert.match(verifier, /selectSchemaSnapshot/);
  assert.match(verifier, /selectSchemaSnapshot/);
  assert.match(verifier, /--baseline-reconciliation/);
  assert.match(verifier, /getDatabaseTargetError/);
  assert.match(verifier, /requireExpected: baselineReconciliation/);
  assert.match(verifier, /information_schema\.tables/);
  assert.match(verifier, /information_schema\.columns/);
  assert.match(verifier, /mismatchedDefaults/);
  assert.match(verifier, /constraint_row\.contype = 'f'/);
  assert.match(verifier, /constraint_row\.confupdtype/);
  assert.match(verifier, /constraint_row\.contype IN \('u', 'p'\)/);
  assert.match(verifier, /pg_index/);
  assert.match(verifier, /equivalentUniqueIndexConstraints/);
  assert.match(verifier, /hasSchemaDrift\(result, \{ requireLedger: !baselineReconciliation \}\)/);
  assert.match(verifier, /createHash\("sha256"\)/);
  assert.match(verifier, /SELECT hash, created_at FROM drizzle\.__drizzle_migrations ORDER BY created_at/);
  assert.match(verifier, /expectedMigrationEntries: baselineReconciliation \? 0 : expectedMigrationEntries\.length/);
  assert.match(verifier, /migrationLedgerDrift \|\| hasSchemaDrift/);
});

test("normal verification selects the latest migration snapshot and reconciliation selects the baseline", async () => {
  const { selectSchemaSnapshot } = await import("../lib/schema-snapshot-selection.js");
  const metadata = { journalVersion: migrationJournal.version, journalDialect: migrationJournal.dialect };
  assert.equal(selectSchemaSnapshot({ baselineReconciliation: false, migrationEntries: migrationJournal.entries, ...metadata }), "0002_snapshot.json");
  assert.equal(selectSchemaSnapshot({ baselineReconciliation: true, migrationEntries: migrationJournal.entries, ...metadata }), "0000_snapshot.json");
  assert.throws(() => selectSchemaSnapshot({ baselineReconciliation: false, migrationEntries: [], ...metadata }), /no entries/);
});

test("schema verification rejects malformed or unsafe migration journal order before choosing a snapshot", async () => {
  const { selectSchemaSnapshot } = await import("../lib/schema-snapshot-selection.js");
  const metadata = { journalVersion: migrationJournal.version, journalDialect: migrationJournal.dialect };
  const altered = (change) => migrationJournal.entries.map((entry, index) => change({ ...entry }, index));

  assert.throws(() => selectSchemaSnapshot({
    baselineReconciliation: false,
    migrationEntries: altered((entry, index) => index === 1 ? { ...entry, idx: 4 } : entry),
    ...metadata,
  }), /indices must be contiguous and ordered/);
  assert.throws(() => selectSchemaSnapshot({
    baselineReconciliation: false,
    migrationEntries: altered((entry, index) => index === 1 ? { ...entry, when: migrationJournal.entries[0].when } : entry),
    ...metadata,
  }), /timestamps must be positive, unique, and increasing/);
  assert.throws(() => selectSchemaSnapshot({
    baselineReconciliation: false,
    migrationEntries: altered((entry, index) => index === 1 ? { ...entry, tag: "../outside" } : entry),
    ...metadata,
  }), /tags must be unique safe filenames/);
  assert.throws(() => selectSchemaSnapshot({
    baselineReconciliation: false,
    migrationEntries: altered((entry) => ({ ...entry, tag: "same_migration" })),
    ...metadata,
  }), /tags must be unique safe filenames/);
  assert.throws(() => selectSchemaSnapshot({
    baselineReconciliation: false,
    migrationEntries: altered((entry, index) => index === 1 ? { ...entry, version: "unknown" } : entry),
    ...metadata,
  }), /entries have invalid metadata/);
  assert.throws(() => selectSchemaSnapshot({
    baselineReconciliation: false,
    migrationEntries: migrationJournal.entries,
    journalVersion: migrationJournal.version,
    journalDialect: "mysql",
  }), /journal has invalid version or dialect metadata/);
});

test("schema verification fails on a missing migration ledger and any inventory drift", () => {
  const clean = { migrationLedgerPresent: true };
  assert.equal(hasSchemaDrift(clean), false);
  assert.equal(hasSchemaDrift({ ...clean, migrationLedgerPresent: false }), true);
  assert.equal(hasSchemaDrift({ ...clean, migrationLedgerPresent: false }, { requireLedger: false }), false);
  assert.equal(hasSchemaDrift({ ...clean, migrationLedgerPresent: false, missingForeignKeys: [{}] }, { requireLedger: false }), true);
  assert.equal(hasSchemaDrift({ ...clean, missingForeignKeys: [{}] }), true);
  assert.equal(hasSchemaDrift({ ...clean, mismatchedDefaults: [{}] }), true);
});

test("migration ledger verification requires every journal hash and timestamp in order", () => {
  const expectedEntries = [
    { hash: "hash-0000", created_at: 100 },
    { hash: "hash-0001", created_at: 200 },
  ];
  const matching = expectedEntries.map((entry) => ({ ...entry }));
  assert.equal(hasMigrationLedgerDrift({ present: true, actualEntries: matching, expectedEntries }), false);
  assert.equal(hasMigrationLedgerDrift({ present: false, actualEntries: [], expectedEntries }), true);
  assert.equal(hasMigrationLedgerDrift({ present: true, actualEntries: [], expectedEntries }), true);
  assert.equal(hasMigrationLedgerDrift({ present: true, actualEntries: [matching[0]], expectedEntries }), true);
  assert.equal(hasMigrationLedgerDrift({ present: true, actualEntries: [...matching, matching[1]], expectedEntries }), true);
  assert.equal(hasMigrationLedgerDrift({ present: true, actualEntries: [matching[1], matching[0]], expectedEntries }), true);
  assert.equal(hasMigrationLedgerDrift({
    present: true, actualEntries: [{ ...matching[0], hash: "wrong-hash" }, matching[1]], expectedEntries,
  }), true);
  assert.equal(hasMigrationLedgerDrift({
    present: true, actualEntries: [{ ...matching[0], created_at: 101 }, matching[1]], expectedEntries,
  }), true);
});

test("expected ledger hashes match Drizzle's own migration reader", async () => {
  const { readMigrationFiles } = await import("drizzle-orm/migrator");
  const migrations = readMigrationFiles({ migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
  const expectedEntries = migrations.map(({ hash, folderMillis }) => ({ hash, created_at: folderMillis }));
  const sqlFiles = await Promise.all(migrationJournal.entries.map((entry) =>
    readFile(new URL(`../drizzle/${entry.tag}.sql`, import.meta.url))));
  const { createHash } = await import("node:crypto");
  assert.deepEqual(expectedEntries, sqlFiles.map((sql, index) => ({
    hash: createHash("sha256").update(sql).digest("hex"),
    created_at: migrationJournal.entries[index].when,
  })));
});

test("baseline reconciliation refuses an existing migration ledger", () => {
  assert.equal(hasMigrationLedgerDrift({ present: false, baselineReconciliation: true }), false);
  assert.equal(hasMigrationLedgerDrift({ present: true, baselineReconciliation: true }), true);
});

test("schema verifier exits explicitly without a database URL", () => {
  const result = spawnSync(process.execPath, [verifySchemaScript], {
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: "" },
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /DATABASE_URL missing; verification not run/);
});

test("schema verifier rejects unsupported modes before database access", () => {
  const result = spawnSync(process.execPath, [verifySchemaScript, "--unsafe"], {
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: "" },
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage:.*baseline-reconciliation/);
});

test("baseline reconciliation refuses to connect without independently expected host and database", () => {
  const result = spawnSync(process.execPath, [verifySchemaScript, "--baseline-reconciliation"], {
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: "postgresql://owner:secret-value@ep-prod.example.neon.tech/neondb?sslmode=require",
      EXPECTED_DATABASE_HOST: "",
      EXPECTED_DATABASE_NAME: "",
    },
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Expected database host and name are required/);
  assert.doesNotMatch(result.stderr, /secret-value|ep-prod|neondb/);
});

test("baseline reconciliation rejects a mismatched host or database before network access", () => {
  const run = (expectedHost, expectedDatabase) => spawnSync(process.execPath, [verifySchemaScript, "--baseline-reconciliation"], {
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: "postgresql://owner:secret-value@ep-dev.example.neon.tech/neondb?sslmode=require",
      EXPECTED_DATABASE_HOST: expectedHost,
      EXPECTED_DATABASE_NAME: expectedDatabase,
    },
  });

  const hostMismatch = run("ep-prod.example.neon.tech", "neondb");
  assert.equal(hostMismatch.status, 2);
  assert.match(hostMismatch.stderr, /host does not match/);
  assert.doesNotMatch(hostMismatch.stderr, /secret-value|ep-dev|ep-prod|neondb/);

  const databaseMismatch = run("ep-dev.example.neon.tech", "production");
  assert.equal(databaseMismatch.status, 2);
  assert.match(databaseMismatch.stderr, /database does not match/);
  assert.doesNotMatch(databaseMismatch.stderr, /secret-value|ep-dev|production|neondb/);
});

test("database target validation parses PostgreSQL URLs and compares expected target names", async () => {
  const { getDatabaseTargetError } = await import("../lib/database-target.js");
  assert.equal(getDatabaseTargetError({
    uri: "postgresql://owner:secret-value@EP-DEV.example.neon.tech/neondb?sslmode=require",
    expectedHost: "ep-dev.example.neon.tech",
    expectedDatabase: "neondb",
    requireExpected: true,
  }), null);
  assert.match(getDatabaseTargetError({ uri: "not a url" }), /valid PostgreSQL URL/);
  assert.match(getDatabaseTargetError({ uri: "https://example.com/db" }), /PostgreSQL host and database/);
});
