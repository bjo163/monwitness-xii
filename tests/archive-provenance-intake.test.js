import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const register = readFileSync(new URL("../docs/ARCHIVE_PROVENANCE_INTAKE_V11.md", import.meta.url), "utf8");
const releaseGates = readFileSync(new URL("../docs/RELEASE_GATES_V11.md", import.meta.url), "utf8");
const migrationFixture = readFileSync(new URL("./migration-execution.test.js", import.meta.url), "utf8");

test("Archive provenance intake keeps all 15 slots pending and source-needed", () => {
  const rows = register.match(/^\| (?:0[1-9]|1[0-5]) \|.*$/gm) ?? [];
  assert.equal(rows.length, 15);
  assert.deepEqual(rows.map((row) => row.slice(2, 4)), [
    "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15",
  ]);
  const expectedSlugs = [
    "aetherion-blueprint", "allah-promise-wednesday", "destroy-fake-throne", "dreams-of-dragons-fire", "droplets",
    "family-meets-in-the-sky", "holiday-at-kautsar", "jasa-forgiveness-drone-mode", "somebody-told-me",
    "ssdfreegv-ge-er-f", "the-blow", "they-call-it-karma", "tick-tock-on-the-clock", "tutorial-mahdi", "yosan-2in1",
  ];
  for (const [index, row] of rows.entries()) {
    assert.match(row, /\| Pending \| `source_needed` \|$/);
    assert.match(row, new RegExp(`^\\| (?:0[1-9]|1[0-5]) \\| \`${expectedSlugs[index]}\` \\| — \\|`));
  }
  for (const slug of expectedSlugs) assert.ok(register.includes(`\`${slug}\``), `missing development slug ${slug}`);
  assert.match(register, /branch `br-green-butterfly-b51kp4b1`/);
  assert.match(register, /no synopsis, manuscript, personal, or evidence content was read/);
  assert.match(migrationFixture, /public-editorial-index/);
  assert.match(register, /This repository may be public/);
  assert.match(register, /Do not paste manuscript text, personal data, credentials, or permission documents here/);
  assert.match(releaseGates, /G-ARC-01[\s\S]*ARCHIVE_PROVENANCE_INTAKE_V11\.md/);
});
