import assert from "node:assert/strict";
import { test } from "node:test";
import { validateCookieConfig } from "@neondatabase/auth/server";
import { getNeonAuthConfig, SESSION_DATA_CACHE_TTL_SECONDS } from "../lib/auth-config.js";

test("Neon Auth session-data cache uses the explicit 60-second revocation bound", () => {
  const config = getNeonAuthConfig({
    NEON_AUTH_BASE_URL: "https://auth.example.test",
    NEON_AUTH_COOKIE_SECRET: "test-only-secret-with-at-least-32-characters",
  });
  assert.equal(SESSION_DATA_CACHE_TTL_SECONDS, 60);
  assert.equal(config.cookies.sessionDataTtl, 60);
  assert.equal(config.baseUrl, "https://auth.example.test");
  validateCookieConfig(config.cookies);
});

test("Neon Auth configuration does not accept an empty cookie secret", () => {
  const config = getNeonAuthConfig({
    NEON_AUTH_BASE_URL: "https://auth.example.test",
    NEON_AUTH_COOKIE_SECRET: "",
  });
  assert.throws(() => validateCookieConfig(config.cookies), /secret/i);
});
