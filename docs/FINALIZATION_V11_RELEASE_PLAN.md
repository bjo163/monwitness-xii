# MOONWITNESS XII — V11 FINALIZATION / GO-NO-GO

Updated: 2026-10-12. Review branch: `codex/v11-release-readiness`. Goal: release Story Archive without exposing originals or breaking production.

## Decision: retain Neon + Vercel for release; Local AI is optional
Replacing a functioning deployed stack with a local inference engine now is **not** a release shortcut.
A local model (e.g. Ollama or llama.cpp) can be integrated later for optional AI-assisted tagging/search. Keep all scripture/religious analyses human-reviewed, no autonomous publishing, no private content sent to external models without consent.

## Verified DONE [x]
- [x] Neon project `proud-surf-04547637`; dev branch `br-green-butterfly-b51kp4b1`.
- [x] Development schemas 9, tables 16; no production schema migration.
- [x] Preview DATABASE_URL separated from production secrets.
- [x] Development Story Archive includes 15 **editorial index entries**, not source-complete manuscripts.
- [x] GET published-only episodes API, /episodes UI, homepage link, DB health probe implemented.
- [x] Neon Managed Auth provisioned on isolated dev branch only; production untouched.
- [x] Local admin-only sign-in and session authorization are implemented; the application auth proxy denies public sign-up routes.
- [ ] Resolve identity onboarding before accepting editors: Neon Auth reports `allow_sign_up=true`, and current Neon docs say restricted signups are not yet supported. The app proxy returns 404 for signup routes, but direct provider signup is not proven blocked. Keep provider-side role assignment owner-controlled, verify how roles are granted, and select another auth approach if invite-only registration/MFA is a hard requirement.
- [x] Anonymous HTTP checks: auth session proxy `200 null`, editor session `401`, draft POST `401`.
- [x] Unit tests cover admin RBAC, origin rejection, invalid identities and actor mapping contract.
- [x] Append-only draft/revision SQL + audit-event CTE committed (not E2E proven).
- [x] Shared payload validation and unit test files committed.
- [x] GitHub Actions workflow + DB inventory and HTTP smoke test scripts committed.
- [x] Prior exact-head CI run [38162078569](https://github.com/bjo163/monwitness-xii/actions/runs/38162078569) passed all quality gates on `41221a438442edd0bf0bcba24283226f6139efe1` (locked install, 28 tests, migration reproducibility, production audit, build). The subsequent baseline-reconciliation verifier update passes locally and is awaiting a new CI run.
- [x] Prior review-head Vercel deployment `dpl_CA8SrdHx5kQzb8EEgqbjXkbQAvGu` is READY for `41221a4`; alias smoke: liveness 200, DB connected 200, archive list 200/15 metadata-only entries, signed-out Auth session 200/null. The new verifier mode has not been deployed yet.

## Not DONE [ ] — release blockers ranked
### P0: security and tests
- [ ] Confirm exact Preview database branch mapping and editor session behavior. Current smoke: DB health 200, public list 200/15, known story 200, Auth signed-out session 200/null and public signup 404. Vercel environment metadata labels the Preview DB value for isolated development but does not expose its encrypted host; connector retry prevents observing `/api/editor/session`'s expected 401.
- [ ] Confirm GitHub Actions is green on the current verifier change; previous exact-head run `38162078569` passed on `41221a4`.
- [ ] Provision owner admin identity and complete live sign-in/session/logout restoration checks.
- [ ] Verify authenticated write + revision + actor-attributed audit and concurrency on isolated dev database.
- [x] Implement an atomic database-backed limit of 30 editor writes per actor per 15-minute window; PGlite concurrency and isolated Neon apply/limit/reset/rollback rehearsals pass. Applying migration `0002` to persistent dev and authenticated end-to-end validation remain gated.
- [ ] Choose an MFA-capable identity for production editor access; Neon Managed Auth currently does not expose MFA.
- [ ] End-to-end create draft + revision + audit on dev-only database; 403/401 invalid-session tests; concurrency and retry.
- [ ] Finish schema alignment of Drizzle definitions with actual dev SQL; generate and commit reproducible migration.
- [ ] Review any shared credentials, rotate old password if necessary.

### P1: go-live
- [ ] Backups and restore rehearsal; defined rollback actions.
- [ ] Resolve conflict of existing PR #2 dev→main; live GitHub state remains open and `mergeable=false`; do not force-merge.
- [ ] Decide which editorial entries may be public; verify content and rights.
- [ ] Validate production DATABASE_URL maps to intended project/branch; obtain explicit go/no-go.
- [ ] Stage and deploy, perform smoke tests, sign off.

### P2: after release, can be parallel
- [ ] Reconstruct full original archive with immutable sources, posters, witness-log privacy and credits.
- [ ] Mizan/semantic engine human review, CAB, AETHERION persistent progression and remaining V11 modules.
- [ ] Optional local LLM adapter for self-hosted inference (not a database replacement).

## Current evidence snapshot — 2026-10-12

This snapshot supersedes earlier “current”/“latest” references above; those bullets preserve the history of prior verification passes.

- Review branch `codex/v11-release-readiness` contains integration commit `e5eff67a2cc5186f85fe593fbe4d91a40d6ee895`, merging current `main` (`7daffea`) into the review branch. Draft PR #4 remains open to `dev`; PR #2 remains open/dirty (`dev` → `main`) until this integration is reviewed and lands in `dev`. Neither PR was merged.
- CI [38165821216](https://github.com/bjo163/monwitness-xii/actions/runs/38165821216) passed on exact integration SHA `e5eff67a2cc5186f85fe593fbe4d91a40d6ee895`. Vercel Preview `dpl_HCuUTFQgX4QCBXGYJ1PB3mBtGVGr` is READY for that SHA. Authorized fetch returned 200 for `/`, `/team`, `/throwing-dice`, `/four-books`, `/aetherion`, `/witness-log`, `/the-lab`, `/episodes`, `/api/health`, `/api/health/db` (connected), `/api/episodes` (15 metadata-only entries), and a known story detail. Locally, `npm run build`, `npm test` (30/30), and `npm run db:check` passed. Direct protected smoke still cannot verify the app-level `/api/editor/session` response.
- Rate limiting is implemented for both editor write routes (30 writes per authenticated actor per 15 minutes, atomic database reservation, 429 with `Retry-After`, fail-closed 503). Local tests and PGlite cover policy, concurrency, and reset. On the approved disposable Neon branch, 35 concurrent SQL upserts admitted 30 and rejected 5; the counter was 30. The test data/table were removed. This is database-level concurrency evidence only; no authenticated route-level write has been sent.
- The editor-write limiter does not cover sign-in/password-attempt throttling; that control remains unverified.
- Migration `0002_editor_write_limits` and the retention migration were rehearsed on an isolated branch, but neither is applied to persistent dev or Preview. Dev still needs a positively mapped application connection and a reviewed ledger-stamping/migration decision. No production migration or deployment was made.
- A manual production snapshot was restored to an isolated branch successfully for the then-empty application database. Owner selected a daily schedule with 30-day retention; the current production branch still reads `schedule: []`. Current project plan is Free (`free_v3`), and Neon rejected schedule creation because it is not enabled on that plan. A read-only usage snapshot for the current period (2026-10-11T13:08:19Z–2026-11-01T00:00:00Z) reports 369,215 bytes transferred, 2,135 compute seconds, 8,364 active seconds, 0 written bytes, and 0 data-storage byte-hours. These are consumption counters, not an invoice or forecast. No plan/billing change was made. The paid-plan budget ceiling has not yet been provided, so enabling the schedule remains gated. RPO/RTO and recovery of representative application data remain open.
- The 15 existing dev records are public editorial indexes only: all are `source_verified=false`, `editorial_index_only`, and `source_needed`. Media, evidence, and revision tables were empty in the recorded read-only inventory. Source provenance, credits, and rights remain unreviewed.
- No owner admin account exists for authenticated E2E; Neon Managed Auth does not provide MFA in this configuration. Choose an MFA-capable production identity, verify actor-attributed writes and audit events on a properly isolated app-connected DB, resolve PR #2 and the listed content/backup gates, then seek separate explicit approval for production promotion.

**Release decision: NO-GO for production.**

## Definition of DONE
A checked item requires real evidence (commit SHA, SQL output, test result, deployment URL and HTTP response). **READY build ≠ production complete.** Until security gates pass, use dev only and do not accept real user drafts via public web clients.

## Local AI later: minimal safe configuration
Use Ollama on an owner-controlled machine. Run behind loopback/private network only; do not expose port 11434 to public internet. App integration via server-side `OLLAMA_BASE_URL`, configurable fallback and strict no-autopublish. Neon remains system of record, Vercel hosts public app; local inference host requires secure VPN/tunnel and health checks. Never embed API secrets in frontend.
