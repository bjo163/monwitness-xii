import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { getDrizzleCliGuardError } from "../lib/database-target.js";

const script = fileURLToPath(new URL("../scripts/drizzle-safe.mjs", import.meta.url));
const stampBaselineScript = fileURLToPath(new URL("../scripts/stamp-baseline.mjs", import.meta.url));
const drizzleCli = fileURLToPath(new URL("../node_modules/drizzle-kit/bin.cjs", import.meta.url));
const safeEnvironment = {
  ...process.env,
  DATABASE_URL: "postgresql://owner:do-not-print@ep-dev.example.neon.tech/neondb?sslmode=require",
};
const run = (operation = "migrate", overrides = {}) => spawnSync(process.execPath, [script, operation], {
  encoding: "utf8",
  env: { ...safeEnvironment, ...overrides },
});
const runBaselineStamp = (overrides = {}) => spawnSync(process.execPath, [stampBaselineScript], {
  encoding: "utf8",
  env: { ...safeEnvironment, ...overrides },
});

test("npm migration command routes through its guard and refuses a missing URL", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.scripts["db:migrate"], "node scripts/drizzle-safe.mjs migrate");
  assert.equal(packageJson.scripts["db:stamp-baseline"], "node scripts/stamp-baseline.mjs");
  assert.equal(packageJson.scripts["db:studio"], "node scripts/drizzle-safe.mjs studio");
  const result = run("migrate", { DATABASE_URL: "" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /DATABASE_URL missing; Drizzle migrate not run/);

  const missingBranchConfirmation = runBaselineStamp({
    CONFIRM_BASELINE_STAMP: "",
    CONFIRM_DATABASE_MIGRATION: "YES",
  });
  assert.equal(missingBranchConfirmation.status, 2);
  assert.match(missingBranchConfirmation.stderr, /CONFIRM_BASELINE_STAMP.*exact development branch ID/);
  assert.doesNotMatch(missingBranchConfirmation.stderr, /do-not-print|ep-dev/);

  const wrongBranchConfirmation = runBaselineStamp({
    CONFIRM_BASELINE_STAMP: "br-dark-sea-b5iws5uf",
    CONFIRM_DATABASE_MIGRATION: "YES",
  });
  assert.equal(wrongBranchConfirmation.status, 2);
  assert.match(wrongBranchConfirmation.stderr, /CONFIRM_BASELINE_STAMP.*exact development branch ID/);

  const missingMigrationConfirmation = runBaselineStamp({
    CONFIRM_BASELINE_STAMP: "br-green-butterfly-b51kp4b1",
    CONFIRM_DATABASE_MIGRATION: "",
    EXPECTED_DATABASE_HOST: "ep-dev.example.neon.tech",
    EXPECTED_DATABASE_NAME: "neondb",
  });
  assert.equal(missingMigrationConfirmation.status, 2);
  assert.match(missingMigrationConfirmation.stderr, /CONFIRM_DATABASE_MIGRATION=YES.*baseline stamp not run/);
  assert.doesNotMatch(missingMigrationConfirmation.stderr, /do-not-print|ep-dev|neondb/);
});

