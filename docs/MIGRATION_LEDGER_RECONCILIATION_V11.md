# V11 populated development database ledger reconciliation

## Current state

The persistent development branch `br-green-butterfly-b51kp4b1` contains the original 16 application tables and 15 published editorial indexes, but has no `drizzle.__drizzle_migrations` table. Its revision foreign key is still `ON DELETE CASCADE`, which matches migration `0000` and differs from migration `0001` (`RESTRICT`). Migration `0002` adds a per-editor write-limit table. Local-only migrations `0003` and `0004` add the editor write-freeze singleton and its operator/reason audit fields. These two files have not been applied to any database. The development branch has not been stamped or migrated.

The migration journal records these exact files and timestamps:

| Order | File | SHA-256 | `created_at` |
| --- | --- | --- | ---: |
| Baseline | `drizzle/0000_0000_initial_v11.sql` | `6ec01f3cd4578803ca87ef32cb87ad31d71ee95ac93082238ba109fcc569928e` | `1791729329809` |
| Retention | `drizzle/0001_initial_v11.sql` | `d61ccc5ae7d2105e2171913721c6e7b0fdac57b41e73f3328b9a6d6c862c391a` | `1791729410459` |
| Editor write limits | `drizzle/0002_editor_write_limits.sql` | `1e900d5e610c813b50c5e451af486ecb0b53c4e2dff066124522cfd53506386e` | `1791742779447` |
| Editor write freeze | `drizzle/0003_editor_write_controls.sql` | `c616759e0ac1a2e213e2632bfaeb0c3df6654cf319f23e6489c961395e973916` | `1791781566106` |
| Freeze operator audit | `drizzle/0004_editor_write_control_audit.sql` | `4628355bd4e7bfa29d2fcaf1a77fec658dffc862963b2528bc1e2479358fc548` | `1791781623168` |

## Isolated rehearsal evidence

On the previously approved, non-default Neon rehearsal branch `br-flat-shape-b5ofan15`, read-only prechecks confirmed the dev clone had 16 application tables, 15 stories, zero revisions, no migration ledger, and the original `CASCADE` foreign key. The baseline hash/timestamp was stamped into Drizzle's standard ledger shape. Applying migration `0001` then recorded its hash/timestamp and changed the FK to `RESTRICT`. A temporary revision sentinel made PostgreSQL reject deletion of its parent story. Rollback removed only the sentinel and `0001` ledger row and restored `CASCADE`; the rehearsal branch ended with all 15 stories intact, zero revisions, and only the `0000` baseline ledger row. Persistent dev and production were not changed.

**Read-only branch-state recheck (2026-10-13):** Neon still lists `mw-v11-migration-rehearsal-20261012` (`br-flat-shape-b5ofan15`) as ready, non-default, and parented by the development branch. Its database inventory contains the 16 application tables; the migration ledger has exactly one row matching the `0000` hash `6ec01f3c…569928e` and timestamp `1791729329809`. `archive.story_revisions` still has `ON DELETE CASCADE`, and count-only queries returned 15 stories and zero revisions. The `system.editor_write_limits` table is absent after the earlier temporary `0002` exercise was rolled back. This confirms the clone remains at its recorded baseline after the rehearsals. No story text, revision bodies, credentials, or private evidence were queried; no SQL writes or branch changes occurred. It does not validate migrations `0003`/`0004` on Neon.

**Database target clarification (read-only, 2026-10-13):** this branch contains both `neondb` and the separate `mw_v11_migration_test` database. The current populated-clone state above refers to **`neondb`**: 15 stories, zero revisions, one `0000` ledger row, the original `CASCADE` FK, and no `system.editor_write_limits` or `system.editor_write_controls` table. The separately named `mw_v11_migration_test` contains the 16 baseline application tables but currently has zero stories/revisions, no Drizzle ledger, the original `CASCADE` FK, and neither feature table. Always pass `database_name` as well as the branch ID when checking this branch; the branch tree view combines database objects. Neither database has had `0003` or `0004` applied, so those migrations remain unverified on Neon.

This rehearsal validates Drizzle's timestamp-based baseline-stamp sequence on a clone; it did not run `npm run db:migrate` through a local database URL, which is unavailable in this checkout.

The additive `0002` migration was also applied to this same authorized disposable clone. A PostgreSQL rehearsal admitted exactly 30 writes for one editor, rejected the next five, reset the count after an expired window, and removed the temporary test row. A second rehearsal sent 35 independent SQL upserts concurrently through the Neon connector to the same actor key; exactly 30 returned an admitted row, five returned no row, and the stored counter was 30. The test actor and table were then removed; a read-only check confirmed 15 stories, zero revisions, and no rate-limit table. This proves atomic reservation at the SQL level on Neon, not end-to-end concurrency through authenticated application requests. The persistent dev branch has not received `0001` or `0002`.

## Local reverse-DDL rehearsal across migrations 0001–0004

