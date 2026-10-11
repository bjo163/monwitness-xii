# MoonWitness XII V11 — Grand Master Plan implementation checklist

**Updated:** 2026-10-11 (Asia/Jakarta)  
**Branch:** `codex/v11-release-readiness` (review branch targeting `dev`)  
**Release decision:** NO-GO for production promotion.  
**Evidence policy:** DONE requires implementation plus recorded verification. “Verified” in older handover material is historical evidence and is not a substitute for rerunning checks on this checkout.

## Source documents and scope

The repository contains the V11 handover, finalization release plan, V11.1 fast-track checklist, release gates, and engineering fast-track report. A separate Grand Master Plan V11 or V11.2 narrative/checklist is not present in this checkout. GitHub Issue #3 remains open and PR #2 remains open/unmergeable as verified during this run. Do not reconstruct missing narrative or mark its scope complete by inference.

## Foundation and release gates

| Task ID | Module | Description | Priority | Status | Dependencies | Implementation evidence | Verification evidence | Related commit | Remaining risks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FND-01 | Repository | Clone exact repository and work on `dev` | P0 | [x] DONE | None | Clean clone at `X:\REPO\monwitness-xii`; branch `dev` | Initial `dev...origin/dev`, clean status, HEAD `c03e977` | None known |
| FND-02 | Runtime | Install dependencies and establish clean build | P0 | [x] DONE | FND-01 | `npm install --no-audit --no-fund` | `npm run build` passed on Node v26.5.0 / npm 11.17.0 | Local-only | CI uses Node 22; rerun there |
| FND-03 | QA | Restore portable test command and verify existing unit suite | P0 | [x] DONE | FND-02 | `package.json` now uses Node's native `--test` runner | `npm test` passed: 10 tests | Local changes | Route-level and database integration tests remain unimplemented |
| FND-04 | QA | Exercise HTTP contract and expected archive count | P0 | [x] DONE | Authorized preview URL and access | `scripts/smoke-http.mjs` checks health, 15 rows, slug shape, POST-only method | Protected preview on SHA `4e72818`: health 200/connected; list 200/15 entries; known slug 200; editor GET 405 | `4e72818` | Preview uses development config only; editor POST authorization still needs runtime checks |
| FND-05 | CI | Confirm GitHub Actions green on current review branch | P0 | [x] DONE | Push/CI access | `.github/workflows/quality.yml` uses lockfile-based `npm ci`, PR checks target `dev`/`main`, and production dependency auditing | Run 38150146407 on SHA `598fdd9` completed success; includes locked install, 21 tests, production audit, and build | `598fdd9` | Future source changes require their own CI run |

## Story Archive, identity, and data integrity

