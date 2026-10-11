# MoonWitness XII V11 — Fast-track production gates
_Track on GitHub issue #3. [x] denotes verified evidence, not intent._

## Database and app
- [x] Neon development branch isolated; 9 schemas/16 tables verified.
- [x] 15 editorial indices published in development, each original source still needed.
- [x] Vercel dev build READY at 6b48b588.
- [x] Read-only public API and Neon-backed archive page in dev source.
- [ ] Request HTTP status and payload checks from preview deployment.
- [ ] Reproducible generated Drizzle SQL migration checked against disposable branch.
- [ ] Verify migration drift, rollback and database backup/restore.

## Security and editor
- [x] Fail-closed bearer gate for server-to-server editor requests (not end-user authentication).
- [x] Append-only revision inserts and audit event in the same SQL statement.
- [x] Node unit tests for token gate, payload validation (run in CI; inspect results).
- [ ] Real editor authentication/session with per-user RBAC, MFA as appropriate.
- [ ] Per-write actor identity in audit log and appropriate retention.
- [ ] Rate limits, CSRF/Origin policies and E2E penetration and transaction checks.
- [ ] Formal publishing review and source/rights checks.

## Delivery
- [x] Vercel production left unchanged during prototype development.
- [ ] GitHub Actions pipeline run green and confirmed.
- [ ] Tested safe dev-to-main release, smoke check and rollback rehearsal.
- [ ] Verify no shared credential is exposed; rotate previously pasted password.

## Must-not-regress
- Draft revisions and witness private data never appear in public GET.
- Authoritative religious/scientific claims are reviewed and sourced; comedy separate from evidence.
- Story archive originals retained, not overwritten by editorial summaries.
