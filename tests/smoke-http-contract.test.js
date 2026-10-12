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
const handoverStyles = await readFile(new URL("../app/handover/handover.module.css", import.meta.url), "utf8");
const handoverDoc = await readFile(new URL("../docs/HANDOVER_V11.md", import.meta.url), "utf8");
const implementationChecklist = await readFile(new URL("../docs/GRAND_MASTER_PLAN_IMPLEMENTATION_CHECKLIST.md", import.meta.url), "utf8");
const releaseGatesDoc = await readFile(new URL("../docs/RELEASE_GATES_V11.md", import.meta.url), "utf8");
const migrationReconciliationDoc = await readFile(new URL("../docs/MIGRATION_LEDGER_RECONCILIATION_V11.md", import.meta.url), "utf8");
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
  assert.equal(smokeScript.split('await check("/editor",').length - 1, 2, "both local and Preview profiles must verify anonymous editor denial");
});

test("local and Preview smoke enforce route-specific OPTIONS and HEAD behavior", () => {
  assert.equal((smokeScript.match(/api\/auth\/sign-in\/email",\(r\)=>r\.status===204&&r\.headers\.get\("allow"\)==="POST","OPTIONS"/g) ?? []).length, 2);
  assert.equal((smokeScript.match(/api\/auth\/get-session",\(r\)=>r\.status===405&&r\.headers\.get\("allow"\)==="GET","HEAD"/g) ?? []).length, 2);
});

test("local smoke checks public Archive detail projection and invalid-slug handling", () => {
  assert.match(smokeScript, /api\/episodes\/tick-tock-on-the-clock",\(r,b\)=>r\.headers\.get\("cache-control"\)==="no-store"&&\(\(r\.status===200&&b\?\.episode\?\.slug==="tick-tock-on-the-clock"&&b\?\.notice===PUBLIC_ARCHIVE_NOTICE&&JSON\.stringify\(Object\.keys\(b\.episode\)\.sort\(\)\)===JSON\.stringify\(\["experienceType","season","slug","synopsis","title"\]\)\)\|\|\(r\.status===503&&b\?\.error==="Archive unavailable"\)\)\)/);
  assert.match(smokeScript, /api\/episodes\/INVALID%21",\(r,b\)=>r\.status===400&&r\.headers\.get\("cache-control"\)==="no-store"&&b\?\.error==="Invalid slug"/);
});

test("local smoke checks editor write responses are not cacheable", () => {
  assert.match(smokeScript, /api\/editor\/drafts",\(r\)=>\[401,503\]\.includes\(r\.status\)&&r\.headers\.get\("cache-control"\)==="no-store","POST"/);
  assert.match(smokeScript, /await check\("\/api\/auth\/sign-in\/email",\(r,b\)=>r\.status===403&&b\?\.error==="Cross-origin authentication request rejected","POST"\)/);
  assert.match(smokeScript, /origin:"https:\/\/attacker\.example"/);
  assert.match(smokeScript, /origin:parsedBase\.origin,"sec-fetch-site":"cross-site"/);
  assert.match(smokeScript, /for\(const fetchSite of \["same-site","none","unknown"\]\)/);
  assert.match(smokeScript, /headers:\{\.\.\.headers,\.\.\.extraHeaders\}/);
});

test("local handover reports current local evidence and keeps production NO-GO", () => {
  assert.match(handoverPage, /LOCAL REVIEW • NO-GO FOR PRODUCTION/);
  assert.match(handoverPage, /129 \/ 129/);
  assert.match(smokeScript, /t\.includes\("129 \/ 129"\)/);
  assert.match(handoverPage, /40 \/ 40/);
  assert.match(handoverPage, /Latest run · Node 26\.5\.0/);
  assert.match(handoverPage, /draft and revision writes share a database quota, and every handler response is no-store/);
  assert.match(handoverPage, /Earlier clean Node 22\.23\.3 snapshots at commits 6a88a4b and 9d054ff passed their recorded workflow checks/);
  assert.match(handoverPage, /Fresh exact tracked-tree reproduction at commit 2f43d14 passed 125\/125 tests, migration replay, full npm audit \(0 vulnerabilities\), actionlint, production build, and CSP-required loopback smoke 34\/34 on Node 26\.5\.0 \/ npm 11\.17\.0 after a clean 239-package install/);
  assert.match(handoverPage, /draft and revision writes share one actor quota and editor write responses use `Cache-Control: no-store`/);
  assert.match(handoverPage, /Local Auth returns a signed-out session and editor denial/);
  assert.match(handoverPage, /review Neon Auth SDK peer compatibility/);
  assert.match(handoverPage, /effective failed-login throttling is unverified\. This SDK cannot configure a provider-wide limiter/);
  assert.match(handoverPage, /npm ls reports invalid peer versions inside the Neon Auth SDK transitive UI bundle/);
  assert.match(handoverPage, /All ten prompt modules are mapped to local evidence/);
  assert.match(releaseGatesDoc, /current app proxy has no sign-in attempt limiter; the PostgreSQL quota protects editor draft\/revision writes only/);
  assert.match(releaseGatesDoc, /installed `@neondatabase\/auth@0\.5\.0-beta` `NeonAuthConfig` exposes `baseUrl`, cookie settings, and logging; it has no `rateLimit` or `customRules` option/);
  assert.match(handoverPage, /Daily snapshots with 30-day retention are unavailable/);
  assert.match(handoverPage, /The Neon rehearsal covers migrations 0000–0002 only\. Review and rehearse 0003\/0004 on an isolated clone/);
  assert.match(handoverPage, /The freeze runbook requires an independently verified provider\/application write stop before destructive recovery/);
  assert.match(handoverPage, /All 15 entries remain source-needed/);
  assert.match(handoverPage, /Schema verification detects untracked RLS, CHECK, policy, and trigger drift/);
  assert.match(handoverStyles, /@media\(max-width:620px\)\{[\s\S]*?\.nav\{grid-column:1\/-1;display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(handoverStyles, /\.heroLinks\{display:grid;grid-template-columns:minmax\(0,1fr\);\}/);
  assert.match(handoverStyles, /\.statusCard\{width:100%;max-width:100%;margin:0;padding:18px 16px;transform:none;\}/);
  assert.doesNotMatch(handoverPage, /Preview is live|Latest branch CI/);
  assert.match(smokeScript, /"\/handover",\(r,b,t\)=>r\.status===200&&t\.includes\("LOCAL REVIEW • NO-GO FOR PRODUCTION"\)/);
  assert.match(smokeScript, /let smokeChecksTotal=0/);
  assert.match(smokeScript, /let smokeChecksPassed=0/);
  assert.match(smokeScript, /HTTP smoke checks: \$\{smokeChecksPassed\}\/\$\{smokeChecksTotal\} passed/);
  const uiGateIds = [...handoverPage.matchAll(/\{ id: "(G-[A-Z]{2,4}-\d{2})", title:/g)].map((match) => match[1]);
  const docGateRows = [...releaseGatesDoc.matchAll(/^\| (G-[A-Z]{2,4}-\d{2}) \|.*\| OPEN \|/gm)].map((match) => match[1]);
  assert.deepEqual(uiGateIds, ["G-SEC-01", "G-AUTH-01", "G-AUTH-02", "G-DB-02", "G-DB-03", "G-ARC-01", "G-REL-01", "G-PLAN-01"]);
  assert.deepEqual(docGateRows, uiGateIds, "release gate register must match the dashboard and keep each gate open");
  const implementationTasks = implementationChecklist.split(/\r?\n/).filter((line) => /^\| [A-Z][A-Z0-9-]*-\d{2} \|/.exec(line));
  const implementationTaskIds = implementationTasks.map((line) => line.split("|")[1].trim());
  assert.ok(uiGateIds.every((id) => id.startsWith("G-")), "release gates must use their own ID namespace");
  assert.equal(uiGateIds.some((id) => implementationTaskIds.includes(id)), false, "release gate IDs must not collide with implementation task IDs");
  assert.ok(implementationTasks.length >= 24, "prompt and release gaps must remain in the implementation tracker");
  assert.equal(new Set(implementationTaskIds).size, implementationTaskIds.length, "implementation task IDs must be unique");
  for (const line of implementationTasks) {
    const columns = line.split("|").slice(1, -1).map((value) => value.trim());
    assert.equal(columns.length, 10, `implementation task must include all ten required fields: ${line}`);
    assert.ok(/^\[x\] DONE$|^\[ \] (IN PROGRESS|BLOCKED|TODO)$/.exec(columns[4]), `invalid task status: ${columns[4]}`);
  }
  assert.match(implementationChecklist, /Implementation-task IDs in this tracker are separate from the `G-`-prefixed release-gate IDs/);
  const promptCrosswalk = implementationChecklist.split("### Attached master-prompt execution crosswalk")[1]?.split("## Story Archive, identity, and data integrity")[0] ?? "";
  const promptItems = promptCrosswalk.split("|").map((cell) => cell.trim().split(" ")[0]).filter((cell) => cell.startsWith("P3-") || cell.startsWith("DoD-") || cell.startsWith("P7-"));
  assert.equal(promptItems.length, 39);
  assert.equal(new Set(promptItems).size, 39);
  for (let index = 1; index <= 14; index += 1) {
    assert.ok(promptItems.includes(`P3-${String(index).padStart(2, "0")}`));
    assert.ok(promptItems.includes(`DoD-${String(index).padStart(2, "0")}`));
  }
  for (let index = 1; index <= 11; index += 1) assert.ok(promptItems.includes(`P7-${String(index).padStart(2, "0")}`));
  assert.match(promptCrosswalk, /P7-01.*Not delivered to `dev` under the explicit local-only\/no-push instruction/);
  assert.match(promptCrosswalk, /P7-11.*Keep NO-GO until every required gate is verified/);
  assert.match(promptCrosswalk, /P3-07.*isolated Neon rehearsal covers only `0000`–`0002`/s);
  assert.match(promptCrosswalk, /DoD-13.*No current exact-head Preview exists; user explicitly requested no deployment/);
  assert.match(promptCrosswalk, /DoD-14.*Maintain NO-GO until all gates are verified and owner separately approves promotion/);
  assert.match(implementationChecklist, /\| MOD-MIZ-01 \| Semantic Research \/ Mizan/);
  assert.match(implementationChecklist, /\| MOD-CAB-01 \| CAB Mission Control/);
  assert.match(implementationChecklist, /^\| DB-02 \| Database \|.*\| \[ \] IN PROGRESS \|.*`0003`\/`0004`/m);
  assert.match(releaseGatesDoc, /isolated Neon rehearsal proves migrations `0000`–`0002` only.*not been applied to any database or Neon-rehearsed/);
  assert.match(releaseGatesDoc, /separate populated-fixture PGlite test automatically executes the reviewed reverse-DDL sequence.*not published downgrade scripts/);
  assert.match(handoverDoc, /^### Earlier local implementation checkpoint — 2026-10-12 \(superseded by the current local-only follow-up above\)/m);
  assert.doesNotMatch(handoverDoc, /^### Current local review update/m);
  assert.match(implementationChecklist, /Historical local-only code checkpoint.*`7ec6752`; superseded by the current checkpoint/);
  assert.match(finalizationPlan, /dated planning snapshot.*do not mean the current release gates are closed/);
  assert.match(finalizationPlan, /Production remains \*\*NO-GO\*\* until those current gates are verified/);
  assert.match(releaseGatesDoc, /Historical local visual checkpoint .* handover page at `http:\/\/127\.0\.0\.1:3054\/handover`/);
  assert.match(releaseGatesDoc, /Prior local checkpoint — superseded by the verification above/);
  assert.match(releaseGatesDoc, /At checkpoint commit `81f8fe8`, the suite passed 125\/125 tests and CSP-required HTTP smoke 34\/34 on Node 26\.5\.0/);
  assert.match(releaseGatesDoc, /fresh tracked-tree snapshot at `162693b`.*fresh install of 239 locked packages.*Node 26\.5\.0 \/ npm 11\.17\.0/);
  assert.match(releaseGatesDoc, /current local dashboard at `http:\/\/localhost:3199\/handover` reports 129\/129, 40\/40, and all eight gates open/);
  assert.match(implementationChecklist, /offline driver-policy validation only; no configured Neon URL or remote branch was tested/);
  assert.match(releaseGatesDoc, /Editor mutation origin policy:/);
  assert.match(releaseGatesDoc, /PGlite integration calls the actual authorizer and write handler/);
  assert.match(releaseGatesDoc, /without adding a revision, audit event, actor row, or quota reservation/);
  assert.match(releaseGatesDoc, /rejects connection-identity and TLS-configuration query overrides and requires exactly one `sslmode`/);
  assert.match(releaseGatesDoc, /guarded npm wrapper and direct Drizzle CLI paths have offline regression tests proving they stop before connecting/);
  assert.match(handoverDoc, /Editor handler integration confirms rejected origin metadata adds no revision, audit event, actor row, or quota reservation/);
  assert.match(releaseGatesDoc, /Read-only GitHub review recorded PR #4 draft\/open with no reviews at remote head `06e2a119377e46a735714608becf96e095846553`/);
  assert.match(releaseGatesDoc, /local merge-tree simulation reported add\/add conflicts/);
  assert.ok(releaseGatesDoc.includes("in `app/page.jsx`, `app/style.css`, and `package.json`"));
  assert.match(releaseGatesDoc, /existing Neon Auth transitive UI peer conflicts/);
  assert.doesNotMatch(releaseGatesDoc, /127\.0\.0\.1:30(?:20|35|36)\/handover/);
});

test("handover automated-test metric matches the declared Node test suite size", async () => {
  const testFiles = (await readdir(testsDirectory)).filter((file) => file.endsWith(".test.js"));
  const testSources = await Promise.all(testFiles.map((file) => readFile(new URL(file, testsDirectory), "utf8")));
  const declaredTests = testSources.reduce((total, source) => total + (source.match(/\btest\(/g) ?? []).length, 0);
  const dashboardCount = Number(handoverPage.match(/value: "(\d+) \/ \d+", label: "automated tests"/)?.[1]);
  assert.ok(Number.isFinite(dashboardCount), "handover must declare its automated-test count");
  assert.equal(dashboardCount, declaredTests, "dashboard count must follow the actual declared test suite");
});

test("populated development migration runbook accounts for the entire current journal", () => {
  assert.match(migrationReconciliationDoc, /journal now contains migrations `0001` through `0004`/);
  assert.match(migrationReconciliationDoc, /do not stop after applying only `0001`\/`0002`/);
  assert.match(migrationReconciliationDoc, /complete ordered plan for all four migrations/);
  assert.match(migrationReconciliationDoc, /`system\.editor_write_controls` has exactly one global row/);
  assert.match(migrationReconciliationDoc, /`writes_frozen` is `false` after migrations/);
  assert.match(migrationReconciliationDoc, /Local reverse-DDL rehearsal across migrations 0001–0004/);
  assert.match(migrationReconciliationDoc, /15 synthetic published, `source_needed` story indexes and zero revisions/);
  assert.match(migrationReconciliationDoc, /all 19 story rows[\s\S]*15 baseline stories' published[\s\S]*source_needed[\s\S]*statuses remain intact/);
  assert.match(migrationReconciliationDoc, /PGlite reverse-DDL simulation, not a published downgrade command, Drizzle-ledger rollback workflow, or Neon rehearsal/);
  assert.match(migrationReconciliationDoc, /No step in this document grants approval to write/);
});

test("README local visual and smoke instructions do not claim a session-specific server is running", () => {
  assert.match(readme, /Local visual routes after starting the app/);
  assert.match(readme, /If port 3000 is occupied, choose an available port/);
  assert.match(readme, /Local pages do not imply a Preview or production deployment/);
  assert.match(readme, /Do not pass a custom `--config` to a direct Drizzle command/);
  assert.match(readme, /that file is outside the repository's default-config guard/);
  assert.doesNotMatch(readme, /\]\(https?:\/\/(?:127\.0\.0\.1|localhost):\d+|are running/);
});

test("database readiness smoke never treats an app label as proof of the target environment", () => {
  assert.match(smokeScript, /api\/health\/db",\(r,b\)=>r\.status===200&&b\?\.status==="ok"&&b\?\.database==="connected"&&!Object\.hasOwn\(b,"migration"\)/);
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
