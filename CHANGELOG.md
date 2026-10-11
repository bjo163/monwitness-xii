# Changelog

This file records user-visible and operational changes for MoonWitness XII.

## 2026-10-12 — Security and release-readiness continuation

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
