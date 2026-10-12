import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseHealthHandler } from "../lib/database-health-handler.js";

const savedDatabaseUrl = process.env.DATABASE_URL;

test.after(() => {
  if (savedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedDatabaseUrl;
});

test("unconfigured database readiness stays unavailable without logging a connection failure", async () => {
  delete process.env.DATABASE_URL;
  let databaseLoads = 0;
  const errors = [];
  const GET = createDatabaseHealthHandler({
    getDatabase: () => { databaseLoads += 1; throw new Error("must not load without configuration"); },
    probeDatabase: async () => {},
    logger: { error: (...args) => errors.push(args) },
  });

  const response = await GET();

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { status: "error", database: "unavailable" });
  assert.equal(databaseLoads, 0);
  assert.deepEqual(errors, []);
});

test("database readiness reports connectivity without asserting an unverified environment", async () => {
  process.env.DATABASE_URL = "postgresql://local-test.invalid/moonwitness";
  const errors = [];
  const GET = createDatabaseHealthHandler({
    getDatabase: () => ({ connected: true }),
    probeDatabase: async () => ({ rows: [{ healthy: 1 }] }),
    logger: { error: (...args) => errors.push(args) },
  });

  const response = await GET();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { status: "ok", database: "connected" });
  assert.deepEqual(errors, []);
});

test("configured database failures log only their error class and return a safe response", async () => {
  process.env.DATABASE_URL = "postgresql://local-test.invalid/moonwitness";
  const errors = [];
  const GET = createDatabaseHealthHandler({
    getDatabase: () => ({ connected: true }),
    probeDatabase: async () => { throw new Error("private connection detail"); },
    logger: { error: (...args) => errors.push(args) },
  });

  const response = await GET();

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { status: "error", database: "unavailable" });
  assert.deepEqual(errors, [["MoonWitness DB probe failed", "Error"]]);
  assert.doesNotMatch(JSON.stringify(errors), /private connection detail|local-test/);
});
