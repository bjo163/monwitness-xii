# MoonWitness XII V11 — Engineering handover

**As of:** 2026-10-12 • **Owner repository:** bjo163/monwitness-xii • **Release verdict:** NO-GO for production promotion.

## Current architecture
- GitHub: `dev` (ongoing) → `main` (production). PR #2 remains open with merge conflicts.
- Vercel project: `monwitness-xii`; development builds have returned READY, but runtime response assertions are not yet verified.
- Neon project `proud-surf-04547637`; branch `br-green-butterfly-b51kp4b1` (`mw-v11-development`). 9 app schemas, 16 tables; 15 published editorial indexes, zero drafts/revisions/audits as last observed. Managed Better Auth is provisioned on this development branch only; production branch `br-dark-sea-b5iws5uf` was untouched.
- `DATABASE_URL` is configured in Vercel Preview only for this branch. Production holds a separate sensitive variable; endpoint identity not validated here.

## File map
| Path | Responsibility |
| --- | --- |
| `app/page.jsx` | Neon-comic AETHERION homepage |
| `app/episodes/page.jsx` | Neon-backed published archive |
| `app/api/episodes/*` | Read-only public archive API |
| `app/api/health/db/route.js` | Read-only connection probe |
| `app/api/auth/[...path]/route.js` | Neon Managed Auth session proxy |
| `app/editor/login/*`, `app/editor/page.jsx` | Sign-in-only, admin-checked editor entry |
| `app/api/editor/{drafts,revisions}/route.js` | Admin session-gated, origin-checked writes with actor-attributed audits |
| `db/schema.js`, `db/client.js` | Drizzle schema and Neon driver |
| `lib/auth.js`, `lib/editor-auth.js` | Managed Auth session and admin authorization |
| `lib/request-validation.js` | Content validation |
| `tests/*.test.js` | Authorization and validation regression tests |
| `scripts/{verify-schema,smoke-http}.mjs` | Read-only DB and HTTP test harnesses |
| `.github/workflows/quality.yml` | Build/test CI |
| `docs/*` | Checklists, QA gates, migration notes, engineering report |

## Evidence: DONE vs NOT DONE
- [x] Vercel dev builds READY for previous commits.
- [x] 9/16 database schema inventory, 15 editorial indices on dev.
- [x] Neon Managed Auth provisioned on isolated development branch; production untouched.
- [x] Sign-in-only editor entry and admin-only, same-origin server authorization implemented; public signup disabled.
- [x] Local anonymous HTTP returns auth proxy 200/null, editor session 401, and draft POST 401.
- [x] Exact baseline and retention migration SQL replayed in a blank isolated Neon rehearsal database; 9 schemas/16 tables verified; `RESTRICT` behavior and rollback to `CASCADE` exercised; source dev branch remained unchanged.
- [ ] Owner-provisioned admin sign-in, logout, session restoration and protected write E2E tests.
- [ ] Live actor-attributed audit, revision concurrency and database transaction tests.
- [x] Frontend homepage and archive exist on dev.
- [ ] End-to-end HTTP and database transaction tests with evidence.
- [ ] Live editor session, RBAC write, and actor-attributed audit E2E tests (policy and SQL contract are implemented and unit-tested).
- [ ] Resolve existing-schema migration ledger strategy; verify backups and restoration (dev currently has no snapshot schedule or manual snapshot evidence).
- [ ] GitHub Actions green on the exact current review head; latest pre-fix audit failed on esbuild and is being corrected.
- [ ] Resolve PR conflicts; authorize prod connection and promotion.
- [ ] Source manuscripts/posters/content provenance integrated and reviewed.

## Suggested fastest remaining order
1. Provision an owner-controlled admin user on dev Auth and verify login/logout/session restore; keep public signup off.
2. Run authenticated draft/revision/audit and concurrent-write tests on dev with disposable content; verify actor IDs and public read isolation.
3. Run CI for the patched dependency lockfile; continue migration-ledger baseline planning (the disposable Neon apply/rollback rehearsal is complete).
4. Rehearse backup/restore, add rate limiting, and choose an MFA-capable production editor identity (Managed Auth lacks MFA here).
5. Resolve PR #2 conflicts against `main`, re-run checks; verify production DB mapping, source/rights and explicit release approval.
6. Deploy only after every gate passes; verify checks and rehearse rollback.

## Rollback / secret hygiene
- On deployment error: roll back the Vercel deployment to last known stable production version; never delete tables as an improvised rollback.
- On database error: disable write endpoints, investigate; restore using verified Neon backup/branch procedure with operator review.
- Rotate any passwords that were previously pasted into a chat. Do not store connection strings in README, commits or screenshots.
- Editor writes remain blocked without configured Auth, an admin session and a database connection. Keep production Auth and credentials untouched until separately approved.

## Local Codex option
Not activated. Codex CLI is an optional assistant for continued implementation and does not require changing Neon/Vercel architecture.
