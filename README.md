# MOONWITNESS XII 🌙

**FIND LIGHT IN DARKNESS · COMEDY ON. SHALAWAT ON.**

MoonWitness XII is a faceless neon-comic storytelling universe and learning RPG. Its development release contains a database-backed Story Archive, four recurring fictional characters, and an AETHERION 100-level conceptual interface.

> **Handover status (12 October 2026): DEVELOPMENT AUTH INTEGRATION IN PROGRESS — NOT PRODUCTION-READY.**
> Neon Managed Auth is enabled on the isolated development branch. The sign-in flow and admin-only draft routes are implemented, but owner-admin session and authenticated-write E2E tests remain unverified. Production Auth, migrations and release have not been changed.

## Quick links
- [Development frontend](https://monwitness-xii-git-dev-bjo163s-projects.vercel.app)
- [Latest READY remote review visual: The Batteries roster](https://monwitness-ddqa9vtjb-bjo163s-projects.vercel.app/team) — protected Preview for checkpoint `d6c884b`; local unpushed changes are not included.
- [Local Story Archive visual](http://localhost:3005/episodes) — current local production build; archive rows require a development-only database connection.
- [Production frontend](https://monwitness-xii.vercel.app) — older production version; V11 changes are **not** released
- [Story Archive](https://monwitness-xii-git-dev-bjo163s-projects.vercel.app/episodes)
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

Add your *development-only* `DATABASE_URL`, `NEON_AUTH_BASE_URL`, a newly generated `NEON_AUTH_COOKIE_SECRET`, and owner-approved `EDITOR_ADMIN_USER_IDS` to `.env.local` (never commit secrets). The editor allowlist is a comma-separated set of Neon Auth user IDs and must be configured server-side for each deployment. The homepage works without a database; `/episodes` and `/api/health/db` require one. `/editor/login` requires Auth configuration and an owner-provisioned admin account whose ID is allowlisted. The app auth proxy blocks public sign-up routes (404). Neon currently reports provider-level `allow_sign_up=true` and its documented Managed Auth controls do not offer a restricted-signup switch; do not treat the app proxy as provider-wide signup disablement. Editor writes require both the session's `admin` role and an exact ID match in `EDITOR_ADMIN_USER_IDS`; empty or missing allowlists deny all editor writes. Direct provider sign-up behavior, identity onboarding policy, and authenticated admin E2E remain open release gates.

```bash
npm test
npm run db:check # regenerates migration SQL and validates the committed migration history
npm audit
npm run build
npm run db:verify # read-only, needs DATABASE_URL
```

For populated-development baseline preflight only, also set `EXPECTED_DATABASE_HOST` and `EXPECTED_DATABASE_NAME` using the independently confirmed Neon development endpoint details. The verifier rejects missing or mismatched target values before connecting; see [the migration reconciliation runbook](docs/MIGRATION_LEDGER_RECONCILIATION_V11.md). This guard does not authorize any database write.

`npm test` includes an in-memory PostgreSQL migration execution test; it does not require Docker or a Neon connection.

For a local HTTP smoke without database credentials, use PowerShell: `$env:SMOKE_PROFILE = 'local'; npm run smoke:http`. Local mode only permits loopback hosts. It accepts the safe database/archive `503` response when no local `DATABASE_URL` exists; this does not count as database connectivity verification. For an authorized connected Preview, leave the profile at its default and set `$env:SMOKE_BASE_URL = 'https://your-authorized-preview.example'` before running `npm run smoke:http`. Do not put credentials in the URL.

The latest local production build's [Story Archive page](http://localhost:3005/episodes) is running. It shows a safe unavailable/retry state when `.env.local` has no `DATABASE_URL`; its public-index and source-provenance notice remains visible.

The current local review includes an Archive notice explaining that a published index does not establish source provenance or reuse rights. Without a local development `DATABASE_URL`, the notice is visible but the database-backed episode cards show the safe retry state. This local review change is not in the remote Preview.

`npm run db:generate` and `npm run db:migrate` exist. SQL migration artifacts are reproducible and were replayed against an isolated Neon rehearsal database; the development branch already has its schema but lacks a Drizzle migration ledger, so baseline stamping remains a release blocker. **Do not run migrations against production without review and approval.**

The current V11 hardening changes are in draft [PR #4](https://github.com/bjo163/monwitness-xii/pull/4), targeting `dev`. They have not been merged or released. See [CHANGELOG.md](CHANGELOG.md) for this review's changes and outstanding gates.

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

Editor writes require a same-origin Neon Auth session with the `admin` role and a matching server-side `EDITOR_ADMIN_USER_IDS` entry; audit records attribute each write to the mapped application user. Authentication is fail-closed if configuration or the provider is unavailable. The application auth proxy permits only SDK-defined methods for its four allowlisted routes; mismatched methods return 405 with a route-specific `Allow` header, `OPTIONS` advertises only that route's allowed method, and `HEAD` is rejected without calling the provider. Public sign-up requests to this app are rejected with 404. Neon Auth currently reports provider-level `allow_sign_up=true`, and Neon documents restricted sign-up as unsupported/not yet available. This means a direct provider registration may still be possible; the app proxy is not a provider-wide signup control. The explicit user-ID allowlist prevents a newly registered account from gaining editor rights unless an owner configures that ID server-side; identity onboarding policy and authenticated admin E2E remain release gates. The limiter passed PGlite tests and an isolated Neon SQL concurrency rehearsal; authenticated application-route writes, owner-admin sign-in, and route-level concurrency remain unverified before accepting drafts. Neon Managed Auth currently does not provide MFA in this configuration.

## Release rules
- Keep **`dev`** for development, **`main`** for production. No forced merge.
- Never publish private drafts or personal witness logs by default.
- The narrative is creative and reflective; it is not an assertion of external divine authority or medical facts.
- Always distinguish original manuscripts, editorial summaries, source references, and claims needing verification.
- See [handover runbook](docs/HANDOVER_V11.md) for exact remaining tasks, verification evidence, and rollback plan.

Architect / Storyteller: ROCKSOUL BIN YOSAN 2IN1.
