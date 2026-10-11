# MoonWitness XII V11 — Fast-track production gates
_Track on GitHub issue #3. [x] denotes verified evidence, not intent._

## Current review snapshot — 2026-10-12

This snapshot supersedes the older SHA/status references below; the original gate narrative is retained as historical context.

- Current integration commit `e5eff67a2cc5186f85fe593fbe4d91a40d6ee895` merges `main` into review branch `codex/v11-release-readiness` while preserving V11 homepage, faceless art, auth/schema, and migrations. Draft PR #4 still targets `dev`. Actions [38165821216](https://github.com/bjo163/monwitness-xii/actions/runs/38165821216) passed. Vercel Preview `dpl_HCuUTFQgX4QCBXGYJ1PB3mBtGVGr` is READY for the exact SHA.
- PR #2 remains open and dirty (`dev` → `main`). Conflict resolution is prepared on the review branch by merging current `main` commit `7daffea`; review and integration through PR #4 are still required before PR #2 is rechecked. No PR was merged; production remains **NO-GO**.
- Editor limiter (30 writes per authenticated actor per 15 minutes) passed PGlite tests and an approved disposable Neon SQL concurrency rehearsal (35 reservations: 30 allowed, 5 denied). No authenticated application-route write or owner-admin sign-in has been verified; migrations `0001`/`0002` remain unapplied to persistent dev/Preview.
- This limiter protects authenticated draft/revision writes; rate limiting repeated sign-in/credential attempts remains a separate unverified control.
- Owner selected daily snapshots with 30-day retention. Neon rejects schedule creation on the current project plan; production schedule reads `[]`. No billing or production database change was made. A manual snapshot restore was verified only for the empty app-database state; RPO/RTO and representative-data recovery remain open.
- Preview DB host/branch mapping is not independently verified, app-level editor-session HTTP response is obscured by Vercel Deployment Protection, no MFA-capable production editor identity is configured, and source/credit/rights review remains open.

## Database and app
- [x] Neon development branch isolated; 9 schemas/16 tables verified.
- [x] 15 editorial indices published in development, each original source still needed.
- [x] Vercel dev build READY at 6b48b588.
- [x] Read-only public API and Neon-backed archive page in dev source.
- [ ] Finish preview HTTP evidence: current SHA `5d2700d` returns app/DB health 200, published archive 200/15, known story 200, signed-out Auth session 200/null, and public signup 404. Verify exact encrypted DB host/branch and signed-out editor-session 401; current connector could not observe that expected 401.
- [x] Reproducible generated Drizzle SQL migration checked against disposable branch; see exact Neon rehearsal in `GRAND_MASTER_PLAN_IMPLEMENTATION_CHECKLIST.md`.
- [ ] Resolve populated-dev migration ledger strategy. Manual snapshot/restore is now rehearsed from Neon production root to an isolated branch: exact DB tree and 7,716,864-byte `neondb` size match, but both have 0 app tables. Dev/prod automatic snapshot schedules are empty; application-data restore, retention, and RPO/RTO remain unverified.

## Security and editor
- [x] Neon Managed Better Auth enabled on isolated development branch only; production Auth unchanged.
- [x] Application sign-in-only UI/auth proxy; sign-up endpoint is denied with 404; editor routes require an `admin` session.
- [ ] Resolve identity onboarding before accepting editors: dev Auth reads `allow_sign_up=true`; Neon docs say restricted signups are not yet supported. App signup proxy returns 404, but that does not prove direct provider signup is blocked. Confirm provider-side role assignment cannot be self-selected; use an identity provider with controlled registration and MFA if required.
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
