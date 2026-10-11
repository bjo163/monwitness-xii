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
