import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { hasSchemaDrift } from "../lib/schema-verification-status.js";
import { hasMigrationLedgerDrift } from "../lib/migration-ledger-verification.js";
import { selectSchemaSnapshot } from "../lib/schema-snapshot-selection.js";
import { getDatabaseTargetError } from "../lib/database-target.js";

const args = process.argv.slice(2);
const baselineReconciliation = args.length === 1 && args[0] === "--baseline-reconciliation";
if (args.length > 0 && !baselineReconciliation) {
  console.error("Usage: node scripts/verify-schema.mjs [--baseline-reconciliation]");
  process.exit(2);
}

const uri = process.env.DATABASE_URL;
if (!uri) {
  console.error("DATABASE_URL missing; verification not run");
  process.exit(2);
}

const targetError = getDatabaseTargetError({
  uri,
  expectedHost: process.env.EXPECTED_DATABASE_HOST,
  expectedDatabase: process.env.EXPECTED_DATABASE_NAME,
  requireExpected: baselineReconciliation,
});
if (targetError) {
  console.error(`${targetError}; verification not run`);
  process.exit(2);
}

const root = fileURLToPath(new URL("..", import.meta.url));
const journal = JSON.parse(await readFile(join(root, "drizzle", "meta", "_journal.json"), "utf8"));
const snapshotFile = selectSchemaSnapshot({
  baselineReconciliation,
  migrationEntries: journal.entries,
  journalVersion: journal.version,
  journalDialect: journal.dialect,
});
const expectedMigrationEntries = await Promise.all(journal.entries.map(async (entry) => {
  const sql = await readFile(join(root, "drizzle", `${entry.tag}.sql`));
  return { hash: createHash("sha256").update(sql).digest("hex"), created_at: entry.when };
}));
const snapshot = JSON.parse(await readFile(join(root, "drizzle", "meta", snapshotFile), "utf8"));
const expectedTables = snapshot.tables;
const schemas = [...new Set(Object.values(expectedTables).map((table) => table.schema))].sort();

if (schemas.some((schema) => !/^[a-z_][a-z0-9_]*$/.test(schema))) {
  throw new Error("Unexpected schema identifier in Drizzle snapshot");
}
const schemaSql = schemas.map((schema) => `'${schema}'`).join(",");
const db = neon(uri);

const actualTables = await db`SELECT table_schema, table_name FROM information_schema.tables
WHERE table_type = 'BASE TABLE' AND table_schema IN (${db.unsafe(schemaSql)})`;
const actualTableNames = new Set(actualTables.map((row) => `${row.table_schema}.${row.table_name}`));
const missingTables = Object.keys(expectedTables).filter((name) => !actualTableNames.has(name));
const unexpectedTables = [...actualTableNames].filter((name) => !Object.hasOwn(expectedTables, name));

const actualColumns = await db`SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns WHERE table_schema IN (${db.unsafe(schemaSql)})`;
const actualColumnMap = new Map(actualColumns.map((column) => [`${column.table_schema}.${column.table_name}.${column.column_name}`, column]));
const missingColumns = [];
const mismatchedColumns = [];
const mismatchedDefaults = [];
const expectedColumnKeys = new Set();
const normalizeDefault = (value) => value == null ? null : String(value)
  .replace(/::(?:jsonb|text|integer|boolean|uuid|timestamp with time zone)$/i, "")
  .replace(/^\((.*)\)$/, "$1");
for (const [tableName, table] of Object.entries(expectedTables)) {
  for (const [columnName, expected] of Object.entries(table.columns)) {
    const key = `${tableName}.${columnName}`;
    expectedColumnKeys.add(key);
    const actual = actualColumnMap.get(key);
    if (!actual) {
      missingColumns.push(key);
      continue;
    }
    const expectedNullable = expected.notNull ? "NO" : "YES";
    if (actual.data_type !== expected.type || actual.is_nullable !== expectedNullable) {
      mismatchedColumns.push({ column: key, expected: { type: expected.type, nullable: expectedNullable }, actual: { type: actual.data_type, nullable: actual.is_nullable } });
    }
    const expectedDefault = normalizeDefault(expected.default);
    const actualDefault = normalizeDefault(actual.column_default);
    if (expectedDefault !== actualDefault) {
      mismatchedDefaults.push({ column: key, expected: expectedDefault, actual: actualDefault });
    }
  }
}
const unexpectedColumns = actualColumns
  .map((column) => `${column.table_schema}.${column.table_name}.${column.column_name}`)
  .filter((key) => actualTableNames.has(key.slice(0, key.lastIndexOf("."))) && !expectedColumnKeys.has(key));

