import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { getDatabaseTargetError } from "../lib/database-target.js";

const operation = process.argv[2];
if (!["migrate", "studio"].includes(operation) || process.argv.length > 3) {
  console.error("Usage: node scripts/drizzle-safe.mjs <migrate|studio>");
  process.exit(2);
}

const uri = process.env.DATABASE_URL;
if (!uri) {
  console.error(`DATABASE_URL missing; Drizzle ${operation} not run`);
  process.exit(2);
}

const targetError = getDatabaseTargetError({
  uri,
  expectedHost: process.env.EXPECTED_DATABASE_HOST,
  expectedDatabase: process.env.EXPECTED_DATABASE_NAME,
  requireExpected: true,
});
if (targetError) {
  console.error(`${targetError}; Drizzle ${operation} not run`);
  process.exit(2);
}

const confirmationVariable = operation === "migrate"
  ? "CONFIRM_DATABASE_MIGRATION"
  : "CONFIRM_DATABASE_STUDIO";
if (process.env[confirmationVariable] !== "YES") {
  console.error(`Set ${confirmationVariable}=YES after reviewing the exact target and operation; Drizzle ${operation} not run`);
  process.exit(2);
}

const root = fileURLToPath(new URL("..", import.meta.url));
const drizzleCli = join(root, "node_modules", "drizzle-kit", "bin.cjs");
const result = spawnSync(process.execPath, [drizzleCli, operation], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error(`Could not start Drizzle ${operation}: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