The PGlite migration execution test starts from the `0000` schema with 15 synthetic published, `source_needed` story indexes and zero revisions, mirroring the last read-only development inventory. It verifies those counts before and after applying `0001`–`0004`, then adds synthetic public/private stories, revisions, an authenticated-editor audit event, and linked Archive records. It verifies the write-freeze control defaults and writes an operator/reason plus quota counter, then simulates reverse DDL in order: drop `0004`'s two audit columns, drop `0003`'s control table, drop `0002`'s quota table, and restore `0001`'s prior `CASCADE` FK. The test checks that the frozen flag survives the `0004` column rollback and that all 19 story rows, the three revisions, the audit event, and the 15 baseline stories' published/`source_needed` statuses remain intact after feature-table rollback and FK restoration.

This is a PGlite reverse-DDL simulation, not a published downgrade command, Drizzle-ledger rollback workflow, or Neon rehearsal. It does not establish safe operational rollback on a persistent database. The destructive reverse steps must be reviewed and tested against a fresh isolated clone before any persistent apply; DB-02 remains open.

The same local test also runs Drizzle's actual PGlite migrator against a second, empty PGlite database using the repository migration folder. It verifies all five ordered `hash`/`created_at` ledger entries against Drizzle's migration reader, then reruns the migrator and confirms no duplicate ledger rows. This strengthens local migration-runner and ledger evidence; it does not verify the Neon PostgreSQL environment, remote migration state, or a Drizzle rollback workflow.

## Read-only preflight before any dev stamp

After securely obtaining the development-branch connection string, independently verify its endpoint host and database name against the selected Neon development branch in the Neon control plane. The baseline preflight requires these values separately so it can reject a copied production or unrelated DSN before opening a connection. Do not populate the expected values by extracting them from `DATABASE_URL` alone. Run:

```sh
DATABASE_URL="<verified development branch URL>" \
EXPECTED_DATABASE_HOST="<host from verified development endpoint details>" \
EXPECTED_DATABASE_NAME="<database name from verified development endpoint details>" \
node scripts/verify-schema.mjs --baseline-reconciliation
```

This mode validates the DSN's host and database against the independently supplied expected values before connecting, then compares live schema structure with `drizzle/meta/0000_snapshot.json`. It permits the migration ledger to be absent but fails if any ledger already exists, matching the requirement to stop before stamping when a ledger is present. It still fails on table, column, default, FK, index, or uniqueness drift. It does not write to the database, and mismatch errors never print the DSN. The host-to-branch association must be checked in the Neon control plane immediately before use. Do not use this mode for ordinary current-schema verification.

## Reviewed sequence for a future persistent-dev migration

1. Take and verify a recoverable backup of the development branch, or make an isolated Neon clone and confirm the target identity before any write.
2. Run the read-only baseline reconciliation command above against the exact populated development target. Stop on any mismatch.
3. Obtain explicit owner approval to stamp this exact target. The approval must name the development branch and acknowledge that stamping records existing schema as migration `0000`; it does not execute the baseline SQL.
4. Create the `drizzle` schema and standard `drizzle.__drizzle_migrations` table if absent, then insert exactly the `0000` hash and timestamp shown above. Stop if any ledger already exists or if the recorded baseline does not match.
5. Before any migration command, independently confirm the endpoint host and database name in Neon, set `EXPECTED_DATABASE_HOST`, `EXPECTED_DATABASE_NAME`, and `CONFIRM_DATABASE_MIGRATION=YES`, and review the exact migration plan. `npm run db:migrate` enforces these local preconditions before starting Drizzle; this guard does not itself prove the endpoint-to-branch mapping or grant owner approval. The journal now contains migrations `0001` through `0004`; do not stop after applying only `0001`/`0002` and then expect the current verifier to pass, because it requires every journal entry. Review the complete ordered plan for all four migrations against the populated dev schema before applying the reviewed set: `0001` retention, `0002` editor-write limits, `0003` editor-write freeze control, and `0004` freeze operator/reason audit fields. Do not apply the `0000` baseline SQL to this populated database. If the owner chooses to defer `0003`/`0004`, that requires a separately reviewed, repository-consistent migration plan and verifier/journal strategy before the database is touched; do not create a partial ledger by hand.
6. Run normal `npm run db:verify`. It checks current schema shape and requires the ledger rows to match every journal migration's SHA-256 and timestamp in order, including the row count. A missing, stale, reordered, or unexpected row makes verification fail. Independently confirm the FK is `RESTRICT`, `system.editor_write_limits` exists, `system.editor_write_controls` has exactly one global row, and `writes_frozen` is `false` after migrations; confirm stories remain 15 and no draft/revision/audit data changed unexpectedly. The verifier is read-only; it has not yet been run against the persistent development branch in this checkout.
7. Keep production separate. Its current root branch has no application tables; it needs a separately reviewed initial-schema and content rollout plan, not a populated-dev baseline stamp.

No step in this document grants approval to write to persistent dev or production. The explicit owner approval and exact branch identity remain required.

## Current migration policy

As of the local V11 handover checkpoint, persistent development remains unstamped and unmigrated. The live journal includes the locally PGlite-tested additions `0003`/`0004`; neither migration has been applied to any database or Neon-rehearsed. Therefore this runbook records the required sequence and verification, not authorization or completed rehearsal evidence for those additions. Before any persistent apply, review the full set against an isolated database clone, test rollback/recovery for both migrations, and update this evidence from actual results. The migrations, owner approval, and target mapping must all be verified before persistent development changes.
