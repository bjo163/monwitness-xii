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
- [x] Local admin-only sign-in and session authorization are implemented; public account creation is disabled.
- [x] Anonymous HTTP checks: auth session proxy `200 null`, editor session `401`, draft POST `401`.
- [x] Unit tests cover admin RBAC, origin rejection, invalid identities and actor mapping contract.
- [x] Append-only draft/revision SQL + audit-event CTE committed (not E2E proven).
- [x] Shared payload validation and unit test files committed.
- [x] GitHub Actions workflow + DB inventory and HTTP smoke test scripts committed.
- [x] Latest review-head CI run [38161232758](https://github.com/bjo163/monwitness-xii/actions/runs/38161232758) passed all quality gates on `52140679745e2728b269d94e5c0a6ee76e49f021` (locked install, 28 tests, migration reproducibility, production audit, build).
- [x] Latest review-head Vercel deployment `dpl_DmqYbKeqH7BqjPAHrLQmyfLu3B8a` is READY for `5214067`; alias smoke: liveness 200, DB connected 200, archive list 200/15 metadata-only entries, signed-out Auth session 200/null.

## Not DONE [ ] — release blockers ranked
### P0: security and tests
- [ ] Confirm exact Preview database branch mapping and editor session behavior. Current smoke: DB health 200, public list 200/15, known story 200, Auth signed-out session 200/null and public signup 404. Vercel environment metadata labels the Preview DB value for isolated development but does not expose its encrypted host; connector retry prevents observing `/api/editor/session`'s expected 401.
- [x] Confirm GitHub Actions pipeline status; latest review-head CI run `38161232758` is green on `5214067`.
- [ ] Provision owner admin identity and complete live sign-in/session/logout restoration checks.
- [ ] Verify authenticated write + revision + actor-attributed audit and concurrency on isolated dev database.
- [ ] Add rate limiting and choose MFA-capable identity for production editor access; Neon Managed Auth currently does not expose MFA.
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

## Definition of DONE
A checked item requires real evidence (commit SHA, SQL output, test result, deployment URL and HTTP response). **READY build ≠ production complete.** Until security gates pass, use dev only and do not accept real user drafts via public web clients.

## Local AI later: minimal safe configuration
Use Ollama on an owner-controlled machine. Run behind loopback/private network only; do not expose port 11434 to public internet. App integration via server-side `OLLAMA_BASE_URL`, configurable fallback and strict no-autopublish. Neon remains system of record, Vercel hosts public app; local inference host requires secure VPN/tunnel and health checks. Never embed API secrets in frontend.
