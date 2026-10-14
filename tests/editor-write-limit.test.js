import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { reserveEditorWrite } from "../lib/editor-write-limit.js";

const initial = await readFile(new URL("../drizzle/0000_0000_initial_v11.sql", import.meta.url), "utf8");
const retention = await readFile(new URL("../drizzle/0001_initial_v11.sql", import.meta.url), "utf8");
const writeLimits = await readFile(new URL("../drizzle/0002_editor_write_limits.sql", import.meta.url), "utf8");

function taggedQuery(db) {
  return (strings, ...values) => {
    const query = strings.reduce((result, segment, index) => result + segment + (index < values.length ? `$${index + 1}` : ""), "");
    return db.query(query, values).then((result) => result.rows);
  };
}

test("editor write limits enforce one atomic per-actor window and reset after expiry", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(initial);
  await db.exec(retention);
  await db.exec(writeLimits);
  const sql = taggedQuery(db);

  const results = await Promise.all(Array.from({ length: 10 }, () => reserveEditorWrite({ sql, actorId: "admin-1", limit: 3, windowSeconds: 900 })));
  assert.equal(results.filter((result) => result.allowed).length, 3);
  assert.equal(results.filter((result) => !result.allowed).length, 7);
  assert.ok(results.filter((result) => !result.allowed).every((result) => result.retryAfterSeconds >= 1));

  const otherActor = await reserveEditorWrite({ sql, actorId: "admin-2", limit: 3, windowSeconds: 900 });
  assert.equal(otherActor.allowed, true);

  await db.query("UPDATE system.editor_write_limits SET window_started_at=now()-interval '16 minutes' WHERE actor_id=$1", ["admin-1"]);
  const reset = await reserveEditorWrite({ sql, actorId: "admin-1", limit: 3, windowSeconds: 900 });
  assert.equal(reset.allowed, true);
  assert.equal(reset.remaining, 2);

  await assert.rejects(reserveEditorWrite({ sql, actorId: "", limit: 3 }), /actorId is required/);
  await assert.rejects(reserveEditorWrite({ sql, actorId: "admin-1", limit: 0 }), /positive integers/);
});
