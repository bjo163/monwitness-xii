# MOONWITNESS XII 🌙

**FIND LIGHT IN DARKNESS · COMEDY ON. SHALAWAT ON.**

MoonWitness XII is a faceless neon-comic storytelling universe and learning RPG. Its development release contains a database-backed Story Archive, four recurring fictional characters, and an AETHERION 100-level conceptual interface.

> **Handover status (13 October 2026): LOCAL RELEASE REVIEW IN PROGRESS — NOT PRODUCTION-READY.**
> Editor access requires a verified email, Neon admin role, and exact owner allowlist. Local checks pass (134/134 tests; HTTP smoke 40/40), but owner-authenticated E2E remains unverified. Neon Managed Auth still permits public sign-up; restricted sign-up, provider login throttling, and MFA remain open gates. Production remains NO-GO.

## Quick links
- Local visual routes after starting the app: `/`, `/team`, `/episodes`, and `/handover` (see [Local development](#local-development)). No port-specific localhost URL is recorded because local ports vary by session.
- Historical Development Preview: `https://monwitness-xii-git-dev-bjo163s-projects.vercel.app` — this may not include the current local review commits.
- Historical READY review Preview: [The Batteries roster](https://monwitness-ddqa9vtjb-bjo163s-projects.vercel.app/team), checkpoint `d6c884b`; protected and does not contain current local changes.
- Existing production frontend: [moonwitness-xii.vercel.app](https://monwitness-xii.vercel.app) — V11 changes are **not** released.
- [Grand Plan implementation checklist](docs/GRAND_MASTER_PLAN_IMPLEMENTATION_CHECKLIST.md)
- [Release gates](docs/RELEASE_GATES_V11.md)
- [Go / No-Go](docs/FINALIZATION_V11_RELEASE_PLAN.md)
- [Handover runbook](docs/HANDOVER_V11.md)
- [Fast-track goal issue #3](https://github.com/bjo163/monwitness-xii/issues/3)
- [Open PR #2](https://github.com/bjo163/monwitness-xii/pull/2) — conflicts and release blockers

## Stack
Next.js 16 / React 19, Neon Managed Better Auth, PostgreSQL, Drizzle ORM, Vercel, GitHub Actions.
Nine logical schemas and 16 tables exist on the **isolated Neon development branch**. The original creative archive is not fully ingested: 15 records are only editorial indexes with `source_needed`.

## Local development
Requirements: Node.js 22+ and npm.

```bash
git clone https://github.com/bjo163/monwitness-xii.git
cd monwitness-xii
git switch dev
npm ci
cp .env.example .env.local
npm run dev
```

Add your *development-only* `DATABASE_URL`, independently verified `EXPECTED_DATABASE_HOST` and `EXPECTED_DATABASE_NAME`, `NEON_AUTH_BASE_URL`, a newly generated `NEON_AUTH_COOKIE_SECRET`, and owner-approved `EDITOR_ADMIN_USER_IDS` to `.env.local` (never commit secrets). Database routes, editor writes, and `db:verify` fail closed unless the expected host and database name match the URL; obtain expected values separately from the verified Neon endpoint details. The editor allowlist is a comma-separated set of Neon Auth user IDs and must be configured server-side for each deployment. The homepage works without a database; `/episodes` and `/api/health/db` require a verified target. `/editor/login` requires Auth configuration and an owner-provisioned admin account whose ID is allowlisted. The app auth proxy blocks public sign-up routes (404). Neon currently reports provider-level `allow_sign_up=true` and its documented Managed Auth controls do not offer a restricted-signup switch; do not treat the app proxy as provider-wide signup disablement. Editor writes require both the session's `admin` role and an exact ID match in `EDITOR_ADMIN_USER_IDS`; empty or missing allowlists deny all editor writes. Local migrations `0003`/`0004` add a database-backed freeze control; its target-guarded `scripts/editor-write-freeze.mjs` operator commands are documented in [the backup/restore runbook](docs/BACKUP_RESTORE_RUNBOOK_V11.md). These migrations have not been applied to persistent dev, Preview, or production. Direct provider sign-up behavior, identity onboarding policy, and authenticated admin E2E remain open release gates.

On a shared Windows machine, restrict `.env.local` to its owner, SYSTEM, and local Administrators. Run this from the repository as the account that owns the file:

```powershell
$owner = "$env:USERDOMAIN\$env:USERNAME"
icacls .env.local /inheritance:r /grant:r "$($owner):(F)" "NT AUTHORITY\SYSTEM:(F)" "BUILTIN\Administrators:(F)"
```

```bash
npm test
npm run db:check # regenerates migration SQL and validates the committed migration history
npm audit
npm run build
npm run db:verify # read-only, needs DATABASE_URL
```

For populated-development baseline preflight only, also set `EXPECTED_DATABASE_HOST` and `EXPECTED_DATABASE_NAME` using the independently confirmed Neon development endpoint details. The verifier rejects missing or mismatched target values before connecting; see [the migration reconciliation runbook](docs/MIGRATION_LEDGER_RECONCILIATION_V11.md). This guard does not authorize any database write.

`npm test` includes an in-memory PostgreSQL migration execution test; it does not require Docker or a Neon connection.

For a CSP-required local HTTP smoke without database credentials, start the production build in one PowerShell window with `npm run start -- --hostname 127.0.0.1 --port 3000`. In a second window, set `$env:SMOKE_PROFILE = 'local'; $env:SMOKE_BASE_URL = 'http://127.0.0.1:3000'; $env:SMOKE_EXPECT_CSP = '1'; npm run smoke:http`. If port 3000 is occupied, choose an available port and use it in both commands. Local mode only permits loopback hosts. It accepts the safe database/archive `503` response when no local `DATABASE_URL` exists; this does not count as database connectivity verification. For an authorized connected Preview, leave the profile at its default and set `$env:SMOKE_BASE_URL = 'https://your-authorized-preview.example'` before running `npm run smoke:http`. Do not put credentials in the URL.

Open `/episodes` for the Story Archive and `/handover` for the release dashboard after starting the local app. The Archive shows a safe unavailable/retry state when `.env.local` has no `DATABASE_URL`; its public-index and source-provenance notice remains visible. The local handover keeps production NO-GO and identifies the current release gates. Local pages do not imply a Preview or production deployment.

The current local review includes an Archive notice explaining that a published index does not establish source provenance or reuse rights. Without a local development `DATABASE_URL`, the notice is visible but the database-backed episode cards show the safe retry state. This local review change is not in the remote Preview.

`npm run db:generate` and `npm run db:migrate` exist. SQL migration artifacts are reproducible and were replayed against an isolated Neon rehearsal database; the development branch already has its schema but lacks a Drizzle migration ledger, so baseline stamping remains a release blocker. The guarded npm commands and the repository's default Drizzle config require a `DATABASE_URL`, independently verified `EXPECTED_DATABASE_HOST` and `EXPECTED_DATABASE_NAME`, and operation-specific confirmation before connected migrations, Studio, or schema introspection. CLI connection overrides are rejected, and direct `drizzle-kit push` is disabled so schema changes use reviewed SQL migration files; Drizzle documents that `push` applies generated SQL directly to the database ([Drizzle Kit push](https://orm.drizzle.team/docs/drizzle-kit-push)). **Do not pass a custom `--config` to a direct Drizzle command:** Drizzle supports loading an alternate config file ([Drizzle Kit config selection](https://orm.drizzle.team/docs/kit-overview)), and that file is outside the repository's default-config guard. Use the guarded npm migration/Studio wrappers instead. See [database setup](docs/DATABASE_SETUP.md). **Do not run migrations against production without review and approval.**

`npm run db:verify` is read-only. It compares schema shape and checks that every Drizzle migration ledger row matches the repository journal by SHA-256 and timestamp in order. Both normal verification and `--baseline-reconciliation` require independently confirmed `EXPECTED_DATABASE_HOST` and `EXPECTED_DATABASE_NAME` values matching `DATABASE_URL` before connecting. Baseline reconciliation allows an absent ledger for preflight and fails when one already exists.

The current V11 hardening changes are in draft [PR #4](https://github.com/bjo163/monwitness-xii/pull/4), targeting `dev`. They have not been merged or released. Every HTML page uses one per-request nonce for both script and style policies; local smoke checks nonce rotation, matching directive/element nonces, no inline style attributes, and no page CSP on APIs or static assets. Nonces require dynamic page rendering, so all pages are server-rendered on demand. The selected Vercel Hobby plan includes 1 million function invocations/month and 4 CPU-hours; monitor actual usage before promotion. Current local CSP code has no remote CI or Preview result. See [CHANGELOG.md](CHANGELOG.md) for review changes and outstanding gates.

For recovery operations, use the [V11 backup/restore runbook](docs/BACKUP_RESTORE_RUNBOOK_V11.md). It documents the isolated, unfinalized restore workflow and the remaining production-data/RPO/RTO gates.

## API surface
| Route | Purpose | Security |
| --- | --- | --- |
| `GET /api/health/db` | Read-only DB connectivity | Public health signal (no secrets) |
| `GET /api/episodes` | Published editorial indexes plus a provenance notice | Five-field allowlist; no-store; no source or rights evidence |
| `GET /api/episodes/:slug` | Published episode index plus a provenance notice | Five-field allowlist; no-store; no source or rights evidence |
| `GET /api/auth/get-session` | Current Neon Auth session | Neon Auth session; no-store |
| `POST /api/auth/sign-in/email` | Email/password sign-in | Neon Auth session; no-store |
| `POST /api/auth/sign-out` | End current browser session | Neon Auth session; no-store |
| `GET /api/auth/token` | Retrieve a Neon Auth token | Neon Auth session; no-store |
| `GET /api/editor/session` | Current editor role and allowlist status | Own session only |
| `POST /api/editor/drafts` | Draft + immutable first revision + audit | Same-origin Neon Auth admin session and server allowlist |
| `POST /api/editor/revisions` | Append immutable revision + audit | Same-origin Neon Auth admin session and server allowlist |

Editor writes require a same-origin Neon Auth session with the `admin` role and a matching server-side `EDITOR_ADMIN_USER_IDS` entry; each editor authorization check bypasses the SDK signed session-data cookie cache and asks the provider for current session/role state; audit records attribute each write to the mapped application user. Authentication is fail-closed if configuration or the provider is unavailable. The application auth proxy permits only SDK-defined methods for its four allowlisted routes; mismatched methods return 405 with a route-specific `Allow` header, `OPTIONS` advertises only that route's allowed method, and `HEAD` is rejected without calling the provider. Public sign-up requests to this app are rejected with 404. Neon Auth currently reports provider-level `allow_sign_up=true`, and Neon documents restricted sign-up as unsupported/not yet available. This means a direct provider registration may still be possible; the app proxy is not a provider-wide signup control. The explicit user-ID allowlist prevents a newly registered account from gaining editor rights unless an owner configures that ID server-side; identity onboarding policy and authenticated admin E2E remain release gates. The limiter passed PGlite tests and an isolated Neon SQL concurrency rehearsal; authenticated application-route writes, owner-admin sign-in, and route-level concurrency remain unverified before accepting drafts. Neon Managed Auth currently does not provide MFA in this configuration.

## Release rules
- Keep **`dev`** for development, **`main`** for production. No forced merge.
- Never publish private drafts or personal witness logs by default.
- The narrative is creative and reflective; it is not an assertion of external divine authority or medical facts.
- Always distinguish original manuscripts, editorial summaries, source references, and claims needing verification.
- See [handover runbook](docs/HANDOVER_V11.md) for exact remaining tasks, verification evidence, and rollback plan.

Architect / Storyteller: ROCKSOUL BIN YOSAN 2IN1.
