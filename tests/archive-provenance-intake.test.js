import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const register = readFileSync(new URL("../docs/ARCHIVE_PROVENANCE_INTAKE_V11.md", import.meta.url), "utf8");
const releaseGates = readFileSync(new URL("../docs/RELEASE_GATES_V11.md", import.meta.url), "utf8");

test("Archive provenance intake keeps all 15 slots pending and source-needed", () => {
  const rows = register.match(/^\| (?:0[1-9]|1[0-5]) \|.*$/gm) ?? [];
  assert.equal(rows.length, 15);
  assert.deepEqual(rows.map((row) => row.slice(2, 4)), [
    "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15",
  ]);
  for (const row of rows) {
    assert.match(row, /\| Pending \| `source_needed` \|$/);
    assert.match(row, /^\| (?:0[1-9]|1[0-5]) \| — \| — \|/);
  }
  assert.match(register, /This repository may be public/);
  assert.match(register, /Do not paste manuscript text, personal data, credentials, or permission documents here/);
  assert.match(releaseGates, /G-ARC-01[\s\S]*ARCHIVE_PROVENANCE_INTAKE_V11\.md/);
});
