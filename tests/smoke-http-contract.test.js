import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { readFile } from "node:fs/promises";

const script = fileURLToPath(new URL("../scripts/smoke-http.mjs", import.meta.url));
const nextConfig = await readFile(new URL("../next.config.js", import.meta.url), "utf8");

function runSmoke(env) {
  return spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: { ...process.env, SMOKE_BASE_URL: "", SMOKE_PROFILE: "", ...env },
  });
}

test("local HTTP smoke refuses non-loopback targets before making requests", () => {
  const result = runSmoke({ SMOKE_PROFILE: "local", SMOKE_BASE_URL: "https://example.invalid" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /only permits loopback hosts/);
});

test("HTTP smoke rejects URLs containing credentials without echoing them", () => {
  const result = runSmoke({ SMOKE_PROFILE: "preview", SMOKE_BASE_URL: "https://private-user:secret-value@example.invalid" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /must not contain credentials/);
  assert.doesNotMatch(result.stderr, /private-user|secret-value/);
});

test("HTTP smoke rejects unsupported profiles before making requests", () => {
  const result = runSmoke({ SMOKE_PROFILE: "other", SMOKE_BASE_URL: "http://localhost:3000" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /must be preview or local/);
});

test("global Next.js headers harden pages and static assets", () => {
  assert.match(nextConfig, /source:\s*["']\/:path\*["']/);
  assert.match(nextConfig, /X-Content-Type-Options["']?,\s*value:\s*["']nosniff/);
  assert.match(nextConfig, /X-Frame-Options["']?,\s*value:\s*["']DENY/);
  assert.match(nextConfig, /Referrer-Policy["']?,\s*value:\s*["']strict-origin-when-cross-origin/);
  assert.match(nextConfig, /Permissions-Policy["']?,\s*value:\s*["']camera=\(\), microphone=\(\), geolocation=\(\)/);
  assert.match(nextConfig, /source:\s*["']\/api\/:path\*["'][\s\S]*?Cache-Control["']?,\s*value:\s*["']no-store/);
  assert.match(nextConfig, /source:\s*["']\/editor\/:path\*["'][\s\S]*?Cache-Control["']?,\s*value:\s*["']no-store/);
});