test("migration command requires independently supplied host and database", () => {
  const result = run("migrate", {
    EXPECTED_DATABASE_HOST: "",
    EXPECTED_DATABASE_NAME: "",
    CONFIRM_DATABASE_MIGRATION: "YES",
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Expected database host and name are required/);
  assert.doesNotMatch(result.stderr, /do-not-print|ep-dev|neondb/);
});

test("migration command rejects target mismatches before starting Drizzle", () => {
  const result = run("migrate", {
    EXPECTED_DATABASE_HOST: "ep-prod.example.neon.tech",
    EXPECTED_DATABASE_NAME: "neondb",
    CONFIRM_DATABASE_MIGRATION: "YES",
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /host does not match/);
  assert.doesNotMatch(result.stderr, /do-not-print|ep-dev|ep-prod|neondb/);
});

test("migration command rejects driver connection and startup environment overrides before starting Drizzle", () => {
  const result = run("migrate", {
    DATABASE_URL: "postgresql://owner:do-not-print@ep-dev.example.neon.tech/neondb?host=ep-prod.example.neon.tech&sslmode=require",
    EXPECTED_DATABASE_HOST: "ep-dev.example.neon.tech",
    EXPECTED_DATABASE_NAME: "neondb",
    CONFIRM_DATABASE_MIGRATION: "YES",
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /must not override connection identity through query parameters/);
  assert.doesNotMatch(result.stderr, /do-not-print|ep-dev|ep-prod|neondb/);

  for (const [overrides, expectedMessage] of [
    [{ PGPORT: "5433" }, /standard PostgreSQL port 5432/],
    [{ PGOPTIONS: "-c search_path=untrusted" }, /PGOPTIONS must be unset/],
    [{ PGREPLICATION: "replication-target-marker" }, /PGREPLICATION must be unset/],
  ]) {
    const guardedResult = run("migrate", {
      EXPECTED_DATABASE_HOST: "ep-dev.example.neon.tech",
      EXPECTED_DATABASE_NAME: "neondb",
      CONFIRM_DATABASE_MIGRATION: "YES",
      ...overrides,
    });
    assert.equal(guardedResult.status, 2);
    assert.match(guardedResult.stderr, expectedMessage);
    assert.doesNotMatch(guardedResult.stderr, /do-not-print|ep-dev|neondb|untrusted|replication-target-marker/);
  }
});

test("migration command requires explicit operator confirmation after target validation", () => {
  const result = run("migrate", {
    EXPECTED_DATABASE_HOST: "ep-dev.example.neon.tech",
    EXPECTED_DATABASE_NAME: "neondb",
    CONFIRM_DATABASE_MIGRATION: "",
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /CONFIRM_DATABASE_MIGRATION=YES/);
  assert.doesNotMatch(result.stderr, /do-not-print|ep-dev|neondb/);
});

test("direct Drizzle CLI migration also rejects an unapproved target before connecting", () => {
  const localOnlyUrl = "postgresql://local-only:do-not-print@127.0.0.1:5432/moonwitness_local";
  const result = spawnSync(process.execPath, [drizzleCli, "migrate"], {
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: localOnlyUrl,
      EXPECTED_DATABASE_HOST: "unrelated.invalid",
      EXPECTED_DATABASE_NAME: "moonwitness_local",
      CONFIRM_DATABASE_MIGRATION: "YES",
    },
    timeout: 15000,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL host does not match EXPECTED_DATABASE_HOST; Drizzle migrate not run/);
  assert.doesNotMatch(result.stderr, /local-only|do-not-print|127\.0\.0\.1|moonwitness_local/);
});

test("direct Drizzle CLI migration rejects target, TLS override, and TLS downgrade URLs", () => {
  for (const [DATABASE_URL, expectedMessage] of [
    ["postgresql://role:do-not-print@ep-dev.example.neon.tech/neondb?host=ep-prod.example.neon.tech&sslmode=require", /must not override connection identity through query parameters/],
    ["postgresql://role:do-not-print@ep-dev.example.neon.tech/neondb?sslrootcert=untrusted-path&sslmode=require", /must not override TLS configuration through query parameters/],
    ["postgresql://role:do-not-print@ep-dev.example.neon.tech/neondb?sslmode=disable", /must specify exactly one TLS-required sslmode/],
  ]) {
    const result = spawnSync(process.execPath, [drizzleCli, "migrate"], {
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL,
        EXPECTED_DATABASE_HOST: "ep-dev.example.neon.tech",
        EXPECTED_DATABASE_NAME: "neondb",
        CONFIRM_DATABASE_MIGRATION: "YES",
      },
      timeout: 15000,
    });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 1);
    assert.match(result.stderr, expectedMessage);
    assert.doesNotMatch(result.stderr, /do-not-print|ep-dev|ep-prod|neondb/);
  }
});

test("direct Drizzle introspection rejects an unapproved target before connecting", () => {
  const localOnlyUrl = "postgresql://local-only:do-not-print@127.0.0.1:5432/moonwitness_local";
  const result = spawnSync(process.execPath, [drizzleCli, "introspect"], {
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: localOnlyUrl,
      EXPECTED_DATABASE_HOST: "unrelated.invalid",
      EXPECTED_DATABASE_NAME: "moonwitness_local",
      CONFIRM_DATABASE_INTROSPECTION: "YES",
    },
    timeout: 15000,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL host does not match EXPECTED_DATABASE_HOST; Drizzle introspect not run/);
  assert.doesNotMatch(result.stderr, /local-only|do-not-print|127\.0\.0\.1|moonwitness_local/);
});

test("direct Drizzle Studio rejects listener overrides before opening a listener", () => {
  for (const studioOption of [
    ["--host", "0.0.0.0"],
    ["--port=4984"],
  ]) {
    const result = spawnSync(process.execPath, [drizzleCli, "studio", ...studioOption], {
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL: "postgresql://owner:do-not-print@127.0.0.1:1/moonwitness_local?sslmode=require",
        EXPECTED_DATABASE_HOST: "127.0.0.1",
        EXPECTED_DATABASE_NAME: "moonwitness_local",
        CONFIRM_DATABASE_STUDIO: "YES",
      },
      timeout: 15000,
    });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Drizzle CLI (connection overrides|options) are disabled/);
    assert.doesNotMatch(result.stderr, /do-not-print|moonwitness_local/);
    assert.doesNotMatch(result.stdout, /Studio is up and running|https?:\/\//);
  }
});

test("Drizzle config rejects command-line database credential overrides", () => {
  const localOnlyUrl = "postgresql://local-only:do-not-print@127.0.0.1:1/moonwitness_local";
  const error = getDrizzleCliGuardError({
    args: ["migrate", "--url=postgresql://override:do-not-print@127.0.0.1:1/other_database"],
    env: {
      DATABASE_URL: localOnlyUrl,
      EXPECTED_DATABASE_HOST: "127.0.0.1",
      EXPECTED_DATABASE_NAME: "moonwitness_local",
      CONFIRM_DATABASE_MIGRATION: "YES",
    },
  });
  assert.match(error, /Drizzle CLI connection overrides are disabled/);
  assert.doesNotMatch(error, /local-only|override:|do-not-print|127\.0\.0\.1|moonwitness_local|other_database/);
});

test("Drizzle config rejects alternate config paths before loading them", () => {
  const localOnlyUrl = "postgresql://local-only:do-not-print@127.0.0.1:1/moonwitness_local";
  for (const args of [
    ["migrate", "--config=./untrusted.config.js"],
    ["migrate", "--config", "./untrusted.config.js"],
  ]) {
    const error = getDrizzleCliGuardError({
      args,
      env: {
        DATABASE_URL: localOnlyUrl,
        EXPECTED_DATABASE_HOST: "127.0.0.1",
        EXPECTED_DATABASE_NAME: "moonwitness_local",
        CONFIRM_DATABASE_MIGRATION: "YES",
      },
    });
    assert.match(error, /Drizzle CLI config overrides are disabled/);
    assert.doesNotMatch(error, /local-only|do-not-print|127\.0\.0\.1|moonwitness_local|untrusted/);
  }
});

test("guarded npm migration rejects --config before loading the alternate config", () => {
  const temporaryDirectory = "mw-v11-drizzle-config-does-not-exist";
  const result = spawnSync(process.execPath, [script, "migrate", "--config", temporaryDirectory], {
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: "postgresql://local-only:do-not-print@127.0.0.1:5432/moonwitness_local",
      EXPECTED_DATABASE_HOST: "127.0.0.1",
      EXPECTED_DATABASE_NAME: "moonwitness_local",
      CONFIRM_DATABASE_MIGRATION: "YES",
    },
    timeout: 15000,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Drizzle CLI config overrides are disabled/);
  assert.doesNotMatch(result.stderr, /Cannot find module|mw-v11-drizzle-config-does-not-exist|do-not-print|local-only/);
});

test("guarded npm migration rejects unrecognized CLI arguments instead of forwarding them", () => {
  const result = spawnSync(process.execPath, [script, "migrate", "--no-interaction"], {
    encoding: "utf8",
    env: { ...safeEnvironment },
    timeout: 15000,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Guarded Drizzle commands do not accept CLI arguments/);
});

test("direct schema push is disabled in favor of reviewed SQL migrations", () => {
  const result = spawnSync(process.execPath, [drizzleCli, "push"], {
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: "" },
    timeout: 5000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Direct drizzle-kit push is disabled/);
  assert.doesNotMatch(result.stderr, /DATABASE_URL|do-not-print|postgresql:\/\//);
});

test("database studio requires its own explicit confirmation", () => {
  const result = run("studio", {
    EXPECTED_DATABASE_HOST: "ep-dev.example.neon.tech",
    EXPECTED_DATABASE_NAME: "neondb",
    CONFIRM_DATABASE_STUDIO: "",
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /CONFIRM_DATABASE_STUDIO=YES/);
  assert.doesNotMatch(result.stderr, /do-not-print|ep-dev|neondb/);
});
