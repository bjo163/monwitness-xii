import { neon } from "@neondatabase/serverless";
import { getApplicationDatabaseUrl } from "../lib/database-target.js";
import { isEditorWriteFrozen, setEditorWriteFreezeState } from "../lib/editor-write-freeze.js";

function usage() {
  return "Usage: node scripts/editor-write-freeze.mjs status | freeze --actor=<operator-ref> --reason=<incident-ref> | unfreeze --actor=<operator-ref> --reason=<change-ref>";
}

async function main(args) {
  const [action, ...options] = args;
  if (!["status", "freeze", "unfreeze"].includes(action)) throw new Error(usage());
  const parsed = new Map();
  for (const option of options) {
    const match = /^--(actor|reason)=(.{1,240})$/.exec(option);
    if (!match || parsed.has(match[1])) throw new Error(usage());
    if ((match[1] === "actor" && match[2].length > 120) || !match[2].trim()) throw new Error(usage());
    parsed.set(match[1], match[2]);
  }

  if (action !== "status") {
    if (process.env.CONFIRM_EDITOR_WRITE_FREEZE !== action) {
      throw new Error(`Set CONFIRM_EDITOR_WRITE_FREEZE=${action} after verifying the exact development database target`);
    }
    if (!parsed.has("actor") || !parsed.has("reason")) throw new Error(usage());
  } else if (parsed.size > 0) {
    throw new Error(usage());
  }

  const sql = neon(getApplicationDatabaseUrl());
  if (action === "status") {
    const frozen = await isEditorWriteFrozen({ sql });
    process.stdout.write(`Editor writes are ${frozen ? "FROZEN" : "ENABLED"}.\n`);
    return;
  }

  const frozen = await setEditorWriteFreezeState({
    sql,
    frozen: action === "freeze",
    operator: parsed.get("actor"),
    reason: parsed.get("reason"),
  });
  process.stdout.write(`Editor writes are ${frozen ? "FROZEN" : "ENABLED"}; operator reference and reason were recorded.\n`);
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${error?.message === "Invalid editor write freeze state" ? error.message : "Editor write freeze command failed; check the verified target and control table."}\n`);
  process.exitCode = 1;
});
