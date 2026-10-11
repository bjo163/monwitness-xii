import { PUBLIC_ARCHIVE_NOTICE } from "./source-provenance.js";

function projectPublicEpisode(episode) {
  return {
    slug: episode.slug,
    title: episode.title,
    season: episode.season,
    synopsis: episode.synopsis,
    experienceType: episode.experienceType,
  };
}

const noStoreHeaders = { headers: { "Cache-Control": "no-store" } };
const archiveErrors = {
  "invalid-slug": { status: 400, error: "Invalid slug" },
  "not-found": { status: 404, error: "Not found" },
  unavailable: { status: 503, error: "Archive unavailable" },
};

export function createPublicEpisodesResponse(episodes) {
  return Response.json({
    episodes: episodes.map(projectPublicEpisode),
    notice: PUBLIC_ARCHIVE_NOTICE,
  }, noStoreHeaders);
}

export function createPublicEpisodeResponse(episode) {
  return Response.json({
    episode: projectPublicEpisode(episode),
    notice: PUBLIC_ARCHIVE_NOTICE,
  }, noStoreHeaders);
}

export function createPublicArchiveErrorResponse(kind) {
  const failure = archiveErrors[kind];
  if (!failure) throw new TypeError("Unknown public archive error kind");

  return Response.json(
    { error: failure.error },
    { status: failure.status, headers: noStoreHeaders.headers },
  );
}
