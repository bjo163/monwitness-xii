import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const script = fileURLToPath(new URL("../scripts/migrate-safe.mjs", import.meta.url));
const safeEnvironment = {
  ...process.env,
  DATABASE_URL: "postgresql://owner:do-not-print@ep-dev.example.neon.tech/neondb?sslmode=require",
};
const run = (overrides = {}) => spawnSync(process.execPath, [script], {
  encoding: "utf8",
  env: { ...safeEnvironment, ...overrides },
});

test("npm migration command routes through its guard and refuses a missing URL", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.scripts["db:migrate"], "node scripts/migrate-safe.mjs");
  const result = run({ DATABASE_URL: "" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /DATABASE_URL missing; migration not run/);
});

test("migration command requires independently supplied host and database", () => {
  const result = run({
    EXPECTED_DATABASE_HOST: "",
    EXPECTED_DATABASE_NAME: "",
    CONFIRM_DATABASE_MIGRATION: "YES",
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Expected database host and name are required/);
  assert.doesNotMatch(result.stderr, /do-not-print|ep-dev|neondb/);
});

test("migration command rejects target mismatches before starting Drizzle", () => {
  const result = run({
    EXPECTED_DATABASE_HOST: "ep-prod.example.neon.tech",
    EXPECTED_DATABASE_NAME: "neondb",
    CONFIRM_DATABASE_MIGRATION: "YES",
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /host does not match/);
  assert.doesNotMatch(result.stderr, /do-not-print|ep-dev|ep-prod|neondb/);
});

test("migration command requires explicit operator confirmation after target validation", () => {
  const result = run({
    EXPECTED_DATABASE_HOST: "ep-dev.example.neon.tech",
    EXPECTED_DATABASE_NAME: "neondb",
    CONFIRM_DATABASE_MIGRATION: "",
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /CONFIRM_DATABASE_MIGRATION=YES/);
  assert.doesNotMatch(result.stderr, /do-not-print|ep-dev|neondb/);
});
