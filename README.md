# MOONWITNESS XII 🌙

**FIND LIGHT IN DARKNESS · COMEDY ON. SHALAWAT ON.**

MoonWitness XII is a faceless neon-comic storytelling universe and learning RPG. Its development release contains a database-backed Story Archive, four recurring fictional characters, and an AETHERION 100-level conceptual interface.

> **Handover status (11 October 2026): DEVELOPMENT READY FOR REVIEW — NOT PRODUCTION-READY.**
> Vercel build status is not proof of API end-to-end correctness. No editor login or approved production database migration exists yet.

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
Next.js 15 / React 19, Neon PostgreSQL, Drizzle ORM, Vercel, GitHub Actions.
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

Add your *development-only* `DATABASE_URL` to `.env.local` (never commit a secret). The homepage works without a database; `/episodes` and `/api/health/db` require one.

```bash
npm test
npm run db:check # regenerates migration baseline to a temporary directory and verifies history
npm audit --omit=dev
npm run build
npm run db:verify # read-only, needs DATABASE_URL
SMOKE_BASE_URL=https://your-authorized-preview.example npm run smoke:http
```

`npm run db:generate` and `npm run db:migrate` exist. SQL migration artifacts are under review; the development branch already has its schema but lacks a Drizzle migration ledger, so baseline stamping and disposable-branch rehearsal remain release blockers. **Do not run migrations against production without review and approval.**

The current V11 hardening changes are in draft [PR #4](https://github.com/bjo163/monwitness-xii/pull/4), targeting `dev`. They have not been merged or released. See [CHANGELOG.md](CHANGELOG.md) for this review's changes and outstanding gates.

## API surface
| Route | Purpose | Security |
| --- | --- | --- |
| `GET /api/health/db` | Read-only DB connectivity | Public health signal (no secrets) |
| `GET /api/episodes` | Published editorial indexes | Published-only |
| `GET /api/episodes/:slug` | Published episode index | Published-only |
| `POST /api/editor/drafts` | Draft + immutable first revision + audit | Disabled unless server-only token configured |
| `POST /api/editor/revisions` | Append immutable revision + audit | Disabled unless server-only token configured |

The bearer-token gate is a temporary *server-to-server* mechanism, **not** user sessions, RBAC, or an editor UI. Leave `EDITOR_API_TOKEN` unset until proper identity, authorization and E2E checks are in place.

## Release rules
- Keep **`dev`** for development, **`main`** for production. No forced merge.
- Never publish private drafts or personal witness logs by default.
- The narrative is creative and reflective; it is not an assertion of external divine authority or medical facts.
- Always distinguish original manuscripts, editorial summaries, source references, and claims needing verification.
- See [handover runbook](docs/HANDOVER_V11.md) for exact remaining tasks, verification evidence, and rollback plan.

Architect / Storyteller: ROCKSOUL BIN YOSAN 2IN1.
