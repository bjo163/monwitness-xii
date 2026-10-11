import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { hasSchemaDrift } from "../lib/schema-verification-status.js";

const verifier = await readFile(new URL("../scripts/verify-schema.mjs", import.meta.url), "utf8");

test("schema verifier covers table, column, default, key, and index drift", () => {
  assert.match(verifier, /0001_snapshot\.json/);
  assert.match(verifier, /0000_snapshot\.json/);
  assert.match(verifier, /--baseline-reconciliation/);
  assert.match(verifier, /information_schema\.tables/);
  assert.match(verifier, /information_schema\.columns/);
  assert.match(verifier, /mismatchedDefaults/);
  assert.match(verifier, /constraint_row\.contype = 'f'/);
  assert.match(verifier, /constraint_row\.confupdtype/);
  assert.match(verifier, /constraint_row\.contype IN \('u', 'p'\)/);
  assert.match(verifier, /pg_index/);
  assert.match(verifier, /equivalentUniqueIndexConstraints/);
  assert.match(verifier, /hasSchemaDrift\(result, \{ requireLedger: !baselineReconciliation \}\)/);
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

test("schema verifier exits explicitly without a database URL", () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/verify-schema.mjs", import.meta.url))], {
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: "" },
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /DATABASE_URL missing; verification not run/);
});

test("schema verifier rejects unsupported modes before database access", () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/verify-schema.mjs", import.meta.url)), "--unsafe"], {
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: "" },
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage:.*baseline-reconciliation/);
});
