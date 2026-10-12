import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";

const script = fileURLToPath(new URL("../scripts/smoke-http.mjs", import.meta.url));
const nextConfig = await readFile(new URL("../next.config.js", import.meta.url), "utf8");
const qualityWorkflow = await readFile(new URL("../.github/workflows/quality.yml", import.meta.url), "utf8");
const dependabotConfig = await readFile(new URL("../.github/dependabot.yml", import.meta.url), "utf8");
const smokeScript = await readFile(new URL("../scripts/smoke-http.mjs", import.meta.url), "utf8");
const editorLoginPage = await readFile(new URL("../app/editor/login/page.jsx", import.meta.url), "utf8");
const editorLoginView = await readFile(new URL("../app/editor/login/view.jsx", import.meta.url), "utf8");
const archivePage = await readFile(new URL("../app/episodes/page.jsx", import.meta.url), "utf8");
const handoverPage = await readFile(new URL("../app/handover/page.jsx", import.meta.url), "utf8");
const handoverDoc = await readFile(new URL("../docs/HANDOVER_V11.md", import.meta.url), "utf8");
const implementationChecklist = await readFile(new URL("../docs/GRAND_MASTER_PLAN_IMPLEMENTATION_CHECKLIST.md", import.meta.url), "utf8");
const releaseGatesDoc = await readFile(new URL("../docs/RELEASE_GATES_V11.md", import.meta.url), "utf8");
const finalizationPlan = await readFile(new URL("../docs/FINALIZATION_V11_RELEASE_PLAN.md", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const proxySource = await readFile(new URL("../proxy.js", import.meta.url), "utf8");
const rootLayout = await readFile(new URL("../app/layout.jsx", import.meta.url), "utf8");
const testsDirectory = new URL(".", import.meta.url);

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
  assert.match(handoverPage, /99 \/ 99/);
  assert.match(handoverPage, /Current checkout · Node 26\.5\.0/);
  assert.match(handoverPage, /clean Node 22\.23\.3 snapshot passed install, 95\/95 tests/);
  assert.match(handoverPage, /current checkout exercises the actual editor draft\/revision handlers against PGlite and passes 99\/99 tests, build, and loopback smoke 32\/32/);
  assert.match(handoverPage, /Local Auth returns a signed-out session and editor denial/);
  assert.match(handoverPage, /All ten prompt modules are mapped to local evidence/);
  assert.match(handoverPage, /Daily snapshots with 30-day retention are unavailable/);
  assert.match(handoverPage, /All 15 entries remain source-needed/);
  assert.doesNotMatch(handoverPage, /Preview is live|Latest branch CI/);
  assert.match(smokeScript, /"\/handover",\(r,b,t\)=>r\.status===200&&t\.includes\("LOCAL REVIEW • NO-GO FOR PRODUCTION"\)/);
  const uiGateIds = [...handoverPage.matchAll(/\{ id: "([A-Z]{2,4}-\d{2})", title:/g)].map((match) => match[1]);
  const docGateRows = [...releaseGatesDoc.matchAll(/^\| ([A-Z]{2,4}-\d{2}) \|.*\| OPEN \|/gm)].map((match) => match[1]);
  assert.deepEqual(uiGateIds, ["SEC-01", "AUTH-01", "AUTH-02", "DB-02", "DB-03", "ARC-01", "REL-01", "PLAN-01"]);
  assert.deepEqual(docGateRows, uiGateIds, "release gate register must match the dashboard and keep each gate open");
  const implementationTasks = implementationChecklist.split(/\r?\n/).filter((line) => /^\| [A-Z][A-Z0-9-]*-\d{2} \|/.exec(line));
  const implementationTaskIds = implementationTasks.map((line) => line.split("|")[1].trim());
  assert.ok(implementationTasks.length >= 24, "prompt and release gaps must remain in the implementation tracker");
  assert.equal(new Set(implementationTaskIds).size, implementationTaskIds.length, "implementation task IDs must be unique");
  for (const line of implementationTasks) {
    const columns = line.split("|").slice(1, -1).map((value) => value.trim());
    assert.equal(columns.length, 10, `implementation task must include all ten required fields: ${line}`);
    assert.ok(/^\[x\] DONE$|^\[ \] (IN PROGRESS|BLOCKED|TODO)$/.exec(columns[4]), `invalid task status: ${columns[4]}`);
  }
  assert.match(implementationChecklist, /Implementation-task IDs in this tracker are separate from the gate IDs/);
  assert.match(implementationChecklist, /\| MOD-MIZ-01 \| Semantic Research \/ Mizan/);
  assert.match(implementationChecklist, /\| MOD-CAB-01 \| CAB Mission Control/);
  assert.match(handoverDoc, /^### Current local review update/m);
  assert.match(implementationChecklist, /Historical local-only code checkpoint.*`7ec6752`; superseded by the current checkpoint/);
  assert.match(finalizationPlan, /dated planning snapshot.*do not mean the current release gates are closed/);
  assert.match(finalizationPlan, /Production remains \*\*NO-GO\*\* until those current gates are verified/);
  assert.match(releaseGatesDoc, /Current handover page at `http:\/\/127\.0\.0\.1:3036\/handover`/);
  assert.doesNotMatch(releaseGatesDoc, /127\.0\.0\.1:30(?:20|35)\/handover/);
});

test("handover automated-test metric matches the declared Node test suite size", async () => {
  const testFiles = (await readdir(testsDirectory)).filter((file) => file.endsWith(".test.js"));
  const testSources = await Promise.all(testFiles.map((file) => readFile(new URL(file, testsDirectory), "utf8")));
  const declaredTests = testSources.reduce((total, source) => total + (source.match(/\btest\(/g) ?? []).length, 0);
  const dashboardCount = Number(handoverPage.match(/value: "(\d+) \/ \d+", label: "automated tests"/)?.[1]);
  assert.ok(Number.isFinite(dashboardCount), "handover must declare its automated-test count");
  assert.equal(dashboardCount, declaredTests, "dashboard count must follow the actual declared test suite");
});

test("README local visual and smoke instructions do not claim a session-specific server is running", () => {
  assert.match(readme, /Local visual routes after starting the app/);
  assert.match(readme, /If port 3000 is occupied, choose an available port/);
  assert.match(readme, /Local pages do not imply a Preview or production deployment/);
  assert.match(readme, /Do not pass a custom `--config` to a direct Drizzle command/);
  assert.match(readme, /that file is outside the repository's default-config guard/);
  assert.doesNotMatch(readme, /\]\(https?:\/\/(?:127\.0\.0\.1|localhost):\d+|are running/);
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
