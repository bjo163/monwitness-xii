# MoonWitness XII V11 — local engineering handover

**Date:** 2026-10-11 (Asia/Jakarta)  
**Branch at start:** `dev`  
**Starting commit:** `c03e977`  
**Release decision:** **NO-GO for production promotion.**

## Work completed in this handover pass

- Cloned the requested repository to `X:\REPO\monwitness-xii`; the existing similarly named directories were unrelated repositories and were left unchanged.
- Recorded the baseline: Node v26.5.0 and npm 11.17.0; dependency installation completed; the existing `npm test` command failed because Node 26 rejects `--experimental-default-type=module`; running the original suite via `node --test tests/*.test.js` passed all 10 tests; `npm run build` passed.
- Updated the test script to use the portable native Node test runner. Existing auth and input-validation unit tests remain the automated test coverage; handler/DB integration tests still need an isolated runtime harness.
- Added `.gitignore` entries for local dependencies, Next.js build artifacts, coverage, and local environment files. Dependency directories and `.next` output are not part of the handover.
- Added `package-lock.json` for repeatable installs.
- Hardened `scripts/smoke-http.mjs`: validate the base URL, report network/JSON errors, assert the expected 15-entry archive, check the known slug response, and verify the write route is POST-only.
- Added an initial Drizzle migration for 16 tables and a follow-up migration that changes the revision FK from `ON DELETE CASCADE` to `ON DELETE RESTRICT`, preserving manuscript revisions.
- Added `npm run db:check` structural checks for the committed 9-schema/16-table migration, revision retention policy, and Drizzle journal. This does not claim live database drift validation.
- Hardened revision number allocation by locking the draft story row during insertion. This serializes writers for one story, but remains unverified against PostgreSQL concurrency.
- Added a shared editor JSON body parser that requires `application/json`, rejects invalid UTF-8, and caps streamed payloads at 256 KiB. Added SQL contract and body parser unit tests.
- Updated GitHub Actions to use the committed lockfile with `npm ci`.
- Added `docs/GRAND_MASTER_PLAN_IMPLEMENTATION_CHECKLIST.md` with evidence/status fields and an explicit note that the Grand Master Plan V11/V11.2 source files are missing from this checkout.

## Verification

- `npm test` — **PASS**, 18/18 unit and SQL contract tests.
- `npm run build` — **PASS** after edits.
- `npm run db:check` — **PASS**, local structural checks only.
- Authenticated protected-preview fetch on review SHA `4e72818394aa59ab2285c74f9369ed6026ece940` — **PASS**: database health 200/connected; published archive list 200 with 15 entries; `tick-tock-on-the-clock` 200; GET draft endpoint 405. Preview alias is `https://monwitness-xii-git-codex-v11-release-readiness-bjo163s-projects.vercel.app`.
- `git diff --check` — **PASS**.
- `npm run db:check` — **PASS**, 16-table schema migration artifacts regenerate identically.
- Local `next start` HTTP checks — **PASS for fail-closed behavior**: `/api/health/db`, `/api/episodes`, and known episode route return 503 with no DB URL; editor draft/revision POST return 503 with no token. This does not validate the deployed preview or Neon data.
- `npm run db:verify` — **NOT RUN**; no development `DATABASE_URL` was provided.
- `npm run smoke:http` — **NOT RUN**; requires an authorized preview URL.
- GitHub Issue #3 is open; PR #2 is open and reported `mergeable: false`. No Actions run existed for PR #4 because PR triggers excluded base `dev`; the workflow now includes `dev`, and rerun is pending after push.
- Local commits from this work: `1e1760d` (portable verification and handover) and `80e8205` (migration artifacts, revision serialization, and lockfile). Both are on local `dev`, ahead of `origin/dev`; they have not been pushed.
- Migrations, backups/restores, production env, and deployment — **NOT TOUCHED**.

## Blockers and next actions

1. Push the current `dev` commit when ready, then run CI under Node 22 and record its job URL/status.
2. Provide/authorize a preview endpoint to run the HTTP smoke checks; confirm current row count and endpoint bodies.
3. Use a confirmed isolated Neon development branch to compare actual SQL with Drizzle, generate migration artifacts, and test drift/apply/rollback.
4. Select and implement a real editor identity/session and role model before enabling writes. Verify actor-attributed audit records and concurrent revision behavior end-to-end.
5. Rehearse backup/restore on a separate target; resolve PR #2 without force-merging; complete source/rights review.
6. Keep production promotion **NO-GO** until every release gate has verified evidence and the owner explicitly approves promotion.

See [the implementation checklist](GRAND_MASTER_PLAN_IMPLEMENTATION_CHECKLIST.md) for task IDs, statuses, dependencies, evidence, and risk tracking. No commit has been created in this handover pass.