const actualForeignKeys = await db`
  SELECT source_ns.nspname AS schema_name, source_table.relname AS table_name,
    array_agg(source_column.attname ORDER BY source_key.ordinality) AS columns,
    target_ns.nspname AS target_schema, target_table.relname AS target_table,
    array_agg(target_column.attname ORDER BY source_key.ordinality) AS target_columns,
    CASE constraint_row.confdeltype
      WHEN 'a' THEN 'no action' WHEN 'r' THEN 'restrict' WHEN 'c' THEN 'cascade'
      WHEN 'n' THEN 'set null' WHEN 'd' THEN 'set default'
    END AS on_delete,
    CASE constraint_row.confupdtype
      WHEN 'a' THEN 'no action' WHEN 'r' THEN 'restrict' WHEN 'c' THEN 'cascade'
      WHEN 'n' THEN 'set null' WHEN 'd' THEN 'set default'
    END AS on_update
  FROM pg_constraint AS constraint_row
  JOIN pg_class AS source_table ON source_table.oid = constraint_row.conrelid
  JOIN pg_namespace AS source_ns ON source_ns.oid = source_table.relnamespace
  JOIN pg_class AS target_table ON target_table.oid = constraint_row.confrelid
  JOIN pg_namespace AS target_ns ON target_ns.oid = target_table.relnamespace
  JOIN LATERAL unnest(constraint_row.conkey) WITH ORDINALITY AS source_key(attnum, ordinality) ON true
  JOIN LATERAL unnest(constraint_row.confkey) WITH ORDINALITY AS target_key(attnum, ordinality) ON target_key.ordinality = source_key.ordinality
  JOIN pg_attribute AS source_column ON source_column.attrelid = source_table.oid AND source_column.attnum = source_key.attnum
  JOIN pg_attribute AS target_column ON target_column.attrelid = target_table.oid AND target_column.attnum = target_key.attnum
  WHERE constraint_row.contype = 'f' AND source_ns.nspname IN (${db.unsafe(schemaSql)})
  GROUP BY source_ns.nspname, source_table.relname, target_ns.nspname, target_table.relname, constraint_row.confdeltype, constraint_row.confupdtype
`;
const signature = (value) => JSON.stringify({
  schema: value.schema,
  table: value.table,
  columns: value.columns,
  targetSchema: value.targetSchema,
  targetTable: value.targetTable,
  targetColumns: value.targetColumns,
  onDelete: value.onDelete,
  onUpdate: value.onUpdate,
});
const expectedForeignKeys = [];
for (const [tableKey, table] of Object.entries(expectedTables)) {
  for (const foreignKey of Object.values(table.foreignKeys)) {
    expectedForeignKeys.push({
      schema: table.schema,
      table: table.name,
      columns: foreignKey.columnsFrom,
      targetSchema: foreignKey.schemaTo,
      targetTable: foreignKey.tableTo,
      targetColumns: foreignKey.columnsTo,
      onDelete: foreignKey.onDelete,
      onUpdate: foreignKey.onUpdate,
    });
  }
}
const normalizeActual = (fk) => ({ schema: fk.schema_name, table: fk.table_name, columns: fk.columns, targetSchema: fk.target_schema, targetTable: fk.target_table, targetColumns: fk.target_columns, onDelete: fk.on_delete, onUpdate: fk.on_update });
const actualFkSignatures = new Set(actualForeignKeys.map((fk) => signature(normalizeActual(fk))));
const expectedFkSignatures = new Set(expectedForeignKeys.map(signature));
const missingForeignKeys = expectedForeignKeys.filter((fk) => !actualFkSignatures.has(signature(fk)));
const unexpectedForeignKeys = actualForeignKeys.map(normalizeActual).filter((fk) => !expectedFkSignatures.has(signature(fk)));

