# Changelog

## 2026-10-12 — Editor session response minimization

- The editor session API now sets `Cache-Control: no-store` on signed-out, authenticated, and unavailable responses. It returns only authentication state, normalized role, and editor eligibility; it does not serialize the session, user ID, email, or tokens.
- Added response-contract tests for signed-out, allowed/disallowed admin, unexpected role, and unavailable-service cases.
- Validation: 91/91 tests, production build, local smoke 32/32; the live local session endpoint returned 401/no-store/`authenticated:false`. Production remains NO-GO.

## 2026-10-12 — Editor write-surface audit

- Added a repository-wide API route contract that identifies data writers, permits only the guarded editor draft/revision POSTs, and checks authorization precedes SQL writes. This prevents a new route from silently bypassing the owner allowlist.
- Validation: 89/89 tests, production build, CSP-required local smoke 32/32. `/editor/login` and `/handover` render their access requirements, 89/89 metric, and production NO-GO. No database, remote CI, push, or deployment action occurred.

## 2026-10-12 — Editor access feedback

- The sign-in page now states all access requirements: owner-provisioned account, Neon Auth `admin` role, and exact user ID in the server-side allowlist. It clarifies that provider registration is separate and alone grants no editor access.
- Login feedback now distinguishes account authorization failures from Auth/session verification service failures; a 5xx response is no longer presented as an account denial.
- Added tests for the decision logic and login guidance. Validation: 88/88 tests, production build, and local HTTP smoke 32/32. Production remains NO-GO.

## 2026-10-12 — Clean snapshot verification

- Exported exact commit `38f1adc` with `git archive` into a temporary directory and installed the lockfile offline (`npm ci`, 239 packages; Node `v26.5.0`, npm `11.17.0`).
- The clean snapshot passed 84/84 tests, `db:check`, production build, and CSP-required HTTP smoke 32/32. The no-secret snapshot correctly returned safe-unconfigured Auth and database responses.
- npm reported peer/deprecation warnings and withheld `core-js` / `esbuild` install scripts under local script-approval policy. This is local Node 26 evidence; remote CI remains on Node 22 and has not run for this commit.

## 2026-10-12 — Migration preflight

- Routed `npm run db:migrate` and `npm run db:studio` through a local fail-closed wrapper that requires a PostgreSQL URL, independently supplied expected host/database, and operation-specific confirmation before invoking Drizzle. Target errors do not reveal DSN values.
- Added regression coverage for missing URL/target, mismatches, and missing confirmation. No database command was executed against a real target.
- Updated the local handover metric to 84/84 after adding Studio guard coverage; release status remains NO-GO.

This file records user-visible and operational changes for MoonWitness XII.

## 2026-10-12 — Local mission-control handover and CSP source of truth

- Reworked `/handover` into a responsive release dashboard with the current NO-GO decision, local verification figures, evidence notes, and eight explicit open gates. Kept all existing character and site artwork unchanged.
- Removed the obsolete global CSP declaration containing `script-src 'unsafe-inline'` from `next.config.js`; the Next.js proxy is now the sole source of per-request nonce policies for HTML pages. Migrated the two remaining JSX style attributes to CSS classes and changed `style-src` to the matching request nonce, without `unsafe-inline`. Smoke confirms the script/style directives share a nonce and API/static responses carry no page CSP.
- Refreshed the dashboard's smoke contract and local-only status. Browser-console review, remote CI, and Preview remain unverified; production remains NO-GO.
- Validation: 79/79 tests, migration generation/replay check, full dependency audit (0 vulnerabilities), actionlint, production build, local HTTP smoke 32/32, and `git diff --check` pass. No push, deployment, or Neon access occurred.

## 2026-10-12 — Site-wide script CSP nonce

