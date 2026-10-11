# MoonWitness XII V11 — Engineering handover

**As of:** 2026-10-12 • **Owner repository:** bjo163/monwitness-xii • **Release verdict:** NO-GO for production promotion.

## Current architecture
- GitHub: `dev` (ongoing) → `main` (production). PR #2 remains open with merge conflicts.
- Vercel project: `monwitness-xii`; Preview `dpl_HCuUTFQgX4QCBXGYJ1PB3mBtGVGr` is READY for integration SHA `e5eff67`. Authorized fetch returned 200 for homepage, restored universe pages, liveness, DB readiness, and 15 metadata-only archive entries. This does not verify protected editor routes or authenticated writes.
- Neon project `proud-surf-04547637`; branch `br-green-butterfly-b51kp4b1` (`mw-v11-development`). 9 app schemas, 16 tables; 15 published editorial indexes, zero drafts/revisions/audits as last observed. Managed Better Auth is provisioned on this development branch only; production branch `br-dark-sea-b5iws5uf` was untouched.
- Vercel metadata labels `DATABASE_URL` as Preview/dev and has a separate Production variable. Its encrypted value prevents confirming the exact Preview hostname/branch mapping. Production settings were not changed.

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
- [x] Sign-in-only editor entry and admin-only, same-origin server authorization implemented; public signup routes are denied by the application proxy. Neon Auth provider config reads `allow_sign_up=true`; current Neon docs say restricted signup is not yet supported, so direct provider registration remains an open identity-onboarding risk/gate.
- [x] Local anonymous HTTP returns auth proxy 200/null, editor session 401, and draft POST 401.
- [x] Exact baseline and retention migration SQL replayed in a blank isolated Neon rehearsal database; 9 schemas/16 tables verified; `RESTRICT` behavior and rollback to `CASCADE` exercised; source dev branch remained unchanged.
- [ ] Owner-provisioned admin sign-in, logout, session restoration and protected write E2E tests. Editor writes additionally require a server-side `EDITOR_ADMIN_USER_IDS` allowlist; it is intentionally unset until the owner identity is verified.
- [ ] Live actor-attributed audit, revision concurrency and database transaction tests.
- [x] Frontend homepage and archive exist on dev.
- [x] Public preview HTTP checks on the latest app-code head: homepage, liveness, database readiness, and published metadata archive return expected 200 responses.
- [ ] Direct smoke is blocked by Vercel Deployment Protection (302); authorized fetch reports a deployment-auth 401 before the app can verify `/api/editor/session`. Local Vercel CLI is logged out.
- [x] Atomic editor write limiter implemented: 30 per authenticated actor per 15-minute window; PGlite tests and real Neon SQL concurrency rehearsal passed (35 concurrent reservations → 30 accepted, 5 rejected). This is not authenticated application-route concurrency proof.
- [ ] Owner-provisioned admin sign-in, session lifecycle, actor-attributed writes/audit, and authenticated application concurrency remain unverified.
- [ ] Resolve existing-schema migration ledger strategy. Migrations `0001` and `0002` were rehearsed on an approved disposable Neon branch only; they are not applied to persistent dev/Preview.
- [ ] Backups: manual production snapshot restored to an isolated branch for the empty app-database state. Owner selected daily/30-day automated snapshots, but the current Neon plan rejects schedule creation; no billing change was made. Define RPO/RTO and prove recovery with representative app data.
- [x] GitHub Actions run [38164622428](https://github.com/bjo163/monwitness-xii/actions/runs/38164622428) passed on docs-only review head `a42c10e`; app-code head `b05826a` passed [38164298570](https://github.com/bjo163/monwitness-xii/actions/runs/38164298570).
- [ ] Integrate the conflict-resolution branch: commit `e5eff67` merges `main` (`7daffea`) into PR #4 while preserving V11 work. PR #2 remains open/dirty (`dev` → `main`) until this lands in `dev`; PR #4 is still a draft. Neither PR was merged. Obtain explicit approval before production promotion.
- [ ] Source manuscripts/posters/content provenance integrated and reviewed.

## Suggested fastest remaining order
1. Confirm the encrypted Preview DB branch mapping and owner-controlled test identity. Before editor onboarding, verify provider-side role assignment and determine whether direct provider signups can receive roles; Neon currently documents no restricted-signup switch. Configure the verified Neon user ID in the Preview-only `EDITOR_ADMIN_USER_IDS` variable. If invite-only registration is mandatory, select an auth provider that supports it (and MFA).
2. After separate owner approval and exact target confirmation, rehearse the pending migrations on a disposable app-connected branch, then test authenticated draft/revision/audit and route-level concurrency with disposable content.
3. Decide whether to approve a paid Neon plan for the selected daily/30-day schedule; set RPO/RTO and test representative-data restore.
4. Choose an MFA-capable production editor identity, complete source/rights review, and prepare rollback evidence.
5. Review and integrate PR #4, which now contains the tested merge of `main`; then recheck PR #2 mergeability from `dev` to `main`.
6. Deploy only after every gate passes and the owner explicitly approves promotion.

## Rollback / secret hygiene
- On deployment error: roll back the Vercel deployment to last known stable production version; never delete tables as an improvised rollback.
- On database error: disable write endpoints, investigate; restore using verified Neon backup/branch procedure with operator review.
- Rotate any passwords that were previously pasted into a chat. Do not store connection strings in README, commits or screenshots.
- Editor writes remain blocked without configured Auth, an admin session and a database connection. Keep production Auth and credentials untouched until separately approved.

## Local Codex option
Not activated. Codex CLI is an optional assistant for continued implementation and does not require changing Neon/Vercel architecture.
