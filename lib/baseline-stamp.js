import { getDatabaseOperationError } from "./database-target.js";

export const BASELINE_STAMP_DEVELOPMENT_BRANCH_ID = "br-green-butterfly-b51kp4b1";

export function getBaselineStampConfigurationError(env = process.env) {
  if (env.CONFIRM_BASELINE_STAMP !== BASELINE_STAMP_DEVELOPMENT_BRANCH_ID) {
    return `Set CONFIRM_BASELINE_STAMP to the exact development branch ID (${BASELINE_STAMP_DEVELOPMENT_BRANCH_ID}) after independently verifying the Neon target; baseline stamp not run`;
  }
  return getDatabaseOperationError({ operation: "stamp-baseline", env });
}

export function createBaselineStampSql({ hash, createdAt }) {
  if (typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)) {
    throw new Error("Baseline migration hash is invalid");
  }
  if (!Number.isSafeInteger(createdAt) || createdAt < 1) {
    throw new Error("Baseline migration timestamp is invalid");
  }

  return `DO $mw_v11_baseline_stamp$
DECLARE
  app_table_count integer;
  story_count integer;
  published_count integer;
  source_needed_count integer;
  revision_count integer;
  revision_fk_count integer;
  revision_fk_action text;
  ledger_count integer;
  ledger_hash text;
  ledger_created_at bigint;
BEGIN
  IF to_regclass('drizzle.__drizzle_migrations') IS NOT NULL THEN
    RAISE EXCEPTION 'Baseline stamp refused: migration ledger already exists';
  END IF;

  SELECT count(*)::integer INTO app_table_count
  FROM information_schema.tables
  WHERE table_type = 'BASE TABLE'
    AND table_schema IN ('identity','archive','scripture','research','intelligence','characters','aetherion','cab','system');
  IF app_table_count <> 16 THEN
    RAISE EXCEPTION 'Baseline stamp refused: application table inventory differs';
  END IF;

  SELECT count(*)::integer,
    count(*) FILTER (WHERE status = 'published')::integer,
    count(*) FILTER (WHERE original_source_status = 'source_needed')::integer
  INTO story_count, published_count, source_needed_count
  FROM archive.stories;
  SELECT count(*)::integer INTO revision_count FROM archive.story_revisions;
  IF story_count <> 15 OR published_count <> 15 OR source_needed_count <> 15 OR revision_count <> 0 THEN
    RAISE EXCEPTION 'Baseline stamp refused: Archive baseline counts differ';
  END IF;

  SELECT count(*)::integer, min(confdeltype::text)
  INTO revision_fk_count, revision_fk_action
  FROM pg_constraint
  WHERE conrelid = 'archive.story_revisions'::regclass
    AND contype = 'f';
  IF revision_fk_count <> 1 OR revision_fk_action IS DISTINCT FROM 'c' THEN
    RAISE EXCEPTION 'Baseline stamp refused: revision foreign key differs';
  END IF;

  IF to_regclass('system.editor_write_limits') IS NOT NULL
    OR to_regclass('system.editor_write_controls') IS NOT NULL THEN
    RAISE EXCEPTION 'Baseline stamp refused: post-baseline feature tables already exist';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'archive' AND table_name = 'stories'
      AND column_name IN ('public_index_approved', 'public_index_approved_by', 'public_index_approved_at', 'public_index_approved_use')
  ) THEN
    RAISE EXCEPTION 'Baseline stamp refused: post-baseline public-index approval columns already exist';
  END IF;

  CREATE SCHEMA IF NOT EXISTS drizzle;
  CREATE TABLE drizzle.__drizzle_migrations (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  );
  INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
  VALUES ('${hash}', ${createdAt});

  SELECT count(*)::integer, min(hash), min(created_at)
  INTO ledger_count, ledger_hash, ledger_created_at
  FROM drizzle.__drizzle_migrations;
  IF ledger_count <> 1 OR ledger_hash <> '${hash}' OR ledger_created_at <> ${createdAt} THEN
    RAISE EXCEPTION 'Baseline stamp refused: migration ledger postcondition failed';
  END IF;
END
$mw_v11_baseline_stamp$;`;
}
