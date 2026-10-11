# MoonWitness XII V11 — Fast-track production gates
_Track on GitHub issue #3. [x] denotes verified evidence, not intent._

## Release gate snapshot — 2026-10-12

The live review branch SHA, PR state, and latest exact-head CI run are tracked in [PR #4](https://github.com/bjo163/monwitness-xii/pull/4) and [Issue #3](https://github.com/bjo163/monwitness-xii/issues/3). This file records release gates based on application/Preview verification, while retaining older SHA-specific evidence below as historical context. Verified app implementation `09624ca60ccfdada2ea5a8190d78beb10451067f` passed CI [38171011483](https://github.com/bjo163/monwitness-xii/actions/runs/38171011483), and exact-code Preview [dpl_92zBVvnTpRMtVVKHrPfZaJmMMKeb](https://vercel.com/bjo163s-projects/monwitness-xii/deployments/dpl_92zBVvnTpRMtVVKHrPfZaJmMMKeb) is READY. Review snapshot `3b70c661093a0a84f0f8438879917b46162f0054` passed CI [38171319647](https://github.com/bjo163/monwitness-xii/actions/runs/38171319647). Its Vercel deployment hit the build-rate limit; app code is unchanged from the verified deployment.

- Exact Preview smoke check: deployment `09624ca` returned 200 for `/`, `/handover`, `/episodes`, `/episodes/jasa-forgiveness-drone-mode`, `/api/health/db`, and `/api/episodes`; the DB health body says connected/development and the API returns 15 public indexes. The detail response showed only its editorial index/synopsis and `SOURCE NEEDED`, without original materials or revision data. Signed-out Auth session returned `200 null`, `/api/editor/session` returned 401, and the app signup route returned 404. This verifies app behavior but does not reveal the encrypted Preview DB hostname/branch mapping.
- Sanitized Preview configuration metadata labels the branch-scoped Managed Auth base URL and Preview `DATABASE_URL` for isolated development. Read-only queries return the same 15 published `slug/title` pairs on dev branch `br-green-butterfly-b51kp4b1`, its migration-rehearsal clone `br-flat-shape-b5ofan15`, and Preview `/api/episodes`. Production and restore branches have no `archive.stories` table. This confirms the Preview uses the dev dataset lineage, but data parity cannot distinguish the dev branch from its clone; the encrypted URL hostname was not read, so the exact target branch remains unverified.
- Local `.env.local` has no `DATABASE_URL`; local `/api/health/db` therefore correctly returns 503 and archive/detail show their safe retry states. This is missing local configuration, not evidence that the Neon development database is unavailable. Mobile CUA inspection at 390×844 recorded 375px document width on `/`, `/team`, `/throwing-dice`, `/four-books`, `/aetherion`, `/witness-log`, `/the-lab`, `/episodes`, and `/handover`.
- Draft PR #4 targets `dev`, is currently mergeable, and is not merged. PR #2 remains open and unmergeable (`dev` → `main`; GitHub reports its head at `c03e977`). Recheck after PR #4 is reviewed/integrated. No PR was merged; production remains **NO-GO**.
- Local ref `dev` is at `e269ffb`, three commits ahead of `origin/dev` (`c03e977`): `1e1760d`, `80e8205`, and `e269ffb`. PR #4 descends from this local ref, so these changes are included in that draft's review diff. They have not been pushed directly to `dev`; keep them in review before integration. PR #2 remains unmergeable until its merge conflict is resolved after the reviewed dev integration.
- Editor limiter (30 writes per authenticated actor per 15 minutes) passed PGlite tests and an approved disposable Neon SQL concurrency rehearsal (35 reservations: 30 allowed, 5 denied). No authenticated application-route write or owner-admin sign-in has been verified; migrations `0001`/`0002` remain unapplied to persistent dev/Preview.
- This limiter protects authenticated draft/revision writes; rate limiting repeated sign-in/credential attempts remains a separate unverified control.
- Owner selected daily snapshots with 30-day retention and explicitly chose to remain on Free. The production schedule reads `[]`; official Neon docs cap Free PITR history at 6 hours/1 GB (30 days requires Scale). `pg_dump` through scheduled GitHub Actions to S3 is a documented alternative, but requires separately priced storage and is not configured. The GitHub repository is public; [repository readers can download Actions artifacts](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts), so plaintext database dumps are not acceptable there. An encrypted-artifact design has not been implemented or restore-tested. No approved no-cost private target is configured. No billing or production database change was made. A manual snapshot restore was verified only for the empty app-database state; RPO/RTO and representative-data recovery remain open.
- Preview DB data is consistent with dev: sanitized Vercel env metadata labels it for isolated dev, and its 15 published slug/title pairs match dev plus the dev-derived rehearsal clone. Since those branches share the same rows, parity does not uniquely prove the exact target; the encrypted URL remains unread. App-level signed-out responses are verified through the authenticated Vercel fetch connector. No MFA-capable production editor identity is configured, and source/credit/rights review remains open.

## Database and app
- [x] Neon development branch isolated; 9 schemas/16 tables verified.
- [x] 15 editorial indices published in development, each original source still needed.
- [x] Vercel dev build READY at 6b48b588.
- [x] Read-only public API and Neon-backed archive page in dev source.
- [x] Verify current app Preview HTTP behavior on `09624ca`: homepage, handover, archive, representative detail and DB health return 200; archive API returns 15 metadata-only entries; signed-out Auth session returns 200/null; editor session returns 401; app signup path returns 404. Detail remains editorial-only and marked `SOURCE NEEDED`.
- [ ] Independently confirm the encrypted Preview `DATABASE_URL` host/branch. Sanitized environment metadata labels it for dev; the 15-row slug/title fingerprint also matches the dev-derived migration-rehearsal clone, so parity cannot uniquely identify the target. The secret URL itself was not read.
- [x] Reproducible generated Drizzle SQL migration checked against disposable branch; see exact Neon rehearsal in `GRAND_MASTER_PLAN_IMPLEMENTATION_CHECKLIST.md`.
- [ ] Resolve populated-dev migration ledger strategy. Manual snapshot/restore is now rehearsed from Neon production root to an isolated branch: exact DB tree and 7,716,864-byte `neondb` size match, but both have 0 app tables. Dev/prod automatic snapshot schedules are empty; application-data restore, retention, and RPO/RTO remain unverified.

## Security and editor
- [x] Neon Managed Better Auth enabled on isolated development branch only; production Auth unchanged.
- [x] Application sign-in-only UI/auth proxy; app signup endpoint is denied with 404; editor writes now require both an `admin` session role and a server-side exact-user-ID allowlist.
- [ ] Resolve identity onboarding before accepting editors: dev Auth reads `allow_sign_up=true`; Neon docs say restricted signups are not yet supported. Read-only inspection found `neon_auth.user` empty and its `role` column nullable with no database default; this does not establish the Managed Auth signup role behavior. App signup proxy returns 404, but direct provider signup may still be possible. Set an owner-controlled `EDITOR_ADMIN_USER_IDS` value for each intended environment only after provisioning and verifying the admin account; MFA-capable identity is still required for production.
- [x] Anonymous HTTP verification: Auth proxy session `200 null`, editor session `401`, draft POST `401`.
- [x] Same-origin and cross-site request policy has regression tests; writes map Auth subjects to `identity.users` and attribute audit rows.
- [ ] Provision owner account and verify sign-in, admin role, sign-out and session restoration end-to-end.
- [ ] Execute authenticated draft/revision/audit write and concurrency tests on isolated development database.
- [ ] Per-write actor identity verified in live database and retention policy reviewed.
- [ ] Rate limiting and protection against repeated credential attempts.
- [ ] MFA: Neon Managed Auth on this branch does not expose MFA; choose an approved MFA-capable identity policy before production editor access.
- [ ] E2E penetration and transaction checks.
- [ ] Formal publishing review and source/rights checks.

## Delivery
- [x] Vercel production left unchanged during prototype development.
- [x] GitHub Actions run [38160413791](https://github.com/bjo163/monwitness-xii/actions/runs/38160413791) green for review head `5d2700d`; rerun after later commits.
- [ ] Tested safe dev-to-main release, smoke check and rollback rehearsal.
- [ ] Verify no shared credential is exposed; rotate previously pasted password.

## Must-not-regress
- Draft revisions and witness private data never appear in public GET.
- Authoritative religious/scientific claims are reviewed and sourced; comedy separate from evidence.
- Story archive originals retained, not overwritten by editorial summaries.