const actualIndexes = await db`
  SELECT index_namespace.nspname AS schema_name, table_class.relname AS table_name,
    index_class.relname AS index_name, pg_get_indexdef(index_class.oid) AS definition
  FROM pg_class AS index_class
  JOIN pg_index AS index_row ON index_row.indexrelid = index_class.oid
  JOIN pg_class AS table_class ON table_class.oid = index_row.indrelid
  JOIN pg_namespace AS index_namespace ON index_namespace.oid = index_class.relnamespace
  WHERE index_class.relkind = 'i' AND index_namespace.nspname IN (${db.unsafe(schemaSql)})
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint AS constraint_row
      WHERE constraint_row.conindid = index_class.oid
    )
`;
const actualUniqueConstraints = await db`
  SELECT source_ns.nspname AS schema_name, source_table.relname AS table_name,
    constraint_row.conname AS constraint_name,
    array_agg(source_column.attname ORDER BY source_key.ordinality) AS columns
  FROM pg_constraint AS constraint_row
  JOIN pg_class AS source_table ON source_table.oid = constraint_row.conrelid
  JOIN pg_namespace AS source_ns ON source_ns.oid = source_table.relnamespace
  JOIN LATERAL unnest(constraint_row.conkey) WITH ORDINALITY AS source_key(attnum, ordinality) ON true
  JOIN pg_attribute AS source_column ON source_column.attrelid = source_table.oid AND source_column.attnum = source_key.attnum
  WHERE constraint_row.contype IN ('u', 'p') AND source_ns.nspname IN (${db.unsafe(schemaSql)})
  GROUP BY source_ns.nspname, source_table.relname, constraint_row.conname
`;
// Drizzle's snapshot records index semantics; compare name, uniqueness and ordered
// key columns without depending on PostgreSQL's pretty-printer formatting.
const normalizeIndex = (row) => {
  const definition = row.definition;
  const unique = /CREATE UNIQUE INDEX/.test(definition);
  const method = definition.match(/ USING (\w+)/)?.[1] ?? "btree";
  const columnsPart = definition.match(/\((.*)\)(?: WHERE |$)/)?.[1] ?? "";
  return { schema: row.schema_name, table: row.table_name, name: row.index_name, unique, method, columns: columnsPart.replaceAll('"', "").split(", ") };
};
const expectedIndexShape = (index) => ({
  schema: index.schema, table: index.table, name: index.name,
  unique: index.isUnique, method: index.method ?? "btree",
  columns: index.columns.map((column) => column.expression),
});
const indexShapeSignature = (index) => JSON.stringify(index);
const uniqueConstraintSignature = ({ schema, table, columns }) => JSON.stringify({ schema, table, columns });
const actualUniqueConstraintShapes = actualUniqueConstraints.map((row) => ({
  schema: row.schema_name, table: row.table_name, columns: row.columns,
}));
const expectedIndexShapes = [];
for (const table of Object.values(expectedTables)) {
  for (const index of Object.values(table.indexes)) expectedIndexShapes.push(expectedIndexShape({ ...index, schema: table.schema, table: table.name }));
}
const actualIndexShapes = actualIndexes.map(normalizeIndex);
const actualIndexSignatures = new Set(actualIndexShapes.map(indexShapeSignature));
const expectedIndexSignatures = new Set(expectedIndexShapes.map(indexShapeSignature));
const equivalentUniqueIndexConstraints = actualUniqueConstraintShapes.filter((constraint) =>
  expectedIndexShapes.some((index) => index.unique && index.schema === constraint.schema && index.table === constraint.table
    && JSON.stringify(index.columns) === JSON.stringify(constraint.columns)));
const equivalentUniqueConstraintSignatures = new Set(equivalentUniqueIndexConstraints.map(uniqueConstraintSignature));
const missingIndexes = expectedIndexShapes.filter((index) => !actualIndexSignatures.has(indexShapeSignature(index))
  && !(index.unique && equivalentUniqueIndexConstraints.some((constraint) => constraint.schema === index.schema
    && constraint.table === index.table && JSON.stringify(constraint.columns) === JSON.stringify(index.columns))));
