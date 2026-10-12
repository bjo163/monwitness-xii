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
4. Before a connected migration, Studio session, or schema introspection, independently verify the exact Neon development endpoint and database name in the control plane. Set `EXPECTED_DATABASE_HOST` and `EXPECTED_DATABASE_NAME`, then set the matching confirmation (`CONFIRM_DATABASE_MIGRATION=YES`, `CONFIRM_DATABASE_STUDIO=YES`, or `CONFIRM_DATABASE_INTROSPECTION=YES`) after reviewing the target and intended action. Both the npm wrapper and this repository's default Drizzle config reject missing/mismatched target details, missing confirmation, and CLI credential overrides before Drizzle connects; errors do not print the connection URL. Direct `drizzle-kit push` is disabled; use reviewed SQL migration files. Drizzle supports selecting alternate config files with `--config`; an alternate file is outside this repository's config guard, so do not pass custom `--config` values. Use the guarded npm wrappers for connected migrate/Studio operations ([Drizzle Kit config selection](https://orm.drizzle.team/docs/kit-overview)). Run database tools only against the approved disposable or development branch, never production.
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
No application schema migration has been applied to the persistent development or production databases. For isolated verification only, the committed baseline and retention SQL were replayed against a fresh database on disposable Neon branch `br-flat-shape-b5ofan15`; the retention migration and rollback passed there. The persistent development database still lacks a Drizzle migration ledger, so baseline stamping has not been applied. Production has no application schema/data migration; a manual backup snapshot was created and restored to an isolated branch.

The populated-development baseline-stamp procedure and a read-only `0000_snapshot` preflight mode are documented in [MIGRATION_LEDGER_RECONCILIATION_V11.md](MIGRATION_LEDGER_RECONCILIATION_V11.md). A later isolated rehearsal validated stamping baseline `0000`, applying `0001`, blocking parent deletion while a revision exists, and rolling `0001` back. The persistent dev database still has not been stamped or migrated. A production-root backup snapshot has been created and restored to an isolated branch; no production schema/data migration occurred.
