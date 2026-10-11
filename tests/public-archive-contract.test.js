import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const listRoute = await readFile(new URL("../app/api/episodes/route.js", import.meta.url), "utf8");
const detailRoute = await readFile(new URL("../app/api/episodes/[slug]/route.js", import.meta.url), "utf8");

test("public archive list selects a bounded published-only metadata projection", () => {
  assert.match(listRoute, /db\.select\(\{\s*slug: stories\.slug, title: stories\.title, season: stories\.season,\s*synopsis: stories\.synopsis, experienceType: stories\.experienceType,\s*\}\)/);
  assert.match(listRoute, /\.where\(eq\(stories\.status, "published"\)\)/);
  assert.match(listRoute, /\.limit\(100\)/);
  assert.match(listRoute, /episodes: rows, notice: PUBLIC_ARCHIVE_NOTICE/);
  assert.doesNotMatch(listRoute, /originalSourceStatus|storyRevisions|auditEvents|\.select\(\)/);
});

test("public story detail requires a valid slug and published status", () => {
  assert.match(detailRoute, /!\/\^\[a-z0-9-\]\{1,120\}\$\//);
  assert.match(detailRoute, /\.where\(and\(eq\(stories\.slug, slug\), eq\(stories\.status, "published"\)\)\)/);
  assert.match(detailRoute, /if \(!episode\) return Response\.json\(\{ error: "Not found" \}, \{ status: 404 \}\)/);
  assert.match(detailRoute, /episode, notice: PUBLIC_ARCHIVE_NOTICE/);
  assert.doesNotMatch(detailRoute, /originalSourceStatus|storyRevisions|auditEvents|\.select\(\)/);
});
