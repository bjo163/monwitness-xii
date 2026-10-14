import assert from "node:assert/strict";
import test from "node:test";
import { levels, regions, realmLevelNames } from "../lib/aetherion-codex.js";

test("AETHERION codex has ten realms and one hundred sequential levels", () => {
  assert.equal(regions.length, 10);
  assert.equal(realmLevelNames.length, 10);
  assert.ok(realmLevelNames.every((names) => names.length === 10));
  assert.equal(levels.length, 100);
  assert.deepEqual(levels.map(({ id }) => id), Array.from({ length: 100 }, (_, index) => index + 1));
  assert.deepEqual(levels.filter(({ open }) => open).map(({ id }) => id), Array.from({ length: 33 }, (_, index) => index + 1));

  for (let realmIndex = 0; realmIndex < regions.length; realmIndex += 1) {
    const realmLevels = levels.slice(realmIndex * 10, realmIndex * 10 + 10);
    assert.deepEqual(realmLevels.map(({ name }) => name), realmLevelNames[realmIndex]);
    assert.ok(realmLevels.every(({ realm }) => realm === regions[realmIndex]));
  }
});
