import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { readFile } from "node:fs/promises";

const script = fileURLToPath(new URL("../scripts/smoke-http.mjs", import.meta.url));
const nextConfig = await readFile(new URL("../next.config.js", import.meta.url), "utf8");
const qualityWorkflow = await readFile(new URL("../.github/workflows/quality.yml", import.meta.url), "utf8");
const dependabotConfig = await readFile(new URL("../.github/dependabot.yml", import.meta.url), "utf8");
const smokeScript = await readFile(new URL("../scripts/smoke-http.mjs", import.meta.url), "utf8");
const editorLoginPage = await readFile(new URL("../app/editor/login/page.jsx", import.meta.url), "utf8");
const editorLoginView = await readFile(new URL("../app/editor/login/view.jsx", import.meta.url), "utf8");
const archivePage = await readFile(new URL("../app/episodes/page.jsx", import.meta.url), "utf8");
const handoverPage = await readFile(new URL("../app/handover/page.jsx", import.meta.url), "utf8");
const proxySource = await readFile(new URL("../proxy.js", import.meta.url), "utf8");
const rootLayout = await readFile(new URL("../app/layout.jsx", import.meta.url), "utf8");

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
  assert.match(smokeScript, /\/editor\/login",\(r,b,t\)=>r\.status===200&&r\.headers\.get\("cache-control"\)==="no-store"&&hasStrictPageCsp\(r,b,t\)/);
  assert.match(archivePage, /PUBLIC EDITORIAL INDEX/);
  assert.doesNotMatch(archivePage, /DEVELOPMENT VAULT/);
  assert.match(smokeScript, /\/episodes",\(r,b,t\)=>r\.status===200&&t\.includes\("PUBLIC EDITORIAL INDEX"\)&&t\.includes\(PUBLIC_ARCHIVE_NOTICE\)/);
  assert.doesNotMatch(nextConfig, /Content-Security-Policy|unsafe-inline|process\.env\.NODE_ENV/);
  assert.match(smokeScript, /SMOKE_EXPECT_CSP/);
  assert.match(proxySource, /crypto\.randomUUID\(\)/);
  assert.match(proxySource, /source:\s*["']\/\(\(\?!api\|_next\/static\|_next\/image\|favicon\.ico\|characters\/\)\.\*\)["']/);
  assert.match(proxySource, /script-src 'self' 'nonce-\$\{nonce\}' 'strict-dynamic'/);
  assert.match(proxySource, /fonts\.googleapis\.com/);
  assert.match(proxySource, /fonts\.gstatic\.com/);
  assert.match(proxySource, /style-src 'self' 'nonce-\$\{nonce\}' https:\/\/fonts\.googleapis\.com/);
  assert.doesNotMatch(proxySource, /(?:script|style)-src[^,]*unsafe-inline/);
  assert.match(rootLayout, /dynamic\s*=\s*["']force-dynamic["']/);
  assert.match(smokeScript, /function hasStrictPageCsp/);
  assert.match(smokeScript, /scriptNonce!==styleNonce/);
  assert.match(smokeScript, /scriptPolicy\.includes\("'strict-dynamic'"\)/);
  assert.equal((smokeScript.match(/api\/health",\(r,b\)=>r\.status===200&&r\.headers\.get\("content-security-policy"\)===null/g) ?? []).length, 2);
  assert.match(smokeScript, /content-security-policy"\)===null&&r\.headers\.get\("content-type"/);
  assert.match(smokeScript, /styleBlocks\.every/);
  assert.match(smokeScript, /style-src\[\^;\]\*'unsafe-inline'/);
  assert.equal((smokeScript.match(/\/episodes\/tick-tock-on-the-clock",\(r,b,t\)=>r\.status===200&&hasStrictPageCsp/g) ?? []).length, 2);
  assert.match(smokeScript, /checkFreshPageNonce\("\/"\)/);
  assert.match(smokeScript, /scripts\.every/);
  assert.match(handoverPage, /Every HTML page receives a fresh script CSP nonce/);
  assert.match(handoverPage, /nonce-only script and style policies/);
  assert.doesNotMatch(nextConfig, /unsafe-eval/);
});

test("editor login explains owner provisioning and all editor-access requirements", () => {
  assert.match(editorLoginView, /owner-provisioned account/);
  assert.match(editorLoginView, /Neon Auth administrator role/);
  assert.match(editorLoginView, /server-side editor allowlist/);
  assert.match(editorLoginView, /Provider registration is managed separately/);
  assert.match(editorLoginView, /getEditorLoginAccessDecision/);
  assert.match(editorLoginView, /role:data\?\.role,canEdit:data\?\.canEdit/);
});

test("local and Preview smoke enforce per-route Neon Auth methods", () => {
  assert.equal((smokeScript.match(/api\/auth\/get-session",\(r\)=>r\.status===405&&r\.headers\.get\("allow"\)==="GET","POST"/g) ?? []).length, 2);
  assert.equal((smokeScript.match(/api\/auth\/sign-in\/email",\(r\)=>r\.status===405&&r\.headers\.get\("allow"\)==="POST"/g) ?? []).length, 2);
});

test("local and Preview smoke verify that the Auth token route rejects signed-out requests", () => {
  assert.equal((smokeScript.match(/api\/auth\/token",\(r,b\)=>r\.headers\.get\("cache-control"\)==="no-store"&&\(\(r\.status===401\)\|\|\(r\.status===503&&b\?\.error==="Authentication is not configured"\)\)\)/g) ?? []).length, 2);
});

test("local and Preview smoke enforce route-specific OPTIONS and HEAD behavior", () => {
  assert.equal((smokeScript.match(/api\/auth\/sign-in\/email",\(r\)=>r\.status===204&&r\.headers\.get\("allow"\)==="POST","OPTIONS"/g) ?? []).length, 2);
  assert.equal((smokeScript.match(/api\/auth\/get-session",\(r\)=>r\.status===405&&r\.headers\.get\("allow"\)==="GET","HEAD"/g) ?? []).length, 2);
});

test("local smoke checks public Archive detail projection and invalid-slug handling", () => {
  assert.match(smokeScript, /api\/episodes\/tick-tock-on-the-clock",\(r,b\)=>r\.headers\.get\("cache-control"\)==="no-store"&&\(\(r\.status===200&&b\?\.episode\?\.slug==="tick-tock-on-the-clock"&&b\?\.notice===PUBLIC_ARCHIVE_NOTICE&&JSON\.stringify\(Object\.keys\(b\.episode\)\.sort\(\)\)===JSON\.stringify\(\["experienceType","season","slug","synopsis","title"\]\)\)\|\|\(r\.status===503&&b\?\.error==="Archive unavailable"\)\)\)/);
  assert.match(smokeScript, /api\/episodes\/INVALID%21",\(r,b\)=>r\.status===400&&r\.headers\.get\("cache-control"\)==="no-store"&&b\?\.error==="Invalid slug"/);
});

test("local handover reports current local evidence and keeps production NO-GO", () => {
  assert.match(handoverPage, /LOCAL REVIEW • NO-GO FOR PRODUCTION/);
  assert.match(handoverPage, /95 \/ 95/);
  assert.match(handoverPage, /Daily snapshots with 30-day retention are unavailable/);
  assert.match(handoverPage, /All 15 entries remain source-needed/);
  assert.doesNotMatch(handoverPage, /Preview is live|Latest branch CI/);
  assert.match(smokeScript, /"\/handover",\(r,b,t\)=>r\.status===200&&t\.includes\("LOCAL REVIEW • NO-GO FOR PRODUCTION"\)/);
});

test("CI actions stay pinned to full SHAs and Dependabot tracks action updates", () => {
  const actionReferences = [...qualityWorkflow.matchAll(/^\s*- uses:\s*(\S+)/gm)].map((match) => match[1]);
  assert.ok(actionReferences.length > 0);
  for (const reference of actionReferences) {
    assert.match(reference, /^[^@]+@[a-f0-9]{40}$/, `${reference} must use a full commit SHA`);
  }
  assert.match(dependabotConfig, /package-ecosystem:\s*github-actions/);
  assert.match(dependabotConfig, /interval:\s*weekly/);
});
