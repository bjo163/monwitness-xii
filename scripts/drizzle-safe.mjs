import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { getDatabaseOperationError, getDrizzleCliGuardError } from "../lib/database-target.js";

const operation = process.argv[2];
if (!["migrate", "studio"].includes(operation)) {
  console.error("Usage: node scripts/drizzle-safe.mjs <migrate|studio>");
  process.exit(2);
}
if (process.argv.length > 3) {
  const cliArgumentError = getDrizzleCliGuardError({ args: [operation, ...process.argv.slice(3)], env: process.env });
  if (cliArgumentError?.includes("overrides are disabled")) {
    console.error(cliArgumentError);
    process.exit(2);
  }
  console.error("Guarded Drizzle commands do not accept CLI arguments.");
  process.exit(2);
}

const operationError = getDatabaseOperationError({ operation, env: process.env });
if (operationError) {
  console.error(operationError);
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
