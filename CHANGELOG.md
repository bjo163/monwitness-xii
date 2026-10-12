# Changelog

This file records user-visible and operational changes for MoonWitness XII.

## 2026-10-12 — Migration ledger verification

- Re-ran the full local validation chain at source HEAD `7964c94`: 78/78 tests, migration check, full audit (0 vulnerabilities), workflow lint, production build, and local HTTP smoke 30/30. Persistent Neon and production were not queried or changed.
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
