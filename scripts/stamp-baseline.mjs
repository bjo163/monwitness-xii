import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { createBaselineStampSql, getBaselineStampConfigurationError } from "../lib/baseline-stamp.js";

if (process.argv.length > 2) {
  console.error("Usage: npm run db:stamp-baseline");
  process.exit(2);
}

const configurationError = getBaselineStampConfigurationError(process.env);
if (configurationError) {
  console.error(configurationError);
  process.exit(2);
}

const root = fileURLToPath(new URL("..", import.meta.url));
const journal = JSON.parse(await readFile(join(root, "drizzle", "meta", "_journal.json"), "utf8"));
const firstEntry = journal.entries[0];
if (firstEntry?.idx !== 0 || firstEntry.tag !== "0000_0000_initial_v11") {
  console.error("The first journal entry is not the reviewed V11 baseline; baseline stamp not run");
  process.exit(2);
}

const migrationSql = await readFile(join(root, "drizzle", `${firstEntry.tag}.sql`));
const baselineHash = createHash("sha256").update(migrationSql).digest("hex");
const statement = createBaselineStampSql({ hash: baselineHash, createdAt: firstEntry.when });

const preflight = spawnSync(process.execPath, [join(root, "scripts", "verify-schema.mjs"), "--baseline-reconciliation"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
if (preflight.error || preflight.status !== 0) {
  console.error("Read-only baseline preflight failed; no stamp was attempted");
  process.exit(2);
}

try {
  await neon(process.env.DATABASE_URL).query(statement);
} catch {
  console.error("Baseline stamp result is unknown. Do not retry until a read-only ledger inspection confirms whether the row exists.");
  process.exit(1);
}

console.log(`Stamped the ${firstEntry.tag} ledger row after the read-only preflight and transactional baseline checks.`);
console.log("Keep persistent migrations stopped until the exact target and stamp row have been independently reverified.");
