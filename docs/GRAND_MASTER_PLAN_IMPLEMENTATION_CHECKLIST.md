# MoonWitness XII V11 — Grand Master Plan implementation checklist

**Updated:** 2026-10-11 (Asia/Jakarta)  
**Branch:** `dev`  
**Release decision:** NO-GO for production promotion.  
**Evidence policy:** DONE requires implementation plus recorded verification. “Verified” in older handover material is historical evidence and is not a substitute for rerunning checks on this checkout.

## Source documents and scope

The repository contains the V11 handover, finalization release plan, V11.1 fast-track checklist, release gates, and engineering fast-track report. A separate Grand Master Plan V11 or V11.2 narrative/checklist is not present in this checkout. GitHub Issue #3 and PR #2 are linked from the README, but their current state has not been queried in this run. Do not reconstruct missing narrative or mark its scope complete by inference.

## Foundation and release gates

| Task ID | Module | Description | Priority | Status | Dependencies | Implementation evidence | Verification evidence | Related commit | Remaining risks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FND-01 | Repository | Clone exact repository and work on `dev` | P0 | [x] DONE | None | Clean clone at `X:\REPO\monwitness-xii`; branch `dev` | Initial `dev...origin/dev`, clean status, HEAD `c03e977` | None known |
| FND-02 | Runtime | Install dependencies and establish clean build | P0 | [x] DONE | FND-01 | `npm install --no-audit --no-fund` | `npm run build` passed on Node v26.5.0 / npm 11.17.0 | Local-only | CI uses Node 22; rerun there |
| FND-03 | QA | Restore portable test command and verify existing unit suite | P0 | [x] DONE | FND-02 | `package.json` now uses Node's native `--test` runner | `npm test` passed: 10 tests | Local changes | Route-level and database integration tests remain unimplemented |
| FND-04 | QA | Exercise HTTP contract and expected archive count | P0 | [ ] IN PROGRESS | Authorized preview URL and access | `scripts/smoke-http.mjs` checks health, 15 rows, slug shape, POST-only method; local Next runtime was exercised without DB credentials | Local routes: DB endpoints 503 and editor writes 503 as configured; authorized preview not tested | Local changes | Preview protection and dev data still unverified |
| FND-05 | CI | Confirm GitHub Actions green on current `dev` | P0 | [ ] TODO | Push/CI access | `.github/workflows/quality.yml` | Latest check on prior remote SHA `c03e977` was green; current local SHA has not been pushed or checked | N/A | New local commit still needs CI evidence |

## Story Archive, identity, and data integrity

| Task ID | Module | Description | Priority | Status | Dependencies | Implementation evidence | Verification evidence | Related commit | Remaining risks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ARC-01 | Story Archive | Public endpoints return published metadata only | P0 | [ ] TODO | Development DB / preview | `app/api/episodes/*`; local public behavior needs DB integration | No current runtime response or DB result | N/A | Public endpoint behavior not E2E verified |
| ARC-02 | Story Archive | Real editor sessions, role authorization, actor attribution, and secure writes | P0 | [ ] BLOCKED | Approved identity provider and security design | Existing bearer gate intentionally fails closed; see `lib/editor-auth.js` | Shared auth unit tests pass; route-level session/role tests do not exist | N/A | Do not configure shared bearer token as user authentication |
| ARC-03 | Story Archive | Verify atomic draft + immutable revision + audit and append-only revisions | P0 | [ ] IN PROGRESS | Isolated disposable Neon development branch and real auth | Revision handler serializes allocation by locking the parent story row; stories with revisions cannot be deleted (`ON DELETE RESTRICT`) | SQL contract review only; no database execution; actor attribution remains missing | Local changes | Requires DB concurrency test before enabling writes |
| DB-01 | Database | Verify schema inventory and align all Drizzle tables/indexes/FKs | P0 | [ ] BLOCKED | Confirmed development-only `DATABASE_URL` | `db/schema.js`; read-only `scripts/verify-schema.mjs` | Not run; no DB credentials available in this checkout | N/A | Live schema drift unknown |
| DB-02 | Database | Generate reproducible migrations and rehearse apply/rollback on disposable branch | P0 | [ ] IN PROGRESS | DB-01; disposable DB | `drizzle/` has initial 16-table migration plus revision-retention migration; `npm run db:check` regenerates into an isolated temp folder | Deterministic generation check passed locally; apply/rollback not run | Local changes | Compare with live schema before any apply; baseline may overlap deployed tables |
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
- After changes: `npm test` passed 10/10; `npm run build` passed; `git diff --check` passed.
- GitHub Issue #3 remains open; PR #2 remains open and `mergeable: false`. Latest remote Actions `verify` run on the older remote commit passed, but this local commit has no remote CI result yet.
- No development/production database connection or protected preview request is configured locally. No secrets were read/changed; no migration apply or deployment was run.
