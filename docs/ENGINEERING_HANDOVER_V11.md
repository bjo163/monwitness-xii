# MoonWitness XII V11 — local engineering handover

**Date:** 2026-10-11 (Asia/Jakarta)  
**Branch at start:** `dev`; review work is on `codex/v11-release-readiness`
**Starting commit:** `c03e977`  
**Release decision:** **NO-GO for production promotion.**

## Work completed in this handover pass

- Cloned the requested repository to `X:\REPO\monwitness-xii`; the existing similarly named directories were unrelated repositories and were left unchanged.
- Recorded the baseline: Node v26.5.0 and npm 11.17.0; dependency installation completed; the existing `npm test` command failed because Node 26 rejects `--experimental-default-type=module`; running the original suite via `node --test tests/*.test.js` passed all 10 tests; `npm run build` passed.
- Updated the test script to use the portable native Node test runner. Auth, input validation, body limits, and SQL contract checks total 18 automated tests; live DB transaction tests still need an isolated Neon harness.
- Added `.gitignore` entries for local dependencies, Next.js build artifacts, coverage, and local environment files. Dependency directories and `.next` output are not part of the handover.
- Added `package-lock.json` for repeatable installs.
- Hardened `scripts/smoke-http.mjs`: validate the base URL, report network/JSON errors, assert the expected 15-entry archive, check the known slug response, and verify the write route is POST-only.
- Added an initial Drizzle migration for 16 tables and a follow-up migration that changes the revision FK from `ON DELETE CASCADE` to `ON DELETE RESTRICT`, preserving manuscript revisions.
- Added `npm run db:check` structural checks for the committed 9-schema/16-table migration, revision retention policy, and Drizzle journal. This does not claim live database drift validation.
- Revision allocation locks the draft story row as a best-effort concurrency guard; a uniqueness conflict still returns 409 for retry. Concurrent behavior remains unverified against PostgreSQL.
- Added a shared editor JSON body parser that requires `application/json`, rejects invalid UTF-8, and caps streamed payloads at 256 KiB. Added SQL contract and body parser unit tests.
- Updated GitHub Actions to use the committed lockfile with `npm ci`.
- Corrected the retention migration to drop the live dev FK name (`story_revisions_story_id_fkey`) discovered through read-only Neon inspection. Updated its structural assertion accordingly.
- Expanded `scripts/verify-schema.mjs` to compare the Drizzle snapshot against live table/column inventories, types/nullability, foreign keys, indexes, unique constraints, migration-ledger presence, and archive counts. It is read-only and requires `DATABASE_URL`; the full comparison has not been run from this shell.
- Used read-only Neon SQL to compare the complete dev inventory to the Drizzle snapshot: 16/16 tables, 109/109 columns, types/nullability, and normalized defaults match. Of 15 foreign keys, 14 match; the only drift is the known revision FK delete action (`CASCADE` live, `RESTRICT` intended). All 3 Drizzle indexes and 21 primary/unique constraints are semantically present; two unique indexes are represented as unique constraints in the live database. FK update actions are all `NO ACTION` as expected. Existing unique constraint names also differ from some Drizzle snapshot names, although constrained columns and uniqueness semantics match.
- Added `docs/GRAND_MASTER_PLAN_IMPLEMENTATION_CHECKLIST.md` with evidence/status fields and an explicit note that the Grand Master Plan V11/V11.2 source files are missing from this checkout.

## Verification

- `npm test` — **PASS**, 18/18 unit and SQL contract tests.
- `npm run build` — **PASS** after edits.
- `npm run db:check` — **PASS**, local structural checks only.
- GitHub Actions run [38148501998](https://github.com/bjo163/monwitness-xii/actions/runs/38148501998) — **PASS** on `f12877655ede097505d003be3ed41a62e49bca9f`; locked install, tests, and build all green on Node 22.
- GitHub Actions run [38149409282](https://github.com/bjo163/monwitness-xii/actions/runs/38149409282) — **PASS** on `020214d171fe8061784024d8ec2c00975b31dd9a`; locked install, 20 tests, and build all green on Node 22.
- Authenticated protected-preview fetch on review SHA `f12877655ede097505d003be3ed41a62e49bca9f` — **PASS**: database health 200/connected; published archive list 200 with 15 entries; `tick-tock-on-the-clock` 200; GET draft endpoint 405. Preview alias is `https://monwitness-xii-git-codex-v11-release-readiness-bjo163s-projects.vercel.app`.
- Read-only Neon connector on project `proud-surf-04547637`, branch `mw-v11-development` — **PASS** for inventory: 9 schemas, 16 tables, selected columns match Drizzle; 15 published stories, 0 drafts, 0 revisions, 0 audit events. Live `archive.story_revisions` FK is `ON DELETE CASCADE` and named `story_revisions_story_id_fkey`; migration now drops that exact constraint and recreates it as `RESTRICT`.
- `git diff --check` — **PASS**.
- Local `next start` HTTP checks — **PASS for fail-closed behavior**: `/api/health/db`, `/api/episodes`, and known episode route return 503 with no DB URL; editor draft/revision POST return 503 with no token. This does not validate the deployed preview or Neon data.
- `npm run db:verify` — local script **NOT RUN**; no shell `DATABASE_URL` was provided. Read-only Neon connector provided table inventory and selected table schema evidence.
- Follow-up verification after the migration/verifier corrections: `node --check scripts/verify-schema.mjs`, `npm test` (20/20), `npm run db:check`, `npm run build`, and `git diff --check` — **PASS**.
- `npm run smoke:http` raw Node call is blocked by Vercel Authentication (302); the authenticated Vercel connector successfully fetched all four smoke paths and verified expected responses.
- GitHub Actions run [38149000704](https://github.com/bjo163/monwitness-xii/actions/runs/38149000704) — **PASS** on `99a97df9385f1007b228a7de49e354becdb88bf6` (locked install, tests, build). Follow-up source changes after that SHA require a new run.
- GitHub Issue #3 is open. PR #2 is open and unmergeable. Draft PR #4 targets `dev` and is mergeable. It has not been merged.
- Commits `1e1760d`, `80e8205`, `e269ffb` are ancestors from the local work; review branch commits include `4e72818`, `f128776`, `e9ccb38`, `99a97df`, and `020214d`. The review branch is pushed. Primary `dev` remains unchanged.
- Migrations, backups/restores, production env, and deployment — **NOT TOUCHED**.

## Blockers and next actions

1. Review PR #4 and merge it to `dev` only after review; retain PR #2 as a separate dev-to-main release gate.
2. Review the confirmed revision-FK drift, unique object-name differences, and missing migration ledger. Do not apply the initial baseline to existing dev until a reviewed baseline-stamping plan exists; rehearse the exact FK change on an isolated disposable branch.
3. Choose a real editor identity/session and role model; implement actor attribution, rate limiting, and protected write tests before enabling writes.
4. Rehearse backup/restore on a separate target; complete source/rights review and locate authoritative Grand Master Plan source docs.
5. Keep production promotion **NO-GO** until every release gate has verified evidence and the owner explicitly approves promotion.

See [the implementation checklist](GRAND_MASTER_PLAN_IMPLEMENTATION_CHECKLIST.md) for task IDs, statuses, dependencies, evidence, and risk tracking.
