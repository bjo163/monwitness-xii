import { findPublicEpisode } from "./public-archive-query.js";
import {
  createPublicArchiveErrorResponse,
  createPublicEpisodeResponse,
} from "./public-archive-response.js";

export function createPublicEpisodeRouteHandler({ getDatabase, stories }) {
  return async function GET(_request, context) {
    const { slug } = await context.params;
    if (!slug || !/^[a-z0-9-]{1,120}$/.test(slug)) {
      return createPublicArchiveErrorResponse("invalid-slug");
    }
    try {
      const db = getDatabase();
      const episode = await findPublicEpisode(db, stories, slug);
      if (!episode) return createPublicArchiveErrorResponse("not-found");
      return createPublicEpisodeResponse(episode);
    } catch {
      return createPublicArchiveErrorResponse("unavailable");
    }
  };
}
