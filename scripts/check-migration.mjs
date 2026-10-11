import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
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
assert.match(retention, /DROP CONSTRAINT "story_revisions_story_id_stories_id_fk"/);
assert.match(retention, /ON DELETE restrict/);
assert.equal(snapshot.tables["archive.story_revisions"].foreignKeys.story_revisions_story_id_stories_id_fk.onDelete, "restrict");
assert.equal(journal.entries.length, 2);
assert.equal(journal.entries[0].tag, "0000_0000_initial_v11");
assert.equal(journal.entries[1].tag, "0001_initial_v11");

console.log("Drizzle artifacts pass structural checks: 16 tables, retained revisions, and a two-step journal. Live database drift remains unverified.");
