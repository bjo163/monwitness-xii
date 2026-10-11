import { getDatabase } from "../../../db/client";
import { stories } from "../../../db/schema";
import { desc, eq } from "drizzle-orm";
import { createPublicEpisodesResponse } from "../../../lib/public-archive-response.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public endpoint exposes only published stories, never drafts or source records.
export async function GET() {
  try {
    const db = getDatabase();
    const rows = await db.select({
      slug: stories.slug, title: stories.title, season: stories.season,
      synopsis: stories.synopsis, experienceType: stories.experienceType,
    }).from(stories).where(eq(stories.status, "published")).orderBy(desc(stories.createdAt)).limit(100);
    return createPublicEpisodesResponse(rows);
  } catch {
    return Response.json({ error: "Archive unavailable" }, { status: 503 });
  }
}
