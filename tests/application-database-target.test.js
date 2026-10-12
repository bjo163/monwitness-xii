import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getApplicationDatabaseTargetError,
  getApplicationDatabaseUrl,
  isApplicationDatabaseConfigured,
} from "../lib/database-target.js";

const verified = {
  DATABASE_URL: "postgresql://role:secret@ep-dev.example.neon.tech/neondb?sslmode=require",
  EXPECTED_DATABASE_HOST: "ep-dev.example.neon.tech",
  EXPECTED_DATABASE_NAME: "neondb",
};

test("application database access requires matching independently supplied target values", () => {
  assert.equal(isApplicationDatabaseConfigured(verified), true);
  assert.equal(getApplicationDatabaseTargetError(verified), null);
  assert.equal(getApplicationDatabaseUrl(verified), verified.DATABASE_URL);

  // PostgreSQL URLs are case-insensitive for host names, while database names
  // remain exact after URL decoding.
  const hostCase = {
    ...verified,
    DATABASE_URL: "postgresql://role:secret@EP-DEV.EXAMPLE.NEON.TECH/moon%2Ddev?sslmode=require",
    EXPECTED_DATABASE_HOST: "ep-dev.example.neon.tech",
    EXPECTED_DATABASE_NAME: "moon-dev",
  };
  assert.equal(getApplicationDatabaseTargetError(hostCase), null);

  assert.equal(getApplicationDatabaseTargetError({
    ...verified,
    DATABASE_URL: "postgresql://role:secret@ep-dev.example.neon.tech:5432/neondb?sslmode=require",
  }), null);
  assert.match(getApplicationDatabaseTargetError({
    ...verified,
    DATABASE_URL: "postgresql://role:secret@ep-dev.example.neon.tech:5433/neondb?sslmode=require",
  }), /standard PostgreSQL port 5432/);

  const malformedDatabaseEncoding = {
    ...verified,
    DATABASE_URL: "postgresql://role:secret@ep-dev.example.neon.tech/moon%2Gdev?sslmode=require",
  };
  assert.match(getApplicationDatabaseTargetError(malformedDatabaseEncoding), /invalid database name/);
  assert.match(getApplicationDatabaseTargetError({
    ...verified,
    DATABASE_URL: "https://ep-dev.example.neon.tech/neondb",
  }), /must identify a PostgreSQL host and database/);
  assert.match(getApplicationDatabaseTargetError({
    ...verified,
    EXPECTED_DATABASE_HOST: "   ",
  }), /host does not match/);

  const missingHost = { ...verified, EXPECTED_DATABASE_HOST: "" };
  assert.equal(isApplicationDatabaseConfigured(missingHost), false);
  assert.match(getApplicationDatabaseTargetError(missingHost), /Expected database host and name are required/);
  assert.throws(() => getApplicationDatabaseUrl(missingHost), /target is not verified/);

  const wrongHost = { ...verified, EXPECTED_DATABASE_HOST: "ep-prod.example.neon.tech" };
  assert.equal(isApplicationDatabaseConfigured(wrongHost), false);
  assert.match(getApplicationDatabaseTargetError(wrongHost), /host does not match/);
  assert.throws(() => getApplicationDatabaseUrl(wrongHost), /target is not verified/);

  const wrongDatabase = { ...verified, EXPECTED_DATABASE_NAME: "production" };
  assert.equal(isApplicationDatabaseConfigured(wrongDatabase), false);
  assert.match(getApplicationDatabaseTargetError(wrongDatabase), /database does not match/);
  assert.throws(() => getApplicationDatabaseUrl(wrongDatabase), /target is not verified/);
  const messages = [missingHost, wrongHost, wrongDatabase]
    .map((env) => getApplicationDatabaseTargetError(env)).join(" ");
  assert.doesNotMatch(messages, /secret|ep-dev|ep-prod|neondb|production/);
});

test("all runtime Neon entrypoints use the verified database target guard", async () => {
  const [client, drafts, revisions, verifier] = await Promise.all([
    readFile(new URL("../db/client.js", import.meta.url), "utf8"),
    readFile(new URL("../app/api/editor/drafts/route.js", import.meta.url), "utf8"),
    readFile(new URL("../app/api/editor/revisions/route.js", import.meta.url), "utf8"),
    readFile(new URL("../scripts/verify-schema.mjs", import.meta.url), "utf8"),
  ]);

  assert.match(client, /neon\(getApplicationDatabaseUrl\(\)\)/);
  assert.match(drafts, /neon\(getApplicationDatabaseUrl\(\)\)/);
  assert.match(revisions, /neon\(getApplicationDatabaseUrl\(\)\)/);
  assert.match(verifier, /requireExpected:\s*true/);
});
