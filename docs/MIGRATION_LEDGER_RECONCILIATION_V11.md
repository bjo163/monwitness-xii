# V11 populated development database ledger reconciliation

## Current state

The persistent development branch `br-green-butterfly-b51kp4b1` contains the original 16 application tables and 15 published editorial indexes, but has no `drizzle.__drizzle_migrations` table. Its revision foreign key is still `ON DELETE CASCADE`, which matches migration `0000` and differs from migration `0001` (`RESTRICT`). Migration `0002` adds a per-editor write-limit table. The development branch has not been stamped or migrated.

The migration journal records these exact files and timestamps:

| Order | File | SHA-256 | `created_at` |
| --- | --- | --- | ---: |
| Baseline | `drizzle/0000_0000_initial_v11.sql` | `6ec01f3cd4578803ca87ef32cb87ad31d71ee95ac93082238ba109fcc569928e` | `1791729329809` |
| Retention | `drizzle/0001_initial_v11.sql` | `d61ccc5ae7d2105e2171913721c6e7b0fdac57b41e73f3328b9a6d6c862c391a` | `1791729410459` |
| Editor write limits | `drizzle/0002_editor_write_limits.sql` | `1e900d5e610c813b50c5e451af486ecb0b53c4e2dff066124522cfd53506386e` | `1791742779447` |

## Isolated rehearsal evidence

On the previously approved, non-default Neon rehearsal branch `br-flat-shape-b5ofan15`, read-only prechecks confirmed the dev clone had 16 application tables, 15 stories, zero revisions, no migration ledger, and the original `CASCADE` foreign key. The baseline hash/timestamp was stamped into Drizzle's standard ledger shape. Applying migration `0001` then recorded its hash/timestamp and changed the FK to `RESTRICT`. A temporary revision sentinel made PostgreSQL reject deletion of its parent story. Rollback removed only the sentinel and `0001` ledger row and restored `CASCADE`; the rehearsal branch ended with all 15 stories intact, zero revisions, and only the `0000` baseline ledger row. Persistent dev and production were not changed.

This rehearsal validates Drizzle's timestamp-based baseline-stamp sequence on a clone; it did not run `npm run db:migrate` through a local database URL, which is unavailable in this checkout.

The additive `0002` migration was also applied to this same authorized disposable clone. A PostgreSQL rehearsal admitted exactly 30 writes for one editor, rejected the next five, reset the count after an expired window, and removed the temporary test row. A second rehearsal sent 35 independent SQL upserts concurrently through the Neon connector to the same actor key; exactly 30 returned an admitted row, five returned no row, and the stored counter was 30. The test actor and table were then removed; a read-only check confirmed 15 stories, zero revisions, and no rate-limit table. This proves atomic reservation at the SQL level on Neon, not end-to-end concurrency through authenticated application requests. The persistent dev branch has not received `0001` or `0002`.

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
5. Apply the reviewed `0001` retention migration and then `0002` editor-write-limits migration in journal order. Do not apply the `0000` baseline SQL to this populated database.
6. Run normal `npm run db:verify`. It checks current schema shape and requires the ledger rows to match every journal migration's SHA-256 and timestamp in order, including the row count. A missing, stale, reordered, or unexpected row makes verification fail. Independently confirm the FK is `RESTRICT`, `system.editor_write_limits` exists, stories remain 15, and no draft/revision/audit data changed unexpectedly. The verifier is read-only; it has not yet been run against the persistent development branch in this checkout.
7. Keep production separate. Its current root branch has no application tables; it needs a separately reviewed initial-schema and content rollout plan, not a populated-dev baseline stamp.

No step in this document grants approval to write to persistent dev or production. The explicit owner approval and exact branch identity remain required.
