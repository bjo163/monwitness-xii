import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseHealthHandler } from "../lib/database-health-handler.js";

const savedEnvironment = Object.fromEntries(["DATABASE_URL", "EXPECTED_DATABASE_HOST", "EXPECTED_DATABASE_NAME"]
  .map((key) => [key, process.env[key]]));

test.after(() => {
  for (const [key, value] of Object.entries(savedEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
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

test("database readiness fails closed without a matching independent target mapping", async () => {
  const errors = [];
  let databaseLoads = 0;
  const GET = createDatabaseHealthHandler({
    getDatabase: () => { databaseLoads += 1; throw new Error("must not load an unverified target"); },
    probeDatabase: async () => {},
    logger: { error: (...args) => errors.push(args) },
  });

  for (const target of [
    { EXPECTED_DATABASE_HOST: "", EXPECTED_DATABASE_NAME: "" },
    { EXPECTED_DATABASE_HOST: "another-host.invalid", EXPECTED_DATABASE_NAME: "moonwitness" },
  ]) {
    process.env.DATABASE_URL = "postgresql://probe:probe@local-test.invalid/moonwitness?sslmode=require";
    process.env.EXPECTED_DATABASE_HOST = target.EXPECTED_DATABASE_HOST;
    process.env.EXPECTED_DATABASE_NAME = target.EXPECTED_DATABASE_NAME;
    const response = await GET();

    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { status: "error", database: "unavailable" });
  }

  assert.equal(databaseLoads, 0);
  assert.deepEqual(errors, []);
});

test("database readiness reports connectivity without asserting an unverified environment", async () => {
  process.env.DATABASE_URL = "postgresql://probe:probe@local-test.invalid/moonwitness?sslmode=require";
  process.env.EXPECTED_DATABASE_HOST = "local-test.invalid";
  process.env.EXPECTED_DATABASE_NAME = "moonwitness";
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
  process.env.DATABASE_URL = "postgresql://probe:probe@local-test.invalid/moonwitness?sslmode=require";
  process.env.EXPECTED_DATABASE_HOST = "local-test.invalid";
  process.env.EXPECTED_DATABASE_NAME = "moonwitness";
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
