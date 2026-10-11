# MoonWitness XII V11 — Fast-track production gates
_Track on GitHub issue #3. [x] denotes verified evidence, not intent._

## Database and app
- [x] Neon development branch isolated; 9 schemas/16 tables verified.
- [x] 15 editorial indices published in development, each original source still needed.
- [x] Vercel dev build READY at 6b48b588.
- [x] Read-only public API and Neon-backed archive page in dev source.
- [ ] Finish preview HTTP evidence: current SHA `5d2700d` returns app/DB health 200, published archive 200/15, known story 200, signed-out Auth session 200/null, and public signup 404. Verify exact encrypted DB host/branch and signed-out editor-session 401; current connector could not observe that expected 401.
- [x] Reproducible generated Drizzle SQL migration checked against disposable branch; see exact Neon rehearsal in `GRAND_MASTER_PLAN_IMPLEMENTATION_CHECKLIST.md`.
- [ ] Verify persistent development migration drift/ledger strategy and database backup/restore. Current Neon inventory has zero snapshots/schedules on dev and production; snapshot API rejects non-root dev. No production snapshot/restore rehearsal has been attempted.

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
