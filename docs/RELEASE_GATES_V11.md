# MoonWitness XII V11 — Fast-track production gates
_Track on GitHub issue #3. [x] denotes verified evidence, not intent._

## Current review snapshot — 2026-10-12

This snapshot supersedes the older SHA/status references below; the original gate narrative is retained as historical context.

- Review head `a42c10e6da3311d8922a7d4e61f8c4531bdaec47` targets `dev` via draft PR #4 (open, mergeable); CI [38164622428](https://github.com/bjo163/monwitness-xii/actions/runs/38164622428) passed. App-code head `b05826a4f75a046256cfe38d525405cc69540c5d` passed CI [38164298570](https://github.com/bjo163/monwitness-xii/actions/runs/38164298570); Preview `dpl_J13Gm5pc8eXrpoiEKdRqx75QP8pE` is READY, with authorized HTTP 200 checks for home, liveness, DB readiness, and 15 metadata-only archive entries.
- PR #2 remains open and `mergeable_state=dirty`, from `dev` (`c03e977`) to `main` (`7daffea`). No PR was merged; production remains **NO-GO**.
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
- [x] Local sign-in-only UI; public sign-up disabled; editor routes require an `admin` session.
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
