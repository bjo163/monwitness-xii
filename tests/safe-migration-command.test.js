import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { getDrizzleCliGuardError } from "../lib/database-target.js";

const script = fileURLToPath(new URL("../scripts/drizzle-safe.mjs", import.meta.url));
const drizzleCli = fileURLToPath(new URL("../node_modules/drizzle-kit/bin.cjs", import.meta.url));
const safeEnvironment = {
  ...process.env,
  DATABASE_URL: "postgresql://owner:do-not-print@ep-dev.example.neon.tech/neondb?sslmode=require",
};
const run = (operation = "migrate", overrides = {}) => spawnSync(process.execPath, [script, operation], {
  encoding: "utf8",
  env: { ...safeEnvironment, ...overrides },
});

test("npm migration command routes through its guard and refuses a missing URL", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.scripts["db:migrate"], "node scripts/drizzle-safe.mjs migrate");
  assert.equal(packageJson.scripts["db:studio"], "node scripts/drizzle-safe.mjs studio");
  const result = run("migrate", { DATABASE_URL: "" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /DATABASE_URL missing; Drizzle migrate not run/);
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
    timeout: 5000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL host does not match EXPECTED_DATABASE_HOST; Drizzle migrate not run/);
  assert.doesNotMatch(result.stderr, /local-only|do-not-print|127\.0\.0\.1|moonwitness_local/);
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
    timeout: 5000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL host does not match EXPECTED_DATABASE_HOST; Drizzle introspect not run/);
  assert.doesNotMatch(result.stderr, /local-only|do-not-print|127\.0\.0\.1|moonwitness_local/);
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
