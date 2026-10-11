import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const schema = await readFile(join(root, "db", "schema.js"), "utf8");
const initial = await readFile(join(root, "drizzle", "0000_0000_initial_v11.sql"), "utf8");
const retention = await readFile(join(root, "drizzle", "0001_initial_v11.sql"), "utf8");
const journal = JSON.parse(await readFile(join(root, "drizzle", "meta", "_journal.json"), "utf8"));
const snapshot = JSON.parse(await readFile(join(root, "drizzle", "meta", "0001_snapshot.json"), "utf8"));

assert.match(schema, /references\(\(\)=>stories\.id,\{onDelete:"restrict"\}\)/, "revision FK must retain source stories");
const schemas = [...initial.matchAll(/CREATE SCHEMA "([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(schemas).size, 9, "initial migration should create nine distinct schemas");
assert.equal((initial.match(/CREATE TABLE /g) ?? []).length, 16, "initial migration should create 16 tables");
assert.match(retention, /DROP CONSTRAINT IF EXISTS "story_revisions_story_id_fkey"/);
assert.match(retention, /DROP CONSTRAINT IF EXISTS "story_revisions_story_id_stories_id_fk"/);
assert.match(retention, /ON DELETE restrict/);
assert.equal(snapshot.tables["archive.story_revisions"].foreignKeys.story_revisions_story_id_stories_id_fk.onDelete, "restrict");
assert.equal(journal.entries.length, 2);
assert.equal(journal.entries[0].tag, "0000_0000_initial_v11");
assert.equal(journal.entries[1].tag, "0001_initial_v11");

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
  const normalizeNewlines = (value) => value.replace(/\r\n/g, "\n");
  const generatedSql = normalizeNewlines(await readFile(join(generatedDirectory, generatedFiles[0]), "utf8"));
  const initialSql = normalizeNewlines(initial);
  const historicalRevisionFk = generatedSql.match(/ALTER TABLE "archive"\."story_revisions" ADD CONSTRAINT "story_revisions_story_id_stories_id_fk" FOREIGN KEY \("story_id"\) REFERENCES "archive"\."stories"\("id"\) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint/);
  assert.ok(historicalRevisionFk, "generated baseline must contain the revision retention FK");
  const expectedHistoricalBaseline = generatedSql.replace(historicalRevisionFk[0], historicalRevisionFk[0].replace("ON DELETE restrict", "ON DELETE cascade"));
  assert.equal(initialSql, expectedHistoricalBaseline, "committed baseline must match regenerated schema except for the documented historical FK policy");
} finally {
  assert.ok(temporaryDirectory.startsWith(`${temporaryBase}${sep}`), "refusing to remove a path outside the temp directory");
  await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log("Drizzle artifacts pass structural and generation checks: 16 tables, retained revisions, and a two-step journal. Neon apply/rollback remains unverified.");
