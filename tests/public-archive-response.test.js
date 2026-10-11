import assert from "node:assert/strict";
import test from "node:test";
import {
  createPublicEpisodeResponse,
  createPublicEpisodesResponse,
} from "../lib/public-archive-response.js";
import { PUBLIC_ARCHIVE_NOTICE } from "../lib/source-provenance.js";

const databaseEpisode = {
  slug: "tick-tock-on-the-clock",
  title: "Tick Tock on the Clock",
  season: "001",
  synopsis: "A published editorial index.",
  experienceType: "comic",
  status: "published",
  originalSourceStatus: "source_needed",
  metadata: { sourceUrl: "private-source-url" },
  body: "private revision body",
};

const publicEpisode = {
  slug: databaseEpisode.slug,
  title: databaseEpisode.title,
  season: databaseEpisode.season,
  synopsis: databaseEpisode.synopsis,
  experienceType: databaseEpisode.experienceType,
};

test("public list response includes notice, no-store, and only editorial fields", async () => {
  const response = createPublicEpisodesResponse([databaseEpisode]);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), {
    episodes: [publicEpisode],
    notice: PUBLIC_ARCHIVE_NOTICE,
  });
});

test("public detail response includes notice, no-store, and only editorial fields", async () => {
  const response = createPublicEpisodeResponse(databaseEpisode);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), {
    episode: publicEpisode,
    notice: PUBLIC_ARCHIVE_NOTICE,
  });
});
