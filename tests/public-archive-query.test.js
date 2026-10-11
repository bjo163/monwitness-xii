import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { evidence, mediaAssets, stories, storyRevisions } from "../db/schema.js";
import { findPublicEpisode, listPublicEpisodes } from "../lib/public-archive-query.js";
import { createPublicEpisodeResponse, createPublicEpisodesResponse } from "../lib/public-archive-response.js";
import { createPublicEpisodeRouteHandler } from "../lib/public-archive-route.js";

const migrationFiles = [
  "../drizzle/0000_0000_initial_v11.sql",
  "../drizzle/0001_initial_v11.sql",
  "../drizzle/0002_editor_write_limits.sql",
];
const migrations = await Promise.all(migrationFiles.map((file) => readFile(new URL(file, import.meta.url), "utf8")));

test("public archive Drizzle queries expose only published editorial fields from a PostgreSQL fixture", async (t) => {
  const client = new PGlite();
  t.after(() => client.close());
  for (const migration of migrations) await client.exec(migration);
  const db = drizzle(client);

  const [published] = await db.insert(stories).values({
    slug: "source-needed-public-index",
    title: "Public Editorial Index",
    season: "Season One",
    synopsis: "A summary written for the public index.",
    status: "published",
    experienceType: "comic",
    originalSourceStatus: "source_needed",
    metadata: { sourceUrl: "https://private.example/original-manuscript", privateEditorNote: "never expose" },
  }).returning({ id: stories.id });
  await db.insert(storyRevisions).values({
    storyId: published.id,
    revision: 1,
    body: "PRIVATE ORIGINAL MANUSCRIPT TEXT",
    sourceType: "user_original",
    notes: "PRIVATE EDITOR NOTES",
  });
  await db.insert(mediaAssets).values({
    storyId: published.id,
    kind: "poster",
    storageKey: "private/original-poster.png",
    credit: "Credit pending",
    rights: "Permission not verified",
  });
  await db.insert(evidence).values({
    storyId: published.id,
    sourceLabel: "Private research note",
    sourceUrl: "https://private.example/evidence",
    claim: "Internal claim text",
  });
  await db.insert(stories).values({
    slug: "draft-must-stay-private",
    title: "Private Draft Secret",
    synopsis: "Private draft synopsis",
    status: "draft",
    originalSourceStatus: "source_needed",
  });

  const list = await listPublicEpisodes(db, stories);
  assert.equal(list.length, 1);
  assert.deepEqual(Object.keys(list[0]).sort(), ["experienceType", "season", "slug", "synopsis", "title"]);
  assert.equal(list[0].slug, "source-needed-public-index");
  assert.deepEqual(await createPublicEpisodesResponse(list).json(), {
    episodes: [{
      slug: "source-needed-public-index",
      title: "Public Editorial Index",
      season: "Season One",
      synopsis: "A summary written for the public index.",
      experienceType: "comic",
    }],
    notice: "Published means this metadata index is public. It does not verify original sources, credits, or reuse rights.",
  });

  const detail = await findPublicEpisode(db, stories, "source-needed-public-index");
  assert.ok(detail);
  assert.deepEqual(Object.keys(detail).sort(), ["experienceType", "season", "slug", "synopsis", "title"]);
  assert.equal(await findPublicEpisode(db, stories, "draft-must-stay-private"), null);
  assert.equal(await findPublicEpisode(db, stories, "unknown-story"), null);

  const detailRoute = createPublicEpisodeRouteHandler({ getDatabase: () => db, stories });
  const routeResponse = await detailRoute(
    new Request("http://localhost/api/episodes/source-needed-public-index"),
    { params: Promise.resolve({ slug: "source-needed-public-index" }) },
  );
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.headers.get("cache-control"), "no-store");
  assert.deepEqual(await routeResponse.json(), {
    episode: {
      slug: "source-needed-public-index",
      title: "Public Editorial Index",
      season: "Season One",
      synopsis: "A summary written for the public index.",
      experienceType: "comic",
    },
    notice: "Published means this metadata index is public. It does not verify original sources, credits, or reuse rights.",
  });

  const draftResponse = await detailRoute(
    new Request("http://localhost/api/episodes/draft-must-stay-private"),
    { params: Promise.resolve({ slug: "draft-must-stay-private" }) },
  );
  assert.equal(draftResponse.status, 404);
  assert.equal(draftResponse.headers.get("cache-control"), "no-store");
  assert.deepEqual(await draftResponse.json(), { error: "Not found" });

  let invalidSlugDatabaseCalls = 0;
  const invalidSlugRoute = createPublicEpisodeRouteHandler({
    getDatabase: () => { invalidSlugDatabaseCalls += 1; throw new Error("must not connect"); },
    stories,
  });
  const invalidSlugResponse = await invalidSlugRoute(
    new Request("http://localhost/api/episodes/INVALID"),
    { params: Promise.resolve({ slug: "INVALID" }) },
  );
  assert.equal(invalidSlugResponse.status, 400);
  assert.equal(invalidSlugResponse.headers.get("cache-control"), "no-store");
  assert.equal(invalidSlugDatabaseCalls, 0);

  const publicJson = JSON.stringify({ list, detail });
  for (const privateValue of [
    "PRIVATE ORIGINAL MANUSCRIPT TEXT",
    "PRIVATE EDITOR NOTES",
    "private/original-poster.png",
    "Credit pending",
    "https://private.example/evidence",
    "Internal claim text",
    "Private Draft Secret",
  ]) assert.doesNotMatch(publicJson, new RegExp(privateValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const listResponse = createPublicEpisodesResponse(list);
  const detailResponse = createPublicEpisodeResponse(detail);
  assert.equal(listResponse.headers.get("cache-control"), "no-store");
  assert.equal(detailResponse.headers.get("cache-control"), "no-store");
});
