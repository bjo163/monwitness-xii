import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const listRoute = await readFile(new URL("../app/api/episodes/route.js", import.meta.url), "utf8");
const detailRoute = await readFile(new URL("../app/api/episodes/[slug]/route.js", import.meta.url), "utf8");
const queryModule = await readFile(new URL("../lib/public-archive-query.js", import.meta.url), "utf8");

test("public archive list selects a bounded published-only metadata projection", () => {
  assert.match(queryModule, /slug: stories\.slug,[\s\S]*title: stories\.title,[\s\S]*season: stories\.season,[\s\S]*synopsis: stories\.synopsis,[\s\S]*experienceType: stories\.experienceType/);
  assert.match(queryModule, /\.where\(eq\(stories\.status, "published"\)\)/);
  assert.match(queryModule, /\.limit\(100\)/);
  assert.match(listRoute, /listPublicEpisodes\(db, stories\)/);
  assert.match(listRoute, /createPublicEpisodesResponse\(rows\)/);
  assert.match(listRoute, /createPublicArchiveErrorResponse\("unavailable"\)/);
  assert.doesNotMatch(listRoute, /originalSourceStatus|storyRevisions|auditEvents|\.select\(\)/);
});

test("public story detail requires a valid slug and published status", () => {
  assert.match(detailRoute, /!\/\^\[a-z0-9-\]\{1,120\}\$\//);
  assert.match(detailRoute, /createPublicArchiveErrorResponse\("invalid-slug"\)/);
  assert.match(queryModule, /\.where\(and\(eq\(stories\.slug, slug\), eq\(stories\.status, "published"\)\)\)/);
  assert.match(detailRoute, /findPublicEpisode\(db, stories, slug\)/);
  assert.match(detailRoute, /if \(!episode\) return createPublicArchiveErrorResponse\("not-found"\)/);
  assert.match(detailRoute, /createPublicEpisodeResponse\(episode\)/);
  assert.match(detailRoute, /createPublicArchiveErrorResponse\("unavailable"\)/);
  assert.doesNotMatch(detailRoute, /originalSourceStatus|storyRevisions|auditEvents|\.select\(\)/);
});
