import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { readFile } from "node:fs/promises";

const script = fileURLToPath(new URL("../scripts/smoke-http.mjs", import.meta.url));
const nextConfig = await readFile(new URL("../next.config.js", import.meta.url), "utf8");
const smokeScript = await readFile(new URL("../scripts/smoke-http.mjs", import.meta.url), "utf8");
const editorLoginPage = await readFile(new URL("../app/editor/login/page.jsx", import.meta.url), "utf8");
const archivePage = await readFile(new URL("../app/episodes/page.jsx", import.meta.url), "utf8");

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
  assert.match(nextConfig, /const noStoreHeaders = \[\{ key: ["']Cache-Control["'], value: ["']no-store["'] \}\]/);
  assert.match(nextConfig, /source:\s*["']\/api\/:path\*["'][\s\S]*?headers:\s*noStoreHeaders/);
  assert.match(nextConfig, /source:\s*["']\/editor\/:path\*["'][\s\S]*?headers:\s*noStoreHeaders/);
  assert.match(editorLoginPage, /export const dynamic\s*=\s*["']force-dynamic["']/);
  assert.match(smokeScript, /\/editor\/login",\(r\)=>r\.status===200&&r\.headers\.get\("cache-control"\)==="no-store"/);
  assert.match(archivePage, /PUBLIC EDITORIAL INDEX/);
  assert.doesNotMatch(archivePage, /DEVELOPMENT VAULT/);
  assert.match(smokeScript, /\/episodes",\(r,b,t\)=>r\.status===200&&t\.includes\("PUBLIC EDITORIAL INDEX"\)&&t\.includes\(PUBLIC_ARCHIVE_NOTICE\)/);
  assert.match(nextConfig, /Content-Security-Policy/);
  assert.match(nextConfig, /process\.env\.NODE_ENV === "production"/);
  assert.match(nextConfig, /fonts\.googleapis\.com/);
  assert.match(nextConfig, /fonts\.gstatic\.com/);
  assert.match(smokeScript, /SMOKE_EXPECT_CSP/);
  assert.doesNotMatch(nextConfig, /unsafe-eval/);
});

test("local and Preview smoke enforce per-route Neon Auth methods", () => {
  assert.equal((smokeScript.match(/api\/auth\/get-session",\(r\)=>r\.status===405&&r\.headers\.get\("allow"\)==="GET","POST"/g) ?? []).length, 2);
  assert.equal((smokeScript.match(/api\/auth\/sign-in\/email",\(r\)=>r\.status===405&&r\.headers\.get\("allow"\)==="POST"/g) ?? []).length, 2);
});
