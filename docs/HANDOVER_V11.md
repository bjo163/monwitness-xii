# MoonWitness XII V11 — Engineering handover

**As of:** 2026-10-12 • **Owner repository:** bjo163/monwitness-xii • **Release verdict:** NO-GO for production promotion.

> **Latest local review:** app-code commit `4739f27` passes 44/44 tests, `npm run db:check`, `git diff --check`, and Next.js production build. Its exact-head GitHub Actions run [38177734505](https://github.com/bjo163/monwitness-xii/actions/runs/38177734505) passed auth tests, migration reproducibility, dependency audit, and build. The `/team` roster reuses the same four faceless character portraits as the homepage; Indonesian document language metadata is `id`. Local visual review confirmed all portraits and the responsive two-column mobile roster. READY Preview `dpl_DRRUuvKdFybsN3qtfirfbVaQJVdp` returned 200 for `/team`, `/`, and dev DB health; documentation-only HEAD `06a47e3` separately passed Actions [38177843654](https://github.com/bjo163/monwitness-xii/actions/runs/38177843654). Exact encrypted Preview DB branch mapping remains unverified. Branch `codex/v11-release-readiness` is pushed.

> **Live status:** this handover preserves the detailed historical evidence below. For current review state, use [PR #4](https://github.com/bjo163/monwitness-xii/pull/4), [Issue #3](https://github.com/bjo163/monwitness-xii/issues/3), [release gates](./RELEASE_GATES_V11.md), and [finalization plan](./FINALIZATION_V11_RELEASE_PLAN.md). At the prior checkpoint, review head `9c4e645` passed exact-head Actions [38177275503](https://github.com/bjo163/monwitness-xii/actions/runs/38177275503). The code checkpoint `b50aae2` passed 43/43 local tests, build, DB check, and all 10 loopback HTTP smoke checks. A READY Preview for that app-code checkpoint returned 200 for homepage, archive (15 entries), dev DB health, archive API, and a representative detail marked `SOURCE NEEDED`; current documentation-only HEAD had not been deployed. The owner confirmed all 15 archive entries remain `source-needed`; direct read-only Neon queries confirm this status and zero source media, evidence, revisions, users, or audit rows. PR #4 remains draft and unmerged; PR #2 remains open/unmergeable. Neon remains Free by owner choice; daily/30-day retention is unmet, and no backup destination is approved or configured. Production promotion remains NO-GO.

> **Preview freshness:** READY Preview app-code checkpoint `b50aae2` was smoke-tested successfully for public homepage/archive/API/dev DB readiness and a representative source-needed detail. Documentation-only HEAD `9c4e645` was not itself deployed. An earlier Preview attempt for `e25d9e0` hit HTTP 402 (`api-deployments-free-per-day`); record it as historical. No plan change or production action was taken.

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
- [x] The official Drizzle PGlite migrator now has a regression test: it applies all three journaled migrations, checks the migration ledger and final FK policy, then reruns without duplicating ledger records. This validates local migrator behavior; persistent Neon dev/Preview migration remains pending.
- [x] Auth route dispatcher tests cover denied signup/admin/unknown paths, unsupported methods, unconfigured provider failure, allowed provider dispatch, and generic provider errors. Local HTTP smoke returned 404 for `/api/auth/sign-up/email` even with Auth unconfigured and 405/`Allow: GET, POST` for unsupported methods.
- [x] Local `SMOKE_PROFILE=local` now verifies the DB-free HTTP surface and safe failure behavior using loopback only. All 10 checks passed: homepage/liveness/login 200; DB/archive safe 503 without local `DATABASE_URL`; signed-out auth/session and editor responses, signup 404, unsupported method 405, and draft GET 405. This is not a Neon connectivity test. Strict Preview smoke still requires an authorized connected deployment and 15 archive rows.
- [x] Smoke script contract tests reject non-loopback local targets, credential-bearing URLs, and unsupported profiles without sending a request or printing secrets.
- [x] Content-owner decision recorded: all 15 Story Archive entries stay `source-needed` until original source materials, credits, and evidence of rights to use them are supplied. No story is marked source-verified.
- [x] Fresh read-only Neon check on dev `br-green-butterfly-b51kp4b1` confirms 15 published rows with `original_source_status='source_needed'`; media, research evidence, revisions, mapped app identities, Neon Auth users, and audit events each contain 0 rows. The story table has no dedicated `editorial_index_only`/`source_verified` columns, and inspected metadata has no such keys. Do not present those older labels as current database fields. Production and dev snapshot schedules both return `[]`.
- [ ] Owner-provisioned admin sign-in, logout, session restoration and protected write E2E tests. Editor writes additionally require a server-side `EDITOR_ADMIN_USER_IDS` allowlist; it is intentionally unset until the owner identity is verified.
- [ ] Live actor-attributed audit, revision concurrency and database transaction tests.
- [x] Frontend homepage and archive exist on dev.
- [x] Public preview HTTP checks on the latest app-code head: homepage, liveness, database readiness, and published metadata archive return expected 200 responses.
- [ ] Direct smoke is blocked by Vercel Deployment Protection (302); authorized fetch reports a deployment-auth 401 before the app can verify `/api/editor/session`. Local Vercel CLI is logged out.
- [x] Atomic editor write limiter implemented: 30 per authenticated actor per 15-minute window; PGlite tests and real Neon SQL concurrency rehearsal passed (35 concurrent reservations → 30 accepted, 5 rejected). This is not authenticated application-route concurrency proof.
- [ ] Sign-in/password-attempt throttling remains unverified. The installed Neon Auth Next.js adapter exposes no limiter option, and Neon documents that Managed Auth does not expose custom server-side handlers. Do not infer the hosted branch's effective sign-in throttling from Better Auth upstream defaults; require provider-specific evidence or support confirmation. [Neon Managed Auth boundary](https://neon.com/blog/neon-auth-branchable-identity-in-your-database) · [Better Auth rate-limit defaults](https://better-auth.com/docs/concepts/rate-limit).
- [ ] Owner-provisioned admin sign-in, session lifecycle, actor-attributed writes/audit, and authenticated application concurrency remain unverified.
- [ ] Resolve existing-schema migration ledger strategy. Migrations `0001` and `0002` were rehearsed on an approved disposable Neon branch only; they are not applied to persistent dev/Preview.
- [ ] Backups: manual production snapshot restored to an isolated branch for the empty app-database state. Owner selected daily/30-day backups and chose to stay on Free. Neon Free allows only 6 hours of PITR history; the automatic snapshot schedule remains empty. S3-based `pg_dump` automation adds separate cost and is not configured. GitHub Actions artifacts on this public repository are downloadable by readers; only client-side encrypted dumps could be considered, with 500 MB included storage shared with Packages and possible overage charges. No destination, workflow, size cap, or hard-stop budget is approved/configured. Define RPO/RTO and prove recovery with representative app data.
- [x] Latest exact-head Actions run [38176668172](https://github.com/bjo163/monwitness-xii/actions/runs/38176668172) passed on review head `6820d00`, including auth security tests, migration reproducibility, dependency audit, and build. The code checkpoint `b50aae2` passed 43/43 local tests; `db:check`, production build, and the 10-check loopback HTTP smoke passed.
- [ ] Integrate the conflict-resolution branch: commit `e5eff67` merges `main` (`7daffea`) into PR #4 while preserving V11 work. PR #2 remains open/dirty (`dev` → `main`) until this lands in `dev`; PR #4 is still a draft. Neither PR was merged. Obtain explicit approval before production promotion.
- [ ] Source manuscripts/posters/content provenance integrated and reviewed.

## Suggested fastest remaining order
1. Confirm the encrypted Preview DB branch mapping and owner-controlled test identity. Before editor onboarding, verify provider-side role assignment and determine whether direct provider signups can receive roles; Neon currently documents no restricted-signup switch. Configure the verified Neon user ID in the Preview-only `EDITOR_ADMIN_USER_IDS` variable. If invite-only registration is mandatory, select an auth provider that supports it (and MFA).
2. After separate owner approval and exact target confirmation, rehearse the pending migrations on a disposable app-connected branch, then test authenticated draft/revision/audit and route-level concurrency with disposable content.
3. Keep Neon on Free as selected; daily/30-day retention is unmet. Define RPO/RTO, identify a no-cost backup destination if available, and test representative-data restore.
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
