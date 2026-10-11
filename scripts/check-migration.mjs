import { execFileSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const committedDir = join(root, "drizzle");
const env = { ...process.env };
delete env.DATABASE_URL;
const drizzleCli = join(root, "node_modules", "drizzle-kit", "bin.cjs");

async function generatedFiles(directory) {
  const metaDir = join(directory, "meta");
  const sqlFiles = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
  const metadataFiles = (await readdir(metaDir)).filter((name) => name.endsWith(".json")).sort();
  return [
    ...await Promise.all(sqlFiles.map(async (name) => [name, await readFile(join(directory, name), "utf8")])),
    ...await Promise.all(metadataFiles.map(async (name) => [join("meta", name), await readFile(join(metaDir, name), "utf8")])),
  ];
}

const before = await generatedFiles(committedDir);
if (before.length === 0) {
  console.error("No committed Drizzle migrations found. Run npm run db:generate, review the SQL, then rerun this check.");
  process.exit(1);
}

const temporaryRoot = await mkdtemp(join(root, ".drizzle-check-"));
const temporaryOut = join(temporaryRoot, "drizzle");
try {
  await cp(committedDir, temporaryOut, { recursive: true });
  execFileSync(process.execPath, [drizzleCli, "generate", "--schema=./db/schema.js", `--out=${temporaryOut.slice(root.length + 1)}`, "--dialect=postgresql", "--prefix=none", "--name=check"], {
    cwd: root,
    env,
    stdio: "inherit",
  });
  const after = await generatedFiles(temporaryOut);
  const normalizeJournal = (value) => value.replace(/"when":\s*\d+/g, '"when": <timestamp>');
  const normalizeSnapshot = (value) => value.replace(/"id":\s*"[0-9a-f-]{36}"/g, '"id": "<snapshot>"');
  const comparable = (items) => items.map(([name, content]) => {
    if (name === join("meta", "_journal.json")) return [name, normalizeJournal(content)];
    if (name.endsWith("_snapshot.json")) return [name, normalizeSnapshot(content)];
    return [name, content];
  });
  if (JSON.stringify(comparable(before)) !== JSON.stringify(comparable(after))) {
    console.error("Committed Drizzle migration artifacts differ from the current schema. Review npm run db:generate output.");
    process.exitCode = 1;
  } else {
    console.log(`Drizzle migration artifacts match the schema (${before.length} files).`);
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