- Extended the per-request nonce policy from editor pages to all HTML pages; API routes and static assets are excluded. Local smoke verifies strict script CSP and nonce attributes on all scripts across public routes, plus nonce rotation.
- Next.js build confirmed all routes are now dynamically rendered; root layout opts into request-time rendering so statically optimized pages cannot emit HTML without the request nonce. The selected Vercel Hobby plan includes 1 million invocations and 4 CPU-hours per month, so usage must be monitored before promotion. [Vercel plan limits](https://vercel.com/docs/limits).
- At this earlier script-CSP checkpoint, `style-src` still allowed inline styles; follow-up nonce-based style hardening is recorded above. No push, deployment, or Neon access occurred.
- Validation on `1d703d5`: 79/79 tests, migration replay, full audit (0 vulnerabilities), `actionlint`, production build, and loopback smoke 31/31 pass. This change has no remote CI or Preview result.

## 2026-10-12 — Editor script CSP nonce

- Added a Next.js 16 `proxy.js` boundary for editor pages that generates a unique nonce per request and sets an editor-only strict CSP. Public pages retain their existing rendering and CSP behavior.
- Extended local/Preview smoke to verify the editor login's CSP nonce matches every script tag and changes between requests. The smoke passes 31/31 locally; `npm test` 79/79, migration replay, full audit (0 vulnerabilities), workflow lint, and production build pass across `5d06fdd` + `ed7a1c3`.
- No push, deployment, or Neon access occurred. The Preview and current remote CI do not include this change; production remains NO-GO.

## 2026-10-12 — Grand Plan source inventory

- Rechecked the attached master prompt, local Codex attachments, and nearby project folders for the missing authoritative Grand Master Plan V11/V11.2 files. None were found.
- Recorded the ten module areas exactly as named in the attached prompt and kept GOV-01/SCOPE-01 blocked until the original plan is available; no detailed requirements were inferred.

## 2026-10-12 — Migration ledger verification

- Added a local PGlite data-directory backup/restore regression with synthetic public/private Archive records, revisions, media/evidence, ledger checks, public projection, and the retained-revision FK invariant. It is synthetic engine evidence only and does not close Neon recovery/retention gates.
- Re-ran the full local validation chain for source commit `d626a84`: 79/79 tests, migration check, full audit (0 vulnerabilities), workflow lint, production build, and local HTTP smoke 30/30. Smoke runs at `127.0.0.1:3015`; DB/archive routes return safe unavailable responses without a local database URL. Persistent Neon and production were not queried or changed.
- `db:verify` now checks every Drizzle ledger row against the journal's migration hash and timestamp, in order, including row count; baseline preflight rejects an existing ledger and reports zero expected ledger entries.
- Added contract tests against Drizzle's migration reader and updated migration runbook and README. Persistent development and production databases were not queried or changed; the change is verified locally only.
- Reduced Neon Auth signed session-data cookie caching from the SDK default 300 seconds to an explicit 60 seconds to narrow stale role/session data exposure; live sign-in and revocation remain unverified.
- Extended the PGlite migration integration test to run the ledger verifier against real migrator rows and reject tampered hash/timestamp values and any existing ledger during baseline preflight.

## 2026-10-12 — Local review updates

- Updated local visual links and release handover evidence to the current review app on port 3015; local-only direction remains in force, with no push or deployment.
- Recorded Node 22 clean-snapshot verification and the isolated Neon `0001` constraint rehearsal. Persistent development and production databases remain untouched; production remains NO-GO.
- Clarified that `db:verify` checks schema shape and ledger-table presence, while migration ledger contents and order require a separate query.
- Kept all 15 Story Archive entries `source-needed` pending original source material, credits, and rights evidence.

## 2026-10-12 — Handover evidence reconciliation

### Documentation

- Historical checkpoint at HEAD `293cee5` was reconciled with exact-head CI [38179410407](https://github.com/bjo163/monwitness-xii/actions/runs/38179410407); this predates the current local-only commits and does not cover them.
- Changed the missing Grand Master Plan V11/V11.2 source gap from “done” to blocked pending the authoritative files, and added a blocked module inventory rather than inventing absent requirements.
- Recorded the Vercel Free quota warning and the owner's choice to keep the plan and wait. Git integration produced READY Preview `dpl_HnnQ6MgscYdnHiSTWGM7SwtkZJch` for `d6c884b` without an upgrade; protected public page/API smoke passed while the editor-session route remains inaccessible behind deployment protection.
- The later docs-only Preview attempt for `06e2a11` hit quota. Owner directed local-only continuation with no further push or deploy; the local app remains available at `http://localhost:3000/team`.
- Refreshed local review evidence: 48/48 unit tests, schema/migration consistency, production build, and all 11 loopback HTTP smoke checks pass; `/`, `/team`, and `/episodes` respond 200. The local smoke correctly reports database-backed API endpoints unavailable without a local `DATABASE_URL`.
- Refreshed the Story Archive's local presentation with a clear source-and-rights notice on the archive and detail pages. Each entry's status explains that a published index is not proof of source provenance or reuse permission; local tests cover missing and non-verified statuses.
- Added the same static provenance notice to public archive list/detail API response envelopes, without exposing per-story internal source status or source records.
- Public archive response builders now re-project list/detail rows onto an explicit five-field editorial allowlist. Runtime tests confirm provenance notices and `Cache-Control: no-store` while dropping source status, arbitrary metadata, and revision body fields.
- Standardized `Cache-Control: no-store` on archive API error responses (invalid slug, missing story, and database unavailable), with status/body/header regression coverage.
- Added global anti-framing, MIME-sniffing, referrer, and browser-permissions headers. All `/api/*` and `/editor/*` responses now receive `Cache-Control: no-store`; the local smoke asserts the policy on signed-out Auth and editor session responses.
- Runtime smoke found Next.js static generation overriding the editor login page's configured no-store header. `/editor/login` is now force-dynamic, and local smoke requires no-store on login, signed-out Auth, editor session, and editor API responses.
- The Preview smoke profile now requires no-store on the login page and signed-out Auth/editor session responses too, so an authorized Preview run will enforce the same cache invariant as local smoke.
- Full `npm audit` currently finds zero vulnerabilities across production and development dependencies. CI now audits the complete locked dependency tree rather than excluding dev dependencies.
- Added an operator recovery runbook for write freeze, isolated non-final restore, branch/data validation, approval-gated cutover, and abort/rollback evidence. It explicitly leaves backup gates open because only an empty production database restore has been rehearsed and the requested daily/30-day schedule is unavailable on the selected Free plan.
- Isolated editor-session resolution from the Neon/Next adapter and added fail-closed tests for missing configuration, provider errors/exceptions, signed-out sessions, and the exact admin-role plus user-ID allowlist check.
- Hardened populated-dev schema preflight: baseline mode now requires independently supplied expected host/database values and rejects a DSN mismatch before opening a connection, without printing the DSN.
- Added a production Content Security Policy that restricts scripts, images, connections, frames and objects while allowing only the Google Fonts hosts used by the current design. CSP stays off in dev to preserve Next.js HMR; the production HTTP smoke can require its presence.
- Extracted the public Archive list/detail Drizzle query into shared helpers and added a PGlite integration fixture that executes the exact query against published and draft entries with private revisions, metadata, evidence and media. Only published editorial fields are selected; private draft and source records are excluded.
- Extended GitHub Actions with a post-build loopback HTTP smoke for the homepage, archive/auth safe states, universe pages, character assets, and security/cache headers; `actionlint` validates the workflow locally. CI-equivalent `next start --hostname 127.0.0.1 --port 3002` plus local smoke passed 21/21; this is local simulation, not a remote Actions result.
- Current local review passes 64/64 tests, `npm run db:check`, production build, zero production dependency audit findings, and 21/21 loopback HTTP smoke checks. Smoke includes all five universe pages and HTTP delivery of all five canonical character assets. The archive notice is visible at `http://localhost:3000/episodes`; live story cards and connected API responses still cannot be validated locally because this checkout has no `DATABASE_URL`.
- Full `npm audit` reports zero findings, and all local Auth/editor/login routes are smoke-checked for `Cache-Control: no-store`. A later Archive UI checkpoint below supersedes the local preview port noted here.
- The Archive header now identifies its contents as a “PUBLIC EDITORIAL INDEX” across both database-ready and retry states, removing the misleading fixed “DEVELOPMENT VAULT” label. Local production build on port 3004 passes 22/22 smoke checks, including `/episodes` rendering the public provenance notice while the local database is unavailable. The current page is open at `http://localhost:3004/episodes`.
- This UI update passes `npm test` (64/64), `npm run db:check`, `npm run build`, and the 22-check production loopback smoke with CSP required; remote CI/Preview were not run under the local-only direction.
- Local app code commit `8d16736` and its documentation follow-ups have no CI/Preview result because the owner requested local-only work. A read-only GitHub check confirms PR #4 is still open/draft/unmerged with no reviews; remote PR metadata still points at `06e2a11`. Do not deploy or push this branch.
- A local virtual merge-tree audit found the current `origin/main` + `origin/dev` conflicts (`app/page.jsx`, `app/style.css`, `package.json`). The review branch already contains merge candidate `e5eff67` and has a clean merge-tree with `origin/main`; PR #4 still needs independent review/integration before PR #2 can be rechecked.
- Preserved all 15 Archive entries as `source-needed` until original material, credits, and rights evidence are supplied.
- Restricted each allowlisted Neon Auth endpoint to its SDK-defined method (`get-session`/`token`: GET; `sign-in/email`/`sign-out`: POST). Local regression tests cover mismatched methods, and a fresh production server on port 3005 passed all 22 loopback smoke checks plus direct 405/Allow and denied-signup checks. `npm test` passes 66/66 and `npm run build` passes. The owner requested local-only work; no push or deployment was made.
- Extended both local and Preview HTTP smoke profiles to assert route-specific Auth method handling (`405` plus the exact `Allow` header); smoke-script contract tests enforce coverage in each profile.
- Latest full local checkpoint after those smoke changes: 67/67 tests, `db:check`, production build, full `npm audit` (0 findings), `actionlint`, and 24/24 loopback HTTP smoke checks pass. No remote CI was run because the branch remains local-only.
- A signed-out local `GET /api/auth/token` returns 401 with `Cache-Control: no-store`; local and Preview smoke profiles now enforce this token boundary (or the expected unconfigured-auth 503 for local environments without provider config).
- Latest test/smoke checkpoint at `2904dea`: 68/68 tests and 25/25 production loopback smoke checks pass, including signed-out token denial.
- Runtime inspection found Next.js' generated `OPTIONS` response advertised every method exported by the catch-all route. The Auth route now handles `OPTIONS` itself with only the path's permitted method in `Allow`, and handles `HEAD` explicitly as a rejection before provider access. Local tests pass 70/70; production build passes; loopback smoke passes 27/27, including `OPTIONS` and `HEAD`. Implementation commit: `d581dc3`.
- Local loopback smoke now exercises `/api/episodes/:slug` directly: a database-unavailable detail returns the generic 503/no-store response; malformed slugs return 400/no-store before database access; a connected response must match the exact five-field editorial projection. Latest `npm test` passes 71/71 and local smoke passes 29/29. Current local DB is unavailable, so connected detail behavior remains covered by PGlite query/response tests rather than HTTP against Neon.
- Extracted the detail endpoint into an injectable handler and exercised that same handler with the PGlite migration fixture: a published `source_needed` entry returns exactly five public fields and the provenance notice, draft slugs return 404/no-store, and invalid slugs return 400/no-store without opening the DB. Commit `964a520`; suite remains 71/71, build succeeds, and loopback smoke remains 29/29.
- Full local verification at `964a520`: `npm test` 71/71, `npm run db:check`, production build, `npm audit` (0 findings), `actionlint .github/workflows/quality.yml`, and production loopback smoke 29/29 pass. No current-head GitHub Actions or connected Neon HTTP result exists because changes remain local-only.

### Release state

- PR #4 remains a draft review path and production remains **NO-GO**. No production database, Auth, billing, merge, or deployment action was performed.

## 2026-10-12 — Security and release-readiness continuation

### Follow-up verification

- Hardened the Auth application proxy so denied paths return 404 before auth configuration is checked. Added handler-dispatch tests for blocked signup/admin/unknown paths, unsupported methods, missing configuration, successful allowlisted forwarding, and provider exceptions. Local HTTP smoke returned signup 404 and unsupported-method 405 with `Allow: GET, POST`.
- Review head `b50aae2`: local `npm test` passed 43/43; `npm run db:check`, `npm run build`, and `git diff --check` passed. Exact-head Actions [38176167354](https://github.com/bjo163/monwitness-xii/actions/runs/38176167354) passed all configured jobs: Auth security regression tests, Drizzle migration reproducibility, production dependency audit, and Next.js build.
- Added a local loopback HTTP-smoke profile. It checks the homepage, liveness, archive/DB safe-failure states, Auth/editor signed-out behavior, blocked signup, and unsupported methods without needing a database credential. Local smoke passed all 10 checks; its 503 DB/archive responses correctly reflect absent local `DATABASE_URL`. Preview profile remains strict for a connected database and 15 archive entries. Smoke regression tests reject non-loopback local targets and credential-bearing URLs without echoing secrets.
- Current local suite passes 43/43 and `npm run db:check` passes with the new smoke-profile contract coverage.
- Added a PGlite regression test that invokes Drizzle's official migrator against the complete journal, checks all three ledger entries, confirms the intended revision foreign-key policy, and proves rerunning is idempotent.
- Updated the handover and release tracker for the owner-selected Neon Free plan: daily/30-day backup retention is not met, the schedule is empty, and no private destination has been approved or configured.
- Owner confirmed that all 15 archive entries remain `source-needed` until original materials, credits, and rights evidence are available; no provenance status was promoted.
- Fresh read-only Neon checks confirm 15 published stories with `original_source_status='source_needed'`; media, research evidence, revisions, mapped editor identities, Neon Auth users, and audit events each have 0 rows. Production and development snapshot schedules remain empty. Corrected older handover statements that had described absent editorial/source-verification metadata keys as if they were stored database flags.
- Verification on review head `eb85af7`: `npm test` passed 35/35, `npm run db:check` passed, `npm run build` passed, and `git diff --check` passed. Exact-head Actions run [38175035910](https://github.com/bjo163/monwitness-xii/actions/runs/38175035910) passed all configured jobs.
- PR #4 remains draft/unmerged. Production remains NO-GO; no persistent Neon migration, billing change, or production deployment was made.

### Added

- Atomic per-editor write limiting for draft and revision POST endpoints: 30 writes per 15-minute window, shared across serverless instances through PostgreSQL. Rejections return 429 with `Retry-After`; limiter storage errors fail closed with 503.
- Drizzle migration `0002_editor_write_limits`, backed by PGlite concurrency/window-reset tests and an apply/limit/reset/rollback rehearsal on the approved disposable Neon branch.
- Migration reproducibility validation now replays the complete migration chain in PostgreSQL and compares schemas, tables, columns, indexes, and constraints with a freshly generated Drizzle schema.

### Verification

- `npm test`: 30/30 passed; PGlite concurrently admitted 3 and denied 7 under a test cap of 3, checked actor isolation and expired-window reset.
- `npm run db:check`: passed; replayed migration chain matches the generated current schema.
- `npm run build`: passed; `npm audit --omit=dev`: zero vulnerabilities; `git diff --check`: passed.
- On the isolated Neon rehearsal clone, migration `0002` admitted 30 sequential writes, rejected the next five, reset the expired window and was rolled back. Final check: 15 stories, zero revisions, no limiter table. Persistent dev and production were unchanged.
- Exact-head verification after push: GitHub Actions run [38163817600](https://github.com/bjo163/monwitness-xii/actions/runs/38163817600) passed. Vercel deployment `dpl_AQsA8BZHazBz1Af3WpJi4s6RFoJT` is READY; authorized preview fetch returned homepage, health, DB readiness and archive endpoints as 200. Database migration has not been applied to persistent dev/preview.
- Neon SQL-level concurrency rehearsal: 35 simultaneous atomic upserts for one actor on the approved disposable branch admitted exactly 30 and rejected five; stored count was 30. The test actor and table were removed, leaving 15 stories and zero revisions. Authenticated application-level concurrent writes remain unverified.

### Remaining gates

- The migration has not been applied to persistent development or Preview; live authenticated editor writes and concurrent PostgreSQL transactions remain unverified.
- Production remains **NO-GO**. Admin provisioning, editor-session access through deployment protection, paid Neon backup scheduling, RPO/RTO and representative data restore, MFA-capable identity, provenance/rights review, PR #2 conflict resolution, rollback rehearsal, and owner promotion approval remain open.

## Unreleased — V11 release-readiness review (2026-10-11)

### Added

- Repeatable dependency installation and CI checks using the committed npm lockfile.
- A read-only Drizzle snapshot verifier for tables, columns, defaults, foreign keys, indexes, unique constraints, migration-ledger presence, and archive counts.
- A migration generation check that regenerates the schema baseline into an isolated temporary directory and verifies the committed historical FK transition.
- An in-memory PostgreSQL migration execution test covering fresh baseline, FK retention migration, `RESTRICT` behavior, and rollback to the original `CASCADE` policy.
- Bounded editor JSON request parsing (256 KiB), JSON content-type enforcement, and malformed UTF-8 rejection.
- Automated auth, input-validation, request-body, public-archive, migration-contract, and schema-verifier contract tests.
- A Grand Master Plan implementation checklist and engineering handover record.

### Changed

- Revision retention uses an intended `ON DELETE RESTRICT` policy so source manuscripts cannot be silently removed with revisions.
- Revision number conflicts return HTTP 409 for retry; the row lock is a best-effort guard, not a proof of serializable allocation.
- GitHub Actions now checks pull requests targeting `dev` and `main`.
- Upgrade Drizzle ORM to 0.45.4 and pin Next.js's PostCSS dependency to patched 8.5.29.

### Verification

- Local checks after dependency updates: 24 tests pass; PostgreSQL migration up/down, structural and regeneration checks, and production build pass.
- `npm audit --omit=dev` reports zero production dependency vulnerabilities. Full audit still reports a moderate advisory in Drizzle Kit's development-only `@esbuild-kit` / esbuild 0.18.20 transitive dependency; no compatible fixed Drizzle Kit release is available in the current package range.
- GitHub Actions run [38151254216](https://github.com/bjo163/monwitness-xii/actions/runs/38151254216) passed for SHA `1edf328`, including locked install, 24 tests, migration regeneration check, production dependency audit, and build.
- The PGlite execution test exposed and helped fix a fresh-install defect: the FK migration now drops both the live Neon and Drizzle baseline constraint names. Local apply/rollback passes; Neon branch rehearsal remains pending.
- Read-only development schema comparison: 16/16 tables and 109/109 columns match; one revision foreign-key delete-action drift remains (`CASCADE` live, intended `RESTRICT`).
- Authenticated HTTP smoke on the Vercel preview tied to SHA `8460d24`: DB health 200, published list 200 with 15 records, known slug 200, editor draft GET 405.
- No drafts existed on the development database, so live public-response leakage behavior still needs a draft fixture on a disposable branch.

### Not released / remaining gates

- Changes remain in draft PR #4 targeting `dev`; they are not merged or deployed to production.
- Real editor sessions/RBAC, actor attribution, rate limiting, database write/concurrency tests, migration baseline and disposable-branch rehearsal, and backup/restore verification remain incomplete.
- The production database mapping and source/rights review remain unverified. Production status is **NO-GO**.
