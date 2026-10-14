import { getDatabase } from "../../../db/client";
import { stories } from "../../../db/schema";
import { listPublicEpisodes } from "../../../lib/public-archive-query.js";
import {
  createPublicArchiveErrorResponse,
  createPublicEpisodesResponse,
} from "../../../lib/public-archive-response.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public endpoint exposes only published stories, never drafts or source records.
export async function GET() {
  try {
    const db = getDatabase();
    const rows = await listPublicEpisodes(db, stories);
    return createPublicEpisodesResponse(rows);
  } catch {
    return createPublicArchiveErrorResponse("unavailable");
  }
}
