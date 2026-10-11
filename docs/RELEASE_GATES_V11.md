# MoonWitness XII V11 — Fast-track production gates
_Track on GitHub issue #3. [x] denotes verified evidence, not intent._

## Current review snapshot — 2026-10-12

This snapshot supersedes the older SHA/status references below; the original gate narrative is retained as historical context.

- Current review HEAD `887ee2b6d384a490a024c0e8866bf6e13e9d2c82` is pushed on `codex/v11-release-readiness`. Actions [38168490685](https://github.com/bjo163/monwitness-xii/actions/runs/38168490685) passed locked install, auth regression tests, migration reproducibility, production dependency audit, and Next.js build. Vercel Preview [dpl_6u6YPUUxdmEbADd5hhdnLk23pQtg](https://vercel.com/bjo163s-projects/monwitness-xii/6u6YPUUxdmEbADd5hhdnLk23pQtg) is READY for the exact HEAD; authorized `/handover` fetch returned 200. The underlying app-code revision at `47b1de4` also passed Actions [38168297956](https://github.com/bjo163/monwitness-xii/actions/runs/38168297956). Its homepage/archive checks returned 200, signed-out auth session returned 200/null, and the app sign-up route returned 404. `/api/editor/session` remains unverified because Vercel Deployment Protection intercepted the authorized request.
- Draft PR #4 targets `dev`, is currently mergeable, and is not merged. PR #2 remains open and unmergeable (`dev` → `main`; PR head `c03e977`, current base `main` SHA `6e25535`). Recheck after PR #4 is reviewed/integrated. No PR was merged; production remains **NO-GO**.
- Editor limiter (30 writes per authenticated actor per 15 minutes) passed PGlite tests and an approved disposable Neon SQL concurrency rehearsal (35 reservations: 30 allowed, 5 denied). No authenticated application-route write or owner-admin sign-in has been verified; migrations `0001`/`0002` remain unapplied to persistent dev/Preview.
- This limiter protects authenticated draft/revision writes; rate limiting repeated sign-in/credential attempts remains a separate unverified control.
- Owner selected daily snapshots with 30-day retention. Neon rejects schedule creation on the current project plan; production schedule reads `[]`. No billing or production database change was made. A manual snapshot restore was verified only for the empty app-database state; RPO/RTO and representative-data recovery remain open.
- Preview DB host/branch mapping is not independently verified, app-level editor-session HTTP response is obscured by Vercel Deployment Protection, no MFA-capable production editor identity is configured, and source/credit/rights review remains open.

## Database and app
- [x] Neon development branch isolated; 9 schemas/16 tables verified.
- [x] 15 editorial indices published in development, each original source still needed.
- [x] Vercel dev build READY at 6b48b588.
- [x] Read-only public API and Neon-backed archive page in dev source.
- [ ] Finish preview HTTP evidence: current exact review HEAD `887ee2b` returns `/handover` 200; latest application revision `47b1de4` returns homepage and archive 200, signed-out Auth session 200/null, and app signup route 404. Verify exact encrypted DB host/branch and signed-out editor-session 401; Vercel Deployment Protection intercepted the last request before the app response.
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
