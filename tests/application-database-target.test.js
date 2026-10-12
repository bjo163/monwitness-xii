import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Client, parseIntoClientConfig } from "@neondatabase/serverless";
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
  assert.equal(getApplicationDatabaseTargetError({
    ...verified,
    DATABASE_URL: "postgresql://role:secret@ep-dev.example.neon.tech/neondb?sslmode=require&channel_binding=require",
  }), null, "the allowlist retains Neon's documented channel-binding connection string");
  assert.match(getApplicationDatabaseTargetError({
    ...verified,
    DATABASE_URL: "postgresql://role:secret@ep-dev.example.neon.tech/neondb?sslmode=require&channel_binding=disable",
  }), /must not disable PostgreSQL channel binding/);
  assert.match(getApplicationDatabaseTargetError({
    ...verified,
    DATABASE_URL: "postgresql://role:secret@ep-dev.example.neon.tech/neondb?sslmode=require&channel_binding=require&channel_binding=require",
  }), /must not disable PostgreSQL channel binding/);

  const previousPgUser = process.env.PGUSER;
  const previousPgPassword = process.env.PGPASSWORD;
  process.env.PGUSER = "fallback_user";
  process.env.PGPASSWORD = "fallback_password";
  try {
    const clientWithoutUrlCredentials = new Client({ connectionString: "postgresql://ep-dev.example.neon.tech/neondb?sslmode=require" });
    assert.equal(clientWithoutUrlCredentials.user, "fallback_user", "the installed driver falls back to PGUSER when URL credentials are absent");
    assert.equal(clientWithoutUrlCredentials.connectionParameters.password, "fallback_password", "the installed driver falls back to PGPASSWORD when URL credentials are absent");
    clientWithoutUrlCredentials.end();
    assert.match(getApplicationDatabaseTargetError({
      ...verified,
      DATABASE_URL: "postgresql://ep-dev.example.neon.tech/neondb?sslmode=require",
    }), /must include explicit database credentials/);
  } finally {
    if (previousPgUser === undefined) delete process.env.PGUSER;
    else process.env.PGUSER = previousPgUser;
    if (previousPgPassword === undefined) delete process.env.PGPASSWORD;
    else process.env.PGPASSWORD = previousPgPassword;
  }
  assert.match(getApplicationDatabaseTargetError({
    ...verified,
    DATABASE_URL: "postgresql://role:secret@ep-dev.example.neon.tech:5433/neondb?sslmode=require",
  }), /standard PostgreSQL port 5432/);

  const hostOverride = "postgresql://role:secret@ep-dev.example.neon.tech/neondb?host=ep-prod.example.neon.tech&sslmode=require";
  assert.equal(parseIntoClientConfig(hostOverride).host, "ep-prod.example.neon.tech", "the installed PostgreSQL driver honors a host query override");
  const hostOverrideError = getApplicationDatabaseTargetError({ ...verified, DATABASE_URL: hostOverride });
  assert.match(hostOverrideError, /must not override connection identity through query parameters/);
  assert.doesNotMatch(hostOverrideError, /ep-prod/);

  const optionsOverride = "postgresql://role:secret@ep-dev.example.neon.tech/neondb?options=-c%20search_path%3Dpublic&sslmode=require";
  assert.equal(parseIntoClientConfig(optionsOverride).options, "-c search_path=public", "the installed PostgreSQL driver honors startup options in the URL");
  for (const parameter of ["options", "replication", "application_name"]) {
    const value = getApplicationDatabaseTargetError({
      ...verified,
      DATABASE_URL: `postgresql://role:secret@ep-dev.example.neon.tech/neondb?${parameter}=untrusted-value&sslmode=require`,
    });
    assert.match(value, /unsupported query parameters/);
    assert.doesNotMatch(value, /untrusted-value/);
  }

  const urlWithoutPort = "postgresql://role:secret@ep-dev.example.neon.tech/neondb?sslmode=require";
  const previousPgPort = process.env.PGPORT;
  process.env.PGPORT = "5433";
  try {
    const pgPortClient = new Client({ connectionString: urlWithoutPort });
    assert.equal(pgPortClient.port, 5433, "the installed PostgreSQL driver falls back to PGPORT when the URL omits a port");
    pgPortClient.end();
    assert.match(getApplicationDatabaseTargetError({ ...verified, PGPORT: "5433" }), /standard PostgreSQL port 5432/);
  } finally {
    if (previousPgPort === undefined) delete process.env.PGPORT;
    else process.env.PGPORT = previousPgPort;
  }

  const previousPgOptions = process.env.PGOPTIONS;
  process.env.PGOPTIONS = "-c search_path=untrusted";
  try {
    const pgOptionsClient = new Client({ connectionString: urlWithoutPort });
    assert.equal(pgOptionsClient.connectionParameters.options, "-c search_path=untrusted", "the installed PostgreSQL driver honors PGOPTIONS");
    pgOptionsClient.end();
    assert.match(getApplicationDatabaseTargetError({ ...verified, PGOPTIONS: "-c search_path=untrusted" }), /PGOPTIONS must be unset/);
  } finally {
    if (previousPgOptions === undefined) delete process.env.PGOPTIONS;
    else process.env.PGOPTIONS = previousPgOptions;
  }

  const previousPgReplication = process.env.PGREPLICATION;
  process.env.PGREPLICATION = "replication-target-marker";
  try {
    const pgReplicationClient = new Client({ connectionString: urlWithoutPort });
    assert.equal(pgReplicationClient.connectionParameters.replication, "replication-target-marker", "the installed driver honors PGREPLICATION");
    pgReplicationClient.end();
    assert.match(getApplicationDatabaseTargetError({ ...verified, PGREPLICATION: "replication-target-marker" }), /PGREPLICATION must be unset/);
  } finally {
    if (previousPgReplication === undefined) delete process.env.PGREPLICATION;
    else process.env.PGREPLICATION = previousPgReplication;
  }

  for (const parameter of ["hostaddr", "dbname", "ssl", "sslcert", "sslkey", "sslrootcert", "sslpassword", "sslcrl", "sslcrldir"]) {
    const value = getApplicationDatabaseTargetError({
      ...verified,
      DATABASE_URL: `postgresql://role:secret@ep-dev.example.neon.tech/neondb?${parameter}=untrusted-value&sslmode=require`,
    });
    assert.match(value, parameter.startsWith("ssl")
      ? /must not override TLS configuration through query parameters/
      : /must not override connection identity through query parameters/);
    assert.doesNotMatch(value, /untrusted-value/);
  }

  const tlsDisabled = "postgresql://role:secret@ep-dev.example.neon.tech/neondb?sslmode=disable";
  assert.equal(parseIntoClientConfig(tlsDisabled).ssl, false, "the installed PostgreSQL driver honors sslmode=disable");
  for (const unsafeConnectionString of [
    "postgresql://role:secret@ep-dev.example.neon.tech/neondb",
    tlsDisabled,
    "postgresql://role:secret@ep-dev.example.neon.tech/neondb?sslmode=prefer",
    "postgresql://role:secret@ep-dev.example.neon.tech/neondb?sslmode=require&sslmode=disable",
    "postgresql://role:secret@ep-dev.example.neon.tech/neondb?sslmode=require&SSLMODE=disable",
  ]) {
    assert.match(getApplicationDatabaseTargetError({ ...verified, DATABASE_URL: unsafeConnectionString }), /must specify exactly one TLS-required sslmode/);
  }
  for (const secureMode of ["require", "verify-ca", "verify-full"]) {
    assert.equal(getApplicationDatabaseTargetError({
      ...verified,
      DATABASE_URL: `postgresql://role:secret@ep-dev.example.neon.tech/neondb?sslmode=${secureMode}`,
    }), null);
  }

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