| Task ID | Module | Description | Priority | Status | Dependencies | Implementation evidence | Verification evidence | Related commit | Remaining risks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ARC-01 | Story Archive | Public endpoints return published metadata only | P0 | [ ] TODO | Development DB / preview | `app/api/episodes/*`; local public behavior needs DB integration | No current runtime response or DB result | N/A | Public endpoint behavior not E2E verified |
| ARC-02 | Story Archive | Real editor sessions, role authorization, actor attribution, and secure writes | P0 | [ ] BLOCKED | Approved identity provider and security design | Existing bearer gate intentionally fails closed; bounded body parser added | Shared auth and body-validation tests pass; session/role tests do not exist | Local changes | Do not configure shared bearer token as user authentication; rate limiting needs trusted shared storage/edge policy |
| ARC-03 | Story Archive | Verify atomic draft + immutable revision + audit and append-only revisions | P0 | [ ] IN PROGRESS | Isolated disposable Neon development branch and real auth | Draft/revision plus audit insertions use one SQL statement; revision allocation locks the parent row as a best-effort guard; uniqueness conflicts return 409 for retry; source retention FK policy is `RESTRICT`; editor bodies are capped at 256 KiB | Live dev currently has 15 stories, 0 revisions, 0 audits; FK is `ON DELETE CASCADE`; local SQL contract tests cover future policy, not DB execution | Current review work | Requires disposable-branch migration and concurrent write tests before enabling writes |
| DB-01 | Database | Verify schema inventory and align all Drizzle tables/indexes/FKs | P0 | [ ] IN PROGRESS | Neon development project access | Read-only comparison against the snapshot: 16/16 tables, 109/109 columns including type/nullability/defaults; indexes and 21 PK/unique constraints semantically present. The full comparison logic is implemented in `scripts/verify-schema.mjs` | 14/15 FKs match; sole drift is `archive.story_revisions` (`CASCADE` live, `RESTRICT` target). Two Drizzle unique indexes appear as unique constraints live; several unique-constraint names differ while semantics match. Dev data: 15 published, 0 drafts/revisions/audits; the verifier script itself was not run from shell due missing `DATABASE_URL` | Current review branch | Rehearse FK correction and resolve initial migration baseline/ledger; production branch mapping remains unverified |
| DB-02 | Database | Generate reproducible migrations and rehearse apply/rollback on disposable branch | P0 | [ ] BLOCKED | DB-01; explicit disposable migration branch | `drizzle/` contains initial 9-schema/16-table baseline plus retention alteration; `npm run db:check` validates structure and FK migration SQL against live constraint name | Local structural check passes; do not apply baseline to existing dev branch because its schemas already exist and migration ledger has not been baselined | Current review work | Need approved baseline strategy and disposable migration rehearsal; no production migration |
| DB-03 | Database | Verify backups and restoration | P1 | [ ] BLOCKED | Neon operator access and isolated restore target | Procedures described in `docs/HANDOVER_V11.md` | No backup or restore rehearsal evidence | N/A | Recovery time/data loss unknown |

## Frontend, content, and governance

| Task ID | Module | Description | Priority | Status | Dependencies | Implementation evidence | Verification evidence | Related commit | Remaining risks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UX-01 | Frontend | Homepage, archive, and handover pages build | P1 | [x] DONE | FND-01 | Existing Next.js pages | `npm run build` passed locally | Local changes | Responsive and accessibility review remains |
| CNT-01 | Story Archive | Preserve originals, provenance, rights, and source context | P1 | [ ] TODO | Source material, rights review | Existing editorial indexes are identified as `source_needed` in docs | No original ingestion/review evidence | N/A | 15 indexes are not full manuscripts |
| GOV-01 | Grand Plan | Preserve missing V11/V11.2 narrative and track tasks without inventing content | P1 | [x] DONE | Documentation inventory | This checklist records the missing-source gap; source docs remain untouched | Repository docs inventory performed | Local changes | Retrieve authoritative missing documents before claiming full plan coverage |
| GOV-02 | Release | Resolve PR #2, complete release gates, and approve production promotion | P0 | [ ] BLOCKED | CI green, security, DB, content, rollback evidence, owner approval | Existing docs say PR #2 has conflicts | Not queried or modified | N/A | Production remains NO-GO |

## This checkout verification log

- Baseline: `npm install --no-audit --no-fund` completed; Node v26.5.0; npm 11.17.0.
- Baseline test command failed because `--experimental-default-type=module` is not accepted by Node 26. The native runner `node --test tests/*.test.js` passed the original 10 tests.
- After changes: `npm test` passed 18/18; `npm run db:check` passed; `npm run build` passed; `git diff --check` passed.
- GitHub Issue #3 remains open; PR #2 remains open and `mergeable: false`. Actions run 38150146407 passed for SHA `598fdd9` (locked install, 21 tests, production audit, production build).
- Security remediation: Drizzle ORM is 0.45.4; Next's PostCSS resolves to 8.5.29. `npm audit --omit=dev` passes with zero production vulnerabilities. Full `npm audit` still reports four moderate findings tied to the dev-only Drizzle Kit `@esbuild-kit` / esbuild 0.18.20 chain; npm's suggested Drizzle Kit downgrade is breaking and was not applied.
- Post-upgrade local verification: `npm test` passes 21/21; `npm run db:check`, `npm run build`, and `git diff --check` pass. GitHub Actions run 38150146407 passed for SHA `598fdd9`.
- Authenticated preview verified health 200, list 200/15, known slug 200, editor GET 405 on the review deployment for `f128776`. The local shell has no DB credentials; no migration apply or production deployment was run.
