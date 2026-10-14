import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const listRoute = await readFile(new URL("../app/api/episodes/route.js", import.meta.url), "utf8");
const detailRoute = await readFile(new URL("../app/api/episodes/[slug]/route.js", import.meta.url), "utf8");
const detailHandler = await readFile(new URL("../lib/public-archive-route.js", import.meta.url), "utf8");
const queryModule = await readFile(new URL("../lib/public-archive-query.js", import.meta.url), "utf8");

test("public archive list selects a bounded published-and-approved metadata projection", () => {
  assert.match(queryModule, /slug: stories\.slug,[\s\S]*title: stories\.title,[\s\S]*season: stories\.season,[\s\S]*synopsis: stories\.synopsis,[\s\S]*experienceType: stories\.experienceType/);
  assert.match(queryModule, /\.where\(and\(eq\(stories\.status, "published"\), eq\(stories\.publicIndexApproved, true\)\)\)/);
  assert.match(queryModule, /\.limit\(100\)/);
  assert.match(listRoute, /listPublicEpisodes\(db, stories\)/);
  assert.match(listRoute, /createPublicEpisodesResponse\(rows\)/);
  assert.match(listRoute, /createPublicArchiveErrorResponse\("unavailable"\)/);
  assert.doesNotMatch(listRoute, /originalSourceStatus|storyRevisions|auditEvents|\.select\(\)/);
});

test("public story detail requires a valid slug, published status, and explicit approval", () => {
  assert.match(detailRoute, /createPublicEpisodeRouteHandler\(\{ getDatabase, stories \}\)/);
  assert.match(detailHandler, /!\/\^\[a-z0-9-\]\{1,120\}\$\//);
  assert.match(detailHandler, /createPublicArchiveErrorResponse\("invalid-slug"\)/);
  assert.match(queryModule, /\.where\(and\(eq\(stories\.slug, slug\), eq\(stories\.status, "published"\), eq\(stories\.publicIndexApproved, true\)\)\)/);
  assert.match(detailHandler, /findPublicEpisode\(db, stories, slug\)/);
  assert.match(detailHandler, /if \(!episode\) return createPublicArchiveErrorResponse\("not-found"\)/);
  assert.match(detailHandler, /createPublicEpisodeResponse\(episode\)/);
  assert.match(detailHandler, /createPublicArchiveErrorResponse\("unavailable"\)/);
  assert.doesNotMatch(detailRoute, /originalSourceStatus|storyRevisions|auditEvents|\.select\(\)/);
  assert.doesNotMatch(detailHandler, /originalSourceStatus|storyRevisions|auditEvents|\.select\(\)/);
});
