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
- [x] Local admin-only sign-in and session authorization are implemented; the application auth proxy denies public sign-up routes. Editor writes require both the provider's `admin` role and the exact user ID in a server-only `EDITOR_ADMIN_USER_IDS` allowlist.
- [ ] Resolve identity onboarding before accepting editors: Neon Auth reports `allow_sign_up=true`, and current Neon docs say restricted signups are not yet supported. The app proxy returns 404 for signup routes, but direct provider signup is not proven blocked. Configure the owner-verified user ID per environment, verify provider-side role assignment, and select another auth approach if invite-only registration/MFA is a hard requirement.
- [x] Anonymous HTTP checks: auth session proxy `200 null`, editor session `401`, draft POST `401`.
- [x] Unit tests cover admin RBAC, origin rejection, invalid identities and actor mapping contract.
- [x] Append-only draft/revision SQL + audit-event CTE committed (not E2E proven).
- [x] Shared payload validation and unit test files committed.
- [x] GitHub Actions workflow + DB inventory and HTTP smoke test scripts committed.
- [x] Earlier exact-head CI and Preview smoke passes are retained below as historical evidence. The current review-head CI status is recorded in the evidence snapshot and linked from PR #4.

## Not DONE [ ] — release blockers ranked
### P0: security and tests
- [ ] Confirm exact Preview database branch mapping. Sanitized Vercel metadata labels the Preview DB/Auth setup for isolated development and its 15 story identifiers match both dev and its rehearsal clone; this does not identify the exact branch. The encrypted connection host remains unread.
- [x] Verify signed-out application session responses through the authenticated Preview fetch: Auth session `200 null`, editor session `401`, and app signup path `404` (latest recorded app verification is on the `09624ca` deployment; current review-head CI does not itself redeploy Preview).
- [x] Review-head CI passed at checkpoint `98e5495d2e5ce60ea9806f11911b85299d5e01c1` in [38173945713](https://github.com/bjo163/monwitness-xii/actions/runs/38173945713); the follow-up evidence refresh `e69d82f1ae936eeffb30e946e54a43365ee7cc50` also passed exact-head CI [38174166221](https://github.com/bjo163/monwitness-xii/actions/runs/38174166221). The moving review head is tracked from PR #4.
- [ ] Provision owner admin identity and complete live sign-in/session/logout restoration checks.
- [ ] Verify authenticated write + revision + actor-attributed audit and concurrency on isolated dev database.
- [x] Implement an atomic database-backed limit of 30 editor writes per actor per 15-minute window; PGlite concurrency and isolated Neon apply/limit/reset/rollback rehearsals pass. Applying migration `0002` to persistent dev and authenticated end-to-end validation remain gated.
- [ ] Choose an MFA-capable identity for production editor access; Neon Managed Auth currently does not expose MFA.
- [ ] End-to-end create draft + revision + audit on dev-only database; 403/401 invalid-session tests; concurrency and retry.
- [x] Generate reproducible migrations and verify catalog replay. Persistent dev schema alignment and migration-ledger application are still gated: dev has `CASCADE` where the reviewed target is `RESTRICT`, and no Drizzle ledger; the disposable-clone rehearsal proved the plan without writing to dev.
- [ ] Review any shared credentials, rotate old password if necessary.

### P1: go-live
- [ ] Backups and restore rehearsal for representative application data; define RPO/RTO and rollback actions. An empty-database snapshot/restore was rehearsed, but scheduled retention is unavailable on the selected Free plan.
- [ ] Resolve conflict of existing PR #2 dev→main; live GitHub state remains open and `mergeable=false`; do not force-merge.
- [ ] Decide which editorial entries may be public; verify content and rights.
- [ ] Validate production DATABASE_URL maps to intended project/branch; obtain explicit go/no-go.
- [ ] Stage and deploy, perform smoke tests, sign off.

### P2: after release, can be parallel
- [ ] Reconstruct full original archive with immutable sources, posters, witness-log privacy and credits.
- [ ] Mizan/semantic engine human review, CAB, AETHERION persistent progression and remaining V11 modules.
- [ ] Optional local LLM adapter for self-hosted inference (not a database replacement).

## Live review checkpoint — 2026-10-12

- App-code checkpoint `d6c884b95b96e50134b43ed4bdc5eea52aed387e` passed exact-head Actions [38179906571](https://github.com/bjo163/monwitness-xii/actions/runs/38179906571), and READY Preview `dpl_HnnQ6MgscYdnHiSTWGM7SwtkZJch` remains available: [open The Batteries roster](https://monwitness-ddqa9vtjb-bjo163s-projects.vercel.app/team). Protected read-only fetch returned 200 for `/`, `/team`, `/episodes`, `/api/episodes` (15 rows), `/api/health/db` (`connected`, `development`), and `/api/auth/get-session` (`null`); app signup proxy returned 404. The editor-session fetch was intercepted by Vercel deployment protection after redirect. The encrypted `DATABASE_URL` host was not read and exact Preview DB branch mapping remains open. Documentation-only repository head `06e2a119377e46a735714608becf96e095846553` passed exact-head Actions [38180083381](https://github.com/bjo163/monwitness-xii/actions/runs/38180083381), but its Preview attempt hit the Free quota. Owner directed local-only continuation; no further push or deployment is planned, and no billing change occurred.
- Latest local-only code commit `d194867` adds the Archive provenance notice. Its tests (47/47), schema check, build, loopback smoke (11/11), and local route render pass; because it has not been pushed, there is no CI or Preview evidence for this change. Do not conflate the local verification with remote release evidence.
- At the last live GitHub check, PR #4 targets `dev`, is open/draft/unmerged and mergeable, with no submitted reviews; PR #2 is open/unmerged and not mergeable (`dev` → `main`). No PR was merged. Recheck moving metadata before integration.
- Owner's latest direction is to keep work local and avoid further deploys or pushes. The latest app Preview remains the READY `d6c884b` checkpoint; the docs-only `06e2a11` deployment attempt hit Vercel's Free quota. No plan or billing change occurred.
- The production Neon schedule remains empty; its API says schedule creation is not enabled on this Free project. Owner chose to remain Free, so daily/30-day backups are unmet. Snapshot/restore has only been tested for the empty production application database. App-data restore, RPO/RTO, and a free private secondary target remain unverified.
- Neon dev read-only query confirms all 15 stories remain `published` with `original_source_status='source_needed'`, as the owner directed until original material, credits, and rights evidence are available.
- Managed Auth credential-attempt throttling, direct provider signup restriction, owner admin onboarding/MFA, authenticated editor E2E, and persistent-dev migration-ledger/apply remain unverified. Production remains **NO-GO**.

## Historical evidence snapshots — 2026-10-12

The following SHA-specific bullets and archived log are historical checkpoints. Consult the live checkpoint above and PR #4 / Issue #3 for current branch state.

- Review branch `codex/v11-release-readiness` evidence refresh `e69d82f1ae936eeffb30e946e54a43365ee7cc50` passed exact-head GitHub Actions run [38174166221](https://github.com/bjo163/monwitness-xii/actions/runs/38174166221) (locked install, auth tests, migration reproducibility, production dependency audit, production build). PR #4 is the draft review path targeting `dev`; the latest recorded state is open and mergeable. PR #2 remains open/unmergeable from `dev` to `main`. See [PR #4](https://github.com/bjo163/monwitness-xii/pull/4) and [Issue #3](https://github.com/bjo163/monwitness-xii/issues/3) for moving GitHub state. No PR was merged.
- The latest recorded protected Preview app-level smoke is on app SHA `09624ca`: homepage, handover, archive, representative detail and DB health returned 200; DB was connected/development; archive API returned 15 metadata-only entries; signed-out Auth session was `200 null`; editor session was `401`; app signup path was `404`. A later documentation-only review-head CI pass does not imply a new Preview deployment.
- Fresh Vercel read-only inventory found READY app Preview `dpl_DRRUuvKdFybsN3qtfirfbVaQJVdp` for app-code commit `4739f27`. Protected fetch returned 200 for `/team`, homepage, and DB health (`connected`, `development`); the roster visibly uses the canonical four faceless character portraits. Documentation-only head `06a47e3` is not separately deployed. The earlier `e25d9e0` HTTP 402 quota refusal is historical; no production setting or billing changed. Exact encrypted Preview DB branch mapping remains open.
- Sanitized Vercel environment metadata labels the Preview DB/Auth setup for isolated development. Read-only data comparison found the same 15 published `slug/title` pairs on dev `br-green-butterfly-b51kp4b1`, rehearsal clone `br-flat-shape-b5ofan15`, and Preview. This proves dev-data lineage but cannot distinguish the two branches; the encrypted hostname was not read.
- Rate limiting is implemented for both editor write routes (30 writes per authenticated actor per 15 minutes, atomic database reservation, 429 with `Retry-After`, fail-closed 503). Local tests and PGlite cover policy, concurrency, and reset. On the approved disposable Neon branch, 35 concurrent SQL upserts admitted 30 and rejected 5; the counter was 30. The test data/table were removed. This is database-level concurrency evidence only; no authenticated route-level write has been sent.
- The editor-write limiter does not cover sign-in/password-attempt throttling; that control remains unverified.
- Migration `0002_editor_write_limits` and the retention migration were rehearsed on an isolated branch, but neither is applied to persistent dev or Preview. Dev still needs a positively mapped application connection and a reviewed ledger-stamping/migration decision. No production migration or deployment was made.
- A manual production snapshot was restored to an isolated branch successfully for the then-empty application database. Owner selected a daily schedule with 30-day retention and chose to stay on Free. The production schedule remains `[]`; the project API rejects schedule creation as not enabled, and Neon’s snapshot guide says automatic schedules are available on paid plans. Free therefore does not meet the requested schedule/retention. A GitHub Actions artifact is a possible encrypted-ciphertext destination with up to 90-day retention, but GitHub Free includes 500 MB Actions storage shared with Packages and usage beyond the allowance can be billed. The repository is public, so only client-side encrypted dumps would be acceptable. No workflow, size cap, DB secret, hard-stop budget, or restore test is configured, and the owner has not approved that destination. S3 adds separate cost and is not configured. No plan/billing or production database change was made. RPO/RTO and recovery of representative application data remain open. [Neon snapshot scheduling](https://neon.com/blog/three-ways-to-use-your-snapshots), [Actions limits](https://docs.github.com/en/actions/reference/limits), [included usage](https://docs.github.com/en/billing/reference/product-usage-included), [artifact retention](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-your-repository).
- Migration SQL generation and reproducibility checks pass, and the populated-dev ledger/apply/rollback sequence was rehearsed on a disposable clone. Persistent dev remains unmodified, has no migration ledger, and its revision FK remains `CASCADE` pending the reviewed `RESTRICT` migration and a separately approved apply decision.
- The 15 existing dev records are published metadata entries with `original_source_status=source_needed`. A fresh schema check found no dedicated `source_verified` or `editorial_index_only` columns, and no such keys in inspected row metadata; media, evidence, and revision tables are empty. Treat these as metadata-only public indexes, not verified source material. Source provenance, credits, and rights remain unreviewed.
- No owner admin account exists for authenticated E2E; Neon Managed Auth does not provide MFA in this configuration. Choose an MFA-capable production identity, verify actor-attributed writes and audit events on a properly isolated app-connected DB, resolve PR #2 and the listed content/backup gates, then seek separate explicit approval for production promotion.

**Release decision: NO-GO for production.**

## Definition of DONE
A checked item requires real evidence (commit SHA, SQL output, test result, deployment URL and HTTP response). **READY build ≠ production complete.** Until security gates pass, use dev only and do not accept real user drafts via public web clients.

## Local AI later: minimal safe configuration
Use Ollama on an owner-controlled machine. Run behind loopback/private network only; do not expose port 11434 to public internet. App integration via server-side `OLLAMA_BASE_URL`, configurable fallback and strict no-autopublish. Neon remains system of record, Vercel hosts public app; local inference host requires secure VPN/tunnel and health checks. Never embed API secrets in frontend.
