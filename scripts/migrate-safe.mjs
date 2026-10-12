import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { getDatabaseTargetError } from "../lib/database-target.js";

const uri = process.env.DATABASE_URL;
if (!uri) {
  console.error("DATABASE_URL missing; migration not run");
  process.exit(2);
}

const targetError = getDatabaseTargetError({
  uri,
  expectedHost: process.env.EXPECTED_DATABASE_HOST,
  expectedDatabase: process.env.EXPECTED_DATABASE_NAME,
  requireExpected: true,
});
if (targetError) {
  console.error(`${targetError}; migration not run`);
  process.exit(2);
}

if (process.env.CONFIRM_DATABASE_MIGRATION !== "YES") {
  console.error("Set CONFIRM_DATABASE_MIGRATION=YES after reviewing the exact target and migration plan; migration not run");
  process.exit(2);
}

const root = fileURLToPath(new URL("..", import.meta.url));
const drizzleCli = join(root, "node_modules", "drizzle-kit", "bin.cjs");
const result = spawnSync(process.execPath, [drizzleCli, "migrate"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error(`Could not start Drizzle migration: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
