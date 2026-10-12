import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = fileURLToPath(new URL("..", import.meta.url));
const schema = await readFile(join(root, "db", "schema.js"), "utf8");
const initial = await readFile(join(root, "drizzle", "0000_0000_initial_v11.sql"), "utf8");
const retention = await readFile(join(root, "drizzle", "0001_initial_v11.sql"), "utf8");
const writeLimits = await readFile(join(root, "drizzle", "0002_editor_write_limits.sql"), "utf8");
const writeControls = await readFile(join(root, "drizzle", "0003_editor_write_controls.sql"), "utf8");
const writeControlAudit = await readFile(join(root, "drizzle", "0004_editor_write_control_audit.sql"), "utf8");
const journal = JSON.parse(await readFile(join(root, "drizzle", "meta", "_journal.json"), "utf8"));
const snapshot = JSON.parse(await readFile(join(root, "drizzle", "meta", "0004_snapshot.json"), "utf8"));

assert.match(schema, /references\(\(\)=>stories\.id,\{onDelete:"restrict"\}\)/, "revision FK must retain source stories");
const schemas = [...initial.matchAll(/CREATE SCHEMA "([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(schemas).size, 9, "initial migration should create nine distinct schemas");
assert.equal((initial.match(/CREATE TABLE /g) ?? []).length, 16, "initial migration should create 16 tables");
assert.match(retention, /DROP CONSTRAINT IF EXISTS "story_revisions_story_id_fkey"/);
assert.match(retention, /DROP CONSTRAINT IF EXISTS "story_revisions_story_id_stories_id_fk"/);
assert.match(retention, /ON DELETE restrict/);
assert.equal(snapshot.tables["archive.story_revisions"].foreignKeys.story_revisions_story_id_stories_id_fk.onDelete, "restrict");
assert.equal(journal.entries.length, 5);
assert.equal(journal.entries[0].tag, "0000_0000_initial_v11");
assert.equal(journal.entries[1].tag, "0001_initial_v11");
assert.equal(journal.entries[2].tag, "0002_editor_write_limits");
assert.equal(journal.entries[3].tag, "0003_editor_write_controls");
assert.equal(journal.entries[4].tag, "0004_editor_write_control_audit");
assert.ok(snapshot.tables["system.editor_write_limits"], "latest Drizzle snapshot must include write limits");
assert.ok(snapshot.tables["system.editor_write_controls"], "latest Drizzle snapshot must include the editor write-freeze control");
assert.match(writeControls, /VALUES \('global', false\)/);

const temporaryBase = resolve(tmpdir());
const temporaryDirectory = await mkdtemp(join(temporaryBase, "mw-v11-migration-check-"));
try {
  assert.ok(temporaryDirectory.startsWith(`${temporaryBase}${sep}`), "migration output must stay in an isolated temp directory");
  const generatedDirectory = join(temporaryDirectory, "generated");
  const generated = spawnSync(process.execPath, [
    join(root, "node_modules", "drizzle-kit", "bin.cjs"),
    "generate",
    "--dialect", "postgresql",
    "--schema", "db/schema.js",
    "--out", generatedDirectory,
  ], { cwd: root, encoding: "utf8", timeout: 30_000 });
  assert.equal(generated.status, 0, `Drizzle migration generation failed:\n${generated.stderr || generated.stdout}`);

  const generatedFiles = (await readdir(generatedDirectory)).filter((name) => /^\d{4}_.+\.sql$/.test(name));
  assert.equal(generatedFiles.length, 1, "a fresh output directory should generate one complete baseline migration");
  const generatedSql = await readFile(join(generatedDirectory, generatedFiles[0]), "utf8");
  const generatedDb = new PGlite();
  const migratedDb = new PGlite();
  try {
    await generatedDb.exec(generatedSql);
    await migratedDb.exec(initial);
    await migratedDb.exec(retention);
    await migratedDb.exec(writeLimits);
    await migratedDb.exec(writeControls);
    await migratedDb.exec(writeControlAudit);

    const readSchema = async (db) => {
      const schemas = await db.query(`SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('identity','archive','scripture','research','intelligence','characters','aetherion','cab','system') ORDER BY schema_name`);
      const tables = await db.query(`SELECT table_schema,table_name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema IN ('identity','archive','scripture','research','intelligence','characters','aetherion','cab','system') ORDER BY table_schema,table_name`);
      const columns = await db.query(`SELECT table_schema,table_name,column_name,ordinal_position,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema IN ('identity','archive','scripture','research','intelligence','characters','aetherion','cab','system') ORDER BY table_schema,table_name,ordinal_position`);
      const indexes = await db.query(`SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname IN ('identity','archive','scripture','research','intelligence','characters','aetherion','cab','system') ORDER BY schemaname,tablename,indexname`);
      const constraints = await db.query(`SELECT n.nspname AS schema_name,c.relname AS table_name,con.conname,pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('identity','archive','scripture','research','intelligence','characters','aetherion','cab','system') ORDER BY n.nspname,c.relname,con.conname`);
      return [schemas.rows,tables.rows,columns.rows,indexes.rows,constraints.rows];
    };
    assert.deepEqual(await readSchema(migratedDb), await readSchema(generatedDb), "committed migration chain must reproduce the full Drizzle schema");
  } finally {
    await Promise.all([generatedDb.close(), migratedDb.close()]);
  }
} finally {
  assert.ok(temporaryDirectory.startsWith(`${temporaryBase}${sep}`), "refusing to remove a path outside the temp directory");
  await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log("Drizzle artifacts pass generation and PostgreSQL replay checks: the committed migration chain matches the full generated schema, including retained revisions, editor write limits, and the audited write-freeze control. This local check does not execute SQL on Neon; see the engineering handover for environment-specific rehearsal evidence.");
