# MoonWitness XII V11 — Engineering handover

**As of:** 2026-10-12 • **Owner repository:** bjo163/monwitness-xii • **Release verdict:** NO-GO for production promotion.

## Current review checkpoint

- **Last pushed review branch head:** `06e2a119377e46a735714608becf96e095846553` (documentation-only); exact-head Actions [38180083381](https://github.com/bjo163/monwitness-xii/actions/runs/38180083381) passed. Local app code commit `8d16736` adds an explicit public archive response-field allowlist, consistent no-store error responses, and runtime response tests; it and later documentation updates remain local per owner direction, with no CI or Preview result. Latest app-identical READY Preview remains `d6c884b95b96e50134b43ed4bdc5eea52aed387e`; a fresh read-only GitHub check confirms PR #4 still targets `dev`, is open/draft/unmerged, has no reviews, and points at remote head `06e2a11`. See [PR #4](https://github.com/bjo163/monwitness-xii/pull/4) and [Issue #3](https://github.com/bjo163/monwitness-xii/issues/3) for remote state.
- READY Preview `dpl_HnnQ6MgscYdnHiSTWGM7SwtkZJch` for `d6c884b`: [open `/team`](https://monwitness-ddqa9vtjb-bjo163s-projects.vercel.app/team). Protected GET returned 200 for `/`, `/team`, `/episodes`, `/api/episodes` (15 rows), `/api/health/db` (`connected`, `development`), and `/api/auth/get-session` (`null`); app signup returned 404. `/api/editor/session` could not be checked because deployment protection intercepted the protected-fetch redirect. The encrypted DB hostname was not read, so exact Preview branch mapping remains unknown.
- Vercel's automatic attempt for the later docs-only head failed at the Free deployment quota. Owner direction is local-only: do not deploy or push; keep using the local app. No plan or billing change was made.
- **Current local verification (2026-10-12):** `npm test` passed 54/54; `npm run db:check` and `npm run build` passed; `$env:SMOKE_PROFILE='local'; npm run smoke:http` passed 21/21 against loopback. Smoke covers home, `/team`, `/throwing-dice`, `/four-books`, `/aetherion`, `/witness-log`, `/the-lab`, and successful HTTP delivery with `image/webp` content type for all five canonical faceless character assets. DB health/archive show safe 503 responses because this shell has no `DATABASE_URL`; successful response allowlists/no-store behavior are verified by isolated runtime tests. This does not establish Neon availability. The local app is running on ports 3000 and 3001.
- Fresh read-only GitHub state: PR #4 is open/draft/unmerged/mergeable with no submitted reviews and still points at `06e2a11`; PR #2 is open and not mergeable (`dev` → `main`). Local Git graph audit confirms `origin/main` merged into the V11 review branch at `e5eff67`, with `origin/dev` an ancestor of that branch. A virtual merge-tree check found conflicts in `app/page.jsx`, `app/style.css`, and `package.json` for `origin/main` + `origin/dev`; `origin/main` is already an ancestor of the review branch and its merge-tree is clean. This is a local conflict-resolution candidate only: PR #4 still needs independent review and reviewed integration into `dev` before rechecking PR #2. No remote PR merge or production action occurred. Production remains **NO-GO**.
- Neon read-only audit confirms all 15 dev Archive rows remain `published`/`source_needed`, as directed. Dev still has no migration ledger; its revision FK is `CASCADE` while migration `0001` expects `RESTRICT`; limiter migration `0002` is not applied. Automatic snapshot schedules are empty. Auth onboarding, provider signup/throttling policy, MFA, authenticated writes/audit E2E, representative-data restore, and persistent-dev migration remain unverified.

> **Historical local app validation:** app-code commit `d13b538` passed 44/44 tests, `npm run db:check`, `git diff --check`, Next.js production build, and 11/11 loopback HTTP smoke checks. Exact-head CI [38178499647](https://github.com/bjo163/monwitness-xii/actions/runs/38178499647) passed auth tests, migration reproducibility, dependency audit, and build. The `/team` roster uses the four canonical faceless character portraits; root language metadata is English, with Indonesian passages marked `lang="id"`. The current CI and Preview checkpoint is above.

> **Historical status:** detailed older evidence follows. For current review state, use the current review checkpoint above, [PR #4](https://github.com/bjo163/monwitness-xii/pull/4), [Issue #3](https://github.com/bjo163/monwitness-xii/issues/3), [release gates](./RELEASE_GATES_V11.md), and [finalization plan](./FINALIZATION_V11_RELEASE_PLAN.md). Earlier deployment and CI references below are not current-state claims.

> **Historical Preview checkpoint:** READY Preview app-code checkpoint `b50aae2` was smoke-tested successfully for public homepage/archive/API/dev DB readiness and a representative source-needed detail. Documentation-only HEAD `9c4e645` was not itself deployed. An earlier Preview attempt for `e25d9e0` hit HTTP 402 (`api-deployments-free-per-day`). This is superseded by the `d6c884b` checkpoint above; no plan change or production action was taken.

## Architecture observed at the `d6c884b` application Preview checkpoint
- GitHub: `dev` (ongoing) → `main` (production). PR #2 remains open with merge conflicts.
- Vercel project: `monwitness-xii`; app-identical commit `d6c884b` has READY Preview `dpl_HnnQ6MgscYdnHiSTWGM7SwtkZJch`. The later branch head is docs-only and its Preview attempt failed at the Free quota; owner requested local-only work. Read-only smoke returned 200 for homepage, `/team`, archive (15 rows), Auth session and development DB health. Protected editor-session response and authenticated writes remain unverified.
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
- [x] Local `SMOKE_PROFILE=local` verifies the DB-free HTTP surface and safe failure behavior using loopback only. Current smoke has 21 checks: home, team, five universe pages, all five canonical character assets, liveness/login, DB/archive safe 503 without local `DATABASE_URL`, signed-out auth/editor responses, signup 404, unsupported method 405, and draft GET 405. Current result: 21/21 passed. This is not a Neon connectivity test. The archive page shows its provenance notice and retry state. Strict Preview smoke still requires an authorized connected deployment and 15 archive rows.
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
- [x] Historical exact-head Actions run [38176668172](https://github.com/bjo163/monwitness-xii/actions/runs/38176668172) passed on review head `6820d00`, including auth security tests, migration reproducibility, dependency audit, and build. The code checkpoint `b50aae2` passed 43/43 local tests; `db:check`, production build, and the 10-check loopback HTTP smoke passed at that checkpoint. Current-checkout results are listed at the top of this handover.
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
