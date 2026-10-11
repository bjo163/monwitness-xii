# MOONWITNESS XII — Neon + Drizzle integration

## Safety
- The database URL previously shared in conversation contained a password. Rotate it.
- Store the replacement in Vercel's encrypted environment variables as `DATABASE_URL`.
- Do not commit credentials, dumps, or production user data.
- The connected Neon account currently does **not** positively identify the previously supplied database host. Do not run migrations against a similarly named project without checking its project and endpoint IDs.

## Setup after the correct Neon project is verified
1. Set `DATABASE_URL` securely in your local environment and Vercel for each target (preview/production).
2. Install dependencies with `npm install`.
3. Generate migration SQL using `npm run db:generate` and review it.
4. Apply only reviewed migrations to a separate development branch with `npm run db:migrate`.
5. Test archive CRUD, authorization, unique constraints, foreign keys and migrations in a disposable branch.
6. Back up production, approve schema migration, then apply to production.

## Model guarantees
- 9 PostgreSQL schemas: identity, archive, scripture, research, intelligence, characters, aetherion, cab, system.
- Source preservation: story original text and editorial revisions are separate records.
- Human approval: CAB mission approval state defaults to draft.
- Analysis review state defaults to pending; no algorithm claims to decide spiritual truth.
- Media bytes belong in object storage; PostgreSQL stores metadata only.
- RPG progress is educational, not a ranking of spiritual standing.

## Current status
Drizzle schema and client scaffold are committed, but no database migration has been executed.