const unexpectedIndexes = actualIndexShapes.filter((index) => !expectedIndexSignatures.has(indexShapeSignature(index)));

const expectedUniqueConstraints = [];
for (const table of Object.values(expectedTables)) {
  for (const constraint of Object.values(table.uniqueConstraints)) {
    expectedUniqueConstraints.push({ schema: table.schema, table: table.name, name: constraint.name, columns: constraint.columns });
  }
}
for (const table of Object.values(expectedTables)) {
  for (const constraint of Object.values(table.compositePrimaryKeys)) {
    expectedUniqueConstraints.push({ schema: table.schema, table: table.name, name: constraint.name, columns: constraint.columns });
  }
  for (const column of Object.values(table.columns)) {
    if (column.primaryKey) expectedUniqueConstraints.push({ schema: table.schema, table: table.name, name: `${table.name}_pkey`, columns: [column.name] });
  }
}
const expectedUniqueSignatures = new Set(expectedUniqueConstraints.map(uniqueConstraintSignature));
const actualUniqueSignatures = new Set(actualUniqueConstraintShapes.map(uniqueConstraintSignature));
const missingUniqueConstraints = expectedUniqueConstraints.filter((constraint) => !actualUniqueSignatures.has(uniqueConstraintSignature(constraint)));
const unexpectedUniqueConstraints = actualUniqueConstraintShapes.filter((constraint) =>
  !expectedUniqueSignatures.has(uniqueConstraintSignature(constraint))
  && !equivalentUniqueConstraintSignatures.has(uniqueConstraintSignature(constraint)));

const migrationLedger = await db`SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS present`;
const migrationLedgerPresent = migrationLedger[0].present;
const actualMigrationEntries = migrationLedgerPresent
  ? await db`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`
  : [];
const migrationLedgerDrift = hasMigrationLedgerDrift({
  present: migrationLedgerPresent,
  actualEntries: actualMigrationEntries,
  expectedEntries: expectedMigrationEntries,
  baselineReconciliation,
});
const storyCounts = actualTableNames.has("archive.stories")
  ? (await db`SELECT count(*)::int AS total, count(*) FILTER (WHERE status='draft')::int AS drafts FROM archive.stories`)[0]
  : { total: null, drafts: null };

const result = {
  verificationMode: baselineReconciliation ? "baseline-reconciliation" : "current-schema",
  schemaSnapshot: snapshotFile,
  expectedTables: Object.keys(expectedTables).length,
  actualTables: actualTableNames.size,
  missingTables,
  unexpectedTables,
  expectedColumns: Object.values(expectedTables).reduce((sum, table) => sum + Object.keys(table.columns).length, 0),
  actualColumns: actualColumns.length,
  missingColumns,
  unexpectedColumns,
  mismatchedColumns,
  mismatchedDefaults,
  expectedForeignKeys: expectedForeignKeys.length,
  actualForeignKeys: actualForeignKeys.length,
  missingForeignKeys,
  unexpectedForeignKeys,
  expectedIndexes: expectedIndexShapes.length,
  actualIndexes: actualIndexShapes.length,
  equivalentUniqueIndexConstraints: equivalentUniqueIndexConstraints.length,
  missingIndexes,
  unexpectedIndexes,
  expectedUniqueConstraints: expectedUniqueConstraints.length,
  actualUniqueConstraints: actualUniqueConstraintShapes.length,
  missingUniqueConstraints,
  unexpectedUniqueConstraints,
  migrationLedgerPresent,
  expectedMigrationEntries: baselineReconciliation ? 0 : expectedMigrationEntries.length,
  actualMigrationEntries: actualMigrationEntries.length,
  migrationLedgerDrift,
  stories: storyCounts.total,
  drafts: storyCounts.drafts,
};
console.log(JSON.stringify(result, null, 2));
if (migrationLedgerDrift || hasSchemaDrift(result, { requireLedger: !baselineReconciliation })) process.exit(1);
