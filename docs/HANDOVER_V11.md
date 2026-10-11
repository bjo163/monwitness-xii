# MoonWitness XII V11 — Engineering handover

**As of:** 2026-10-11 • **Owner repository:** bjo163/monwitness-xii • **Release verdict:** NO-GO for production promotion.

## Current architecture
- GitHub: `dev` (ongoing) → `main` (production). PR #2 remains open with merge conflicts.
- Vercel project: `monwitness-xii`; development builds have returned READY, but runtime response assertions are not yet verified.
- Neon project `proud-surf-04547637`; branch `br-green-butterfly-b51kp4b1` (`mw-v11-development`). 9 schemas, 16 tables; 15 published editorial indexes, zero drafts as last observed.
- `DATABASE_URL` is configured in Vercel Preview only for this branch. Production holds a separate sensitive variable; endpoint identity not validated here.

## File map
| Path | Responsibility |
| --- | --- |
| `app/page.jsx` | Neon-comic AETHERION homepage |
| `app/episodes/page.jsx` | Neon-backed published archive |
| `app/api/episodes/*` | Read-only public archive API |
| `app/api/health/db/route.js` | Read-only connection probe |
| `app/api/editor/{drafts,revisions}/route.js` | Protected draft/revision scaffolds, fail-closed |
| `db/schema.js`, `db/client.js` | Drizzle schema and Neon driver |
| `lib/editor-auth.js` | Bearer gate; intentionally not full login |
| `lib/request-validation.js` | Content validation |
| `tests/*.test.js` | Authorization and validation regression tests |
| `scripts/{verify-schema,smoke-http}.mjs` | Read-only DB and HTTP test harnesses |
| `.github/workflows/quality.yml` | Build/test CI |
| `docs/*` | Checklists, QA gates, migration notes, engineering report |

## Evidence: DONE vs NOT DONE
- [x] Vercel dev builds READY for previous commits.
- [x] 9/16 database schema inventory, 15 editorial indices on dev.
- [x] Auth gate and payload validation code committed.
- [x] Atomic SQL statement intended to store edits and corresponding audit events.
- [x] Frontend homepage and archive exist on dev.
- [ ] End-to-end HTTP and database transaction tests with evidence.
- [ ] Editor sessions, secure RBAC and actor-attributed audit events.
- [ ] Drizzle migration generation, drift checks, tested backups and restoration.
- [ ] GitHub Actions completed green status confirmed.
- [ ] Resolve PR conflicts; authorize prod connection and promotion.
- [ ] Source manuscripts/posters/content provenance integrated and reviewed.

## Suggested fastest remaining order
1. Verify CI job status; run `npm test` and `npm run build`.
2. Run `db:verify`, then smoke-test authorized dev preview HTTP endpoints; log status and count (15).
3. Implement editor identity and RBAC; run protected draft/revision/audit tests on isolated disposable Neon branch.
4. Generate proper Drizzle migration files from schema, compare with deployed DB SQL, rehearse backup/restore.
5. Resolve PR #2 conflicts against `main`, re-run checks; secure explicit release approval.
6. Deploy to production, verify checks, define rollback owner and procedure.

## Rollback / secret hygiene
- On deployment error: roll back the Vercel deployment to last known stable production version; never delete tables as an improvised rollback.
- On database error: disable write endpoints, investigate; restore using verified Neon backup/branch procedure with operator review.
- Rotate any passwords that were previously pasted into a chat. Do not store connection strings in README, commits or screenshots.
- Keep EDITOR_API_TOKEN unset unless safe authenticated integration is explicitly authorized.

## Local Codex option
Not activated. Codex CLI is an optional assistant for continued implementation and does not require changing Neon/Vercel architecture.
