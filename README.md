# MOONWITNESS XII 🌙

**FIND LIGHT IN DARKNESS · COMEDY ON. SHALAWAT ON.**

MoonWitness XII is a faceless neon-comic storytelling universe and learning RPG. Its development release contains a database-backed Story Archive, four recurring fictional characters, and an AETHERION 100-level conceptual interface.

> **Handover status (12 October 2026): DEVELOPMENT AUTH INTEGRATION IN PROGRESS — NOT PRODUCTION-READY.**
> Neon Managed Auth is enabled on the isolated development branch. The sign-in flow and admin-only draft routes are implemented, but owner-admin session and authenticated-write E2E tests remain unverified. Production Auth, migrations and release have not been changed.

## Quick links
- [Development frontend](https://monwitness-xii-git-dev-bjo163s-projects.vercel.app)
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
npm install
cp .env.example .env.local
npm run dev
```

Add your *development-only* `DATABASE_URL`, `NEON_AUTH_BASE_URL`, and a newly generated `NEON_AUTH_COOKIE_SECRET` to `.env.local` (never commit secrets). The homepage works without a database; `/episodes` and `/api/health/db` require one. `/editor/login` requires Auth configuration and an owner-provisioned admin account. Public sign-up is disabled.

```bash
npm test
npm run db:check # regenerates migration SQL and validates the committed migration history
npm audit --omit=dev
npm run build
npm run db:verify # read-only, needs DATABASE_URL
SMOKE_BASE_URL=https://your-authorized-preview.example npm run smoke:http
```

`npm test` includes an in-memory PostgreSQL migration execution test; it does not require Docker or a Neon connection.

`npm run db:generate` and `npm run db:migrate` exist. SQL migration artifacts are reproducible and were replayed against an isolated Neon rehearsal database; the development branch already has its schema but lacks a Drizzle migration ledger, so baseline stamping remains a release blocker. **Do not run migrations against production without review and approval.**

The current V11 hardening changes are in draft [PR #4](https://github.com/bjo163/monwitness-xii/pull/4), targeting `dev`. They have not been merged or released. See [CHANGELOG.md](CHANGELOG.md) for this review's changes and outstanding gates.

## API surface
| Route | Purpose | Security |
| --- | --- | --- |
| `GET /api/health/db` | Read-only DB connectivity | Public health signal (no secrets) |
| `GET /api/episodes` | Published editorial indexes | Published-only |
| `GET /api/episodes/:slug` | Published episode index | Published-only |
| `GET/POST/PUT/PATCH/DELETE /api/auth/*` | Neon Managed Auth session routes | Neon Auth session |
| `GET /api/editor/session` | Current editor role | Own session only |
| `POST /api/editor/drafts` | Draft + immutable first revision + audit | Same-origin Neon Auth admin session |
| `POST /api/editor/revisions` | Append immutable revision + audit | Same-origin Neon Auth admin session |

Editor writes require a same-origin Neon Auth session with the `admin` role; audit records attribute each write to the mapped application user. Authentication is fail-closed if configuration or the provider is unavailable. Sign-in is invite/provision-only: there is no public account creation. The limiter passed PGlite tests and an isolated Neon SQL concurrency rehearsal; authenticated application-route writes, owner-admin sign-in, and route-level concurrency remain unverified before accepting drafts. Neon Managed Auth currently does not provide MFA in this configuration.

## Release rules
- Keep **`dev`** for development, **`main`** for production. No forced merge.
- Never publish private drafts or personal witness logs by default.
- The narrative is creative and reflective; it is not an assertion of external divine authority or medical facts.
- Always distinguish original manuscripts, editorial summaries, source references, and claims needing verification.
- See [handover runbook](docs/HANDOVER_V11.md) for exact remaining tasks, verification evidence, and rollback plan.

Architect / Storyteller: ROCKSOUL BIN YOSAN 2IN1.
